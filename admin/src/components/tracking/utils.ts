import type { Libraries } from '@react-google-maps/api'
import * as bookcarsTypes from ':bookcars-types'
import wellknown from 'wellknown'
import type {
  DraftGeofenceShape,
  FleetCounts,
  FleetVehicle,
  GeofenceEditorType,
  LatLngTuple,
  ParsedGeofence,
  RouteFrame,
} from './types'

export const DEFAULT_CENTER: LatLngTuple = [33.8938, 35.5018]
export const CARS_FETCH_SIZE = 100
export const EVENT_CENTER_LIMIT = 80
export const LIVE_REFRESH_INTERVAL_MS = 30000
export const PLAYBACK_SPEED_OPTIONS = [1, 2, 4, 8]
export const EVENT_TYPE_OPTIONS = [
  'all',
  'geofenceEnter',
  'geofenceExit',
  'deviceOnline',
  'deviceOffline',
  'ignitionOn',
  'ignitionOff',
  'overspeed',
  'alarm',
  'motion',
  'deviceMoving',
  'deviceStopped',
] as const
export const GOOGLE_MAP_LIBRARIES: Libraries = ['drawing']

const STATUS_ORDER: Record<bookcarsTypes.TraccarFleetStatus, number> = {
  moving: 0,
  idle: 1,
  stopped: 2,
  stale: 3,
  noGps: 4,
  offline: 5,
  unlinked: 6,
}

const STATUS_COLORS: Record<bookcarsTypes.TraccarFleetStatus, string> = {
  moving: '#10b981',
  idle: '#f59e0b',
  stopped: '#3b82f6',
  stale: '#fb923c',
  noGps: '#a78bfa',
  offline: '#64748b',
  unlinked: '#334155',
}

export const isFiniteCoordinate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const formatDateInput = (date: Date) => date.toISOString().slice(0, 16)

export const getDateMs = (value?: Date | string | number | null) => {
  if (!value) {
    return 0
  }

  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
}

export const formatTimestamp = (value?: Date | string | number | null) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? `${value}` : date.toLocaleString()
}

