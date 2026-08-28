#!/bin/bash

echo "==================================================="
echo "  Starting AquaTrace / OILTRACE Application..."
echo "==================================================="
echo ""

# ---------------------------------------------------------
# 1. Python ML Backend Setup
# ---------------------------------------------------------
echo "[1/2] Checking Python ML Backend dependencies..."

# Check if venv exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating Python Virtual Environment..."
    python3 -m venv venv
fi

# Activate venv and install requirements
source venv/bin/activate
pip install -r requirements.txt

# Start backend in background
echo "Starting Python ML Backend on http://127.0.0.1:8000..."
cd python_ml_backend
uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

echo ""

# ---------------------------------------------------------
# 2. React Web Frontend Setup
# ---------------------------------------------------------
echo "[2/2] Checking React Web Frontend dependencies..."

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "Installing Node Modules..."
    npm install
fi

# Start frontend
echo "Starting React Web App on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "==================================================="
echo "Both services are launching!"
echo "Press [CTRL+C] to stop both servers."
echo "==================================================="

# Wait for both processes to keep script alive
wait $BACKEND_PID $FRONTEND_PID
