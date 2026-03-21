import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled'
import LinkIcon from '@mui/icons-material/Link'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import RadarIcon from '@mui/icons-material/Radar'
import RouteIcon from '@mui/icons-material/Route'
import SearchIcon from '@mui/icons-material/Search'
import SensorsIcon from '@mui/icons-material/Sensors'
import SpeedIcon from '@mui/icons-material/Speed'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { CircleF, GoogleMap, InfoWindow, MarkerF, PolygonF, PolylineF, RectangleF, useJsApiLoader } from '@react-google-maps/api'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import wellknown from 'wellknown'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import * as TraccarService from '@/services/TraccarService'

import '@/assets/css/tracking.css'

const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018]
const CARS_FETCH_SIZE = 100

type FleetMode = 'fleet' | 'single'
type LatLngTuple = [number, number]
type GoogleLatLng = google.maps.LatLngLiteral

type ParsedGeofence = {
  id: number | string
  name: string
  shape: 'circle' | 'polygon' | 'rectangle' | 'geojson' | 'polyline'
  center?: LatLngTuple
  radius?: number
  points?: LatLngTuple[]
  bounds?: [LatLngTuple, LatLngTuple]
  geojson?: any
  lineWidth?: number
}

type FleetCarView = {
  car: bookcarsTypes.Car
  snapshot?: TraccarService.TraccarFleetItem
  position: bookcarsTypes.TraccarPosition | null
  currentPoint: LatLngTuple | null
  deviceName: string
  deviceStatus: string
  isLinked: boolean
  isOnline: boolean
  lastSeen: string
}

