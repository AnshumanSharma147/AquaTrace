import { Fragment, useEffect, useState } from 'react'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { estimatedReleasePoint, mapView, sourceZone, spillPolygon } from '../data/investigation'

function MapEffects({ vessel }) {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 80)
    return () => window.clearTimeout(timer)
  }, [map])

  useEffect(() => {
    if (!vessel) return
    // Use flyTo instead of panTo so it smoothly zooms out and back in
    // to correctly pinpoint vessels that might be halfway across the globe!
    map.flyTo(vessel.position, 11, { animate: true, duration: 1.5 })
  }, [vessel, map])

  return null
}

function AutoPanToPolygon({ spillCoords, actualCoords }) {
  const map = useMap()
  
  useEffect(() => {
    // If we have actual coordinates from a scan, zoom to them
    if (actualCoords && actualCoords.length > 0) {
      map.fitBounds(actualCoords, { padding: [50, 50], maxZoom: 13, animate: true })
    } 
    // Otherwise zoom to the predicted spill if it exists
    else if (spillCoords && spillCoords.length > 0) {
      map.fitBounds(spillCoords, { padding: [50, 50], maxZoom: 13, animate: true })
    }
  }, [spillCoords, actualCoords, map])

  return null
}

function CursorCoordinates() {
  const [position, setPosition] = useState(null)
  
  useMapEvents({
    mousemove(e) {
      setPosition(e.latlng)
    }
  })

  if (!position) return null

  return (
    <div style={{ 
      position: 'absolute', 
      bottom: '24px', 
      left: '24px', 
      zIndex: 1000, 
      background: 'rgba(0, 0, 0, 0.75)', 
      padding: '6px 10px', 
      borderRadius: '6px', 
      fontFamily: 'monospace', 
      fontSize: '13px', 
      color: '#4fd4e8',
      border: '1px solid rgba(79, 212, 232, 0.3)',
      pointerEvents: 'none'
    }}>
      LAT: {position.lat.toFixed(5)} &nbsp;|&nbsp; LON: {position.lng.toFixed(5)}
    </div>
  )
}

function scoreColor(score) {
  if (score >= 80) return '#4fd4e8'
  if (score >= 50) return '#e8b84f'
  return '#8aa0b8'
}

