import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'
import process from 'node:process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({
  path: path.join(__dirname, '.env'),
})

const app = express()
const port = Number(process.env.PORT) || 3001
const gfwUrl = 'https://gateway.api.globalfishingwatch.org/v3/4wings/report'

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function getDateRange(request) {
  const now = Date.now()
  const requestedTime = request.query.time ? new Date(request.query.time) : null

  if (request.query.start || request.query.end) {
    const start = new Date(request.query.start)
    const end = new Date(request.query.end)
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start >= end) {
      return null
    }
    return [start, end]
  }

  if (requestedTime && !Number.isNaN(requestedTime.valueOf())) {
    const windowMinutes = numberOrNull(request.query.windowMinutes) || 60
    const windowMilliseconds = windowMinutes * 60 * 1000
    return [
      new Date(requestedTime.valueOf() - windowMilliseconds),
      new Date(requestedTime.valueOf() + windowMilliseconds),
    ]
  }

  if (request.query.time) {
    return null
  }

  return [new Date(now - 24 * 60 * 60 * 1000), new Date(now)]
}

function makeSearchArea(latitude, longitude, radiusKm) {
  const latitudeOffset = radiusKm / 111
  const longitudeOffset = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180))

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [longitude - longitudeOffset, latitude - latitudeOffset],
          [longitude + longitudeOffset, latitude - latitudeOffset],
          [longitude + longitudeOffset, latitude + latitudeOffset],
          [longitude - longitudeOffset, latitude + latitudeOffset],
          [longitude - longitudeOffset, latitude - latitudeOffset],
        ]],
      },
    }],
  }
}

function collectReportEntries(value, entries = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReportEntries(item, entries))
  } else if (value && typeof value === 'object') {
    if (value.vesselId || value.vessel_id || value.mmsi || value.shipName) {
      entries.push(value)
    } else {
      Object.values(value).forEach((item) => collectReportEntries(item, entries))
    }
  }
  return entries
}

function normalizeVessel(entry) {
  return {
    id: entry.vesselId ?? entry.vessel_id ?? entry.id ?? null,
    name: entry.shipName ?? entry.shipname ?? entry.name ?? null,
    mmsi: entry.mmsi ?? entry.ssvid ?? null,
    imo: entry.imo ?? null,
    type: entry.vesselType ?? entry.vessel_type ?? entry.shiptype ?? null,
    flag: entry.flag ?? null,
    lat: numberOrNull(entry.lat ?? entry.latitude),
    lng: numberOrNull(entry.lon ?? entry.lng ?? entry.longitude),
    timestamp: entry.entryTimestamp ?? entry.timestamp ?? entry.date ?? null,
    speedKn: numberOrNull(entry.speedKn ?? entry.speed ?? entry.sog),
    courseDeg: numberOrNull(entry.courseDeg ?? entry.course ?? entry.cog),
  }
}

app.get('/api/vessels', async (request, response) => {
  const latitude = numberOrNull(request.query.lat)
  const longitude = numberOrNull(request.query.lng)
  const radiusKm = numberOrNull(request.query.radiusKm) || 10
  const dateRange = getDateRange(request)

  if (
    latitude === null || longitude === null ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
    radiusKm <= 0 || radiusKm > 100 || !dateRange
  ) {
    return response.status(400).json({
      error: 'Provide valid lat, lng, radiusKm (0-100), and start/end or time.',
    })
  }

  if (!process.env.GFW_API_TOKEN) {
    return response.status(500).json({ error: 'GFW API token is not configured.' })
  }

  const query = new URLSearchParams({
    format: 'JSON',
    'group-by': 'VESSEL_ID',
    'temporal-resolution': 'HOURLY',
    'spatial-resolution': 'HIGH',
    'spatial-aggregation': 'false',
    'datasets[0]': 'public-global-presence:latest',
    'date-range': `${dateRange[0].toISOString()},${dateRange[1].toISOString()}`,
  })

  try {
    const gfwResponse = await fetch(`${gfwUrl}?${query}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GFW_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        geojson: makeSearchArea(latitude, longitude, radiusKm).features[0].geometry,
      }),
    })

    const gfwData = await gfwResponse.json()
    if (!gfwResponse.ok) {
      return response.status(502).json({
        error: 'Global Fishing Watch request failed.',
        upstreamStatus: gfwResponse.status,
      })
    }

    return response.json({
      vessels: collectReportEntries(gfwData).map(normalizeVessel),
    })
  } catch (error) {
    console.error('GFW request failed:', error.message)
    return response.status(502).json({ error: 'Unable to reach Global Fishing Watch.' })
  }
})

app.listen(port, () => {
  console.log(`OilTrace AIS backend listening on http://localhost:${port}`)
})