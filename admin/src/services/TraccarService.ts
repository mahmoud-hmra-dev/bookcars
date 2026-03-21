import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'

export interface TraccarLinkPayload {
  deviceId: number
  deviceName?: string
  notes?: string
  enabled?: boolean
}

export interface TraccarGeofenceEditorPayload {
  name: string
  description?: string
  area: string
  calendarId?: number
  attributes?: Record<string, any>
}

export interface TraccarEventCenterParams {
  carId?: string
  from: string
  to: string
  types?: string[]
  limit?: number
}

export interface TraccarCommandPayload {
  type: string
  textChannel?: boolean
  attributes?: Record<string, any>
}

export const getStatus = (): Promise<{ enabled: boolean, baseUrl: string }> =>
  axiosInstance
    .get('/api/status', { withCredentials: true })
    .then((res) => res.data)

export const getDevices = (): Promise<bookcarsTypes.TraccarDevice[]> =>
  axiosInstance
    .get('/api/devices', { withCredentials: true })
    .then((res) => res.data)

export const getFleetOverview = (): Promise<{ items: bookcarsTypes.TraccarFleetItem[], health: bookcarsTypes.TraccarFleetHealth }> =>
  axiosInstance
    .get('/api/fleet', { withCredentials: true })
    .then((res) => res.data)

export const getAllGeofences = (): Promise<bookcarsTypes.TraccarGeofence[]> =>
  axiosInstance
    .get('/api/geofences', { withCredentials: true })
    .then((res) => res.data)

export const createGeofence = (payload: TraccarGeofenceEditorPayload): Promise<bookcarsTypes.TraccarGeofence> =>
  axiosInstance
    .post('/api/geofences', payload, { withCredentials: true })
    .then((res) => res.data)

export const updateGeofence = (geofenceId: number, payload: TraccarGeofenceEditorPayload): Promise<bookcarsTypes.TraccarGeofence> =>
  axiosInstance
    .put(`/api/geofences/entity/${geofenceId}`, payload, { withCredentials: true })
    .then((res) => res.data)

export const deleteGeofence = (geofenceId: number): Promise<void> =>
  axiosInstance
    .delete(`/api/geofences/entity/${geofenceId}`, { withCredentials: true })
    .then(() => undefined)

export const linkGeofence = (carId: string, geofenceId: number): Promise<bookcarsTypes.TraccarGeofence[]> =>
  axiosInstance
    .post(`/api/geofences/${encodeURIComponent(carId)}/link/${geofenceId}`, null, { withCredentials: true })
    .then((res) => res.data)

export const unlinkGeofence = (carId: string, geofenceId: number): Promise<bookcarsTypes.TraccarGeofence[]> =>
  axiosInstance
    .post(`/api/geofences/${encodeURIComponent(carId)}/unlink/${geofenceId}`, null, { withCredentials: true })
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

export const getCommandTypes = (carId: string): Promise<bookcarsTypes.TraccarCommandType[]> =>
  axiosInstance
    .get(`/api/commands/${encodeURIComponent(carId)}/types`, { withCredentials: true })
    .then((res) => res.data)

export const sendCommand = (carId: string, payload: TraccarCommandPayload): Promise<bookcarsTypes.TraccarCommand> =>
  axiosInstance
    .post(`/api/commands/${encodeURIComponent(carId)}/send`, payload, { withCredentials: true })
    .then((res) => res.data)

export const getRoute = (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarPosition[]> =>
  axiosInstance
    .get(`/api/route/${encodeURIComponent(carId)}`, { params: { from, to }, withCredentials: true })
    .then((res) => res.data)

export const getVehicleReports = (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarVehicleReportBundle> =>
  axiosInstance
    .get(`/api/reports/${encodeURIComponent(carId)}`, { params: { from, to }, withCredentials: true })
    .then((res) => res.data)

export const getGeofences = (carId: string): Promise<bookcarsTypes.TraccarGeofence[]> =>
  axiosInstance
    .get(`/api/geofences/${encodeURIComponent(carId)}`, { withCredentials: true })
    .then((res) => res.data)

export const getGeofenceAlerts = (carId: string, from: string, to: string): Promise<bookcarsTypes.TraccarEvent[]> =>
  axiosInstance
    .get(`/api/geofence-alerts/${encodeURIComponent(carId)}`, { params: { from, to }, withCredentials: true })
    .then((res) => res.data)

export const getEventCenter = (params: TraccarEventCenterParams): Promise<bookcarsTypes.TraccarEventCenterEntry[]> =>
  axiosInstance
    .get('/api/events-center', {
      params: {
        ...params,
        types: params.types && params.types.length > 0 ? params.types.join(',') : undefined,
      },
      withCredentials: true,
    })
    .then((res) => res.data)
