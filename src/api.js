const BASE_URL = `http://${window.location.hostname}:8000/api`;

export const detectSpill = async (imageFile, maskFile = null) => {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  if (maskFile) {
    formData.append('mask_file', maskFile);
  }

  const res = await fetch(`${BASE_URL}/detect`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) throw new Error('Detection failed');
  return res.json();
};

export const calculateDrift = async (geojson, wind_speed, wind_direction, current_speed, current_direction) => {
  const res = await fetch(`${BASE_URL}/hindcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geojson,
      wind_speed,
      wind_direction,
      current_speed,
      current_direction,
    }),
  });
  
  if (!res.ok) throw new Error('Hindcast failed');
  return res.json();
};

export const findSuspects = async (lat, lon, time = null) => {
  const res = await fetch(`${BASE_URL}/correlate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, time }),
  });
  
  if (!res.ok) throw new Error('Correlation failed');
  return res.json();
};
