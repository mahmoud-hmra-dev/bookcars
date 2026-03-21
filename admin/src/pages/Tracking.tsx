import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
import MyLocationIcon from '@mui/icons-material/MyLocation'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RadarIcon from '@mui/icons-material/Radar'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import RouteIcon from '@mui/icons-material/Route'
import SearchIcon from '@mui/icons-material/Search'
import SpeedIcon from '@mui/icons-material/Speed'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { CircleF, DrawingManager, GoogleMap, HeatmapLayer, InfoWindow, MarkerF, PolygonF, PolylineF, RectangleF, type Libraries, useJsApiLoader } from '@react-google-maps/api'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import wellknown from 'wellknown'
import { Slider } from '@mui/material'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/tracking'
import * as helper from '@/utils/helper'
import { snapRouteToRoads, type RoadPoint } from '@/utils/googleRoads'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import * as TraccarService from '@/services/TraccarService'

import '@/assets/css/tracking.css'

const DEFAULT_CENTER: [number, number] = [33.8938, 35.5018]
const CARS_FETCH_SIZE = 100

type FleetMode = 'fleet' | 'single'
type TrackingPanelSection = 'fleet' | 'vehicle' | 'route' | 'geofences' | 'alerts'
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
type DraftGeofenceShape =
  | { type: 'circle', center: LatLngTuple, radius: number }
  | { type: 'polygon', points: LatLngTuple[] }
  | { type: 'polyline', points: LatLngTuple[] }
type RouteFrame = {
  point: LatLngTuple
  position: bookcarsTypes.TraccarPosition
  timestampMs: number
  speed: number
}
type RouteHeatmapPoint = {
  point: LatLngTuple
  weight: number
}
type DetectedStop = {
  id: string
  point: LatLngTuple
  startedAt: number
  endedAt: number
  durationMs: number
  pointCount: number
}
type RouteSnapState = {
  displayPoints: LatLngTuple[]
  playbackPoints: LatLngTuple[]
  mode: 'idle' | 'loading' | 'snapped' | 'raw'
}

