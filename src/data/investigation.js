/**
 * Mock investigation payload.
 * Replace this module with API responses later; keep the same shape.
 */

export const system = {
  name: 'AquaTrace',
  tagline: 'Maritime Oil Spill Intelligence',
  status: 'ONLINE',
}

export const incident = {
  id: 'OT-001',
  status: 'DETECTED',
  location: {
    lat: 14.32,
    lng: 72.81,
    label: '14.32°N, 72.81°E',
  },
  detectionTime: '14:30 UTC',
  estimatedAreaKm2: 4.7,
  sensor: 'SAR / Sentinel-1 (simulated)',
  region: 'Arabian Sea — west of India',
}

/** Irregular slick polygon [lat, lng] */
export const spillPolygon = [
  [14.328, 72.798],
  [14.336, 72.806],
  [14.339, 72.818],
  [14.333, 72.829],
  [14.324, 72.832],
  [14.314, 72.824],
  [14.310, 72.812],
  [14.312, 72.800],
  [14.320, 72.794],
]

export const estimatedReleasePoint = {
  lat: 14.338,
  lng: 72.792,
}

export const sourceZone = {
  center: [14.338, 72.792],
  radiusMeters: 2800,
}

export const mapView = {
  center: [14.32, 72.81],
  zoom: 11,
}

export const vessels = [
  {
    id: 'v-ocean-star',
    name: 'MT Ocean Star',
    mmsi: '123456789',
    type: 'Oil Tanker',
    flag: 'Marshall Islands',
    courseDeg: 142,
    speedKn: 11.4,
    lastAis: '14:18 UTC',
    attributionScore: 91,
    status: 'HIGH PROBABILITY',
    rank: 1,
    position: [14.341, 72.801],
    trajectory: [
      [14.412, 72.701],
      [14.398, 72.718],
      [14.382, 72.738],
      [14.368, 72.758],
      [14.352, 72.776],
      [14.341, 72.792],
      [14.338, 72.792],
      [14.341, 72.801],
      [14.328, 72.822],
      [14.312, 72.848],
    ],
    evidence: {
      trajectoryMatch: 94,
      temporalMatch: 89,
      driftConsistency: 87,
      spatialProximity: 95,
      aisAnomaly: 85,
    },
    notes:
      'Track intersects the estimated release window. AIS gap of 22 minutes near the source zone.',
  },
  {
    id: 'v-sea-pearl',
    name: 'MV Sea Pearl',
    mmsi: '234567890',
    type: 'Bulk Carrier',
    flag: 'Panama',
    courseDeg: 88,
    speedKn: 13.1,
    lastAis: '14:26 UTC',
    attributionScore: 68,
    status: 'MODERATE',
    rank: 2,
    position: [14.368, 72.862],
    trajectory: [
      [14.355, 72.710],
      [14.358, 72.742],
      [14.360, 72.778],
      [14.362, 72.812],
      [14.365, 72.838],
      [14.368, 72.862],
      [14.372, 72.890],
    ],
    evidence: {
      trajectoryMatch: 71,
      temporalMatch: 74,
      driftConsistency: 62,
      spatialProximity: 78,
      aisAnomaly: 41,
    },
    notes: 'Passed north of the slick after detection. Continuous AIS, weaker drift fit.',
  },
  {
    id: 'v-blue-horizon',
    name: 'MV Blue Horizon',
    mmsi: '345678901',
    type: 'Container Ship',
    flag: 'Singapore',
    courseDeg: 310,
    speedKn: 16.8,
    lastAis: '14:22 UTC',
    attributionScore: 43,
    status: 'LOW',
    rank: 3,
    position: [14.248, 72.742],
    trajectory: [
      [14.180, 72.860],
      [14.198, 72.832],
      [14.214, 72.802],
      [14.230, 72.772],
      [14.248, 72.742],
      [14.268, 72.710],
    ],
    evidence: {
      trajectoryMatch: 48,
      temporalMatch: 51,
      driftConsistency: 39,
      spatialProximity: 44,
      aisAnomaly: 22,
    },
    notes: 'Outbound lane south of the slick. Geometry does not support a release here.',
  },
  {
    id: 'v-neptune',
    name: 'FV Neptune',
    mmsi: '456789012',
    type: 'Fishing Vessel',
    flag: 'India',
    courseDeg: 18,
    speedKn: 6.2,
    lastAis: '14:11 UTC',
    attributionScore: 19,
    status: 'UNLIKELY',
    rank: 4,
    position: [14.402, 72.738],
    trajectory: [
      [14.378, 72.718],
      [14.386, 72.722],
      [14.394, 72.730],
      [14.402, 72.738],
      [14.410, 72.746],
    ],
    evidence: {
      trajectoryMatch: 22,
      temporalMatch: 31,
      driftConsistency: 18,
      spatialProximity: 36,
      aisAnomaly: 12,
    },
    notes: 'Coastal fishing pattern. Cargo type and track geometry are inconsistent with this spill.',
  },
]

export const evidenceLabels = [
  { key: 'trajectoryMatch', label: 'Trajectory match' },
  { key: 'temporalMatch', label: 'Temporal match' },
  { key: 'driftConsistency', label: 'Drift consistency' },
  { key: 'spatialProximity', label: 'Spatial proximity' },
  { key: 'aisAnomaly', label: 'AIS anomaly' },
]

export function getPrimaryVessel() {
  return vessels.reduce((best, vessel) =>
    vessel.attributionScore > best.attributionScore ? vessel : best
  )
}

export function getVesselById(id) {
  return vessels.find((vessel) => vessel.id === id) ?? getPrimaryVessel()
}
