import pandas as pd
import numpy as np
import random
import os
from datetime import datetime, timedelta

# Realistic maritime vessel names
REALISTIC_NAMES = [
    "MV Seawise Giant", "Ever Given", "Pioneering Spirit", "Suezmax Glory",
    "Knock Nevis", "Batillus", "CSCL Globe", "MSC Oscar", "Oasis of the Seas",
    "TI Europe", "Emma Maersk", "Cosco Guangzhou", "CMA CGM Marco Polo",
    "Berge Emperor", "Esso Atlantic", "Boraq", "BW Tiber", "Fure West",
    "Stena Bulk", "Nordic Zenith", "Torm Gertrude", "Hafnia Lise"
]

# Constants
NUM_ROWS = 500
OUTPUT_FILE = 'ais_data.csv'

# "Origin Point" where the spill started at T-12 hours
ORIGIN_LAT = 19.8968
ORIGIN_LON = -155.5828
T_MINUS_12 = datetime.utcnow() - timedelta(hours=12)

def generate_mock_data():
    data = []
    
    # 1. Plant the "Guilty" ship exactly at the Origin Point
    data.append({
        'mmsi': '123456789',
        'vessel_name': 'MV Suspect Alpha',
        'timestamp': T_MINUS_12.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'latitude': ORIGIN_LAT,
        'longitude': ORIGIN_LON,
        'speed_knots': 14.5,
        'heading': 270.0
    })
    
    # 2. Generate 499 other random ship records around that general area
    for i in range(NUM_ROWS - 1):
        # Add some random noise to coordinates
        lat = ORIGIN_LAT + random.uniform(-2.0, 2.0)
        lon = ORIGIN_LON + random.uniform(-2.0, 2.0)
        
        # Add random time within a 24 hour window
        random_hours = random.uniform(-24, 0)
        ts = datetime.utcnow() + timedelta(hours=random_hours)
        
        mmsi = str(random.randint(100000000, 999999999))
        vessel_name = random.choice(REALISTIC_NAMES)
        
        data.append({
            'mmsi': mmsi,
            'vessel_name': vessel_name,
            'timestamp': ts.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'latitude': lat,
            'longitude': lon,
            'speed_knots': round(random.uniform(5.0, 20.0), 1),
            'heading': round(random.uniform(0.0, 360.0), 1)
        })
        
    df = pd.DataFrame(data)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Successfully generated {NUM_ROWS} rows of mock AIS data to {OUTPUT_FILE}")

if __name__ == '__main__':
    generate_mock_data()
