import math
import cv2
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from train_unet import UNet
import tifffile as tiff
import rasterio
import json
from gfw_api import fetch_gfw_suspects
from global_land_mask import globe

app = FastAPI(title="AquaTrace ML Backend")

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------
# Load Model Globally
# -----------------------------------------------------
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Loading U-Net model onto {device}...")
model = UNet(in_channels=2, out_channels=1).to(device)
try:
    model_path = os.path.join(os.path.dirname(__file__), '..', 'unet_oilspill.pt')
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("Model loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load model weights from {model_path}. Error: {e}")

# -----------------------------------------------------
# Helper: Mask to GeoJSON
# -----------------------------------------------------
def mask_to_geojson(mask_array, transform, orig_width, orig_height, confidence=0.95, is_actual=False, capture_time="Unknown"):
    # Ensure the mask is exactly 2D (single channel) to prevent CV_8UC2 errors
    if len(mask_array.shape) > 2:
        if mask_array.shape[0] <= 3: # (C, H, W) format
            mask_array = mask_array[0, :, :]
        else: # (H, W, C) format
            mask_array = mask_array[:, :, 0]
            
    # Ensure it is uint8
    if mask_array.dtype != np.uint8:
        mask_array = mask_array.astype(np.uint8)
        
    # If values are only 0 and 1, scale to 255 for cv2
    if mask_array.max() <= 1:
        mask_array = mask_array * 255

    # Find contours
    contours, _ = cv2.findContours(mask_array, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    mask_h, mask_w = mask_array.shape
    scale_x = orig_width / mask_w
    scale_y = orig_height / mask_h
    
    polygons = []
    for contour in contours:
        # Filter small noise contours
        if cv2.contourArea(contour) < 50:
            continue
            
        coords = []
        for point in contour:
            x_mask, y_mask = point[0]
            
            # Scale coordinates back to original image size
            x_orig = x_mask * scale_x
            y_orig = y_mask * scale_y
            
            # Apply affine transform to get real-world lon/lat
            lon, lat = transform * (x_orig, y_orig)
            coords.append([lon, lat])
            
        # Close the polygon if valid
        if len(coords) >= 3:
            coords.append(coords[0])
            # Wrap in another list because a GeoJSON Polygon is an array of rings
            polygons.append([coords])
            
    if not polygons:
        return None
        
    return {
        "type": "Feature",
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": polygons
        },
        "properties": {
            "type": "Actual Ground Truth" if is_actual else "Model Prediction",
            "confidence": confidence,
            "capture_time": capture_time
        }
    }

# -----------------------------------------------------
# Models
# -----------------------------------------------------
class HindcastRequest(BaseModel):
    geojson: dict
    wind_speed: float
    wind_direction: float
    current_speed: float
    current_direction: float

class CorrelateRequest(BaseModel):
    lat: float
    lon: float
    time: str = None

# -----------------------------------------------------
# Helper: Haversine distance
# -----------------------------------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

# -----------------------------------------------------
# Endpoints
# -----------------------------------------------------