type GeofenceEditorType = 'circle' | 'polygon' | 'polyline'

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)
const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const formatCoordinate = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '-')
const formatNumber = (value?: number, suffix = '') => (typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100) / 100}${suffix}` : '-')
const toGoogleLatLng = (point: LatLngTuple): GoogleLatLng => ({ lat: point[0], lng: point[1] })

const formatTimestamp = (value?: Date | string | null) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

const normalizeLatLngOrder = (first: number, second: number): LatLngTuple => {
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

const extractResultPage = (data: unknown) => {
  const payload = Array.isArray(data) && data.length > 0
    ? data[0] as { resultData?: bookcarsTypes.Car[], pageInfo?: Array<{ totalRecords?: number }> }
    : undefined
  const rows = Array.isArray(payload?.resultData) ? payload.resultData : []
  const totalRecords = Array.isArray(payload?.pageInfo) && payload.pageInfo.length > 0
    ? (payload.pageInfo[0]?.totalRecords || 0)
    : rows.length

  return { rows, totalRecords }
}

const getPositionTimestamp = (position?: bookcarsTypes.TraccarPosition | null) => (
  position?.deviceTime || position?.fixTime || position?.serverTime
)

const getStatusTone = (status?: string): 'default' | 'success' | 'warning' => {
  const normalized = status?.trim().toLowerCase()
  if (normalized === 'online') {
    return 'success'
  }
  if (!normalized || normalized === 'offline') {
    return 'default'
  }
  return 'warning'
}

const toSearchText = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ').toLowerCase()

const formatPointList = (points: LatLngTuple[]) => points.map(([lat, lng]) => `${lat}, ${lng}`).join('\n')

const parsePointList = (value: string) => value
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [latText, lngText] = line.split(',').map((part) => part.trim())
    const lat = Number.parseFloat(latText)
    const lng = Number.parseFloat(lngText)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(commonStrings.FIELD_NOT_VALID)
    }
    return [lat, lng] as LatLngTuple
  })

const closePolygon = (points: LatLngTuple[]) => {
  if (points.length < 2) {
    return points
  }

  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return points
  }

  return [...points, first]
}

const parseGeofenceArea = (geofence: bookcarsTypes.TraccarGeofence, fallbackIndex: number): ParsedGeofence | null => {
  if (geofence.geojson) {
    const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
    const id = geofence.id ?? `GEOJSON-${fallbackIndex}`

    return { id, name, shape: 'geojson', geojson: { type: 'Feature', properties: { name }, geometry: geofence.geojson } }
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

  if (shapeType === 'CIRCLE') {
    const full = geofence.area || ''
    const match = full.match(/CIRCLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i)
    if (!match) {
      return null
    }

    const lat = Number.parseFloat(match[1])
    const lng = Number.parseFloat(match[2])
    const radius = Number.parseFloat(match[3])
    return [lat, lng, radius].every((value) => Number.isFinite(value))
      ? { id, name, shape: 'circle', center: [lat, lng], radius }
      : null
  }

  if (shapeType === 'RECTANGLE') {
    const values = (geofence.area.match(/[+-]?\d+(?:\.\d+)?/g) || [])
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    return values.length >= 4
      ? { id, name, shape: 'rectangle', bounds: [[values[0], values[1]], [values[2], values[3]]] }
      : null
  }

  try {
    const geometry = wellknown.parse(geofence.area || '')
    if (geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon') {
      return { id, name, shape: 'geojson', geojson: { type: 'Feature', properties: { name }, geometry } }
    }
    if (geometry?.type === 'LineString') {
      return {
        id,
        name,
        shape: 'polyline',
        points: (geometry.coordinates || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple),
        lineWidth: typeof geofence.attributes?.polylineDistance === 'number' ? geofence.attributes.polylineDistance : undefined,
      }
    }
  } catch {
    // Leave as unsupported.
  }

  const values = (geofence.area.match(/[+-]?\d+(?:\.\d+)?/g) || [])
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))

  if (values.length >= 6) {
    const points: LatLngTuple[] = []
    for (let index = 0; index + 1 < values.length; index += 2) {
      points.push(normalizeLatLngOrder(values[index], values[index + 1]))
    }
    if (shapeType === 'LINESTRING') {
      return points.length >= 2
        ? { id, name, shape: 'polyline', points, lineWidth: typeof geofence.attributes?.polylineDistance === 'number' ? geofence.attributes.polylineDistance : undefined }
        : null
    }

    return points.length >= 3 ? { id, name, shape: 'polygon', points } : null
  }

  return null
}

const extractGeoJsonPaths = (geojson: any): LatLngTuple[][] => {
  const geometry = geojson?.type === 'Feature' ? geojson.geometry : geojson
  if (!geometry) {
    return []
  }
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates || []).map((ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng]))
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates || []).flatMap((polygon: [number, number][][]) => polygon.map((ring: [number, number][]) => ring.map(([lng, lat]) => [lat, lng])))
  }
  return []
}

const GoogleTrackingMap = ({
  mapMode,
  fleetCars,
  selectedFleetCar,
  currentPoint,
  currentPosition,
  routePoints,
  routeStartPoint,
  routeEndPoint,
  geofenceShapes,
  onMarkerClick,
}: {
  mapMode: FleetMode
  fleetCars: FleetCarView[]
  selectedFleetCar: FleetCarView | null
  currentPoint: LatLngTuple | null
  currentPosition: bookcarsTypes.TraccarPosition | null
  routePoints: LatLngTuple[]
  routeStartPoint: LatLngTuple | null
  routeEndPoint: LatLngTuple | null
  geofenceShapes: ParsedGeofence[]
  onMarkerClick: (carId: string) => void
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'bookcars-google-maps',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
  })

  const fleetMarkers = useMemo(() => fleetCars.filter((item) => item.currentPoint), [fleetCars])

  const onLoad = React.useCallback((map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds()
    let hasBounds = false

    const extend = (point: LatLngTuple) => {
      bounds.extend(toGoogleLatLng(point))
      hasBounds = true
    }

    if (mapMode === 'fleet') {
      fleetMarkers.forEach((item) => item.currentPoint && extend(item.currentPoint))
    } else {
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
    }

    if (hasBounds) {
      map.fitBounds(bounds, 40)
    } else {
      map.setCenter(toGoogleLatLng(DEFAULT_CENTER))
      map.setZoom(7)
    }
  }, [currentPoint, fleetMarkers, geofenceShapes, mapMode, routePoints])

  if (!env.GOOGLE_MAPS_API_KEY) {
    return <div className="tracking-map-empty"><Typography variant="body2">Google Maps API key is missing.</Typography></div>
  }

  if (!isLoaded) {
    return <div className="tracking-map-empty"><Typography variant="body2">{commonStrings.LOADING}</Typography></div>
  }

  const buildMarkerIcon = (color: string, scale: number): google.maps.Symbol => ({
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale,
  })

  const infoPoint = mapMode === 'fleet' ? selectedFleetCar?.currentPoint || null : currentPoint
  const infoPosition = mapMode === 'fleet' ? selectedFleetCar?.position || null : currentPosition

  return (
    <GoogleMap
      mapContainerClassName="tracking-map"
      center={toGoogleLatLng(DEFAULT_CENTER)}
      zoom={7}
      onLoad={onLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
    >
      {mapMode === 'single' && geofenceShapes.map((geofence) => {
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
        if (geofence.shape === 'polyline' && geofence.points) {
          return <PolylineF key={`${geofence.id}`} path={geofence.points.map(toGoogleLatLng)} options={{ strokeColor: '#00897b', strokeWeight: 4, strokeOpacity: 0.9 }} />
        }
        if (geofence.shape === 'geojson' && geofence.geojson) {
          return extractGeoJsonPaths(geofence.geojson).map((ring, index) => (
            <PolygonF key={`${geofence.id}-${index}`} paths={ring.map(toGoogleLatLng)} options={{ strokeColor: '#00897b', fillColor: '#4db6ac', fillOpacity: 0.18, strokeWeight: 2 }} />
          ))
        }
        return null
      })}

      {mapMode === 'single' && routePoints.length > 1 && <PolylineF path={routePoints.map(toGoogleLatLng)} options={{ strokeColor: '#1976d2', strokeWeight: 4, strokeOpacity: 0.9 }} />}
      {mapMode === 'single' && routeStartPoint && routePoints.length > 1 && <MarkerF position={toGoogleLatLng(routeStartPoint)} title={strings.ROUTE_START} icon={buildMarkerIcon('#2e7d32', 7)} />}
      {mapMode === 'single' && routeEndPoint && routePoints.length > 1 && <MarkerF position={toGoogleLatLng(routeEndPoint)} title={strings.ROUTE_END} icon={buildMarkerIcon('#6a1b9a', 7)} />}
      {mapMode === 'single' && currentPoint && <MarkerF position={toGoogleLatLng(currentPoint)} title={selectedFleetCar?.car.name || strings.SELECT_CAR} icon={buildMarkerIcon('#d32f2f', 8)} />}
      {mapMode === 'fleet' && fleetMarkers.map((item) => (
        <MarkerF
          key={item.car._id}
          position={toGoogleLatLng(item.currentPoint as LatLngTuple)}
          title={item.car.name}
          onClick={() => onMarkerClick(item.car._id)}
          icon={buildMarkerIcon(item.car._id === selectedFleetCar?.car._id ? '#0f172a' : item.isOnline ? '#0284c7' : '#94a3b8', item.car._id === selectedFleetCar?.car._id ? 9 : 7)}
        />
      ))}
      {infoPoint && (
        <InfoWindow position={toGoogleLatLng(infoPoint)}>
          <div className="tracking-map-info">
            <strong>{selectedFleetCar?.car.name || strings.SELECT_CAR}</strong>
            {selectedFleetCar?.car.licensePlate && <div>{selectedFleetCar.car.licensePlate}</div>}
            <div>{`${formatCoordinate(infoPosition?.latitude)}, ${formatCoordinate(infoPosition?.longitude)}`}</div>
            {selectedFleetCar?.deviceStatus && <div>{`${strings.DEVICE_STATUS}: ${selectedFleetCar.deviceStatus}`}</div>}
            {infoPosition?.speed !== undefined && <div>{`${strings.SPEED}: ${formatNumber(infoPosition.speed, ' kn')}`}</div>}
            <div>{`${strings.TIME}: ${formatTimestamp(getPositionTimestamp(infoPosition))}`}</div>
            {infoPosition?.address && <div>{infoPosition.address}</div>}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}

const Tracking = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [cars, setCars] = useState<bookcarsTypes.Car[]>([])
  const [devices, setDevices] = useState<bookcarsTypes.TraccarDevice[]>([])
  const [fleetOverview, setFleetOverview] = useState<TraccarService.TraccarFleetItem[]>([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [mapMode, setMapMode] = useState<FleetMode>('fleet')
  const [fleetSearch, setFleetSearch] = useState('')
  const [trackingEnabled, setTrackingEnabled] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [notes, setNotes] = useState('')
  const [positions, setPositions] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [route, setRoute] = useState<bookcarsTypes.TraccarPosition[]>([])
  const [allGeofences, setAllGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [alerts, setAlerts] = useState<bookcarsTypes.TraccarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(true)
  const [editingGeofenceId, setEditingGeofenceId] = useState<number | null>(null)
  const [geofenceFormName, setGeofenceFormName] = useState('')
  const [geofenceFormDescription, setGeofenceFormDescription] = useState('')
  const [geofenceFormType, setGeofenceFormType] = useState<GeofenceEditorType>('circle')
  const [geofenceFormCenterLat, setGeofenceFormCenterLat] = useState('')
  const [geofenceFormCenterLng, setGeofenceFormCenterLng] = useState('')
  const [geofenceFormRadius, setGeofenceFormRadius] = useState('200')
  const [geofenceFormPoints, setGeofenceFormPoints] = useState('')
  const [geofenceFormPolylineDistance, setGeofenceFormPolylineDistance] = useState('25')

  const now = useMemo(() => new Date(), [])
  const [from, setFrom] = useState(formatDateInput(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState(formatDateInput(now))

  const selectedCar = useMemo(() => cars.find((item) => item._id === selectedCarId) || null, [cars, selectedCarId])

  useEffect(() => {
    setTrackingEnabled(selectedCar?.tracking?.enabled ?? false)
    setDeviceId(selectedCar?.tracking?.deviceId ? `${selectedCar.tracking.deviceId}` : '')
    setDeviceName(selectedCar?.tracking?.deviceName || '')
    setNotes(selectedCar?.tracking?.notes || '')
  }, [selectedCar])

  useEffect(() => {
    let active = true

    const loadSelectedCarGeofences = async () => {
      if (!selectedCar?.tracking?.deviceId || !integrationEnabled) {
        setGeofences([])
        return
      }

      try {
        const data = await TraccarService.getGeofences(selectedCar._id)
        if (active) {
          setGeofences(data)
        }
      } catch {
        if (active) {
          setGeofences([])
        }
      }
    }

    void loadSelectedCarGeofences()

    return () => {
      active = false
    }
  }, [integrationEnabled, selectedCar])

  const geofenceLookup = useMemo(() => {
    const lookup = new Map<number, string>()
    geofences.forEach((geofence) => {
      if (typeof geofence.id === 'number' && geofence.name) {
        lookup.set(geofence.id, geofence.name)
      }
    })
    return lookup
  }, [geofences])

  const linkedGeofenceIds = useMemo(() => (
    new Set(geofences.map((geofence) => geofence.id).filter((id): id is number => typeof id === 'number'))
  ), [geofences])

  const resetGeofenceForm = () => {
    setEditingGeofenceId(null)
    setGeofenceFormName('')
    setGeofenceFormDescription('')
    setGeofenceFormType('circle')
    setGeofenceFormCenterLat('')
    setGeofenceFormCenterLng('')
    setGeofenceFormRadius('200')
    setGeofenceFormPoints('')
    setGeofenceFormPolylineDistance('25')
  }

  const populateGeofenceForm = (geofence: bookcarsTypes.TraccarGeofence) => {
    setEditingGeofenceId(typeof geofence.id === 'number' ? geofence.id : null)
    setGeofenceFormName(geofence.name || '')
    setGeofenceFormDescription(geofence.description || '')
    setGeofenceFormCenterLat('')
    setGeofenceFormCenterLng('')
    setGeofenceFormRadius('200')
    setGeofenceFormPoints('')
    setGeofenceFormPolylineDistance(`${typeof geofence.attributes?.polylineDistance === 'number' ? geofence.attributes.polylineDistance : 25}`)

    const area = geofence.area || ''
    const circleMatch = area.match(/CIRCLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i)
    if (circleMatch) {
      setGeofenceFormType('circle')
      setGeofenceFormCenterLat(circleMatch[1])
      setGeofenceFormCenterLng(circleMatch[2])
      setGeofenceFormRadius(circleMatch[3])
      return
    }

    try {
      const geometry = wellknown.parse(area)
      if (geometry?.type === 'LineString') {
        setGeofenceFormType('polyline')
        setGeofenceFormPoints(formatPointList((geometry.coordinates || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)))
        return
      }

      if (geometry?.type === 'Polygon') {
        const ring = (geometry.coordinates?.[0] || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
        setGeofenceFormType('polygon')
        setGeofenceFormPoints(formatPointList(ring.length > 1 ? ring.slice(0, -1) : ring))
        return
      }
    } catch {
      // Fall back to free-form numeric parsing below.
    }

    const points = (area.match(/[+-]?\d+(?:\.\d+)?/g) || [])
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    if (area.toUpperCase().startsWith('LINESTRING') && points.length >= 4) {
      const linePoints: LatLngTuple[] = []
      for (let index = 0; index + 1 < points.length; index += 2) {
        linePoints.push(normalizeLatLngOrder(points[index], points[index + 1]))
      }
      setGeofenceFormType('polyline')
      setGeofenceFormPoints(formatPointList(linePoints))
      return
    }

    if (points.length >= 6) {
      const polygonPoints: LatLngTuple[] = []
      for (let index = 0; index + 1 < points.length; index += 2) {
        polygonPoints.push(normalizeLatLngOrder(points[index], points[index + 1]))
      }
      setGeofenceFormType('polygon')
      setGeofenceFormPoints(formatPointList(polygonPoints.length > 1 ? polygonPoints.slice(0, -1) : polygonPoints))
    }
  }

  const buildGeofencePayload = (): TraccarService.TraccarGeofenceEditorPayload => {
    const name = geofenceFormName.trim()
    if (!name) {
      throw new Error(commonStrings.FIELD_NOT_VALID)
    }

    if (geofenceFormType === 'circle') {
      const lat = Number.parseFloat(geofenceFormCenterLat)
      const lng = Number.parseFloat(geofenceFormCenterLng)
      const radius = Number.parseFloat(geofenceFormRadius)
      if (![lat, lng, radius].every((value) => Number.isFinite(value))) {
        throw new Error(commonStrings.FIELD_NOT_VALID)
      }

      return {
        name,
        description: geofenceFormDescription.trim() || undefined,
        area: `CIRCLE (${lat} ${lng}, ${radius})`,
        attributes: {},
      }
    }

    const points = parsePointList(geofenceFormPoints)

    if (geofenceFormType === 'polyline') {
      if (points.length < 2) {
        throw new Error(commonStrings.FIELD_NOT_VALID)
      }

      const polylineDistance = Number.parseFloat(geofenceFormPolylineDistance)
      if (!Number.isFinite(polylineDistance) || polylineDistance <= 0) {
        throw new Error(commonStrings.FIELD_NOT_VALID)
      }

      return {
        name,
        description: geofenceFormDescription.trim() || undefined,
        area: `LINESTRING (${points.map(([lat, lng]) => `${lat} ${lng}`).join(', ')})`,
        attributes: { polylineDistance },
      }
    }

    if (points.length < 3) {
      throw new Error(commonStrings.FIELD_NOT_VALID)
    }

    const closedPoints = closePolygon(points)
    return {
      name,
      description: geofenceFormDescription.trim() || undefined,
      area: `POLYGON ((${closedPoints.map(([lat, lng]) => `${lat} ${lng}`).join(', ')}))`,
      attributes: {},
    }
  }

  const fleetOverviewByCarId = useMemo(() => {
    const lookup = new Map<string, TraccarService.TraccarFleetItem>()
    fleetOverview.forEach((item) => lookup.set(item.carId, item))
    return lookup
  }, [fleetOverview])

  const fleetCars = useMemo<FleetCarView[]>(() => {
    const result = cars.map((car) => {
      const snapshot = fleetOverviewByCarId.get(car._id)
      const position = car._id === selectedCarId && positions[0] ? positions[0] : snapshot?.position || null
      const deviceStatus = snapshot?.deviceStatus || car.tracking?.status || ''
      const isLinked = typeof car.tracking?.deviceId === 'number'

      return {
        car,
        snapshot,
        position,
        currentPoint: toLatLng(position),
        deviceName: snapshot?.deviceName || car.tracking?.deviceName || '',
        deviceStatus,
        isLinked,
        isOnline: deviceStatus.trim().toLowerCase() === 'online',
        lastSeen: formatTimestamp(getPositionTimestamp(position) || snapshot?.lastSyncedAt),
      }
    })

    result.sort((left, right) => {
      if (left.isOnline !== right.isOnline) {
        return left.isOnline ? -1 : 1
      }
      if (left.isLinked !== right.isLinked) {
        return left.isLinked ? -1 : 1
      }
      return left.car.name.localeCompare(right.car.name)
    })

    return result
  }, [cars, fleetOverviewByCarId, positions, selectedCarId])

  const filteredFleetCars = useMemo(() => {
    const query = fleetSearch.trim().toLowerCase()
    if (!query) {
      return fleetCars
    }

    return fleetCars.filter((item) => (
      toSearchText(item.car.name, item.car.licensePlate, item.deviceName, item.car.supplier?.fullName).includes(query)
    ))
  }, [fleetCars, fleetSearch])

  const selectedFleetCar = useMemo(() => fleetCars.find((item) => item.car._id === selectedCarId) || null, [fleetCars, selectedCarId])
  const managedGeofences = useMemo(() => (
    [...allGeofences].sort((left, right) => (left.name || '').localeCompare(right.name || ''))
  ), [allGeofences])
  const currentPosition = positions[0] || selectedFleetCar?.position || null
  const currentPoint = useMemo(() => toLatLng(currentPosition), [currentPosition])
  const routePoints = useMemo(() => route.map((position) => toLatLng(position)).filter((point): point is LatLngTuple => point !== null), [route])
  const geofenceShapes = useMemo(() => geofences.map(parseGeofenceArea).filter((shape): shape is ParsedGeofence => shape !== null), [geofences])
  const routeStart = route.length > 0 ? route[0] : null
  const routeEnd = route.length > 1 ? route[route.length - 1] : route[0] || null
  const routeStartPoint = useMemo(() => toLatLng(routeStart), [routeStart])
  const routeEndPoint = useMemo(() => toLatLng(routeEnd), [routeEnd])
  const latestAlert = alerts[0]

  const linkedCarsCount = fleetCars.filter((item) => item.isLinked).length
  const liveCarsCount = fleetCars.filter((item) => item.currentPoint).length
  const onlineCarsCount = fleetCars.filter((item) => item.isOnline).length
  const canLoadTracking = !!selectedCar?.tracking?.deviceId && integrationEnabled
  const hasMapData = mapMode === 'fleet' ? liveCarsCount > 0 : !!currentPoint || routePoints.length > 0 || geofenceShapes.length > 0

  const resetTrackingData = () => {
    setPositions([])
    setRoute([])
    setGeofences([])
    setAlerts([])
  }

  const selectCar = (carId: string) => {
    setSelectedCarId(carId)
    resetTrackingData()
  }

  const loadCars = async () => {
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

    const firstPage = await CarService.getCars('', payload, 1, CARS_FETCH_SIZE)
    const { rows: firstRows, totalRecords } = extractResultPage(firstPage)
    const totalPages = Math.max(1, Math.ceil(totalRecords / CARS_FETCH_SIZE))

    if (totalPages === 1) {
      return firstRows
    }

    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
    const remainingPages = await Promise.all(pageNumbers.map((pageNumber) => CarService.getCars('', payload, pageNumber, CARS_FETCH_SIZE)))
    return [...firstRows, ...remainingPages.flatMap((pageData) => extractResultPage(pageData).rows)]
  }

  const loadFleetOverview = async () => {
    if (!integrationEnabled) {
      setFleetOverview([])
      return
    }
    setFleetOverview(await TraccarService.getFleetOverview())
  }

  const loadDevices = async () => {
    if (!integrationEnabled) {
      setDevices([])
      return
    }
    setDevices(await TraccarService.getDevices())
  }

  const loadAllGeofences = async () => {
    if (!integrationEnabled) {
      setAllGeofences([])
      return
    }
    setAllGeofences(await TraccarService.getAllGeofences())
  }

  const handleRefreshFleet = async () => {
    if (!integrationEnabled) {
      return
    }

    setLoading(true)
    try {
      await Promise.all([loadFleetOverview(), loadDevices(), loadAllGeofences()])
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshGeofenceLibrary = async () => {
    if (!integrationEnabled) {
      return
    }

    setLoading(true)
    try {
      await loadAllGeofences()
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
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
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      await Promise.all([loadFleetOverview(), loadDevices()])
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
      setCars((prev) => prev.map((car) => (car._id === updated._id ? updated : car)))
      resetTrackingData()
      await loadFleetOverview()
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
      setPositions(await TraccarService.getPositions(selectedCar._id))
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
      setRoute(await TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()))
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
      setGeofences(await TraccarService.getGeofences(selectedCar._id))
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGeofence = async () => {
    setLoading(true)
    try {
      const payload = buildGeofencePayload()
      if (editingGeofenceId) {
        await TraccarService.updateGeofence(editingGeofenceId, payload)
      } else {
        await TraccarService.createGeofence(payload)
      }

      await Promise.all([
        loadAllGeofences(),
        canLoadTracking && selectedCar ? TraccarService.getGeofences(selectedCar._id).then(setGeofences) : Promise.resolve(),
      ])

      resetGeofenceForm()
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkGeofence = async (geofenceId: number) => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      setGeofences(await TraccarService.linkGeofence(selectedCar._id, geofenceId))
      helper.info(commonStrings.UPDATED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkGeofence = async (geofenceId: number) => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      setGeofences(await TraccarService.unlinkGeofence(selectedCar._id, geofenceId))
      helper.info(commonStrings.UPDATED)
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
      setAlerts(await TraccarService.getGeofenceAlerts(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()))
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSnapshot = async () => {
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      const [currentData, routeData, geofenceData, alertData] = await Promise.all([
        TraccarService.getPositions(selectedCar._id),
        TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
        TraccarService.getGeofences(selectedCar._id),
        TraccarService.getGeofenceAlerts(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()),
      ])

      setPositions(currentData)
      setRoute(routeData)
      setGeofences(geofenceData)
      setAlerts(alertData)
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

      const loadedCars = await loadCars()
      setCars(loadedCars)
      const defaultCar = loadedCars.find((car) => car.tracking?.deviceId) || loadedCars[0]
      if (defaultCar) {
        setSelectedCarId(defaultCar._id)
      }

      if (status.enabled) {
        const [devicesResult, fleetResult, geofencesResult] = await Promise.allSettled([
          TraccarService.getDevices(),
          TraccarService.getFleetOverview(),
          TraccarService.getAllGeofences(),
        ])

        if (devicesResult.status === 'fulfilled') {
          setDevices(devicesResult.value)
        }
        if (fleetResult.status === 'fulfilled') {
          setFleetOverview(fleetResult.value)
        }
        if (geofencesResult.status === 'fulfilled') {
          setAllGeofences(geofencesResult.value)
        }
      }
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
            <div className="tracking-header-chips">
              <Chip color={integrationEnabled ? 'success' : 'error'} label={integrationEnabled ? strings.LIVE_FLEET : strings.INTEGRATION_DISABLED} />
              {selectedCar && <Chip color={trackingEnabled ? 'success' : 'default'} label={trackingEnabled ? strings.TRACKING_ENABLED : strings.TRACKING_DISABLED} />}
            </div>
          </div>

          {!integrationEnabled && (
            <Alert severity="error" className="tracking-info-alert">
              {strings.INTEGRATION_DISABLED}
            </Alert>
          )}

          <div className="tracking-summary-grid tracking-summary-grid--hero">
            <Paper className="tracking-card tracking-stat-card">
              <Box className="tracking-stat-icon tracking-stat-icon--fleet"><DirectionsCarFilledIcon /></Box>
              <div>
                <Typography className="tracking-stat-label">{strings.LIVE_FLEET}</Typography>
                <Typography variant="h6">{`${liveCarsCount}/${linkedCarsCount}`}</Typography>
                <Typography className="tracking-stat-note">{strings.LIVE_FLEET_HINT}</Typography>
              </div>
            </Paper>

            <Paper className="tracking-card tracking-stat-card">
              <Box className="tracking-stat-icon tracking-stat-icon--linked"><LinkIcon /></Box>
              <div>
                <Typography className="tracking-stat-label">{strings.LINKED_DEVICES}</Typography>
                <Typography variant="h6">{linkedCarsCount}</Typography>
                <Typography className="tracking-stat-note">{`${cars.length} ${commonStrings.CARS}`}</Typography>
              </div>
            </Paper>

            <Paper className="tracking-card tracking-stat-card">
              <Box className="tracking-stat-icon tracking-stat-icon--online"><SensorsIcon /></Box>
              <div>
                <Typography className="tracking-stat-label">{strings.ONLINE_DEVICES}</Typography>
                <Typography variant="h6">{onlineCarsCount}</Typography>
                <Typography className="tracking-stat-note">{selectedFleetCar?.deviceStatus || strings.NO_DATA}</Typography>
              </div>
            </Paper>

            <Paper className="tracking-card tracking-stat-card">
              <Box className="tracking-stat-icon tracking-stat-icon--alerts"><WarningAmberIcon /></Box>
              <div>
                <Typography className="tracking-stat-label">{strings.SELECTED_VEHICLE}</Typography>
                <Typography variant="h6">{selectedCar?.name || strings.NO_DATA}</Typography>
                <Typography className="tracking-stat-note">{selectedCar?.licensePlate || strings.NO_DATA}</Typography>
              </div>
            </Paper>
          </div>

          <Paper className="tracking-card tracking-controls-card">
            <div className="tracking-toolbar">
              <div className="tracking-toolbar-group">
                <ToggleButtonGroup
                  value={mapMode}
                  exclusive
                  onChange={(_event, value: FleetMode | null) => value && setMapMode(value)}
                  size="small"
                  className="tracking-mode-toggle"
                >
                  <ToggleButton value="fleet">{strings.FLEET_MODE}</ToggleButton>
                  <ToggleButton value="single">{strings.SINGLE_MODE}</ToggleButton>
                </ToggleButtonGroup>

                <FormControl className="tracking-car-select">
                  <InputLabel>{strings.SELECT_CAR}</InputLabel>
                  <Select
                    value={selectedCarId}
                    label={strings.SELECT_CAR}
                    onChange={(event) => selectCar(event.target.value as string)}
                  >
                    {cars.map((car) => (
                      <MenuItem key={car._id} value={car._id}>{car.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <div className="tracking-toolbar-group tracking-toolbar-group--actions">
                <Button variant="contained" className="btn-primary" onClick={handleRefreshFleet} disabled={!integrationEnabled}>
                  {strings.REFRESH_FLEET}
                </Button>
                <Button variant="contained" className="btn-secondary" onClick={handleLoadSnapshot} disabled={!canLoadTracking}>
                  {strings.LOAD_SNAPSHOT}
                </Button>
              </div>
            </div>
          </Paper>

          <div className="tracking-layout">
            <div className="tracking-main-column">
              <Paper className="tracking-card tracking-map-card">
                <div className="tracking-header">
                  <div>
                    <Typography variant="h6">{strings.MAP_OVERVIEW}</Typography>
                    <Typography className="tracking-card-subtitle">
                      {mapMode === 'fleet' ? strings.LIVE_FLEET_HINT : strings.MAP_HINT}
                    </Typography>
                  </div>
                  <div className="tracking-map-legend">
                    {mapMode === 'fleet'
                      ? (
                        <>
                          <span><i className="tracking-legend-dot tracking-legend-dot--fleet" /> {strings.LIVE_FLEET}</span>
                          <span><i className="tracking-legend-dot tracking-legend-dot--selected" /> {strings.SELECTED_VEHICLE}</span>
                          <span><i className="tracking-legend-dot tracking-legend-dot--offline" /> {strings.TRACKING_DISABLED}</span>
                        </>
                        )
                      : (
                        <>
                          <span><i className="tracking-legend-dot tracking-legend-dot--current" /> {strings.CURRENT_POSITION}</span>
                          <span><i className="tracking-legend-line" /> {strings.ROUTE_HISTORY}</span>
                          <span><i className="tracking-legend-zone" /> {strings.GEOFENCES}</span>
                        </>
                        )}
                  </div>
                </div>

                <div className="tracking-map-shell">
                  {!hasMapData
                    ? (
                      <div className="tracking-map-empty">
                        <Typography variant="body1">{mapMode === 'fleet' ? strings.FLEET_EMPTY : strings.NO_MAP_DATA}</Typography>
                        <Typography variant="body2">{mapMode === 'fleet' ? strings.LIVE_FLEET_HINT : strings.MAP_EMPTY_HELP}</Typography>
                      </div>
                      )
                    : (
                      <GoogleTrackingMap
                        mapMode={mapMode}
                        fleetCars={fleetCars}
                        selectedFleetCar={selectedFleetCar}
                        currentPoint={currentPoint}
                        currentPosition={currentPosition}
                        routePoints={routePoints}
                        routeStartPoint={routeStartPoint}
                        routeEndPoint={routeEndPoint}
                        geofenceShapes={geofenceShapes}
                        onMarkerClick={selectCar}
                      />
                      )}
                </div>
              </Paper>

              <div className="tracking-summary-grid">
                <Paper className="tracking-card tracking-stat-card">
                  <Box className="tracking-stat-icon tracking-stat-icon--position"><MyLocationIcon /></Box>
                  <div>
                    <Typography className="tracking-stat-label">{strings.CURRENT_POSITION}</Typography>
                    <Typography variant="h6">{currentPoint ? `${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}` : '-'}</Typography>
                    <Typography className="tracking-stat-note">{currentPosition?.address || strings.NO_DATA}</Typography>
                  </div>
                </Paper>

                <Paper className="tracking-card tracking-stat-card">
                  <Box className="tracking-stat-icon tracking-stat-icon--route"><RouteIcon /></Box>
                  <div>
                    <Typography className="tracking-stat-label">{strings.ROUTE_POINTS}</Typography>
                    <Typography variant="h6">{routePoints.length}</Typography>
                    <Typography className="tracking-stat-note">{routeStart ? formatTimestamp(getPositionTimestamp(routeStart)) : strings.NO_DATA}</Typography>
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
              <Paper className="tracking-card tracking-fleet-roster-card">
                <div className="tracking-header">
                  <div>
                    <Typography variant="h6">{strings.LIVE_FLEET}</Typography>
                    <Typography className="tracking-card-subtitle">{`${filteredFleetCars.length}/${cars.length} ${commonStrings.CARS}`}</Typography>
                  </div>
                  <Chip size="small" label={`${liveCarsCount} ${strings.CURRENT_POSITION}`} />
                </div>

                <TextField
                  value={fleetSearch}
                  onChange={(event) => setFleetSearch(event.target.value)}
                  placeholder={strings.SEARCH_CARS}
                  fullWidth
                  className="tracking-search"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <div className="tracking-fleet-list">
                  {filteredFleetCars.map((item) => (
                    <button
                      type="button"
                      key={item.car._id}
                      className={`tracking-fleet-item${item.car._id === selectedCarId ? ' tracking-fleet-item--active' : ''}`}
                      onClick={() => selectCar(item.car._id)}
                    >
                      <div className="tracking-fleet-avatar-shell">
                        <div className="tracking-fleet-avatar">{item.car.name.slice(0, 1)}</div>
                      </div>

                      <div className="tracking-fleet-body">
                        <div className="tracking-fleet-row">
                          <Typography className="tracking-fleet-name">{item.car.name}</Typography>
                          <Chip
                            size="small"
                            color={item.isLinked ? getStatusTone(item.deviceStatus) : 'default'}
                            label={item.isLinked ? (item.deviceStatus || strings.TRACKING_ENABLED) : strings.TRACKING_NOT_LINKED}
                          />
                        </div>
                        <Typography className="tracking-list-subtext">{item.car.licensePlate || strings.NO_DATA}</Typography>
                        <div className="tracking-fleet-meta">
                          <span>{item.deviceName || item.car.supplier?.fullName || strings.NO_DATA}</span>
                          <span>{item.lastSeen}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <div>
                    <Typography variant="h6">{strings.LINK_DEVICE}</Typography>
                    <Typography className="tracking-card-subtitle">{selectedCar?.name || strings.SELECT_CAR}</Typography>
                  </div>
                  {selectedFleetCar?.snapshot?.deviceStatus && (
                    <Chip size="small" color={getStatusTone(selectedFleetCar.snapshot.deviceStatus)} label={selectedFleetCar.snapshot.deviceStatus} />
                  )}
                </div>

                {selectedCar
                  ? (
                    <>
                      {!selectedCar.tracking?.deviceId && (
                        <Alert severity="info" className="tracking-inline-alert">
                          {strings.TRACKING_NOT_LINKED}
                        </Alert>
                      )}

                      <div className="tracking-grid">
                        <FormControlLabel
                          control={<Switch checked={trackingEnabled} onChange={(event) => setTrackingEnabled(event.target.checked)} />}
                          label={strings.TRACKING_ENABLED}
                        />
                        <FormControl>
                          <InputLabel>{strings.SELECT_DEVICE}</InputLabel>
                          <Select
                            value={deviceId}
                            label={strings.SELECT_DEVICE}
                            onChange={(event) => {
                              const nextDeviceId = event.target.value as string
                              setDeviceId(nextDeviceId)
                              const nextDevice = devices.find((item) => `${item.id}` === nextDeviceId)
                              if (nextDevice?.name) {
                                setDeviceName(nextDevice.name)
                              }
                            }}
                          >
                            {devices.map((device) => (
                              <MenuItem key={device.id} value={`${device.id}`}>
                                {`${device.name || `Device ${device.id}`} ${device.status ? `(${device.status})` : ''}`}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField label={strings.DEVICE_ID} value={deviceId} onChange={(event) => setDeviceId(event.target.value)} />
                        <TextField label={strings.DEVICE_NAME} value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
                        <TextField label={strings.NOTES} value={notes} onChange={(event) => setNotes(event.target.value)} multiline minRows={2} />
                      </div>

                      <div className="tracking-actions">
                        <Button variant="contained" className="btn-primary" onClick={handleLink} disabled={!integrationEnabled}>
                          {strings.LINK_DEVICE}
                        </Button>
                        <Button variant="contained" className="btn-secondary" onClick={handleUnlink} disabled={!selectedCar.tracking?.deviceId}>
                          {strings.UNLINK_DEVICE}
                        </Button>
                      </div>
                    </>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <div>
                    <Typography variant="h6">{strings.GEOFENCE_MANAGER}</Typography>
                    <Typography className="tracking-card-subtitle">
                      {editingGeofenceId ? strings.EDIT_GEOFENCE : strings.CREATE_GEOFENCE}
                    </Typography>
                  </div>
                  {editingGeofenceId && (
                    <Button variant="text" onClick={resetGeofenceForm}>
                      {strings.CANCEL_EDIT}
                    </Button>
                  )}
                </div>

                <div className="tracking-grid">
                  <TextField
                    label={strings.GEOFENCE_NAME}
                    value={geofenceFormName}
                    onChange={(event) => setGeofenceFormName(event.target.value)}
                  />
                  <FormControl>
                    <InputLabel>{strings.GEOFENCE_TYPE}</InputLabel>
                    <Select
                      value={geofenceFormType}
                      label={strings.GEOFENCE_TYPE}
                      onChange={(event) => setGeofenceFormType(event.target.value as GeofenceEditorType)}
                    >
                      <MenuItem value="circle">{strings.GEOFENCE_TYPE_CIRCLE}</MenuItem>
                      <MenuItem value="polygon">{strings.GEOFENCE_TYPE_POLYGON}</MenuItem>
                      <MenuItem value="polyline">{strings.GEOFENCE_TYPE_POLYLINE}</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label={strings.DESCRIPTION}
                    value={geofenceFormDescription}
                    onChange={(event) => setGeofenceFormDescription(event.target.value)}
                  />
                </div>

                {geofenceFormType === 'circle'
                  ? (
                    <div className="tracking-grid">
                      <TextField label={strings.CENTER_LATITUDE} value={geofenceFormCenterLat} onChange={(event) => setGeofenceFormCenterLat(event.target.value)} />
                      <TextField label={strings.CENTER_LONGITUDE} value={geofenceFormCenterLng} onChange={(event) => setGeofenceFormCenterLng(event.target.value)} />
                      <TextField label={strings.RADIUS_METERS} value={geofenceFormRadius} onChange={(event) => setGeofenceFormRadius(event.target.value)} />
                    </div>
                    )
                  : (
                    <>
                      <TextField
                        label={strings.GEOFENCE_POINTS}
                        value={geofenceFormPoints}
                        onChange={(event) => setGeofenceFormPoints(event.target.value)}
                        placeholder={strings.GEOFENCE_POINTS_HINT}
                        fullWidth
                        multiline
                        minRows={4}
                        className="tracking-geofence-points"
                      />
                      {geofenceFormType === 'polyline' && (
                        <div className="tracking-grid">
                          <TextField
                            label={strings.POLYLINE_DISTANCE}
                            value={geofenceFormPolylineDistance}
                            onChange={(event) => setGeofenceFormPolylineDistance(event.target.value)}
                          />
                        </div>
                      )}
                    </>
                    )}

                <div className="tracking-actions">
                  <Button variant="contained" className="btn-primary" onClick={handleSaveGeofence} disabled={!integrationEnabled}>
                    {editingGeofenceId ? strings.UPDATE_GEOFENCE : strings.CREATE_GEOFENCE}
                  </Button>
                </div>
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <div>
                    <Typography variant="h6">{strings.GEOFENCE_LIBRARY}</Typography>
                    <Typography className="tracking-card-subtitle">{selectedCar?.name || strings.SELECT_CAR}</Typography>
                  </div>
                  <Button variant="contained" className="btn-primary" onClick={handleRefreshGeofenceLibrary} disabled={!integrationEnabled}>
                    {strings.FETCH}
                  </Button>
                </div>

                {managedGeofences.length > 0
                  ? (
                    <div className="tracking-list">
                      {managedGeofences.map((geofence, index) => {
                        const parsed = parseGeofenceArea(geofence, index)
                        const linked = typeof geofence.id === 'number' && linkedGeofenceIds.has(geofence.id)

                        return (
                          <div key={geofence.id || `${geofence.name}-${index}`} className="tracking-list-item tracking-geofence-library-item">
                            <div className="tracking-geofence-library-header">
                              <div>
                                <div>{geofence.name || geofence.description || `Geofence ${index + 1}`}</div>
                                <div className="tracking-list-subtext">{parsed ? `${strings.SHAPE}: ${parsed.shape}` : strings.UNSUPPORTED_GEOFENCE}</div>
                              </div>
                              <Chip
                                size="small"
                                color={linked ? 'success' : 'default'}
                                label={linked ? strings.LINKED_TO_SELECTED_CAR : strings.NOT_LINKED_TO_SELECTED_CAR}
                              />
                            </div>
                            <div className="tracking-actions">
                              <Button
                                variant="text"
                                onClick={() => populateGeofenceForm(geofence)}
                                disabled={!integrationEnabled}
                              >
                                {strings.EDIT_GEOFENCE}
                              </Button>
                              {linked
                                ? (
                                  <Button
                                    variant="contained"
                                    className="btn-secondary"
                                    onClick={() => typeof geofence.id === 'number' && handleUnlinkGeofence(geofence.id)}
                                    disabled={!canLoadTracking || typeof geofence.id !== 'number'}
                                  >
                                    {strings.UNLINK_FROM_CAR}
                                  </Button>
                                  )
                                : (
                                  <Button
                                    variant="contained"
                                    className="btn-primary"
                                    onClick={() => typeof geofence.id === 'number' && handleLinkGeofence(geofence.id)}
                                    disabled={!canLoadTracking || typeof geofence.id !== 'number'}
                                  >
                                    {strings.LINK_TO_CAR}
                                  </Button>
                                  )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_GEOFENCES}</div>
                    )}
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <Typography variant="h6">{strings.CURRENT_POSITION}</Typography>
                  <Button variant="contained" className="btn-primary" onClick={handleFetchPositions} disabled={!canLoadTracking}>
                    {strings.FETCH}
                  </Button>
                </div>

                {currentPosition
                  ? (
                    <div className="tracking-data tracking-detail-list">
                      <div><MyLocationIcon fontSize="small" /> {`${formatCoordinate(currentPosition.latitude)}, ${formatCoordinate(currentPosition.longitude)}`}</div>
                      <div><SpeedIcon fontSize="small" /> {`${strings.SPEED}: ${formatNumber(currentPosition.speed, ' kn')}`}</div>
                      <div><AccessTimeIcon fontSize="small" /> {`${strings.TIME}: ${formatTimestamp(getPositionTimestamp(currentPosition))}`}</div>
                      {currentPosition.address && <div>{`${strings.ADDRESS}: ${currentPosition.address}`}</div>}
                    </div>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <Typography variant="h6">{strings.ROUTE_HISTORY}</Typography>
                  <Button variant="contained" className="btn-primary" onClick={handleFetchRoute} disabled={!canLoadTracking}>
                    {strings.FETCH}
                  </Button>
                </div>

                <div className="tracking-grid">
                  <TextField label={strings.FROM} type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
                  <TextField label={strings.TO} type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
                </div>

                {route.length > 0
                  ? (
                    <div className="tracking-list">
                      {route.slice(0, 10).map((position, index) => (
                        <div key={position.id || `${position.latitude}-${position.longitude}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(getPositionTimestamp(position))}</div>
                          <div className="tracking-list-subtext">{`${formatCoordinate(position.latitude)}, ${formatCoordinate(position.longitude)}`}</div>
                        </div>
                      ))}
                    </div>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <Typography variant="h6">{strings.GEOFENCES}</Typography>
                  <Button variant="contained" className="btn-primary" onClick={handleFetchGeofences} disabled={!canLoadTracking}>
                    {strings.FETCH}
                  </Button>
                </div>

                {geofences.length > 0
                  ? (
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
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
              </Paper>

              <Paper className="tracking-card">
                <div className="tracking-header">
                  <Typography variant="h6">{strings.GEOFENCE_ALERTS}</Typography>
                  <Button variant="contained" className="btn-primary" onClick={handleFetchAlerts} disabled={!canLoadTracking}>
                    {strings.FETCH}
                  </Button>
                </div>

                <div className="tracking-grid">
                  <TextField label={strings.FROM} type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
                  <TextField label={strings.TO} type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
                </div>

                {alerts.length > 0
                  ? (
                    <div className="tracking-list">
                      {alerts.map((alert, index) => (
                        <div key={alert.id || `${alert.geofenceId}-${index}`} className="tracking-list-item">
                          <div>{formatTimestamp(alert.eventTime || '')}</div>
                          <div className="tracking-list-subtext">{geofenceLookup.get(alert.geofenceId || -1) || alert.geofenceId || alert.type}</div>
                        </div>
                      ))}
                    </div>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
              </Paper>

              {geofences.length > 0 && geofenceShapes.length !== geofences.length && (
                <Alert severity="info" className="tracking-info-alert">
                  {strings.GEOFENCE_PARSE_NOTICE}
                </Alert>
              )}
            </div>
          </div>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Tracking
