# AquaTrace / OILTRACE 🌊🛳️

AquaTrace (formerly OILTRACE) is an end-to-end AI forensics platform designed to detect ocean oil spills from Sentinel-1 Synthetic Aperture Radar (SAR) satellite imagery, calculate the oceanographic reverse-drift to find the exact time and location of the release, and automatically query the Global Fishing Watch live AIS database to identify the guilty vessel.

## 🚀 Features
1. **U-Net Machine Learning Model:** Scans `.tif` SAR images and automatically detects the geospatial boundaries of oil slicks.
2. **Reverse Kinematic Drift Physics:** Simulates the reverse drift of the oil over time by analyzing ocean current and wind vectors, automatically stopping if it hits a landmass (`global-land-mask`).
3. **Forensic Vessel Correlation:** Pings the Global Fishing Watch (GFW) API to cross-reference the estimated spill origin time and location with historic ship trajectories to assign an Attribution Match Score to suspects.

---

## 💻 Installation Guide

### 1. Prerequisites
- **Node.js** (v18+) for the React frontend
- **Python** (v3.10+) for the ML backend

### 2. Setup the Python ML Backend
Open your terminal in the project root (`D:\SIH\OILTRACE`) and run:
```bash
# Create a virtual environment (if you haven't already)
python -m venv venv

# Activate the virtual environment (Windows)
.\venv\Scripts\Activate.ps1

# Install all AI and API dependencies
pip install -r requirements.txt
```

### 3. Setup the React Web App
In a new terminal window, run:
```bash
# Install Node modules
npm install
```

### 4. Add your API Token (Optional but Recommended)
To pull real ship tracking data from satellites, you need a Global Fishing Watch API token.
1. Navigate to the `python_ml_backend/` folder.
2. Create a file named `.env`
3. Add your token inside the file like this:
   `GFW_API_TOKEN=eyJhbGciOiJSUz...`

*Note: If you do not provide a token, the backend has an intelligent fail-safe that will fall back to using synthetic tracking data (`ais_data.csv`) so that your presentation demo never crashes!*

---

## 🏃‍♂️ How to Run the App

You can launch the entire application seamlessly by double-clicking the **`start_app.bat`** file located in the root of the project folder.

Alternatively, you can run them manually in two separate terminals:

**Terminal 1 (Backend):**
```bash
.\venv\Scripts\Activate.ps1
cd python_ml_backend
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Once running, navigate to **http://localhost:5173** in your web browser!

---

## 🔬 Usage Walkthrough (For Demos)

1. **Upload an Image:** Click "Select Satellite Image (.tif)" in the right sidebar. You can use the real Sentinel-1 test imagery.
2. **Run Inference:** Click "Run U-Net Inference" to trigger the Python ML model. It will detect the oil spill and highlight it in yellow on the interactive map.
3. **Calculate Drift:** Click "Calculate Drift". The physics engine will simulate reverse drift, plotting a red dotted line back to the exact time of release.
4. **Find Suspects:** Click "Find Suspects". The system will query the GFW API (or the fallback CSV) to pull all ships that were in the vicinity, calculating a dynamic Attribution Score for the culprit! Click on the ships to see their Speed, Course, and Match Confidence.
