# AquaTrace: Full Developer Documentation

This document serves as the official API reference, codebase structure guide, and data schema manual for developers working on the AquaTrace (formerly OILTRACE) platform.

---

## 1. System Architecture Overview

AquaTrace is built on a decoupled client-server architecture:
- **Frontend:** React.js (Vite) Single Page Application (SPA), using Leaflet for geospatial mapping.
- **Backend:** Python (FastAPI) server, using PyTorch for Deep Learning inference and custom kinematic algorithms for drift physics.
- **External APIs:** Global Fishing Watch (GFW) v3 for real-time AIS vessel tracking.

---

## 2. API Endpoints Reference

The FastAPI server runs locally on `http://127.0.0.1:8000`.

### 2.1. Oil Spill Detection
**`POST /api/detect`**
Runs the PyTorch U-Net inference on a SAR satellite image.

- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `image_file` (File, required): The `.tif` SAR image to scan.
  - `mask_file` (File, optional): The ground truth `.tif` mask.
- **Returns:**
  ```json
  {
    "status": "success",
    "predicted_geojson": { ... }, 
    "actual_geojson": { ... } // (null if mask_file not provided)
  }
  ```

### 2.2. Reverse Drift Hindcast
**`POST /api/hindcast`**
Calculates a 12-hour reverse trajectory to find the origin of the spill.

- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "geojson": { ... }, // The predicted_geojson from /api/detect
    "wind_speed": 15.0,
    "wind_direction": 45.0,
    "current_speed": 1.2,
    "current_direction": 90.0
  }
  ```
- **Returns:**
  ```json
  {
    "status": "success",
    "trajectory": { ... }, // GeoJSON LineString of the drift path
    "origin_point": { "lat": 19.8968, "lon": -155.5828 }
  }
  ```

### 2.3. Vessel Correlation
**`POST /api/correlate`**
Queries the Global Fishing Watch API (or fallback CSV) to find ships near the origin point.

- **Content-Type:** `application/json`
- **Request Body:**
  ```json
  {
    "lat": 19.8968,
    "lon": -155.5828,
    "time": "2026-08-27T16:00:00Z"
  }
  ```
- **Returns:**
  ```json
  {
    "status": "success",
    "source": "GFW_API", // or "MOCK_CSV"
    "suspects": [
      {
        "id": "123456",
        "name": "MV Suspect Alpha",
        "attributionScore": 98,
        ...
      }
    ]
  }
  ```

---

## 3. Frontend Directory Structure

Located in `/src/`:
- **`App.jsx`**: The main orchestrator. Manages global states (loading flags, active polygons, trajectories).
- **`/components/InvestigationMap.jsx`**: The React-Leaflet map. Handles rendering GeoJSON data, Polylines, Tooltips, and cinematic `flyTo` camera movements.
- **`/components/InvestigationPanel.jsx`**: The right-side command center. Handles file uploads and triggering backend API calls.
- **`/components/EvidenceModal.jsx`**: The popup that displays full forensic details of a selected vessel.
- **`/api.js`**: Contains the Axios/Fetch wrappers that communicate with the FastAPI backend.

---

## 4. Backend Directory Structure

Located in `/python_ml_backend/`:
- **`main.py`**: The FastAPI application. Houses all endpoints and the OpenCV contour extraction logic (`mask_to_geojson`).
- **`gfw_api.py`**: The bridge to the Global Fishing Watch API. Handles parsing temporal windows, making authorized HTTP requests, and the exponential decay algorithm for attribution scoring.
- **`.env`**: (Git Ignored) Contains sensitive API keys, specifically `GFW_API_TOKEN`.
- **`../unet_oilspill.pt`**: The compiled weights for the PyTorch U-Net model.

---

## 5. Environment & Configuration

### The `.env` File
To unlock real-time vessel tracking, a `.env` file must be placed inside `python_ml_backend/`.
```ini
GFW_API_TOKEN=your_token_here
```
**Fail-Safe Mechanism:** If the token is invalid, missing, or the API is unreachable, `main.py` will automatically intercept the 502/401 error and fallback to reading `/ais_data.csv`. This ensures the UI never crashes during a live demonstration.

### Drift Physics Tuning
The reverse drift formula is currently located in `main.py` under the `/api/hindcast` endpoint. It currently applies `100%` of the ocean current vector and `3%` of the wind vector. This can be tuned directly in the API endpoint based on specific crude oil viscosity profiles.
