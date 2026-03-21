import * as bookcarsTypes from ':bookcars-types'

export type LatLngTuple = [number, number]

export type TrackingTab = 'status' | 'route' | 'geofences' | 'events' | 'device'
export type SidebarView = 'fleet' | 'vehicle'
export type TrackingMapType = 'roadmap' | 'hybrid'
export type GeofenceEditorType = 'circle' | 'polygon' | 'polyline'

export type DraftGeofenceShape =
  | { type: 'circle', center: LatLngTuple, radius: number }
  | { type: 'polygon', points: LatLngTuple[] }
  | { type: 'polyline', points: LatLngTuple[] }

export type ParsedGeofence = {
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

export type FleetVehicle = {
  car: bookcarsTypes.Car
  snapshot?: bookcarsTypes.TraccarFleetItem
  position: bookcarsTypes.TraccarPosition | null
  point: LatLngTuple | null
  isLinked: boolean
  isOnline: boolean
  status: bookcarsTypes.TraccarFleetStatus
  speedKmh: number
  lastSeenLabel: string
  supplierName: string
  deviceName: string
  deviceStatus: string
  batteryLevel?: number
  ignition?: boolean
  address?: string
  staleMinutes?: number
}

export type FleetCounts = {
  total: number
  moving: number
  idle: number
  stopped: number
  stale: number
  offline: number
  noGps: number
  unlinked: number
}

export type RouteFrame = {
  point: LatLngTuple
  position: bookcarsTypes.TraccarPosition
  timestampMs: number
  speedKmh: number
}
