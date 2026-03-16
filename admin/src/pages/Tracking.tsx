import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import RoomIcon from '@mui/icons-material/Room'
import RouteIcon from '@mui/icons-material/Route'
import RadarIcon from '@mui/icons-material/Radar'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import SpeedIcon from '@mui/icons-material/Speed'
import { GoogleMap, InfoWindow, MarkerF, PolygonF, PolylineF, RectangleF, CircleF, useJsApiLoader } from '@react-google-maps/api'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import wellknown from 'wellknown'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import * as SupplierService from '@/services/SupplierService'
import * as CarService from '@/services/CarService'
import * as TraccarService from '@/services/TraccarService'

import 'leaflet/dist/leaflet.css'
import '@/assets/css/tracking.css'

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)
const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018]


type LatLngTuple = [number, number]

type GoogleLatLng = google.maps.LatLngLiteral

type ParsedGeofence = {
  id: number | string
  name: string
  shape: 'circle' | 'polygon' | 'rectangle' | 'geojson'
  center?: LatLngTuple
  radius?: number
  points?: LatLngTuple[]
  bounds?: [LatLngTuple, LatLngTuple]
  geojson?: any
}

const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const toLeafletLatLng = (first: number, second: number): LatLngTuple => {
  // Leaflet expects [lat, lng].
  // For WKT/GeoJSON, coordinates are commonly [lng, lat].
  // If only one ordering is geographically valid, normalize to it.
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return [second, first]
  }

  return [first, second]
}

const toLatLng = (position?: bookcarsTypes.TraccarPosition | null): LatLngTuple | null => {
  if (!position || !isFiniteCoordinate(position.latitude) || !isFiniteCoordinate(position.longitude)) {
    return null
  }

  return [position.latitude, position.longitude]
}

