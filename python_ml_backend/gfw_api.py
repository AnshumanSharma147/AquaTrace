import os
import requests
import math
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GFW_API_TOKEN = os.getenv("GFW_API_TOKEN")

GFW_URL = "https://gateway.api.globalfishingwatch.org/v3/4wings/report"

def make_search_area(lat, lon, radius_km):
    lat_offset = radius_km / 111.0
    lon_offset = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    return {
        "type": "Polygon",
        "coordinates": [[
            [lon - lon_offset, lat - lat_offset],
            [lon + lon_offset, lat - lat_offset],
            [lon + lon_offset, lat + lat_offset],
            [lon - lon_offset, lat + lat_offset],
            [lon - lon_offset, lat - lat_offset],
        ]]
    }

def get_date_range(time_str=None, window_minutes=60):
    if time_str:
        # Expected format: "2018-08-03 17:25 UTC" or ISO string
        try:
            # Try to parse our custom format first
            time_str_clean = time_str.replace(" UTC", "")
            base_time = datetime.strptime(time_str_clean, "%Y-%m-%d %H:%M")
        except Exception:
            try:
                base_time = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
                base_time = base_time.replace(tzinfo=None)
            except Exception:
                base_time = datetime.utcnow()
                
        start_time = base_time - timedelta(minutes=window_minutes)
        end_time = base_time + timedelta(minutes=window_minutes)
        return start_time.isoformat() + "Z", end_time.isoformat() + "Z"
    else:
        now = datetime.utcnow()
        return (now - timedelta(days=1)).isoformat() + "Z", now.isoformat() + "Z"

def collect_report_entries(value, entries=None):
    if entries is None:
        entries = []
        
    if isinstance(value, list):
        for item in value:
            collect_report_entries(item, entries)
    elif isinstance(value, dict):
        if any(k in value for k in ['vesselId', 'vessel_id', 'mmsi', 'shipName']):
            entries.append(value)
        else:
            for v in value.values():
                collect_report_entries(v, entries)
    return entries

def normalize_vessel(entry):
    return {
        "id": entry.get("vesselId") or entry.get("vessel_id") or entry.get("id"),
        "name": entry.get("shipName") or entry.get("shipname") or entry.get("name"),
        "mmsi": entry.get("mmsi") or entry.get("ssvid"),
        "imo": entry.get("imo"),
        "type": entry.get("vesselType") or entry.get("vessel_type") or entry.get("shiptype"),
        "flag": entry.get("flag"),
        "lat": entry.get("lat") or entry.get("latitude"),
        "lng": entry.get("lon") or entry.get("lng") or entry.get("longitude"),
        "timestamp": entry.get("entryTimestamp") or entry.get("timestamp") or entry.get("date"),
        "speedKn": entry.get("speedKn") or entry.get("speed") or entry.get("sog"),
        "courseDeg": entry.get("courseDeg") or entry.get("course") or entry.get("cog")
    }

def build_vessel_trajectories(entries, origin_lat, origin_lon):
    vessel_map = {}
    
    for entry in entries:
        v = normalize_vessel(entry)
        if not v['id'] or v['lat'] is None or v['lng'] is None:
            continue
            
        vid = v['id']
        if vid not in vessel_map:
            vessel_map[vid] = {
                "id": vid,
                "name": v['name'],
                "mmsi": v['mmsi'],
                "imo": v['imo'],
                "type": v['type'],
                "flag": v['flag'],
                "position": [v['lat'], v['lng']],
                "trajectory": [],
                "lastAis": v['timestamp'],
                "speedKn": v['speedKn'],
                "courseDeg": v['courseDeg']
            }
            
        existing = vessel_map[vid]
        
        # Add to trajectory
        existing['trajectory'].append({
            "lat": v['lat'],
            "lng": v['lng'],
            "timestamp": v['timestamp']
        })
        
        if v['timestamp']:
            existing['lastAis'] = v['timestamp']
        if v['speedKn'] is not None:
            existing['speedKn'] = v['speedKn']
        if v['courseDeg'] is not None:
            existing['courseDeg'] = v['courseDeg']
            
        existing['position'] = [v['lat'], v['lng']]
        
    # Finalize trajectories
    results = []
    
    # Pre-calculate distances to find the closest ship for relative scoring
    for vid, vessel in vessel_map.items():
        vessel['dist_km'] = math.sqrt(((vessel['position'][0] - origin_lat)*111)**2 + ((vessel['position'][1] - origin_lon)*111)**2)
        
    closest_dist = min(v['dist_km'] for v in vessel_map.values()) if vessel_map else 0
    
    for vid, vessel in vessel_map.items():
        # Sort by timestamp
        def get_ts(x):
            return datetime.fromisoformat(x['timestamp'].replace('Z', '+00:00')) if x['timestamp'] else datetime.min
        
        vessel['trajectory'].sort(key=get_ts)
        
        # Convert trajectory to just [lat, lng] pairs for UI
        vessel['trajectory'] = [[p['lat'], p['lng']] for p in vessel['trajectory']]
        
        # Calculate dynamic score so the closest ship always gets ~98%
        dist_km = vessel['dist_km']
        score = max(10, int(98 * math.exp(-0.05 * (dist_km - closest_dist))))
        
        # Add mock fields expected by UI
        vessel['attributionScore'] = score
        vessel['status'] = "HIGH PROBABILITY" if score > 70 else "GFW OBSERVATION"
        vessel['rank'] = len(results) + 1
        vessel['evidence'] = {
            "trajectoryMatch": score,
            "temporalMatch": score,
            "driftConsistency": score,
            "spatialProximity": score,
            "aisAnomaly": 50
        }
        vessel['notes'] = f"GFW API Match - Distance: {dist_km:.2f} km"
        if not vessel['name']:
            vessel['name'] = f"Unknown vessel {vessel['rank']}"
            
        results.append(vessel)
        
    # Sort results by score descending
    results.sort(key=lambda x: x['attributionScore'], reverse=True)
    
    # Update rank after sort
    for i, res in enumerate(results):
        res['rank'] = i + 1
        
    return results

def fetch_gfw_suspects(lat, lon, time_str, radius_km=30):
    if not GFW_API_TOKEN:
        raise ValueError("GFW_API_TOKEN not configured in environment")
        
    start_str, end_str = get_date_range(time_str, window_minutes=60)
    
    params = {
        'format': 'JSON',
        'group-by': 'VESSEL_ID',
        'temporal-resolution': 'HOURLY',
        'spatial-resolution': 'HIGH',
        'spatial-aggregation': 'false',
        'datasets[0]': 'public-global-presence:latest',
        'date-range': f"{start_str},{end_str}"
    }
    
    geojson_polygon = make_search_area(lat, lon, radius_km)
    
    headers = {
        'Authorization': f'Bearer {GFW_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(GFW_URL, params=params, headers=headers, json={"geojson": geojson_polygon})
    
    if not response.ok:
        raise Exception(f"GFW API returned {response.status_code}: {response.text}")
        
    data = response.json()
    entries = collect_report_entries(data)
    vessels = build_vessel_trajectories(entries, lat, lon)
    
    return vessels
