import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

export interface TraccarLinkPayload {
  deviceId: number
  deviceName?: string
  notes?: string
  enabled?: boolean
}

export interface TraccarFleetItem {
  carId: string
  deviceId: number
  trackingEnabled: boolean
  deviceName?: string
  deviceStatus?: string
  lastEventType?: string
  lastSyncedAt?: Date | string
  position: bookcarsTypes.TraccarPosition | null
}

export const getStatus = (): Promise<{ enabled: boolean, baseUrl: string }> =>
  axiosInstance
    .get('/api/status', { withCredentials: true })
    .then((res) => res.data)

export const getDevices = (): Promise<bookcarsTypes.TraccarDevice[]> =>
  axiosInstance
    .get('/api/devices', { withCredentials: true })
    .then((res) => res.data)

export const getFleetOverview = (): Promise<TraccarFleetItem[]> =>
  axiosInstance
    .get('/api/fleet', { withCredentials: true })
    .then((res) => res.data)

export const linkDevice = (carId: string, payload: TraccarLinkPayload): Promise<bookcarsTypes.TraccarCarTracking> =>
  axiosInstance
    .post(`/api/link/${encodeURIComponent(carId)}`, payload, { withCredentials: true })
    .then((res) => res.data)

export const unlinkDevice = (carId: string): Promise<bookcarsTypes.TraccarCarTracking> =>
  axiosInstance
    .post(`/api/unlink/${encodeURIComponent(carId)}`, null, { withCredentials: true })
    .then((res) => res.data)

export const getPositions = (carId: string): Promise<bookcarsTypes.TraccarPosition[]> =>
  axiosInstance
    .get(`/api/positions/${encodeURIComponent(carId)}`, { withCredentials: true })
    .then((res) => res.data)

export const getRoute = (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarPosition[]> =>
  axiosInstance
    .get(`/api/route/${encodeURIComponent(carId)}`, { params: { from, to }, withCredentials: true })
    .then((res) => res.data)

export const getGeofences = (carId: string): Promise<bookcarsTypes.TraccarGeofence[]> =>
  axiosInstance
    .get(`/api/geofences/${encodeURIComponent(carId)}`, { withCredentials: true })
    .then((res) => res.data)

export const getGeofenceAlerts = (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarEvent[]> =>
  axiosInstance
    .get(`/api/geofence-alerts/${encodeURIComponent(carId)}`, { params: { from, to }, withCredentials: true })
    .then((res) => res.data)