const parseGeofenceArea = (geofence: bookcarsTypes.TraccarGeofence, fallbackIndex: number): ParsedGeofence | null => {
  if (geofence.geojson) {
    const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
    const id = geofence.id ?? `GEOJSON-${fallbackIndex}`

    return {
      id,
      name,
      shape: 'geojson',
      geojson: {
        type: 'Feature',
        properties: { name },
        geometry: geofence.geojson,
      },
    }
  }

  if (!geofence.area) {
    return null
  }

  const [rawType, rawCoords] = geofence.area.split('(', 2)
  if (!rawType || !rawCoords) {
    return null
  }

  const shapeType = rawType.trim().toUpperCase()
  const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
  const id = geofence.id ?? `${shapeType}-${fallbackIndex}`

  const parseCircle = (): ParsedGeofence | null => {
    // Supported formats:
    // - CIRCLE (lat lon, radius)
    // - CIRCLE (lat, lon, radius)
    const full = geofence.area || ''
    const match = full.match(/CIRCLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i)
    if (!match) {
      return null
    }

    const lat = Number.parseFloat(match[1])
    const lng = Number.parseFloat(match[2])
    const radius = Number.parseFloat(match[3])

    if (![lat, lng, radius].every((value) => Number.isFinite(value))) {
      return null
    }

    return { id, name, shape: 'circle', center: [lat, lng], radius }
  }

  const parseRectangle = (): ParsedGeofence | null => {
    // Formats seen in the wild include:
    // - RECTANGLE (lat1 lon1, lat2 lon2)
    // - RECTANGLE (lat1,lng1,lat2,lng2)
    const full = geofence.area || ''
    const match = full.match(/RECTANGLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*\)\s*$/i)
    if (match) {
      const lat1 = Number.parseFloat(match[1])
      const lng1 = Number.parseFloat(match[2])
      const lat2 = Number.parseFloat(match[3])
      const lng2 = Number.parseFloat(match[4])
      if ([lat1, lng1, lat2, lng2].every((value) => Number.isFinite(value))) {
        return { id, name, shape: 'rectangle', bounds: [[lat1, lng1], [lat2, lng2]] }
      }
    }

    // Fallback: pull 4 numbers (comma-style) from the inner part
    const inner = rawCoords.replace(/\)\s*$/, '')
    const nums = inner.split(',').map((item) => Number.parseFloat(item.trim())).filter((value) => Number.isFinite(value))
    if (nums.length >= 4) {
      const [lat1, lng1, lat2, lng2] = nums
      return { id, name, shape: 'rectangle', bounds: [[lat1, lng1], [lat2, lng2]] }
    }

    return null
  }

  const parsePolygon = (): ParsedGeofence | null => {
    const full = geofence.area || ''

    try {
      const geometry = wellknown.parse(full)
      if (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') {
        return {
          id,
          name,
          shape: 'geojson',
          geojson: {
            type: 'Feature',
            properties: { name },
            geometry,
          },
        }
      }
    } catch {
      // Fall back to permissive manual parsing below.
    }

    const wktMatch = full.match(/POLYGON\s*\(\(\s*([\s\S]+?)\s*\)\)\s*$/i)
    const content = wktMatch ? wktMatch[1] : rawCoords.replace(/\)\s*$/, '')

    const coordPairs: LatLngTuple[] = []
    const pairRegex = /([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)/g
    let match: RegExpExecArray | null

    while ((match = pairRegex.exec(content)) !== null) {
      const first = Number.parseFloat(match[1])
      const second = Number.parseFloat(match[2])
      if (Number.isFinite(first) && Number.isFinite(second)) {
        coordPairs.push(toLeafletLatLng(first, second))
      }
    }

    if (coordPairs.length < 3) {
      const numericValues = (full.match(/[+-]?\d+(?:\.\d+)?/g) || [])
        .map((value) => Number.parseFloat(value))
        .filter((value) => Number.isFinite(value))

      for (let i = 0; i + 1 < numericValues.length; i += 2) {
        coordPairs.push(toLeafletLatLng(numericValues[i], numericValues[i + 1]))
      }
    }

    if (coordPairs.length >= 3) {
      return { id, name, shape: 'polygon', points: coordPairs }
    }

    // Last-resort fallback: treat any POLYGON string as a supported polygon shape
    // if it contains at least 3 coordinate pairs after stripping punctuation.
    const loosePairs = content
      .replace(/[()]/g, ' ')
      .split(',')
      .map((segment) => segment.trim().split(/\s+/).map((value) => Number.parseFloat(value)).filter((value) => Number.isFinite(value)))
      .filter((pair) => pair.length >= 2)
      .map((pair) => toLeafletLatLng(pair[0], pair[1]))

    return loosePairs.length >= 3 ? { id, name, shape: 'polygon', points: loosePairs } : null
  }

  const parseGeoJson = (): ParsedGeofence | null => {
    try {
      const geometry = wellknown.parse(geofence.area || '')
      if (!geometry || typeof geometry !== 'object') {
        return null
      }

      // wellknown returns GeoJSON geometry. react-leaflet GeoJSON expects a GeoJSON object.
      return {
        id,
        name,
        shape: 'geojson',
        geojson: {
          type: 'Feature',
          properties: { name },
          geometry,
        },
      }
    } catch {
      return null
    }
  }

  if (shapeType === 'CIRCLE') {
    return parseCircle() || parseGeoJson()
  }

  if (shapeType === 'RECTANGLE') {
    return parseRectangle() || parseGeoJson()
  }

  if (shapeType === 'POLYGON') {
    return parsePolygon() || parseGeoJson()
  }

  return parseGeoJson()
}

const formatTimestamp = (value?: Date | string) => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