const GOOGLE_MAP_LIBRARIES: Libraries = ['drawing', 'visualization']
const PLAYBACK_SPEED_OPTIONS = [1, 2, 4, 8]
const STOP_SPEED_THRESHOLD = 3
const STOP_RADIUS_METERS = 120
const STOP_MIN_DURATION_MS = 2 * 60 * 1000

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)
const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const formatCoordinate = (value?: number) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '-')
const formatNumber = (value?: number, suffix = '') => (typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100) / 100}${suffix}` : '-')
const toGoogleLatLng = (point: LatLngTuple): GoogleLatLng => ({ lat: point[0], lng: point[1] })
const fromGoogleLatLng = (point: google.maps.LatLng | google.maps.LatLngLiteral): LatLngTuple => (
  [typeof point.lat === 'function' ? point.lat() : point.lat, typeof point.lng === 'function' ? point.lng() : point.lng]
)
const fromGooglePath = (path: google.maps.MVCArray<google.maps.LatLng>) => path.getArray().map(fromGoogleLatLng)

const formatTimestamp = (value?: Date | string | number | null) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

const formatDuration = (durationMs: number) => {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  return `${minutes}m`
}

const getDateMs = (value?: Date | string | number | null) => {
  if (!value) {
    return 0
  }

  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
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

const calculateBearing = (from: LatLngTuple, to: LatLngTuple) => {
  const fromLat = from[0] * (Math.PI / 180)
  const fromLng = from[1] * (Math.PI / 180)
  const toLat = to[0] * (Math.PI / 180)
  const toLng = to[1] * (Math.PI / 180)
  const deltaLng = toLng - fromLng

  const y = Math.sin(deltaLng) * Math.cos(toLat)
  const x = (
    Math.cos(fromLat) * Math.sin(toLat)
    - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)
  )

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const haversineDistanceMeters = (from: LatLngTuple, to: LatLngTuple) => {
  const earthRadius = 6371000
  const lat1 = from[0] * (Math.PI / 180)
  const lat2 = to[0] * (Math.PI / 180)
  const deltaLat = (to[0] - from[0]) * (Math.PI / 180)
  const deltaLng = (to[1] - from[1]) * (Math.PI / 180)

  const a = (
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  )
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

const buildVehicleSvgUrl = (bodyColor: string, accentColor: string, rotation: number) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(15,23,42,0.35)"/>
        </filter>
      </defs>
      <g transform="rotate(${rotation} 36 36)" filter="url(#shadow)">
        <path d="M36 7C24 7 17 15 17 25v21c0 6 5 11 11 11h16c6 0 11-5 11-11V25C55 15 48 7 36 7Z" fill="${bodyColor}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M27 17h18c4 0 7 3 7 7v8H20v-8c0-4 3-7 7-7Z" fill="${accentColor}" fill-opacity="0.95"/>
        <path d="M24 37h24v8c0 3-3 6-6 6H30c-3 0-6-3-6-6v-8Z" fill="#ffffff" fill-opacity="0.18"/>
        <circle cx="28" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <circle cx="44" cy="47" r="4" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <path d="M36 6l7 10H29L36 6Z" fill="#ffffff" fill-opacity="0.9"/>
      </g>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

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

const openPolygon = (points: LatLngTuple[]) => {
  if (points.length < 2) {
    return points
  }

  const first = points[0]
  const last = points[points.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return points.slice(0, -1)
  }

  return points
}

const hasDraftGeofenceGeometry = (draft: DraftGeofenceShape | null) => {
  if (!draft) {
    return false
  }

  if (draft.type === 'circle') {
    return isFiniteCoordinate(draft.center[0]) && isFiniteCoordinate(draft.center[1]) && draft.radius > 0
  }

  return draft.points.length >= (draft.type === 'polygon' ? 3 : 2)
}

const parseEditableGeofence = (geofence: bookcarsTypes.TraccarGeofence): DraftGeofenceShape | null => {
  const area = geofence.area || ''
  const circleMatch = area.match(/CIRCLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i)
  if (circleMatch) {
    const lat = Number.parseFloat(circleMatch[1])
    const lng = Number.parseFloat(circleMatch[2])
    const radius = Number.parseFloat(circleMatch[3])
    return [lat, lng, radius].every((value) => Number.isFinite(value))
      ? { type: 'circle', center: [lat, lng], radius }
      : null
  }

  try {
    const geometry = wellknown.parse(area)
    if (geometry?.type === 'LineString') {
      const points = (geometry.coordinates || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
      return points.length >= 2 ? { type: 'polyline', points } : null
    }

    if (geometry?.type === 'Polygon') {
      const ring = (geometry.coordinates?.[0] || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
      const points = openPolygon(ring)
      return points.length >= 3 ? { type: 'polygon', points } : null
    }
  } catch {
    // Fall back to numeric parsing below.
  }

  const values = (area.match(/[+-]?\d+(?:\.\d+)?/g) || [])
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))
  const points: LatLngTuple[] = []

  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push(normalizeLatLngOrder(values[index], values[index + 1]))
  }

  if (area.toUpperCase().startsWith('LINESTRING')) {
    return points.length >= 2 ? { type: 'polyline', points } : null
  }

  const polygonPoints = openPolygon(points)
  return polygonPoints.length >= 3 ? { type: 'polygon', points: polygonPoints } : null
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
  routePathPoints,
  routeStartPoint,
  routeEndPoint,
  playbackPoint,
  playbackPosition,
  playbackHeading,
  heatmapPoints,
  showHeatmap,
  stopMarkers,
  showStops,
  geofenceShapes,
  draftGeofence,
  drawingMode,
  fitRequestToken,
  onMarkerClick,
  onDraftGeofenceChange,
  onDraftGeofenceDrawn,
}: {
  mapMode: FleetMode
  fleetCars: FleetCarView[]
  selectedFleetCar: FleetCarView | null
  currentPoint: LatLngTuple | null
  currentPosition: bookcarsTypes.TraccarPosition | null
  routePathPoints: LatLngTuple[]
  routeStartPoint: LatLngTuple | null
  routeEndPoint: LatLngTuple | null
  playbackPoint: LatLngTuple | null
  playbackPosition: bookcarsTypes.TraccarPosition | null
  playbackHeading: number | null
  heatmapPoints: RouteHeatmapPoint[]
  showHeatmap: boolean
  stopMarkers: DetectedStop[]
  showStops: boolean
  geofenceShapes: ParsedGeofence[]
  draftGeofence: DraftGeofenceShape | null
  drawingMode: GeofenceEditorType | null
  fitRequestToken: number
  onMarkerClick: (carId: string) => void
  onDraftGeofenceChange: (draft: DraftGeofenceShape) => void
  onDraftGeofenceDrawn: (draft: DraftGeofenceShape) => void
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'bookcars-google-maps',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAP_LIBRARIES,
  })

  const fleetMarkers = useMemo(() => fleetCars.filter((item) => item.currentPoint), [fleetCars])
  const mapRef = React.useRef<google.maps.Map | null>(null)
  const draftCircleRef = React.useRef<google.maps.Circle | null>(null)
  const draftPolygonRef = React.useRef<google.maps.Polygon | null>(null)
  const draftPolylineRef = React.useRef<google.maps.Polyline | null>(null)
  const draftPolylineListenersRef = React.useRef<google.maps.MapsEventListener[]>([])
  const googleMaps = globalThis.google?.maps

  const clearDraftPolylineListeners = () => {
    draftPolylineListenersRef.current.forEach((listener) => listener.remove())
    draftPolylineListenersRef.current = []
  }

  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !googleMaps) {
      return
    }

    const bounds = new googleMaps.LatLngBounds()
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
      routePathPoints.forEach(extend)
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

      if (draftGeofence?.type === 'circle') {
        extend(draftGeofence.center)
      } else {
        draftGeofence?.points.forEach(extend)
      }
    }

    if (hasBounds) {
      map.fitBounds(bounds, 40)
    } else {
      map.setCenter(toGoogleLatLng(currentPoint || DEFAULT_CENTER))
      map.setZoom(currentPoint ? 12 : 7)
    }
  }, [currentPoint, fleetMarkers, fitRequestToken, geofenceShapes, googleMaps, mapMode, routePathPoints])

  React.useEffect(() => () => clearDraftPolylineListeners(), [])

  if (!env.GOOGLE_MAPS_API_KEY) {
    return <div className="tracking-map-empty"><Typography variant="body2">Google Maps API key is missing.</Typography></div>
  }

  if (!isLoaded || !googleMaps) {
    return <div className="tracking-map-empty"><Typography variant="body2">{commonStrings.LOADING}</Typography></div>
  }

  const buildMarkerIcon = (color: string, scale: number): google.maps.Symbol => ({
    path: googleMaps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale,
  })

  const infoPoint = mapMode === 'fleet' ? selectedFleetCar?.currentPoint || null : playbackPoint || currentPoint
  const infoPosition = mapMode === 'fleet' ? selectedFleetCar?.position || null : playbackPosition || currentPosition
  const resolvedPlaybackHeading = typeof playbackPosition?.course === 'number' && Number.isFinite(playbackPosition.course)
    ? playbackPosition.course
    : playbackHeading || 0
  const resolvedCurrentHeading = typeof currentPosition?.course === 'number' && Number.isFinite(currentPosition.course)
    ? currentPosition.course
    : 0
  const playbackVehicleIcon: google.maps.Icon = {
    url: buildVehicleSvgUrl('#f97316', '#fde68a', resolvedPlaybackHeading),
    scaledSize: new googleMaps.Size(44, 44),
    anchor: new googleMaps.Point(22, 22),
  }
  const currentVehicleIcon: google.maps.Icon = {
    url: buildVehicleSvgUrl('#0f172a', '#60a5fa', resolvedCurrentHeading),
    scaledSize: new googleMaps.Size(42, 42),
    anchor: new googleMaps.Point(21, 21),
  }
  const stopMarkerIcon: google.maps.Symbol = {
    path: googleMaps.SymbolPath.CIRCLE,
    fillColor: '#f59e0b',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 7,
  }
  const activeDrawingMode = drawingMode
    ? (
      drawingMode === 'circle'
        ? googleMaps.drawing.OverlayType.CIRCLE
        : drawingMode === 'polygon'
          ? googleMaps.drawing.OverlayType.POLYGON
          : googleMaps.drawing.OverlayType.POLYLINE
    )
    : null

  const syncDraftCircle = () => {
    const circle = draftCircleRef.current
    const center = circle?.getCenter()
    const radius = circle?.getRadius()
    if (!circle || !center || typeof radius !== 'number' || !Number.isFinite(radius)) {
      return
    }

    onDraftGeofenceChange({ type: 'circle', center: fromGoogleLatLng(center), radius })
  }

  const syncDraftPolygon = (polygon?: google.maps.Polygon | null) => {
    const instance = polygon || draftPolygonRef.current
    if (!instance) {
      return
    }

    onDraftGeofenceChange({ type: 'polygon', points: fromGooglePath(instance.getPath()) })
  }

  const syncDraftPolyline = () => {
    const polyline = draftPolylineRef.current
    if (!polyline) {
      return
    }

    onDraftGeofenceChange({ type: 'polyline', points: fromGooglePath(polyline.getPath()) })
  }

  const attachDraftPolylineListeners = (polyline: google.maps.Polyline) => {
    clearDraftPolylineListeners()
    const path = polyline.getPath()
    draftPolylineListenersRef.current = [
      googleMaps.event.addListener(path, 'insert_at', syncDraftPolyline),
      googleMaps.event.addListener(path, 'remove_at', syncDraftPolyline),
      googleMaps.event.addListener(path, 'set_at', syncDraftPolyline),
    ]
  }

  const drawingOptions = {
    circleOptions: {
      clickable: false,
      editable: false,
      fillColor: '#fb923c',
      fillOpacity: 0.16,
      strokeColor: '#f97316',
      strokeWeight: 3,
    },
    polygonOptions: {
      clickable: false,
      editable: false,
      fillColor: '#fb923c',
      fillOpacity: 0.16,
      strokeColor: '#f97316',
      strokeWeight: 3,
    },
    polylineOptions: {
      clickable: false,
      editable: false,
      strokeColor: '#f97316',
      strokeWeight: 4,
      strokeOpacity: 0.95,
    },
    drawingControl: false,
  } satisfies google.maps.drawing.DrawingManagerOptions

  const heatmapData = !googleMaps.visualization
    ? []
    : heatmapPoints.map((item) => ({
      location: new googleMaps.LatLng(item.point[0], item.point[1]),
      weight: item.weight,
    }))

  return (
    <GoogleMap
      mapContainerClassName="tracking-map"
      center={toGoogleLatLng(DEFAULT_CENTER)}
      zoom={7}
      onLoad={(map) => {
        mapRef.current = map
      }}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
    >
      {mapMode === 'single' && showHeatmap && heatmapData.length > 0 && (
        <HeatmapLayer
          data={heatmapData}
          options={{
            radius: 26,
            opacity: 0.55,
            gradient: [
              'rgba(59,130,246,0)',
              'rgba(59,130,246,0.35)',
              'rgba(14,165,233,0.55)',
              'rgba(250,204,21,0.7)',
              'rgba(249,115,22,0.88)',
              'rgba(220,38,38,0.96)',
            ],
          }}
        />
      )}

      {mapMode === 'single' && activeDrawingMode && (
        <DrawingManager
          drawingMode={activeDrawingMode}
          options={drawingOptions}
          onCircleComplete={(circle) => {
            const center = circle.getCenter()
            const radius = circle.getRadius()
            circle.setMap(null)
            if (center && Number.isFinite(radius)) {
              onDraftGeofenceDrawn({ type: 'circle', center: fromGoogleLatLng(center), radius })
            }
          }}
          onPolygonComplete={(polygon) => {
            const points = fromGooglePath(polygon.getPath())
            polygon.setMap(null)
            if (points.length >= 3) {
              onDraftGeofenceDrawn({ type: 'polygon', points })
            }
          }}
          onPolylineComplete={(polyline) => {
            const points = fromGooglePath(polyline.getPath())
            polyline.setMap(null)
            if (points.length >= 2) {
              onDraftGeofenceDrawn({ type: 'polyline', points })
            }
          }}
        />
      )}

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

      {mapMode === 'single' && draftGeofence?.type === 'circle' && (
        <CircleF
          center={toGoogleLatLng(draftGeofence.center)}
          radius={draftGeofence.radius}
          options={{ strokeColor: '#f97316', fillColor: '#fb923c', fillOpacity: 0.16, strokeWeight: 3, zIndex: 90 }}
          editable
          draggable
          onLoad={(circle) => {
            draftCircleRef.current = circle
          }}
          onUnmount={() => {
            draftCircleRef.current = null
          }}
          onCenterChanged={syncDraftCircle}
          onRadiusChanged={syncDraftCircle}
          onDragEnd={syncDraftCircle}
          onMouseUp={syncDraftCircle}
        />
      )}

      {mapMode === 'single' && draftGeofence?.type === 'polygon' && (
        <PolygonF
          paths={draftGeofence.points.map(toGoogleLatLng)}
          options={{ strokeColor: '#f97316', fillColor: '#fb923c', fillOpacity: 0.16, strokeWeight: 3, zIndex: 90 }}
          editable
          draggable
          onLoad={(polygon) => {
            draftPolygonRef.current = polygon
          }}
          onUnmount={() => {
            draftPolygonRef.current = null
          }}
          onEdit={syncDraftPolygon}
          onDragEnd={() => syncDraftPolygon()}
          onMouseUp={() => syncDraftPolygon()}
        />
      )}

      {mapMode === 'single' && draftGeofence?.type === 'polyline' && (
        <PolylineF
          path={draftGeofence.points.map(toGoogleLatLng)}
          options={{ strokeColor: '#f97316', strokeWeight: 4, strokeOpacity: 0.95, zIndex: 90 }}
          editable
          draggable
          onLoad={(polyline) => {
            draftPolylineRef.current = polyline
            attachDraftPolylineListeners(polyline)
          }}
          onUnmount={() => {
            clearDraftPolylineListeners()
            draftPolylineRef.current = null
          }}
          onDragEnd={syncDraftPolyline}
          onMouseUp={syncDraftPolyline}
        />
      )}

      {mapMode === 'single' && routePathPoints.length > 1 && <PolylineF path={routePathPoints.map(toGoogleLatLng)} options={{ strokeColor: '#1976d2', strokeWeight: 4, strokeOpacity: 0.9 }} />}
      {mapMode === 'single' && routeStartPoint && routePathPoints.length > 1 && <MarkerF position={toGoogleLatLng(routeStartPoint)} title={strings.ROUTE_START} icon={buildMarkerIcon('#2e7d32', 7)} />}
      {mapMode === 'single' && routeEndPoint && routePathPoints.length > 1 && <MarkerF position={toGoogleLatLng(routeEndPoint)} title={strings.ROUTE_END} icon={buildMarkerIcon('#6a1b9a', 7)} />}
      {mapMode === 'single' && showStops && stopMarkers.map((stop, index) => (
        <MarkerF
          key={stop.id}
          position={toGoogleLatLng(stop.point)}
          title={`${strings.STOP_DETECTION} ${index + 1}: ${formatDuration(stop.durationMs)}`}
          icon={stopMarkerIcon}
          label={{ text: `${index + 1}`, color: '#111827', fontWeight: '700' }}
        />
      ))}
      {mapMode === 'single' && playbackPoint && (
        <MarkerF
          position={toGoogleLatLng(playbackPoint)}
          title={strings.ROUTE_PLAYBACK}
          icon={playbackVehicleIcon}
        />
      )}
      {mapMode === 'single' && currentPoint && !playbackPoint && <MarkerF position={toGoogleLatLng(currentPoint)} title={selectedFleetCar?.car.name || strings.SELECT_CAR} icon={currentVehicleIcon} />}
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
  const [snappedRoute, setSnappedRoute] = useState<RouteSnapState>({ displayPoints: [], playbackPoints: [], mode: 'idle' })
  const [playbackIndex, setPlaybackIndex] = useState(0)
  const [playbackPlaying, setPlaybackPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(4)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showStops, setShowStops] = useState(true)
  const [activePanelSection, setActivePanelSection] = useState<TrackingPanelSection>('fleet')
  const [allGeofences, setAllGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [geofences, setGeofences] = useState<bookcarsTypes.TraccarGeofence[]>([])
  const [alerts, setAlerts] = useState<bookcarsTypes.TraccarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [integrationEnabled, setIntegrationEnabled] = useState(true)
  const [editingGeofenceId, setEditingGeofenceId] = useState<number | null>(null)
  const [geofenceFormName, setGeofenceFormName] = useState('')
  const [geofenceFormDescription, setGeofenceFormDescription] = useState('')
  const [geofenceFormType, setGeofenceFormType] = useState<GeofenceEditorType>('circle')
  const [geofenceFormRadius, setGeofenceFormRadius] = useState('200')
  const [geofenceFormPolylineDistance, setGeofenceFormPolylineDistance] = useState('25')
  const [geofenceDraft, setGeofenceDraft] = useState<DraftGeofenceShape | null>(null)
  const [geofenceDrawingMode, setGeofenceDrawingMode] = useState<GeofenceEditorType | null>(null)
  const [mapFitRequestToken, setMapFitRequestToken] = useState(0)

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
    setGeofenceFormRadius('200')
    setGeofenceFormPolylineDistance('25')
    setGeofenceDraft(null)
    setGeofenceDrawingMode(null)
  }

  const populateGeofenceForm = (geofence: bookcarsTypes.TraccarGeofence) => {
    const draft = parseEditableGeofence(geofence)
    if (!draft) {
      helper.error(null, strings.UNSUPPORTED_GEOFENCE)
      return
    }

    setActivePanelSection('geofences')
    setEditingGeofenceId(typeof geofence.id === 'number' ? geofence.id : null)
    setGeofenceFormName(geofence.name || '')
    setGeofenceFormDescription(geofence.description || '')
    setGeofenceFormPolylineDistance(`${typeof geofence.attributes?.polylineDistance === 'number' ? geofence.attributes.polylineDistance : 25}`)
    setGeofenceFormType(draft.type)
    setGeofenceFormRadius(draft.type === 'circle' ? `${Math.round(draft.radius * 100) / 100}` : '200')
    setGeofenceDraft(draft)
    setGeofenceDrawingMode(null)
    setMapMode('single')
    setMapFitRequestToken((prev) => prev + 1)
  }

  const buildGeofencePayload = (): TraccarService.TraccarGeofenceEditorPayload => {
    const name = geofenceFormName.trim()
    if (!name) {
      throw new Error(commonStrings.FIELD_NOT_VALID)
    }

    if (!geofenceDraft || geofenceDraft.type !== geofenceFormType) {
      throw new Error(commonStrings.FIELD_NOT_VALID)
    }

    if (geofenceDraft.type === 'circle') {
      const radius = Number.parseFloat(geofenceFormRadius)
      if (![geofenceDraft.center[0], geofenceDraft.center[1], radius].every((value) => Number.isFinite(value)) || radius <= 0) {
        throw new Error(commonStrings.FIELD_NOT_VALID)
      }

      return {
        name,
        description: geofenceFormDescription.trim() || undefined,
        area: `CIRCLE (${geofenceDraft.center[0]} ${geofenceDraft.center[1]}, ${radius})`,
        attributes: {},
      }
    }

    const points = geofenceDraft.points

    if (geofenceDraft.type === 'polyline') {
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

  const handleGeofenceTypeChange = (nextType: GeofenceEditorType) => {
    setGeofenceFormType(nextType)
    setGeofenceDrawingMode(null)

    if (geofenceDraft && geofenceDraft.type !== nextType) {
      setGeofenceDraft(null)
    }

    if (nextType === 'circle' && (!geofenceDraft || geofenceDraft.type !== 'circle')) {
      setGeofenceFormRadius('200')
    }
  }

  const handleStartGeofenceDrawing = () => {
    setActivePanelSection('geofences')
    setMapMode('single')
    setGeofenceDrawingMode((current) => (current === geofenceFormType ? null : geofenceFormType))
    setMapFitRequestToken((prev) => prev + 1)
  }

  const handleClearGeofenceDrawing = () => {
    setGeofenceDraft(null)
    setGeofenceDrawingMode(null)
  }

  const handleDraftGeofenceChange = (draft: DraftGeofenceShape) => {
    setGeofenceDraft(draft)
    setGeofenceFormType(draft.type)
    if (draft.type === 'circle') {
      setGeofenceFormRadius(`${Math.round(draft.radius * 100) / 100}`)
    }
  }

  const handleDraftGeofenceDrawn = (draft: DraftGeofenceShape) => {
    handleDraftGeofenceChange(draft)
    setGeofenceDrawingMode(null)
    setMapFitRequestToken((prev) => prev + 1)
  }

  const handleGeofenceRadiusChange = (value: string) => {
    setGeofenceFormRadius(value)

    const radius = Number.parseFloat(value)
    if (geofenceDraft?.type === 'circle' && Number.isFinite(radius) && radius > 0) {
      setGeofenceDraft({ ...geofenceDraft, radius })
    }
  }

  const handlePlaybackToggle = () => {
    if (routeFrames.length < 2) {
      return
    }

    if (boundedPlaybackIndex >= routeFrames.length - 1) {
      setPlaybackIndex(0)
    }

    setPlaybackPlaying((current) => !current)
    setMapMode('single')
    setMapFitRequestToken((prev) => prev + 1)
  }

  const handlePlaybackReplay = () => {
    setPlaybackPlaying(false)
    setPlaybackIndex(0)
    if (routeFrames.length > 0) {
      setMapMode('single')
      setMapFitRequestToken((prev) => prev + 1)
    }
  }

  const handlePlaybackScrub = (_event: Event, value: number | number[]) => {
    const nextIndex = Array.isArray(value) ? value[0] : value
    setPlaybackPlaying(false)
    setPlaybackIndex(nextIndex)
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
  const routeFrames = useMemo<RouteFrame[]>(() => route
    .map((position) => {
      const point = toLatLng(position)
      if (!point) {
        return null
      }

      return {
        point,
        position,
        timestampMs: getDateMs(getPositionTimestamp(position)),
        speed: typeof position.speed === 'number' && Number.isFinite(position.speed) ? position.speed : 0,
      }
    })
    .filter((frame): frame is RouteFrame => frame !== null), [route])
  const rawRoutePoints = useMemo(() => routeFrames.map((frame) => frame.point), [routeFrames])
  const routePathPoints = useMemo(() => (
    snappedRoute.displayPoints.length > 1 ? snappedRoute.displayPoints : rawRoutePoints
  ), [rawRoutePoints, snappedRoute.displayPoints])
  const geofenceShapes = useMemo(() => geofences.map(parseGeofenceArea).filter((shape): shape is ParsedGeofence => shape !== null), [geofences])
  const visibleGeofenceShapes = useMemo(() => (
    editingGeofenceId === null
      ? geofenceShapes
      : geofenceShapes.filter((shape) => `${shape.id}` !== `${editingGeofenceId}`)
  ), [editingGeofenceId, geofenceShapes])
  const routeStart = routeFrames.length > 0 ? routeFrames[0].position : null
  const routeEnd = routeFrames.length > 1 ? routeFrames[routeFrames.length - 1].position : routeFrames[0]?.position || null
  const routeStartPoint = routePathPoints[0] || null
  const routeEndPoint = routePathPoints.length > 1 ? routePathPoints[routePathPoints.length - 1] : routePathPoints[0] || null
  const boundedPlaybackIndex = routeFrames.length > 0 ? Math.min(playbackIndex, routeFrames.length - 1) : 0
  const playbackFrame = routeFrames[boundedPlaybackIndex] || null
  const playbackPoint = snappedRoute.playbackPoints[boundedPlaybackIndex] || playbackFrame?.point || null
  const nextPlaybackPoint = snappedRoute.playbackPoints[boundedPlaybackIndex + 1] || routeFrames[boundedPlaybackIndex + 1]?.point || null
  const playbackHeading = playbackPoint && nextPlaybackPoint
    ? calculateBearing(playbackPoint, nextPlaybackPoint)
    : null
  const playbackSpeedKmh = playbackFrame ? playbackFrame.speed * 1.852 : 0
  const playbackProgress = routeFrames.length > 1
    ? Math.round((boundedPlaybackIndex / (routeFrames.length - 1)) * 100)
    : 0
  const detectedStops = useMemo<DetectedStop[]>(() => {
    const stops: DetectedStop[] = []
    let cluster: Array<{ frame: RouteFrame, point: LatLngTuple }> = []

    const flushCluster = () => {
      if (cluster.length < 2) {
        cluster = []
        return
      }

      const startedAt = cluster[0].frame.timestampMs
      const endedAt = cluster[cluster.length - 1].frame.timestampMs
      const durationMs = endedAt > startedAt ? endedAt - startedAt : 0

      if (durationMs < STOP_MIN_DURATION_MS) {
        cluster = []
        return
      }

      const centerLat = cluster.reduce((sum, item) => sum + item.point[0], 0) / cluster.length
      const centerLng = cluster.reduce((sum, item) => sum + item.point[1], 0) / cluster.length
      stops.push({
        id: `stop-${startedAt}-${endedAt}-${stops.length}`,
        point: [centerLat, centerLng],
        startedAt,
        endedAt,
        durationMs,
        pointCount: cluster.length,
      })
      cluster = []
    }

    routeFrames.forEach((frame, index) => {
      const point = snappedRoute.playbackPoints[index] || frame.point
      const isSlow = frame.speed <= STOP_SPEED_THRESHOLD

      if (!isSlow) {
        flushCluster()
        return
      }

      if (cluster.length === 0) {
        cluster = [{ frame, point }]
        return
      }

      const anchorPoint = cluster[0].point
      if (haversineDistanceMeters(anchorPoint, point) <= STOP_RADIUS_METERS) {
        cluster.push({ frame, point })
      } else {
        flushCluster()
        cluster = [{ frame, point }]
      }
    })

    flushCluster()
    return stops
  }, [routeFrames, snappedRoute.playbackPoints])
  const heatmapPoints = useMemo<RouteHeatmapPoint[]>(() => routeFrames.map((frame, index) => {
    const point = snappedRoute.playbackPoints[index] || frame.point
    const slowBias = frame.speed <= STOP_SPEED_THRESHOLD ? 6 : Math.max(1, 5 - (frame.speed / 12))
    return { point, weight: slowBias }
  }), [routeFrames, snappedRoute.playbackPoints])
  const geofenceDraftReady = hasDraftGeofenceGeometry(geofenceDraft)
  const geofenceDraftPointCount = geofenceDraft?.type === 'circle' ? 0 : geofenceDraft?.points.length || 0

  const linkedCarsCount = fleetCars.filter((item) => item.isLinked).length
  const liveCarsCount = fleetCars.filter((item) => item.currentPoint).length
  const onlineCarsCount = fleetCars.filter((item) => item.isOnline).length
  const canLoadTracking = !!selectedCar?.tracking?.deviceId && integrationEnabled
  const hasMapData = mapMode === 'fleet'
    ? liveCarsCount > 0
    : !!currentPoint || routePathPoints.length > 0 || visibleGeofenceShapes.length > 0 || geofenceDraftReady || geofenceDrawingMode !== null

  useEffect(() => {
    let active = true

    setPlaybackPlaying(false)
    setPlaybackIndex(0)

    if (rawRoutePoints.length < 2) {
      setSnappedRoute({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'idle' })
      return () => {
        active = false
      }
    }

    setSnappedRoute({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'loading' })

    const snapRoute = async () => {
      try {
        const result = await snapRouteToRoads(rawRoutePoints as RoadPoint[], env.GOOGLE_MAPS_API_KEY)
        if (active) {
          setSnappedRoute({
            displayPoints: result.displayPoints,
            playbackPoints: result.playbackPoints,
            mode: 'snapped',
          })
        }
      } catch {
        if (active) {
          setSnappedRoute({ displayPoints: rawRoutePoints, playbackPoints: rawRoutePoints, mode: 'raw' })
        }
      }
    }

    void snapRoute()

    return () => {
      active = false
    }
  }, [rawRoutePoints])

  useEffect(() => {
    if (!playbackPlaying || routeFrames.length < 2) {
      return
    }

    if (boundedPlaybackIndex >= routeFrames.length - 1) {
      setPlaybackPlaying(false)
      return
    }

    const currentFrame = routeFrames[boundedPlaybackIndex]
    const nextFrame = routeFrames[boundedPlaybackIndex + 1]
    const deltaMs = currentFrame.timestampMs > 0 && nextFrame.timestampMs > currentFrame.timestampMs
      ? nextFrame.timestampMs - currentFrame.timestampMs
      : 4000
    const delay = Math.max(140, Math.min(1200, deltaMs / playbackSpeed))

    const timer = window.setTimeout(() => {
      setPlaybackIndex((current) => Math.min(current + 1, routeFrames.length - 1))
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [boundedPlaybackIndex, playbackPlaying, playbackSpeed, routeFrames])

  const resetTrackingData = () => {
    setPositions([])
    setRoute([])
    setSnappedRoute({ displayPoints: [], playbackPoints: [], mode: 'idle' })
    setPlaybackPlaying(false)
    setPlaybackIndex(0)
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
    setActivePanelSection('geofences')
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
    setActivePanelSection('vehicle')
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      setPositions(await TraccarService.getPositions(selectedCar._id))
      setMapMode('single')
      setMapFitRequestToken((prev) => prev + 1)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchRoute = async () => {
    setActivePanelSection('route')
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      setRoute(await TraccarService.getRoute(selectedCar._id, new Date(from).toISOString(), new Date(to).toISOString()))
      setMapMode('single')
      setMapFitRequestToken((prev) => prev + 1)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchGeofences = async () => {
    setActivePanelSection('geofences')
    if (!selectedCar) {
      return
    }

    setLoading(true)
    try {
      setGeofences(await TraccarService.getGeofences(selectedCar._id))
      setMapMode('single')
      setMapFitRequestToken((prev) => prev + 1)
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

  const handleDeleteGeofence = async (geofenceId: number) => {
    if (!window.confirm(strings.DELETE_GEOFENCE_CONFIRM)) {
      return
    }

    setLoading(true)
    try {
      await TraccarService.deleteGeofence(geofenceId)
      await Promise.all([
        loadAllGeofences(),
        canLoadTracking && selectedCar ? TraccarService.getGeofences(selectedCar._id).then(setGeofences) : Promise.resolve(),
      ])

      if (editingGeofenceId === geofenceId) {
        resetGeofenceForm()
      }

      helper.info(strings.GEOFENCE_DELETED)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFetchAlerts = async () => {
    setActivePanelSection('alerts')
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
    setActivePanelSection('vehicle')
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
      setMapMode('single')
      setMapFitRequestToken((prev) => prev + 1)
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
        <div className="tracking-page tracking-workspace">
          {!integrationEnabled && (
            <Alert severity="error" className="tracking-info-alert">
              {strings.INTEGRATION_DISABLED}
            </Alert>
          )}

          <div className="tracking-shell">
            <div className="tracking-shell__map">
              {!hasMapData && mapMode === 'fleet'
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
                    routePathPoints={routePathPoints}
                    routeStartPoint={routeStartPoint}
                    routeEndPoint={routeEndPoint}
                    playbackPoint={playbackPoint}
                    playbackPosition={playbackFrame?.position || null}
                    playbackHeading={playbackHeading}
                    heatmapPoints={heatmapPoints}
                    showHeatmap={showHeatmap}
                    stopMarkers={detectedStops}
                    showStops={showStops}
                    geofenceShapes={visibleGeofenceShapes}
                    draftGeofence={geofenceDraft}
                    drawingMode={geofenceDrawingMode}
                    fitRequestToken={mapFitRequestToken}
                    onMarkerClick={selectCar}
                    onDraftGeofenceChange={handleDraftGeofenceChange}
                    onDraftGeofenceDrawn={handleDraftGeofenceDrawn}
                  />
                  )}

              <div className="tracking-map-overlay tracking-map-overlay--top">
                <div className="tracking-map-badges">
                  <Chip color={integrationEnabled ? 'success' : 'error'} label={integrationEnabled ? strings.LIVE_FLEET : strings.INTEGRATION_DISABLED} />
                  <Chip label={`${linkedCarsCount} ${strings.LINKED_DEVICES}`} />
                  <Chip label={`${onlineCarsCount} ${strings.ONLINE_DEVICES}`} />
                  {selectedCar && <Chip color={trackingEnabled ? 'success' : 'default'} label={selectedCar.name} />}
                </div>
                <div className="tracking-map-legend-card">
                  <Typography className="tracking-map-legend-title">{strings.MAP_OVERVIEW}</Typography>
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
              </div>

            {mapMode === 'single' && routeFrames.length > 0 && (
              <div className="tracking-map-playback-panel">
                <div className="tracking-map-playback-panel__row">
                  <strong>{strings.ROUTE_PLAYBACK}</strong>
                  <span>{`${playbackProgress}%`}</span>
                </div>
                <div className="tracking-map-playback-panel__stats">
                  <span>{formatTimestamp(getPositionTimestamp(playbackFrame?.position || null))}</span>
                  <span>{`${formatNumber(playbackSpeedKmh, ' km/h')}`}</span>
                  <span>{`${boundedPlaybackIndex + 1}/${routeFrames.length}`}</span>
                </div>
                <div className="tracking-map-playback-panel__controls">
                  <Button
                    size="small"
                    variant="contained"
                    className="btn-primary"
                    onClick={handlePlaybackToggle}
                    disabled={routeFrames.length < 2}
                    startIcon={playbackPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  >
                    {playbackPlaying ? strings.ROUTE_PAUSE : strings.ROUTE_PLAYBACK}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handlePlaybackReplay}
                    disabled={routeFrames.length < 2}
                    startIcon={<RestartAltIcon />}
                  >
                    {strings.PLAYBACK_RESTART}
                  </Button>
                </div>
                <Slider
                  min={0}
                  max={Math.max(routeFrames.length - 1, 0)}
                  value={boundedPlaybackIndex}
                  onChange={handlePlaybackScrub}
                  step={1}
                  disabled={routeFrames.length < 2}
                  size="small"
                />
              </div>
            )}

            </div>

            <aside className="tracking-panel">
              <div className="tracking-panel__handle" />
              <div className="tracking-panel__header">
                <div>
                  <Typography variant="h4" className="tracking-title">{strings.TITLE}</Typography>
                  <Typography className="tracking-subtitle">{strings.TRACKING_SUBTITLE}</Typography>
                </div>
                <div className="tracking-header-chips">
                  <Chip size="small" color={integrationEnabled ? 'success' : 'error'} label={integrationEnabled ? strings.LIVE_FLEET : strings.INTEGRATION_DISABLED} />
                  {selectedCar && <Chip size="small" color={trackingEnabled ? 'success' : 'default'} label={selectedCar.licensePlate || strings.SELECTED_VEHICLE} />}
                </div>
              </div>

              <div className="tracking-panel__toolbar">
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

                <div className="tracking-panel__actions">
                  <Button variant="contained" className="btn-primary" onClick={handleRefreshFleet} disabled={!integrationEnabled}>
                    {strings.REFRESH_FLEET}
                  </Button>
                  <Button variant="contained" className="btn-secondary" onClick={handleLoadSnapshot} disabled={!canLoadTracking}>
                    {strings.LOAD_SNAPSHOT}
                  </Button>
                </div>
              </div>

              <div className="tracking-panel__summary">
                <div className="tracking-panel__summary-item">
                  <span>{strings.SELECTED_VEHICLE}</span>
                  <strong>{selectedCar?.name || strings.NO_DATA}</strong>
                </div>
                <div className="tracking-panel__summary-item">
                  <span>{strings.CURRENT_POSITION}</span>
                  <strong>{currentPoint ? `${formatCoordinate(currentPosition?.latitude)}, ${formatCoordinate(currentPosition?.longitude)}` : '-'}</strong>
                </div>
                <div className="tracking-panel__summary-item">
                  <span>{strings.DEVICE_STATUS}</span>
                  <strong>{selectedFleetCar?.deviceStatus || strings.NO_DATA}</strong>
                </div>
              </div>

              <div className="tracking-panel__tabs">
                <ToggleButtonGroup
                  value={activePanelSection}
                  exclusive
                  onChange={(_event, value: TrackingPanelSection | null) => value && setActivePanelSection(value)}
                  size="small"
                  className="tracking-section-tabs"
                >
                  <ToggleButton value="fleet"><DirectionsCarFilledIcon fontSize="small" /> {strings.LIVE_FLEET}</ToggleButton>
                  <ToggleButton value="vehicle"><MyLocationIcon fontSize="small" /> {strings.SELECTED_VEHICLE}</ToggleButton>
                  <ToggleButton value="route"><RouteIcon fontSize="small" /> {strings.ROUTE_HISTORY}</ToggleButton>
                  <ToggleButton value="geofences"><RadarIcon fontSize="small" /> {strings.GEOFENCES}</ToggleButton>
                  <ToggleButton value="alerts"><WarningAmberIcon fontSize="small" /> {strings.GEOFENCE_ALERTS}</ToggleButton>
                </ToggleButtonGroup>
              </div>

              <div className="tracking-panel__content">
                {activePanelSection === 'fleet' && (
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
                )}

                {activePanelSection === 'vehicle' && (
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
                )}

                {activePanelSection === 'geofences' && (
                  <>
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
                      onChange={(event) => handleGeofenceTypeChange(event.target.value as GeofenceEditorType)}
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

                <Alert
                  severity={geofenceDrawingMode ? 'warning' : geofenceDraftReady ? 'success' : 'info'}
                  className="tracking-inline-alert tracking-geofence-editor-alert"
                >
                  {geofenceDrawingMode
                    ? strings.GEOFENCE_DRAWING_ACTIVE
                    : geofenceDraftReady
                      ? strings.GEOFENCE_READY
                      : strings.DRAW_ON_MAP_HELP}
                </Alert>

                <div className="tracking-actions tracking-actions--compact">
                  <Button
                    variant={geofenceDrawingMode === geofenceFormType ? 'contained' : 'outlined'}
                    className={geofenceDrawingMode === geofenceFormType ? 'btn-primary' : undefined}
                    onClick={handleStartGeofenceDrawing}
                    disabled={!integrationEnabled}
                  >
                    {geofenceDrawingMode === geofenceFormType ? commonStrings.CANCEL : strings.DRAW_ON_MAP}
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleClearGeofenceDrawing}
                    disabled={!geofenceDraft && !geofenceDrawingMode}
                  >
                    {strings.CLEAR_SHAPE}
                  </Button>
                </div>

                <div className="tracking-geofence-summary">
                  <div className="tracking-geofence-summary-item">
                    <span>{strings.SHAPE}</span>
                    <strong>
                      {geofenceFormType === 'circle'
                        ? strings.GEOFENCE_TYPE_CIRCLE
                        : geofenceFormType === 'polygon'
                          ? strings.GEOFENCE_TYPE_POLYGON
                          : strings.GEOFENCE_TYPE_POLYLINE}
                    </strong>
                  </div>
                  <div className="tracking-geofence-summary-item">
                    <span>{strings.GEOFENCE_POINTS}</span>
                    <strong>{geofenceDraft?.type === 'circle' ? '-' : `${geofenceDraftPointCount}`}</strong>
                  </div>
                  {geofenceDraft?.type === 'circle' && (
                    <>
                      <div className="tracking-geofence-summary-item">
                        <span>{strings.CENTER_LATITUDE}</span>
                        <strong>{formatCoordinate(geofenceDraft.center[0])}</strong>
                      </div>
                      <div className="tracking-geofence-summary-item">
                        <span>{strings.CENTER_LONGITUDE}</span>
                        <strong>{formatCoordinate(geofenceDraft.center[1])}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="tracking-grid">
                  {geofenceFormType === 'circle' && (
                    <TextField
                      label={strings.RADIUS_METERS}
                      value={geofenceFormRadius}
                      onChange={(event) => handleGeofenceRadiusChange(event.target.value)}
                    />
                  )}
                  {geofenceFormType === 'polyline' && (
                    <TextField
                      label={strings.POLYLINE_DISTANCE}
                      value={geofenceFormPolylineDistance}
                      onChange={(event) => setGeofenceFormPolylineDistance(event.target.value)}
                    />
                  )}
                </div>

                <div className="tracking-actions">
                  <Button variant="contained" className="btn-primary" onClick={handleSaveGeofence} disabled={!integrationEnabled || !geofenceDraftReady}>
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
                        const editable = !!parseEditableGeofence(geofence)
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
                                disabled={!integrationEnabled || !editable}
                              >
                                {strings.EDIT_GEOFENCE}
                              </Button>
                              <Button
                                variant="text"
                                color="error"
                                onClick={() => typeof geofence.id === 'number' && handleDeleteGeofence(geofence.id)}
                                disabled={!integrationEnabled || typeof geofence.id !== 'number'}
                              >
                                {commonStrings.DELETE}
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
                  </>
                )}

                {activePanelSection === 'vehicle' && (
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
                )}

                {activePanelSection === 'route' && (
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

                {routeFrames.length > 0 && snappedRoute.mode !== 'idle' && (
                  <Alert
                    severity={snappedRoute.mode === 'loading' ? 'info' : snappedRoute.mode === 'snapped' ? 'success' : 'warning'}
                    className="tracking-inline-alert"
                  >
                    {snappedRoute.mode === 'loading'
                      ? strings.ROUTE_SNAP_LOADING
                      : snappedRoute.mode === 'snapped'
                        ? strings.ROUTE_SNAP_READY
                      : strings.ROUTE_SNAP_FALLBACK}
                  </Alert>
                )}

                {routeFrames.length > 0 && (
                  <div className="tracking-route-visibility">
                    <FormControlLabel
                      control={<Switch checked={showHeatmap} onChange={(event) => setShowHeatmap(event.target.checked)} />}
                      label={strings.HEATMAP}
                    />
                    <FormControlLabel
                      control={<Switch checked={showStops} onChange={(event) => setShowStops(event.target.checked)} />}
                      label={`${strings.STOP_DETECTION} (${detectedStops.length})`}
                    />
                  </div>
                )}

                {routeFrames.length > 0
                  ? (
                    <>
                      <div className="tracking-route-player">
                        <div className="tracking-route-player__stats">
                          <div className="tracking-route-player__stat">
                            <span>{strings.PLAYBACK_POSITION}</span>
                            <strong>{`${boundedPlaybackIndex + 1}/${routeFrames.length}`}</strong>
                          </div>
                          <div className="tracking-route-player__stat">
                            <span>{strings.SPEED}</span>
                            <strong>{`${formatNumber(playbackSpeedKmh, ' km/h')}`}</strong>
                          </div>
                          <div className="tracking-route-player__stat">
                            <span>{strings.TIME}</span>
                            <strong>{formatTimestamp(getPositionTimestamp(playbackFrame?.position || null))}</strong>
                          </div>
                        </div>

                        <div className="tracking-route-player__controls">
                          <Button
                            variant="contained"
                            className="btn-primary"
                            onClick={handlePlaybackToggle}
                            disabled={routeFrames.length < 2}
                            startIcon={playbackPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                          >
                            {playbackPlaying ? strings.ROUTE_PAUSE : strings.ROUTE_PLAYBACK}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handlePlaybackReplay}
                            disabled={routeFrames.length < 2}
                            startIcon={<RestartAltIcon />}
                          >
                            {strings.PLAYBACK_RESTART}
                          </Button>
                        </div>

                        <div className="tracking-route-player__toolbar">
                          <div className="tracking-route-player__speed">
                            <span>{strings.PLAYBACK_SPEED}</span>
                            <ToggleButtonGroup
                              value={playbackSpeed}
                              exclusive
                              size="small"
                              onChange={(_event, value: number | null) => value && setPlaybackSpeed(value)}
                            >
                              {PLAYBACK_SPEED_OPTIONS.map((speed) => (
                                <ToggleButton key={speed} value={speed}>{`${speed}x`}</ToggleButton>
                              ))}
                            </ToggleButtonGroup>
                          </div>
                          <div className="tracking-route-player__progress">
                            <span>{`${strings.PLAYBACK_PROGRESS}: ${playbackProgress}%`}</span>
                          </div>
                        </div>

                        <Slider
                          min={0}
                          max={Math.max(routeFrames.length - 1, 0)}
                          value={boundedPlaybackIndex}
                          onChange={handlePlaybackScrub}
                          step={1}
                          marks={[
                            { value: 0, label: strings.ROUTE_START },
                            { value: Math.max(routeFrames.length - 1, 0), label: strings.ROUTE_END },
                          ]}
                          disabled={routeFrames.length < 2}
                        />
                      </div>

                      <div className="tracking-route-stops">
                        <div className="tracking-header">
                          <Typography variant="subtitle1">{strings.STOP_DETECTION}</Typography>
                          <Chip size="small" label={`${detectedStops.length} ${strings.STOPS}`} />
                        </div>

                        {detectedStops.length > 0
                          ? (
                            <div className="tracking-list">
                              {detectedStops.slice(0, 6).map((stop) => (
                                <div key={stop.id} className="tracking-list-item">
                                  <div>{`${formatTimestamp(stop.startedAt)} -> ${formatTimestamp(stop.endedAt)}`}</div>
                                  <div className="tracking-list-subtext">{`${strings.STOP_DURATION}: ${formatDuration(stop.durationMs)}`}</div>
                                </div>
                              ))}
                            </div>
                            )
                          : (
                            <div className="tracking-empty">{strings.NO_STOPS}</div>
                            )}
                      </div>

                      <div className="tracking-list">
                        {routeFrames.slice(0, 10).map((frame, index) => (
                          <div key={frame.position.id || `${frame.position.latitude}-${frame.position.longitude}-${index}`} className="tracking-list-item">
                            <div>{formatTimestamp(getPositionTimestamp(frame.position))}</div>
                            <div className="tracking-list-subtext">{`${formatCoordinate(frame.position.latitude)}, ${formatCoordinate(frame.position.longitude)}`}</div>
                          </div>
                        ))}
                      </div>
                    </>
                    )
                  : (
                    <div className="tracking-empty">{strings.NO_DATA}</div>
                    )}
                  </Paper>
                )}

                {activePanelSection === 'geofences' && (
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
                )}

                {activePanelSection === 'alerts' && (
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
                )}

                {activePanelSection === 'geofences' && geofences.length > 0 && geofenceShapes.length !== geofences.length && (
                  <Alert severity="info" className="tracking-info-alert tracking-overlay-alert">
                    {strings.GEOFENCE_PARSE_NOTICE}
                  </Alert>
                )}
            </div>
          </aside>
        </div>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Tracking