export default function InvestigationMap({ 
  vessels, 
  selectedVessel, 
  onSelectVessel,
  detectedPolygon,
  actualPolygon,
  trajectoryLine,
  originPoint
}) {
  // Convert GeoJSON to Leaflet [lat, lng] format if present
  // Deep mapping for MultiPolygon: Polygons -> Rings -> Points -> [lat, lon]
  const dynamicSpill = detectedPolygon 
    ? detectedPolygon.geometry.coordinates.map(polygon => 
        polygon.map(ring => 
          ring.map(coord => [coord[1], coord[0]])
        )
      )
    : null

  const dynamicActual = actualPolygon
    ? actualPolygon.geometry.coordinates.map(polygon => 
        polygon.map(ring => 
          ring.map(coord => [coord[1], coord[0]])
        )
      )
    : null

  const dynamicTrajectory = trajectoryLine
    ? trajectoryLine.geometry.coordinates.map(c => [c[1], c[0]])
    : null

  const releasePoint = originPoint
    ? [originPoint.lat, originPoint.lon]
    : [estimatedReleasePoint.lat, estimatedReleasePoint.lng]

  return (
    <div className="ot-map-wrap">
      <MapContainer
        center={mapView.center}
        zoom={mapView.zoom}
        className="ot-map"
        zoomControl={false}
        attributionControl={true}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEffects vessel={selectedVessel} />
        <AutoPanToPolygon spillCoords={dynamicSpill} actualCoords={dynamicActual} />
        <CursorCoordinates />

        {dynamicSpill && (
          <Polygon
            positions={dynamicSpill}
            pathOptions={{
              color: '#c9a227',
              weight: 1.5,
              fillColor: '#b8860b',
              fillOpacity: 0.38,
            }}
          >
            <Popup>ML Predicted Oil Spill</Popup>
          </Polygon>
        )}

        {dynamicActual && (
          <Polygon
            positions={dynamicActual}
            pathOptions={{
              color: '#10b981',
              weight: 1.5,
              fillColor: '#059669',
              fillOpacity: 0.38,
            }}
          >
            <Popup>Actual Ground Truth</Popup>
          </Polygon>
        )}
        
        {dynamicTrajectory && (
          <Polyline
            positions={dynamicTrajectory}
            pathOptions={{ color: '#ff6b6b', weight: 2, dashArray: '5 5' }}
          />
        )}

        <Circle
          center={sourceZone.center}
          radius={sourceZone.radiusMeters}
          pathOptions={{
            color: '#4fd4e8',
            weight: 1.5,
            dashArray: '6 6',
            fillColor: '#4fd4e8',
            fillOpacity: 0.08,
          }}
        />

        <CircleMarker
          center={releasePoint}
          radius={5}
          pathOptions={{ color: '#4fd4e8', fillColor: '#4fd4e8', fillOpacity: 1, weight: 1 }}
        >
          <Popup>Estimated release point (T-12)</Popup>
        </CircleMarker>

        {vessels.map((vessel) => {
          const isSelected = vessel.id === selectedVessel.id
          const isPrimary = vessel.rank === 1
          const color = isPrimary ? '#4fd4e8' : scoreColor(vessel.attributionScore)

          return (
            <Fragment key={vessel.id}>
              <Polyline
                positions={vessel.trajectory}
                pathOptions={{
                  color,
                  weight: isSelected || isPrimary ? 3 : 1.5,
                  opacity: isSelected || isPrimary ? 0.95 : 0.45,
                  dashArray: isPrimary ? undefined : '4 6',
                }}
              />
              <CircleMarker
                center={vessel.position}
                radius={isPrimary ? 8 : 6}
                eventHandlers={{ click: () => onSelectVessel(vessel.id) }}
                pathOptions={{
                  color: isPrimary ? '#e8b84f' : color,
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: isSelected ? 3 : 1.5,
                }}
              >
                <Popup>
                  <strong>{vessel.name}</strong>
                  <br />
                  <span style={{color: '#8aa0b8'}}>{vessel.type}</span> · <span style={{color: color, fontWeight: 'bold'}}>{vessel.attributionScore}% MATCH</span>
                  <br />
                  Speed: {vessel.speedKn !== null ? vessel.speedKn.toFixed(1) : '--'} kn
                  <br />
                  Course: {vessel.courseDeg !== null ? vessel.courseDeg.toFixed(1) : '--'}°
                </Popup>
                <Tooltip direction="right" offset={[10, 0]} permanent={isPrimary} opacity={0.9}>
                  <strong>{vessel.name}</strong>
                  <br />
                  <span style={{color: '#8aa0b8'}}>{vessel.type}</span> · <span style={{color: color, fontWeight: 'bold'}}>{vessel.attributionScore}% MATCH</span>
                </Tooltip>
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>

      <div className="ot-map-legend">
        <div className="ot-legend-title">LAYER KEY</div>
        <div className="ot-legend-row">
          <span className="ot-swatch" style={{background: '#b8860b', opacity: 0.8}} /> ML Prediction
        </div>
        <div className="ot-legend-row">
          <span className="ot-swatch" style={{background: '#059669', opacity: 0.8}} /> Ground Truth
        </div>
        <div className="ot-legend-row">
          <span className="ot-swatch ot-swatch-source" /> Probable source zone
        </div>
        <div className="ot-legend-row">
          <span className="ot-swatch ot-swatch-track" /> AIS trajectory
        </div>
        <div className="ot-legend-row">
          <span className="ot-swatch ot-swatch-primary" /> Highest-ranked vessel
        </div>
      </div>

      <div className="ot-map-hud">
        SAR overlay · simulated · Arabian Sea
      </div>
    </div>
  )
}