const formatCoordinate = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '—')
const formatNumber = (value?: number, suffix = '') => (typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100) / 100}${suffix}` : '—')

const toGoogleLatLng = (point: LatLngTuple): GoogleLatLng => ({ lat: point[0], lng: point[1] })

const extractGeoJsonPaths = (geojson: any): LatLngTuple[][] => {
  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson
  if (!geometry) {
    return []
  }

  if (geometry.type === 'Polygon') {
    return (geometry.coordinates || []).map((ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng]))
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || []).flatMap((polygon: [number, number][][]) => (
      polygon.map((ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng]))
    ))
  }

  return []
}

const GoogleTrackingMap = ({
  currentPoint,
  currentPosition,
  selectedCarName,
  routePoints,
  routeStartPoint,
  routeEndPoint,
  geofenceShapes,
}: {
  currentPoint: LatLngTuple | null
  currentPosition?: bookcarsTypes.TraccarPosition | null
  selectedCarName: string
  routePoints: LatLngTuple[]
  routeStartPoint: LatLngTuple | null
  routeEndPoint: LatLngTuple | null
  geofenceShapes: ParsedGeofence[]
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'bookcars-google-maps',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
  })

  const onLoad = React.useCallback((map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds()
    let hasBounds = false

    const extend = (point: LatLngTuple) => {
      bounds.extend(toGoogleLatLng(point))
      hasBounds = true
    }

    if (currentPoint) {
      extend(currentPoint)
    }

    routePoints.forEach(extend)

    geofenceShapes.forEach((shape) => {
      if (shape.center) {
        extend(shape.center)
      }
      shape.points?.forEach(extend)
      if (shape.bounds) {
        extend(shape.bounds[0])
        extend(shape.bounds[1])
      }
      if (shape.geojson) {
        extractGeoJsonPaths(shape.geojson).forEach((ring) => ring.forEach(extend))
      }
    })

    if (hasBounds) {
      map.fitBounds(bounds, 40)
    } else {
      map.setCenter(toGoogleLatLng(DEFAULT_CENTER))
      map.setZoom(7)
    }
  }, [currentPoint, routePoints, geofenceShapes])

  if (!env.GOOGLE_MAPS_API_KEY) {
    return <div className="tracking-map-empty"><Typography variant="body2">Google Maps API key is missing.</Typography></div>
  }

  if (!isLoaded) {
    return <div className="tracking-map-empty"><Typography variant="body2">Loading Google Maps...</Typography></div>
  }

  return (
    <GoogleMap
      mapContainerClassName="tracking-map"
      center={toGoogleLatLng(DEFAULT_CENTER)}
      zoom={7}
      onLoad={onLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
    >
      {geofenceShapes.map((geofence) => {
        if (geofence.shape === 'circle' && geofence.center && geofence.radius) {
          return <CircleF key={`${geofence.id}`} center={toGoogleLatLng(geofence.center)} radius={geofence.radius} options={{ strokeColor: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, strokeWeight: 2 }} />
        }

        if (geofence.shape === 'rectangle' && geofence.bounds) {
          const north = Math.max(geofence.bounds[0][0], geofence.bounds[1][0])
          const south = Math.min(geofence.bounds[0][0], geofence.bounds[1][0])
          const east = Math.max(geofence.bounds[0][1], geofence.bounds[1][1])
          const west = Math.min(geofence.bounds[0][1], geofence.bounds[1][1])
          return <RectangleF key={`${geofence.id}`} bounds={{ north, south, east, west }} options={{ strokeColor: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, strokeWeight: 2 }} />
        }

        if (geofence.shape === 'polygon' && geofence.points) {
          return <PolygonF key={`${geofence.id}`} paths={geofence.points.map(toGoogleLatLng)} options={{ strokeColor: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, strokeWeight: 2 }} />
        }

        if (geofence.shape === 'geojson' && geofence.geojson) {
          return extractGeoJsonPaths(geofence.geojson).map((ring, index) => (
            <PolygonF key={`${geofence.id}-${index}`} paths={ring.map(toGoogleLatLng)} options={{ strokeColor: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, strokeWeight: 2 }} />
          ))
        }

        return null
      })}

      {routePoints.length > 1 && <PolylineF path={routePoints.map(toGoogleLatLng)} options={{ strokeColor: '#1976d2', strokeWeight: 4, strokeOpacity: 0.9 }} />}
      {routeStartPoint && routePoints.length > 1 && <MarkerF position={toGoogleLatLng(routeStartPoint)} title={strings.ROUTE_START} />}
      {routeEndPoint && routePoints.length > 1 && <MarkerF position={toGoogleLatLng(routeEndPoint)} title={strings.ROUTE_END} />}
      {currentPoint && <MarkerF position={toGoogleLatLng(currentPoint)} title={selectedCarName} />}
      {currentPoint && (
        <InfoWindow position={toGoogleLatLng(currentPoint)}>
          <div>
            <strong>{selectedCarName}</strong>
            <br />
            {`${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}`}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}

const Tracking = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedCar, setSelectedCar] = useState<bookcarsTypes.Car | null>(null)
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [notes, setNotes] = useState('')
  const [positions, setPositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [alerts, setAlerts] = useState<bookcarsTypes.TraccarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(true)

  const now = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(formatDateInput(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState(formatDateInput(now))

  const geofenceLookup = useMemo(() => {
    const lookup = new Map<number, string>()
    geofences.forEach((geofence) => {
      if (typeof geofence.id === 'number' && geofence.name) {
        lookup.set(geofence.id, geofence.name)
      }
    })
    return lookup
  }, [geofences])

  const currentPosition = positions.length > 0 ? positions[0] : null
  const currentPoint = useMemo(() => toLatLng(currentPosition), [currentPosition])
  const routePoints = useMemo(() => route.map((position) => toLatLng(position)).filter((point): point is LatLngTuple => point !== null), [route])
  const geofenceShapes = useMemo(() => geofences.map(parseGeofenceArea).filter((shape): shape is ParsedGeofence => shape !== null), [geofences])
  const routeStart = route.length > 0 ? route[0] : null
  const routeEnd = route.length > 1 ? route[route.length - 1] : route[0] || null
  const routeStartPoint = useMemo(() => toLatLng(routeStart), [routeStart])
  const routeEndPoint = useMemo(() => toLatLng(routeEnd), [routeEnd])
  const latestAlert = alerts[0]

  const resetTrackingData = () => {
    setPositions([])
    setRoute([])
    setGeofences([])
    setAlerts([])
  }

  const handleCarChange = (carId: string) => {
    setSelectedCarId(carId)
    const car = cars.find((item) => item._id === carId) || null
    setSelectedCar(car)
    setTrackingEnabled(car?.tracking?.enabled ?? false)
    setDeviceId(car?.tracking?.deviceId ? car.tracking.deviceId.toString() : '')
    setDeviceName(car?.tracking?.deviceName || '')
    setNotes(car?.tracking?.notes || '')
    resetTrackingData()
  }

  const handleLoadCars = async () => {
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [],
      carType: bookcarsHelper.getAllCarTypes(),
      gearbox: [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: bookcarsHelper.getAllFuelPolicies(),
      deposit: -1,
      availability: [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable],
      ranges: bookcarsHelper.getAllRanges(),
      multimedia: [],
      rating: -1,
      seats: -1,
    }

    const suppliers = await SupplierService.getAllSuppliers()
    payload.suppliers = bookcarsHelper.flattenSuppliers(suppliers)

    const data = await CarService.getCars('', payload, 1, env.CARS_PAGE_SIZE)
    const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
    const result = _data?.resultData || []
    setCars(result)

    if (result.length > 0 && !selectedCarId) {
      handleCarChange(result[0]._id)
    }
  }

  const handleLink = async () => {
    if (!selectedCar) {
      return
    }

    if (!deviceId) {
      helper.error(null, commonStrings.FIELD_NOT_VALID)
      return
    }

    setLoading(true)
    try {
      const tracking = await TraccarService.linkDevice(selectedCar._id, {
        deviceId: Number.parseInt(deviceId, 10),
        deviceName,
        notes,
        enabled: trackingEnabled,
      })
      const updated = { ...selectedCar, tracking }
      setSelectedCar(updated)
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const tracking = await TraccarService.unlinkDevice(selectedCar._id)
      const updated = { ...selectedCar, tracking }
      setSelectedCar(updated)
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      setDeviceId('')
      setDeviceName('')
      setNotes('')
      setTrackingEnabled(false)
      resetTrackingData()
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchPositions = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getPositions(selectedCar._id)
      setPositions(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchRoute = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString())
      setRoute(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchGeofences = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getGeofences(selectedCar._id)
      setGeofences(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchAlerts = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const data = await TraccarService.getGeofenceAlerts(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString())
      setAlerts(data)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (!_user || !_user.verified) {
      return
    }

    setUser(_user)
    setLoading(true)

    try {
      const status = await TraccarService.getStatus()
      setIntegrationEnabled(status.enabled)
      await handleLoadCars()
    } catch (err) {
      helper.error(err)
      setIntegrationEnabled(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="tracking-page">
          <div className="tracking-page-header">
            <div>
              <Typography variant="h4" className="tracking-title">{strings.TITLE}</Typography>
              <Typography className="tracking-subtitle">{strings.TRACKING_SUBTITLE}</Typography>
            </div>
            {selectedCar && <Chip color={trackingEnabled ? 'success' : 'default'} label={trackingEnabled ? strings.TRACKING_ENABLED : strings.TRACKING_DISABLED} />}
          </div>

          {!integrationEnabled && (
            <Paper className="tracking-card">
              <Typography color="error">{strings.INTEGRATION_DISABLED}</Typography>
            </Paper>
          )}

          <Paper className="tracking-card tracking-controls-card">
            <FormControl fullWidth>
              <InputLabel>{strings.SELECT_CAR}</InputLabel>
              <Select
                value={selectedCarId}
                label={strings.SELECT_CAR}
                onChange={(event) => handleCarChange(event.target.value as string)}
              >
                {cars.map((car) => (
                  <MenuItem key={car._id} value={car._id}>{car.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {selectedCar && (
            <div className="tracking-layout">
              <div className="tracking-main-column">
                <Paper className="tracking-card tracking-map-card">
                  <div className="tracking-header">
                    <div>
                      <Typography variant="h6">{strings.MAP_OVERVIEW}</Typography>
                      <Typography className="tracking-card-subtitle">{strings.MAP_HINT}</Typography>
                    </div>
                    <div className="tracking-map-legend">
                      <span><i className="tracking-legend-dot tracking-legend-dot--current" /> {strings.CURRENT_POSITION}</span>
                      <span><i className="tracking-legend-line" /> {strings.ROUTE_HISTORY}</span>
                      <span><i className="tracking-legend-zone" /> {strings.GEOFENCES}</span>
                    </div>
                  </div>

                  <div className="tracking-map-shell">
                    {(!currentPoint && routePoints.length === 0 && geofenceShapes.length === 0)
                      ? (
                        <div className="tracking-map-empty">
                          <Typography variant="body1">{strings.NO_MAP_DATA}</Typography>
                          <Typography variant="body2">{strings.MAP_EMPTY_HELP}</Typography>
                        </div>
                        )
                      : (
                        <GoogleTrackingMap
                          currentPoint={currentPoint}
                          currentPosition={currentPosition}
                          selectedCarName={selectedCar.name}
                          routePoints={routePoints}
                          routeStartPoint={routeStartPoint}
                          routeEndPoint={routeEndPoint}
                          geofenceShapes={geofenceShapes}
                        />
                        )}
                  </div>
                </Paper>

                <div className="tracking-summary-grid">
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--position"><RoomIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.CURRENT_POSITION}</Typography>
                      <Typography variant="h6">{currentPoint ? `${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}` : '—'}</Typography>
                      <Typography className="tracking-stat-note">{currentPosition?.address || strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--route"><RouteIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.ROUTE_POINTS}</Typography>
                      <Typography variant="h6">{routePoints.length}</Typography>
                      <Typography className="tracking-stat-note">{routeStart ? formatTimestamp(routeStart.deviceTime || routeStart.serverTime || routeStart.fixTime) : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--geofence"><RadarIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.GEOFENCES}</Typography>
                      <Typography variant="h6">{geofences.length}</Typography>
                      <Typography className="tracking-stat-note">{geofenceShapes.length > 0 ? `${geofenceShapes.length} ${strings.MAP_READY}` : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                  <Paper className="tracking-card tracking-stat-card">
                    <Box className="tracking-stat-icon tracking-stat-icon--alerts"><WarningAmberIcon /></Box>
                    <div>
                      <Typography className="tracking-stat-label">{strings.GEOFENCE_ALERTS}</Typography>
                      <Typography variant="h6">{alerts.length}</Typography>
                      <Typography className="tracking-stat-note">{latestAlert ? formatTimestamp(latestAlert.eventTime) : strings.NO_DATA}</Typography>
                    </div>
                  </Paper>
                </div>
              </div>

              <div className="tracking-side-column">
                <Paper className="tracking-card">
                  <Typography variant="h6" className="tracking-section-title">{strings.LINK_DEVICE}</Typography>
                  <div className="tracking-grid">
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={trackingEnabled}
                          onChange={(event) => setTrackingEnabled(event.target.checked)}
                        />
                      )}
                      label={strings.TRACKING_ENABLED}
                    />
                    <TextField
                      label={strings.DEVICE_ID}
                      value={deviceId}
                      onChange={(event) => setDeviceId(event.target.value)}
                    />
                    <TextField
                      label={strings.DEVICE_NAME}
                      value={deviceName}
                      onChange={(event) => setDeviceName(event.target.value)}
                    />
                    <TextField
                      label={strings.NOTES}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <div className="tracking-actions">
                    <Button variant="contained" className="btn-primary" onClick={handleLink} disabled={!integrationEnabled}>{strings.LINK_DEVICE}</Button>
                    <Button variant="contained" className="btn-secondary" onClick={handleUnlink}>{strings.UNLINK_DEVICE}</Button>
                  </div>
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.CURRENT_POSITION}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchPositions} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  {currentPosition ? (
                    <div className="tracking-data tracking-detail-list">
                      <div><RoomIcon fontSize="small" /> {`${formatCoordinate(currentPosition.latitude)}, ${formatCoordinate(currentPosition.longitude)}`}</div>
                      <div><SpeedIcon fontSize="small" /> {`${strings.SPEED}: ${formatNumber(currentPosition.speed, ' kn')}`}</div>
                      <div><AccessTimeIcon fontSize="small" /> {`${strings.TIME}: ${formatTimestamp(currentPosition.deviceTime || currentPosition.serverTime || currentPosition.fixTime)}`}</div>
                      {currentPosition.address && <div>{`${strings.ADDRESS}: ${currentPosition.address}`}</div>}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.ROUTE_HISTORY}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchRoute} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  <div className="tracking-grid">
                    <TextField
                      label={strings.FROM}
                      type="datetime-local"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                    />
                    <TextField
                      label={strings.TO}
                      type="datetime-local"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>
                  {route.length > 0 ? (
                    <div className="tracking-list">
                      {route.slice(0, 10).map((position, index) => (
                        <div key={position.id || `${position.latitude}-${position.longitude}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(position.deviceTime || position.serverTime || position.fixTime)}</div>
                          <div>{`${formatCoordinate(position.latitude)}, ${formatCoordinate(position.longitude)}`}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.GEOFENCES}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchGeofences} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  {geofences.length > 0 ? (
                    <div className="tracking-list">
                      {geofences.map((geofence, index) => {
                        const parsed = parseGeofenceArea(geofence, index)
                        return (
                          <div key={geofence.id || `${geofence.name}-${index}`} className="tracking-list-item">
                            <div>{geofence.name || geofence.description || `Geofence ${index + 1}`}</div>
                            <div className="tracking-list-subtext">{parsed ? `${strings.SHAPE}: ${parsed.shape}` : strings.UNSUPPORTED_GEOFENCE}</div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                <Paper className="tracking-card">
                  <div className="tracking-header">
                    <Typography variant="h6">{strings.GEOFENCE_ALERTS}</Typography>
                    <Button variant="contained" className="btn-primary" onClick={handleFetchAlerts} disabled={!integrationEnabled}>{strings.FETCH}</Button>
                  </div>
                  <div className="tracking-grid">
                    <TextField
                      label={strings.FROM}
                      type="datetime-local"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                    />
                    <TextField
                      label={strings.TO}
                      type="datetime-local"
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </div>
                  {alerts.length > 0 ? (
                    <div className="tracking-list">
                      {alerts.map((alert, index) => (
                        <div key={alert.id || `${alert.geofenceId}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(alert.eventTime || '')}</div>
                          <div className="tracking-list-subtext">{geofenceLookup.get(alert.geofenceId || -1) || alert.geofenceId || alert.type}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                  )}
                </Paper>

                {geofences.length > 0 && geofenceShapes.length !== geofences.length && (
                  <Alert severity="info" className="tracking-info-alert">
                    {strings.GEOFENCE_PARSE_NOTICE}
                  </Alert>
                )}

                <Divider />
              </div>
            </div>
          )}
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Tracking
