import { Fragment, useEffect } from 'react'
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
    map.panTo(vessel.position, { animate: true, duration: 0.35 })
  }, [vessel, map])

  return null
}

function scoreColor(score) {
  if (score >= 80) return '#4fd4e8'
  if (score >= 50) return '#e8b84f'
  return '#8aa0b8'
}

export default function InvestigationMap({ vessels, selectedVessel, onSelectVessel }) {
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

        <Polygon
          positions={spillPolygon}
          pathOptions={{
            color: '#c9a227',
            weight: 1.5,
            fillColor: '#b8860b',
            fillOpacity: 0.38,
          }}
        >
          <Popup>Detected oil slick · 4.7 km²</Popup>
        </Polygon>

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
          center={[estimatedReleasePoint.lat, estimatedReleasePoint.lng]}
          radius={5}
          pathOptions={{ color: '#4fd4e8', fillColor: '#4fd4e8', fillOpacity: 1, weight: 1 }}
        >
          <Popup>Estimated release point</Popup>
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
                  {vessel.type} · {vessel.attributionScore}%
                </Popup>
                {isPrimary && (
                  <Tooltip direction="right" offset={[10, 0]} permanent>
                    {vessel.name}
                  </Tooltip>
                )}
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>

      <div className="ot-map-legend">
        <div className="ot-legend-title">LAYER KEY</div>
        <div className="ot-legend-row">
          <span className="ot-swatch ot-swatch-oil" /> Oil slick
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
