<div align="center">
  
# 🌊 AquaTrace (formerly OILTRACE) 🛳️
**An End-to-End AI Forensics Platform for Marine Oil Spill Detection & Attribution**

[![React](https://img.shields.io/badge/React-18-blue.svg?style=flat&logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0-ee4c2c.svg?style=flat&logo=pytorch)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

AquaTrace is an advanced forensic web application built to detect ocean oil spills from Sentinel-1 Synthetic Aperture Radar (SAR) satellite imagery. Using physics-based reverse-drift modeling and the Global Fishing Watch live AIS database, AquaTrace automatically identifies the guilty vessel responsible for illegal bilge dumping.

---

## ✨ Core Features

1. **🧠 U-Net Machine Learning Model:** Scans `.tif` SAR images and automatically detects the geospatial boundaries of oil slicks. Features dynamic tensor reshaping and normalization to gracefully handle various SAR formats.
2. **🌊 Reverse Kinematic Drift Physics:** Simulates the reverse drift of the oil over time by analyzing ocean current and wind vectors, automatically stopping if it washes ashore (using `global-land-mask`).
3. **🛳️ Forensic Vessel Correlation:** Pings the Global Fishing Watch (GFW) API to cross-reference the estimated spill origin time and location with historic ship trajectories, assigning an Attribution Match Score to suspects.

---

## 💻 Installation & Setup

### 1. Prerequisites
- **Node.js** (v18+) for the React frontend UI
- **Python** (v3.10+) for the ML backend

### 2. Add your API Token
To pull real ship tracking data from satellites, you must provide a Global Fishing Watch API token.
1. Navigate to the `python_ml_backend/` folder.
2. Create a file named `.env`
3. Add your token inside the file: `GFW_API_TOKEN=eyJhbGciOiJSUz...`

---

## 🚀 How to Run the App

You can launch the entire application seamlessly using the "One-Click" startup scripts located in the root of the project folder. These scripts will automatically build your Python virtual environment, run `npm install`, and boot both servers in the background.

**The servers are automatically exposed to your local network (`--host 0.0.0.0`), meaning teammates or judges can instantly view the app on their phones by typing your computer's IP address (e.g. `http://192.168.1.5:5173`) into their browser!**

- **Windows:** Double-click **`start_app.bat`**
- **Mac/Linux:** Open terminal and run **`bash start_app.sh`**

#### Manual Startup:
If you prefer to run them manually in two separate terminals:

**Terminal 1 (Backend):**
```bash
.\venv\Scripts\Activate.ps1
cd python_ml_backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
npm run dev -- --host
```

Once running, navigate to **http://localhost:5173** in your web browser!

---

## 🔬 Usage Walkthrough (For Demos)

1. **Upload an Image:** Click "Select Satellite Image (.tif)" in the right sidebar. You can use real Sentinel-1 test imagery. (The system will dynamically project it onto the Leaflet map).
2. **Run Inference:** Click "Run U-Net Inference" to trigger the Python ML model. It will detect the oil spill and highlight the polygon in yellow on the interactive map.
3. **Calculate Drift:** Click "Calculate Drift". The physics engine will simulate reverse drift, plotting a red dotted line back to the exact time of release.
4. **Find Suspects:** Click "Find Suspects". The system will query the GFW API (or the fallback CSV) to pull all ships that were in the vicinity, calculating a dynamic Attribution Score for the culprit! Click on the ships to see their Speed, Course, and Match Confidence.
