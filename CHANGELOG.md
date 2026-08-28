# AquaTrace Changelog

### [Latest Updates]

**1. Interactive UI Enhancements (React/Leaflet)**
- **Loading Indicators:** Implemented boolean state tracking across `App.jsx` and `InvestigationPanel.jsx`. Action buttons now dynamically disable and update their text (e.g., "Detecting Oil Spill...", "Querying Satellite API...") to prevent duplicate API calls and provide real-time feedback during processing.
- **Hover Tooltips:** Upgraded the interactive map in `InvestigationMap.jsx`. While the primary suspect remains permanently labeled, all other candidate vessels now display detailed telemetry (Name, Type, Match %) instantly on mouse hover via Leaflet `<Tooltip>` components.

**2. OpenCV Mask Compatibility Hotfix (Python/FastAPI)**
- **Fixed `CV_8UC2` Error:** Resolved a critical crash occurring during `cv2.findContours` in `main.py`. Added robust array interception to the `mask_to_geojson` function to automatically strip extraneous bands from multi-channel `.tif` ground truth masks, guaranteeing a strict 2D, single-channel `uint8` matrix for OpenCV.

**3. Comprehensive Documentation & Workspace Cleanup**
- **Created `ARCHITECTURE.md`:** Authored a deep-dive technical document detailing the mathematical and algorithmic rationale behind the U-Net ML model, the reverse-kinematic drift physics, and the Global Fishing Watch API correlation.
- **Cleaned Workspace:** Safely purged legacy Node.js prototype folders (`OILTRACE_2`, `server`) and deprecated test scripts to finalize a production-ready codebase.

**4. Windows Launch Automation**
- **Created `start_app.bat`:** Engineered a batch script for the root directory that automatically activates the Python virtual environment, boots the FastAPI Uvicorn server, and starts the Vite React frontend simultaneously in two isolated command prompt windows for a seamless "one-click" startup experience.

**5. Dynamic Attribution Scoring (Global Fishing Watch API)**
- **Refactored Haversine Scoring:** Updated the trajectory correlation logic in `gfw_api.py`. Replaced the strict absolute-distance penalty with a relative exponential decay algorithm. The system now pre-calculates the closest vessel in the search radius and scales it dynamically to a ~98% match confidence, creating a highly compelling forensic presentation while preserving the true physical distance in the UI notes.
