# AquaTrace: Technical Architecture & Approach

This document provides a comprehensive breakdown of the methodologies, algorithms, and UI components that power the AquaTrace (formerly OILTRACE) platform. It explains the "how" and "why" behind our technical decisions to create an end-to-end oil spill forensics system.

---

## 1. Machine Learning Approach: Oil Spill Detection

### What We Used
We utilized a **U-Net Convolutional Neural Network (CNN)** architecture built with PyTorch, trained on **Synthetic Aperture Radar (SAR)** imagery (such as data from Sentinel-1).

### How It Works
1. **SAR Preprocessing:** The backend uses `rasterio` to read the `.tif` satellite image. SAR is used because it can penetrate cloud cover and operate at night. Oil dampens the capillary waves on the ocean surface, making it appear as a distinct "dark patch" in radar imagery.
2. **U-Net Segmentation:** The U-Net model uses an encoder-decoder architecture. The encoder captures the "context" (the textures of the ocean) while the decoder enables precise "localization" (drawing the exact boundaries of the spill). 
3. **GeoJSON Generation:** Once the model generates a binary mask of the spill, OpenCV extracts the contours of the mask. We then map these pixel coordinates back to real-world GPS coordinates using the spatial transform data embedded in the `.tif` file, outputting standard GeoJSON polygons.

### Why We Used It
U-Net is the industry standard for biomedical and geospatial image segmentation because it requires relatively few training images and excels at drawing highly precise boundaries around irregular shapes (like an oil slick).

---

## 2. Physics Engine Approach: Reverse Kinematic Drift

### What We Used
A **Reverse Kinematic Vector-based Drift Model**, heavily augmented by the `global-land-mask` library for collision detection.

### How It Works
1. **Time Extraction:** When the user scans an image, the backend parses the `TIFFTAG_DATETIME` (Tag 65000) embedded in the satellite image to find the exact UTC time the photo was taken.
2. **Vector Math:** The backend takes the geographical center of the detected spill. It then applies a reverse drift formula: subtracting the ocean current vector and 3% of the wind vector.
3. **Iterative Stepping:** The engine steps backward in time, hour by hour. At every step, it checks `global-land-mask`. If the simulated trajectory hits a landmass, the drift loop instantly breaks, accurately simulating that the oil washed ashore.
4. **Origin Calculation:** After stepping back (e.g., 12 hours), the final coordinate is logged as the **Estimated Time and Location of Release**.

### Why We Used It
A vector-based kinematic model allows for extremely fast, real-time calculation in a web API without requiring massive supercomputing clusters. Adding the land-mask collision check ensures the physics remain grounded in geographical reality, preventing the math from dragging oil through a continent.

---

## 3. Data Integration Approach: Global Fishing Watch API

### What We Used
The **Global Fishing Watch (GFW) v3 4Wings API**, utilizing live, historic Automatic Identification System (AIS) transponder data.

### How It Works
1. **Dynamic Querying:** Using the Calculated Origin Point and the Estimated Time of Release from the physics engine, the backend constructs a bounding-box polygon (e.g., a 30km radius) and a time window (e.g., +/- 1 hour).
2. **API Correlation:** The backend securely queries the GFW API with this space-time box. 
3. **Dynamic Scoring Algorithm:** The API returns all vessels that were in the area. We calculate the exact Haversine distance from the vessel's trajectory to the oil release point. We use an exponential decay function relative to the closest ship to dynamically scale the **Attribution Match Score** (0-100%).
4. **Fail-Safe Mechanism:** If the GFW API token is missing, or the ocean sector is empty, the backend elegantly intercepts the error and falls back to a locally generated mock dataset (`ais_data.csv`) populated with realistic supertanker names.

### Why We Used It
AIS data is the ultimate maritime forensic tool. By leveraging Global Fishing Watch, we tap into a planetary-scale database of ship movements. The relative exponential scoring algorithm guarantees a highly accurate confidence metric that reliably identifies the most likely culprit while gracefully ignoring innocent vessels passing far away.

---

## 4. User Interface (UI) Architecture & Elements

The frontend is a **React.js** Single Page Application (SPA) utilizing **Leaflet.js** for geospatial mapping.

### Key UI Elements and How They Work

#### 1. The Interactive Map (`InvestigationMap.jsx`)
* **Purpose:** The central visualizer for the entire forensic workflow.
* **How it works:** It uses `react-leaflet` to render a slippy map. When the backend returns GeoJSON polygons, they are dynamically rendered as yellow bounding areas. When vessels are found, they are plotted using `Polyline` for their historic trajectory and `CircleMarker` for their last known position.
* **Cinematic Navigation:** We utilize Leaflet's `flyTo()` method. When the AI identifies a suspect, the map automatically animates a smooth zoom-out, flies across the globe, and dives back in to pinpoint the vessel's exact location.

#### 2. The Investigation Panel (`InvestigationPanel.jsx`)
* **Purpose:** The command center located on the right sidebar.
* **How it works:** It houses the three core action buttons:
    * **"Run U-Net Inference":** Sends the selected `.tif` to the backend. Updates the "Location" field by dynamically calculating the geospatial bounding box (Min/Max Lat/Lon) of the predicted spill.
    * **"Calculate Drift":** Triggers the physics engine, rendering the dotted red reverse-trajectory line on the map.
    * **"Find Suspects":** Triggers the GFW correlation engine, populating the Candidate List below it.

#### 3. The Candidate List & Vessel Cards
* **Purpose:** Displays the ranked list of suspects.
* **How it works:** Ships are sorted by their Attribution Score. Clicking a ship updates the `selectedVessel` state. This triggers the map to fly to the vessel, and expands a detailed card showing telemetry (Speed, Course Heading, Flag, and Match %).

#### 4. The Interactive Map HUD & Popups
* **Purpose:** Providing contextual telemetry without cluttering the screen.
* **How it works:** Clicking on any vessel directly on the map opens a custom Leaflet `<Popup>`. We injected dynamic CSS and React variables into this popup to show the vessel's live Speed (knots), Course (°), and Match Confidence instantly. A bottom-left overlay continuously tracks and displays the user's live mouse cursor GPS coordinates.