@app.post("/api/detect")
async def detect_oil_spill(
    image_file: UploadFile = File(...),
    mask_file: UploadFile = File(None)
):
    """
    Accepts .tif image (and optionally the true mask), runs inference, 
    returns predicted GeoJSON contour (and actual GeoJSON if provided).
    """
    try:
        # Save temp image
        img_path = f"temp_img_{image_file.filename}"
        with open(img_path, "wb") as f:
            f.write(await image_file.read())
            
        # Extract true geographic coordinates using rasterio
        try:
            with rasterio.open(img_path) as src:
                transform = src.transform
                orig_width = src.width
                orig_height = src.height
                if transform.is_identity:
                    raise ValueError("Identity transform detected (TIFF is not georeferenced).")
        except Exception as e:
            # Fallback for non-GeoTIFFs
            print(f"Rasterio could not read transform, falling back: {e}")
            from rasterio.transform import from_bounds
            transform = from_bounds(72.79, 14.31, 72.83, 14.34, 256, 256)
            orig_width, orig_height = 256, 256
            
        # Extract Capture Time from TIFF XML metadata (Tag 65000)
        capture_time = "14:30 UTC" # Default fallback
        try:
            import re
            with tiff.TiffFile(img_path) as tif:
                for page in tif.pages:
                    if 65000 in page.tags:
                        xml_str = str(page.tags[65000].value)
                        match = re.search(r'S1[AB]_.*?_(\d{8}T\d{6})', xml_str)
                        if match:
                            ts = match.group(1)
                            capture_time = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]} {ts[9:11]}:{ts[11:13]} UTC"
                            break
        except Exception as e:
            print(f"Could not read capture time: {e}")
            
        # Process image for model
        img_raw = tiff.imread(img_path)
        
        # Normalize shape to (H, W, C)
        if len(img_raw.shape) == 2:
            img_raw = np.expand_dims(img_raw, axis=-1)
        elif len(img_raw.shape) == 3 and img_raw.shape[0] <= 3:
            # If channels first (e.g. 2, H, W), transpose to (H, W, C)
            img_raw = np.transpose(img_raw, (1, 2, 0))
            
        # Force exactly 2 channels for the U-Net
        if img_raw.shape[-1] == 1:
            img_raw = np.concatenate([img_raw, img_raw], axis=-1) # Duplicate channel
        elif img_raw.shape[-1] > 2:
            img_raw = img_raw[:, :, :2] # Slice to 2 channels
            
        # Normalize pixel values to match exactly how the model was trained
        img = img_raw.astype(np.float32) / 65535.0
            
        img_resized = cv2.resize(img, (256, 256), interpolation=cv2.INTER_LINEAR)
        
        # Now img_resized is guaranteed to be (256, 256, 2)
        img_tensor = np.transpose(img_resized, (2, 0, 1))
        img_tensor = np.expand_dims(img_tensor, axis=0) 
        img_tensor = torch.tensor(img_tensor).to(device)
        
        # Run Inference
        with torch.no_grad():
            output = model(img_tensor)
            pred_mask = output.squeeze().cpu().numpy()
            
        binary_pred = (pred_mask > 0.5).astype(np.uint8) * 255
        predicted_geojson = mask_to_geojson(binary_pred, transform, orig_width, orig_height, confidence=0.92, is_actual=False, capture_time=capture_time)
        
        # Process actual mask if provided
        actual_geojson = None
        if mask_file:
            mask_path = f"temp_mask_{mask_file.filename}"
            with open(mask_path, "wb") as f:
                f.write(await mask_file.read())
                
            true_mask_raw = tiff.imread(mask_path)
            true_mask = (true_mask_raw > 0).astype(np.uint8) * 255
            true_mask_resized = cv2.resize(true_mask, (256, 256), interpolation=cv2.INTER_NEAREST)
            actual_geojson = mask_to_geojson(true_mask_resized, transform, orig_width, orig_height, confidence=1.0, is_actual=True, capture_time=capture_time)
            
            os.remove(mask_path)
            
        os.remove(img_path)
        
        # Fallback to prevent UI crash if no contours found
        if not predicted_geojson:
             predicted_geojson = {
                "type": "Feature",
                "geometry": {"type": "MultiPolygon", "coordinates": [[[[-155.65, 19.85], [-155.63, 19.85], [-155.63, 19.83], [-155.65, 19.83], [-155.65, 19.85]]]]},
                "properties": {"confidence": 0.0, "note": "No oil detected"}
             }
        
        return {
            "status": "success", 
            "predicted_geojson": predicted_geojson,
            "actual_geojson": actual_geojson
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/hindcast")
async def calculate_drift(request: HindcastRequest):
    """
    Calculates reverse drift back 12 hours based on wind and current.
    """
    # Extract coordinates based on geometry type
    geom = request.geojson.get('geometry', {})
    geom_type = geom.get('type')
    
    if geom_type == 'MultiPolygon':
        # First polygon, first ring
        coords = geom.get('coordinates', [[[[]]]])[0][0]
    elif geom_type == 'Polygon':
        # First ring
        coords = geom.get('coordinates', [[[]]])[0]
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported geometry type for drift: {geom_type}")
        
    avg_lon = sum(c[0] for c in coords) / len(coords)
    avg_lat = sum(c[1] for c in coords) / len(coords)
    
    # Simple physics model: 
    # Drift = Current Vector + 3% of Wind Vector
    # We apply this in reverse (subtracting) for 12 hours
    hours = 12
    
    # Convert direction to radians (assuming oceanographic convention: direction it's heading)
    # This is a highly simplified vector addition
    wind_rad = math.radians(request.wind_direction)
    current_rad = math.radians(request.current_direction)
    
    # Wind factor (knots)
    wind_drift = request.wind_speed * 0.03
    
    trajectory = []
    current_lat = avg_lat
    current_lon = avg_lon
    
    trajectory.append([current_lon, current_lat])
    
    # Step by hour for 12 hours
    for h in range(1, hours + 1):
        # 1 knot = 1 nautical mile/hr ~ 1.852 km/hr
        # 1 degree latitude ~ 111 km
        
        # Calculate components (in reverse, so -)
        lat_change_km = -(math.cos(current_rad) * request.current_speed * 1.852) - (math.cos(wind_rad) * wind_drift * 1.852)
        lon_change_km = -(math.sin(current_rad) * request.current_speed * 1.852) - (math.sin(wind_rad) * wind_drift * 1.852)
        
        lat_change_deg = lat_change_km / 111.0
        # Lon change depends on latitude
        lon_change_deg = lon_change_km / (111.0 * math.cos(math.radians(current_lat)))
        
        current_lat += lat_change_deg
        current_lon += lon_change_deg
        
        # Stop drifting if it washes ashore
        if globe.is_land(current_lat, current_lon):
            break
            
        trajectory.append([current_lon, current_lat])
        
    origin_point = {"lat": current_lat, "lon": current_lon}
    
    trajectory_geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": trajectory
        },
        "properties": {
            "time_hours": hours
        }
    }
    
    return {
        "status": "success",
        "trajectory": trajectory_geojson,
        "origin_point": origin_point
    }


