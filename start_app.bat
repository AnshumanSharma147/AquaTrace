@echo off
echo ===================================================
echo   Starting AquaTrace / OILTRACE Application...
echo ===================================================

echo.
echo [1/2] Checking Python ML Backend dependencies...
if not exist venv (
    echo Creating Python Virtual Environment...
    python -m venv venv
)
start "AquaTrace - Python ML Backend" cmd /k ".\venv\Scripts\activate.bat && pip install -r requirements.txt && cd python_ml_backend && uvicorn main:app --reload"

echo.
echo [2/2] Checking React Web Frontend dependencies...
if not exist node_modules (
    echo Installing Node Modules...
    npm install
)
start "AquaTrace - React Web App" cmd /k "npm run dev"

echo.
echo Both services are launching! 
echo - The Python Backend is starting on http://127.0.0.1:8000
echo - The React App is starting on http://localhost:5173
echo.
echo You can close this window now.
