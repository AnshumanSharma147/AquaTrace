import { useState } from 'react'
import ActionBar from './components/ActionBar'
import EvidenceModal from './components/EvidenceModal'
import Header from './components/Header'
import InvestigationMap from './components/InvestigationMap'
import InvestigationPanel from './components/InvestigationPanel'
import ReportModal from './components/ReportModal'
import { getPrimaryVessel, getVesselById, incident, system, vessels as mockVessels } from './data/investigation'
import { detectSpill, calculateDrift, findSuspects } from './api'
import './App.css'

export default function App() {
  const [selectedId, setSelectedId] = useState(getPrimaryVessel().id)
  const [modal, setModal] = useState(null)
  
  // New State for ML workflow
  const [detectedPolygon, setDetectedPolygon] = useState(null)
  const [actualPolygon, setActualPolygon] = useState(null)
  const [trajectoryLine, setTrajectoryLine] = useState(null)
  const [originPoint, setOriginPoint] = useState(null)
  const [suspects, setSuspects] = useState([])
  
  // Loading states
  const [isDetecting, setIsDetecting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isFindingSuspects, setIsFindingSuspects] = useState(false)

  const selectedVessel = suspects.find(v => v.id === selectedId) || suspects[0]
  const dynamicTime = detectedPolygon?.properties?.capture_time || incident.detectionTime
  
  let dynamicLocation = incident.location.label;
  if (detectedPolygon) {
      try {
          const polygons = detectedPolygon.geometry.coordinates;
          let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
          polygons.forEach(polygon => {
              polygon.forEach(ring => {
                  ring.forEach(([lon, lat]) => {
                      if (lat < minLat) minLat = lat;
                      if (lat > maxLat) maxLat = lat;
                      if (lon < minLon) minLon = lon;
                      if (lon > maxLon) maxLon = lon;
                  })
              })
          })
          dynamicLocation = `Lat: ${minLat.toFixed(4)} to ${maxLat.toFixed(4)} | Lon: ${minLon.toFixed(4)} to ${maxLon.toFixed(4)}`;
      } catch (e) {
          console.error(e)
      }
  }

  const handleScanImage = async (imageFile, maskFile) => {
    setIsDetecting(true)
    try {
      const res = await detectSpill(imageFile, maskFile)
      setDetectedPolygon(res.predicted_geojson)
      setActualPolygon(res.actual_geojson)
    } catch (err) {
      console.error(err)
      alert("Failed to scan image.")
    } finally {
      setIsDetecting(false)
    }
  }

  const handleCalculateDrift = async () => {
    if (!detectedPolygon) return alert("Please scan an image first.")
    setIsCalculating(true)
    try {
      // Dummy wind/current data
      const res = await calculateDrift(detectedPolygon, 15.0, 45.0, 1.2, 90.0)
      setTrajectoryLine(res.trajectory)
      setOriginPoint(res.origin_point)
    } catch (err) {
      console.error(err)
      alert("Failed to calculate drift.")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleFindSuspects = async () => {
    if (!originPoint) return alert("Please calculate drift first.")
    
    // Estimate release time (12 hours before capture)
    let releaseTime = null;
    if (dynamicTime && dynamicTime !== 'Unknown') {
      try {
        const captureDate = new Date(dynamicTime.replace(" UTC", "") + "Z");
        captureDate.setHours(captureDate.getHours() - 12);
        releaseTime = captureDate.toISOString();
      } catch (e) {
        console.error("Could not parse time", e);
      }
    }
    
    setIsFindingSuspects(true)
    try {
      const res = await findSuspects(originPoint.lat, originPoint.lon, releaseTime)
      
      if (res.source === "GFW_API") {
          // If live API worked, use its native data format
          setSuspects(res.suspects)
          setSelectedId(res.suspects[0]?.id)
          return
      }
      
      // Map the returned fallback suspects to the format expected by the frontend
      const mappedSuspects = res.suspects.map((s, idx) => ({
        id: s.mmsi,
        name: s.vessel_name,
        mmsi: s.mmsi,
        type: 'Unknown',
        flag: 'Unknown',
        courseDeg: s.heading,
        speedKn: s.speed_knots,
        lastAis: s.timestamp,
        attributionScore: Math.round(s.match_score),
        status: idx === 0 ? 'HIGH PROBABILITY' : 'MODERATE',
        rank: idx + 1,
        position: [s.latitude, s.longitude],
        trajectory: [[s.latitude, s.longitude]], // Simplified for now
        evidence: { trajectoryMatch: Math.round(s.match_score) },
        notes: `Fallback CSV - Haversine Distance: ${s.distance_km.toFixed(2)} km`
      }))
      setSuspects(mappedSuspects)
      setSelectedId(mappedSuspects[0].id)
    } catch (err) {
      console.error(err)
      alert("Failed to find suspects.")
    } finally {
      setIsFindingSuspects(false)
    }
  }

  return (
    <div className="ot-shell">
      <Header system={system} />
      <div className="ot-body">
        <InvestigationMap
          vessels={suspects}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedId}
          detectedPolygon={detectedPolygon}
          actualPolygon={actualPolygon}
          trajectoryLine={trajectoryLine}
          originPoint={originPoint}
        />
        <div className="ot-sidebar">
          <InvestigationPanel
            incident={incident}
            dynamicTime={dynamicTime}
            dynamicLocation={dynamicLocation}
            vessels={suspects}
            selectedVessel={selectedVessel}
            onSelectVessel={setSelectedId}
            onScanImage={handleScanImage}
            onCalculateDrift={handleCalculateDrift}
            onFindSuspects={handleFindSuspects}
            isDetecting={isDetecting}
            isCalculating={isCalculating}
            isFindingSuspects={isFindingSuspects}
          />
          <ActionBar
            onViewEvidence={() => setModal('evidence')}
            onGenerateReport={() => setModal('report')}
          />
        </div>
      </div>

      {modal === 'evidence' && (
        <EvidenceModal
          incident={incident}
          vessel={selectedVessel}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'report' && (
        <ReportModal incident={incident} vessel={selectedVessel} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