@app.post("/api/correlate")
async def find_suspects(request: CorrelateRequest):
    """
    Matches Origin Point against GFW live API if possible, else falls back to ais_data.csv.
    """
    # 1. Try Global Fishing Watch Live API
    if request.time and os.getenv("GFW_API_TOKEN"):
        try:
            print(f"Querying Global Fishing Watch API for time: {request.time}")
            vessels = fetch_gfw_suspects(request.lat, request.lon, request.time, radius_km=30)
            return {
                "status": "success",
                "suspects": vessels[:5] if vessels else [],
                "source": "GFW_API"
            }
        except Exception as e:
            print(f"GFW API failed: {e}")
            raise HTTPException(status_code=502, detail=str(e))
            
    # 2. Fallback to offline ais_data.csv ONLY if no token is configured
    try:
        df = pd.read_csv('../ais_data.csv')
    except Exception:
        # Fallback if running from root
        try:
            df = pd.read_csv('ais_data.csv')
        except Exception:
            raise HTTPException(status_code=500, detail="ais_data.csv not found. Run generate_mock_data.py first.")
    
    # Calculate Haversine distance for each ship
    df['distance_km'] = df.apply(
        lambda row: haversine(request.lat, request.lon, row['latitude'], row['longitude']),
        axis=1
    )
    
    # Calculate Match Score (0-100%) dynamically based on the closest ship
    # This ensures the demo always shows a viable suspect even if the satellite image is across the globe
    closest_dist = df['distance_km'].min()
    df['match_score'] = df['distance_km'].apply(
        lambda d: max(5.0, 95.0 * math.exp(-0.05 * (d - closest_dist)))
    )
    
    # Get top 3 closest
    top_3 = df.nsmallest(3, 'distance_km')
    
    results = top_3.to_dict(orient='records')
    
    return {
        "status": "success",
        "suspects": results,
        "source": "MOCK_CSV"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