export const formatRelativeAge = (value?: Date | string | number | null) => {
  const dateMs = getDateMs(value)
  if (!dateMs) {
    return '-'
  }

  const diffMs = Math.max(0, Date.now() - dateMs)
  const totalMinutes = Math.round(diffMs / 60000)

  if (totalMinutes < 1) {
    return 'just now'
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const formatDuration = (durationMs?: number | null) => {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return '-'
  }

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

export const formatDistanceKm = (distanceMeters?: number | null) => {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return '-'
  }

  return `${Math.round((distanceMeters / 1000) * 10) / 10} km`
}

export const formatCoordinate = (value?: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(6) : '-'
)

export const getPositionTimestamp = (position?: bookcarsTypes.TraccarPosition | null) => (
  position?.deviceTime || position?.fixTime || position?.serverTime
)

export const toLatLng = (position?: bookcarsTypes.TraccarPosition | null): LatLngTuple | null => {
  if (!position || !isFiniteCoordinate(position.latitude) || !isFiniteCoordinate(position.longitude)) {
    return null
  }

  return [position.latitude, position.longitude]
}

export const toGoogleLatLng = (point: LatLngTuple): google.maps.LatLngLiteral => ({ lat: point[0], lng: point[1] })

export const fromGoogleLatLng = (point: google.maps.LatLng | google.maps.LatLngLiteral): LatLngTuple => (
  [typeof point.lat === 'function' ? point.lat() : point.lat, typeof point.lng === 'function' ? point.lng() : point.lng]
)

export const fromGooglePath = (path: google.maps.MVCArray<google.maps.LatLng>) => path.getArray().map(fromGoogleLatLng)

export const toSearchText = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ').toLowerCase()

export const getSupplierName = (car: bookcarsTypes.Car) => {
  const supplier = car?.supplier
  if (supplier && typeof supplier === 'object' && typeof supplier.fullName === 'string') {
    return supplier.fullName
  }

  return ''
}

export const getStatusColor = (status: bookcarsTypes.TraccarFleetStatus) => STATUS_COLORS[status]

export const buildFleetVehicles = ({
  cars,
  fleetOverview,
  currentPositions,
  selectedCarId,
}: {
  cars: bookcarsTypes.Car[]
  fleetOverview: bookcarsTypes.TraccarFleetItem[]
  currentPositions: bookcarsTypes.TraccarPosition[]
  selectedCarId?: string
}): FleetVehicle[] => {
  const overviewByCarId = new Map<string, bookcarsTypes.TraccarFleetItem>()
  fleetOverview.forEach((item) => overviewByCarId.set(item.carId, item))

  const currentSelectedPosition = currentPositions[0] || null

  return [...cars]
    .map((car) => {
      const snapshot = overviewByCarId.get(car._id)
      const position = car._id === selectedCarId && currentSelectedPosition ? currentSelectedPosition : snapshot?.position || null
      const isLinked = typeof car.tracking?.deviceId === 'number'
      const deviceStatus = snapshot?.deviceStatus || car.tracking?.status || ''
      const status = snapshot?.movementStatus || (isLinked ? 'offline' : 'unlinked')
      const lastSeenSource = snapshot?.lastPositionAt
        || getPositionTimestamp(position)
        || snapshot?.lastDeviceUpdate
        || snapshot?.lastSyncedAt
        || car.tracking?.lastSyncedAt

      return {
        car,
        snapshot,
        position,
        point: toLatLng(position),
        isLinked,
        isOnline: deviceStatus.trim().toLowerCase() === 'online',
        status,
        speedKmh: snapshot?.speedKmh || 0,
        lastSeenLabel: formatRelativeAge(lastSeenSource),
        supplierName: getSupplierName(car),
        deviceName: snapshot?.deviceName || car.tracking?.deviceName || '',
        deviceStatus,
        batteryLevel: snapshot?.batteryLevel,
        ignition: snapshot?.ignition,
        address: snapshot?.address || position?.address,
        staleMinutes: snapshot?.staleMinutes,
      } satisfies FleetVehicle
    })
    .sort((left, right) => {
      const statusDiff = STATUS_ORDER[left.status] - STATUS_ORDER[right.status]
      if (statusDiff !== 0) {
        return statusDiff
      }

      if (left.isLinked !== right.isLinked) {
        return left.isLinked ? -1 : 1
      }

      return left.car.name.localeCompare(right.car.name)
    })
}

export const buildFleetCounts = (vehicles: FleetVehicle[]): FleetCounts => ({
  total: vehicles.length,
  moving: vehicles.filter((item) => item.status === 'moving').length,
  idle: vehicles.filter((item) => item.status === 'idle').length,
  stopped: vehicles.filter((item) => item.status === 'stopped').length,
  stale: vehicles.filter((item) => item.status === 'stale').length,
  offline: vehicles.filter((item) => item.status === 'offline').length,
  noGps: vehicles.filter((item) => item.status === 'noGps').length,
  unlinked: vehicles.filter((item) => item.status === 'unlinked').length,
})

export const buildRouteFrames = (route: bookcarsTypes.TraccarPosition[]): RouteFrame[] => route
  .map((position) => {
    const point = toLatLng(position)
    if (!point) {
      return null
    }

    const speedKmh = typeof position.speed === 'number' && Number.isFinite(position.speed)
      ? Math.round(position.speed * 1.852 * 100) / 100
      : 0

    return {
      point,
      position,
      timestampMs: getDateMs(getPositionTimestamp(position)),
      speedKmh,
    } satisfies RouteFrame
  })
  .filter((frame): frame is RouteFrame => frame !== null)

export const calculateBearing = (from: LatLngTuple, to: LatLngTuple) => {
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

export const normalizeLatLngOrder = (first: number, second: number): LatLngTuple => {
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return [second, first]
  }

  return [first, second]
}

export const closePolygon = (points: LatLngTuple[]) => {
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

export const openPolygon = (points: LatLngTuple[]) => {
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

export const hasDraftGeofenceGeometry = (draft: DraftGeofenceShape | null) => {
  if (!draft) {
    return false
  }

  if (draft.type === 'circle') {
    return isFiniteCoordinate(draft.center[0]) && isFiniteCoordinate(draft.center[1]) && draft.radius > 0
  }

  return draft.points.length >= (draft.type === 'polygon' ? 3 : 2)
}

export const parseEditableGeofence = (geofence: bookcarsTypes.TraccarGeofence): DraftGeofenceShape | null => {
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

  const geometry = geofence.geojson?.type === 'Feature' ? geofence.geojson.geometry : geofence.geojson
  if (geometry?.type === 'LineString') {
    const points = (geometry.coordinates || []).map((coordinate: [number, number]) => [coordinate[1], coordinate[0]] as LatLngTuple)
    return points.length >= 2 ? { type: 'polyline', points } : null
  }

  if (geometry?.type === 'Polygon') {
    const ring = (geometry.coordinates?.[0] || []).map((coordinate: [number, number]) => [coordinate[1], coordinate[0]] as LatLngTuple)
    const points = openPolygon(ring)
    return points.length >= 3 ? { type: 'polygon', points } : null
  }

  if (geometry?.type === 'MultiPolygon') {
    const ring = (geometry.coordinates?.[0]?.[0] || []).map((coordinate: [number, number]) => [coordinate[1], coordinate[0]] as LatLngTuple)
    const points = openPolygon(ring)
    return points.length >= 3 ? { type: 'polygon', points } : null
  }

  if (area.toUpperCase().startsWith('RECTANGLE')) {
    const values = (area.match(/[+-]?\d+(?:\.\d+)?/g) || [])
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    if (values.length >= 4) {
      const [lat1, lng1] = normalizeLatLngOrder(values[0], values[1])
      const [lat2, lng2] = normalizeLatLngOrder(values[2], values[3])
      const north = Math.max(lat1, lat2)
      const south = Math.min(lat1, lat2)
      const east = Math.max(lng1, lng2)
      const west = Math.min(lng1, lng2)

      return {
        type: 'polygon',
        points: [
          [north, west],
          [north, east],
          [south, east],
          [south, west],
        ],
      }
    }
  }

  try {
    const wktGeometry = wellknown.parse(area)
    if (wktGeometry?.type === 'LineString') {
      const points = (wktGeometry.coordinates || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
      return points.length >= 2 ? { type: 'polyline', points } : null
    }

    if (wktGeometry?.type === 'Polygon') {
      const ring = (wktGeometry.coordinates?.[0] || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
      const points = openPolygon(ring)
      return points.length >= 3 ? { type: 'polygon', points } : null
    }

    if (wktGeometry?.type === 'MultiPolygon') {
      const ring = (wktGeometry.coordinates?.[0]?.[0] || []).map((coordinate) => [coordinate[1], coordinate[0]] as LatLngTuple)
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

export const parseGeofenceArea = (geofence: bookcarsTypes.TraccarGeofence, fallbackIndex: number): ParsedGeofence | null => {
  if (geofence.geojson) {
    const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
    const id = geofence.id ?? `GEOJSON-${fallbackIndex}`

    return { id, name, shape: 'geojson', geojson: { type: 'Feature', properties: { name }, geometry: geofence.geojson } }
  }

  if (!geofence.area) {
    return null
  }

  const [rawType] = geofence.area.split('(', 2)
  if (!rawType) {
    return null
  }

  const shapeType = rawType.trim().toUpperCase()
  const name = geofence.name || geofence.description || `Geofence ${fallbackIndex + 1}`
  const id = geofence.id ?? `${shapeType}-${fallbackIndex}`

  if (shapeType === 'CIRCLE') {
    const match = geofence.area.match(/CIRCLE\s*\(\s*([-\d.]+)(?:\s+|,\s*)([-\d.]+)\s*,\s*([-\d.]+)\s*\)\s*$/i)
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
    const geometry = wellknown.parse(geofence.area)
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

export const extractGeoJsonPaths = (geojson: any): LatLngTuple[][] => {
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

export const buildGeofencePayload = ({
  name,
  description,
  type,
  draft,
  radiusText,
  polylineDistanceText,
}: {
  name: string
  description: string
  type: GeofenceEditorType
  draft: DraftGeofenceShape | null
  radiusText: string
  polylineDistanceText: string
}) => {
  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('Invalid geofence name')
  }

  if (!draft || draft.type !== type) {
    throw new Error('Invalid geofence geometry')
  }

  if (draft.type === 'circle') {
    const radius = Number.isFinite(draft.radius) && draft.radius > 0
      ? draft.radius
      : Number.parseFloat(radiusText)
    if (![draft.center[0], draft.center[1], radius].every((value) => Number.isFinite(value)) || radius <= 0) {
      throw new Error('Invalid geofence radius')
    }

    return {
      name: normalizedName,
      description: description.trim() || undefined,
      area: `CIRCLE (${draft.center[0]} ${draft.center[1]}, ${radius})`,
      attributes: {},
    }
  }

  const points = draft.points

  if (draft.type === 'polyline') {
    if (points.length < 2) {
      throw new Error('Invalid polyline geofence')
    }

    const polylineDistance = Number.parseFloat(polylineDistanceText)
    if (!Number.isFinite(polylineDistance) || polylineDistance <= 0) {
      throw new Error('Invalid polyline distance')
    }

    return {
      name: normalizedName,
      description: description.trim() || undefined,
      area: `LINESTRING (${points.map(([lat, lng]) => `${lat} ${lng}`).join(', ')})`,
      attributes: { polylineDistance },
    }
  }

  if (points.length < 3) {
    throw new Error('Invalid polygon geofence')
  }

  const closedPoints = closePolygon(points)
  return {
    name: normalizedName,
    description: description.trim() || undefined,
    area: `POLYGON ((${closedPoints.map(([lat, lng]) => `${lat} ${lng}`).join(', ')}))`,
    attributes: {},
  }
}
