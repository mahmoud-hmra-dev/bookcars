import axios, { AxiosInstance } from 'axios'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'

let client: AxiosInstance | null = null

const GEOFENCE_FALLBACK_LOOKBACK_DAYS = 30

const getClient = () => {
  if (!client) {
    client = axios.create({
      baseURL: env.TRACCAR_BASE_URL,
      timeout: env.TRACCAR_TIMEOUT,
      auth: {
        username: env.TRACCAR_USERNAME,
        password: env.TRACCAR_PASSWORD,
      },
      headers: {
        Accept: 'application/json',
      },
    })
  }

  return client
}

const ensureEnabled = () => {
  if (!env.TRACCAR_ENABLED) {
    throw new Error('Traccar integration disabled')
  }
}

const isInvalidDeviceGeofenceFilterError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return error.response?.status === 400
}

const uniqueById = <T extends { id?: number }>(items: T[]) => {
  const seen = new Set<number>()

  return items.filter((item) => {
    if (typeof item.id !== 'number') {
      return false
    }

    if (seen.has(item.id)) {
      return false
    }

    seen.add(item.id)
    return true
  })
}

const getFallbackGeofenceIds = async (deviceId: number) => {
  const now = new Date()
  const from = new Date(now.getTime() - (GEOFENCE_FALLBACK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)).toISOString()
  const to = now.toISOString()

  const [positions, events, report] = await Promise.all([
    getPositions(deviceId).catch(() => []),
    getEvents(deviceId, from, to).catch(() => []),
    getGeofenceReport(deviceId, from, to).catch(() => []),
  ])

  const geofenceIds = new Set<number>()

  for (const position of positions) {
    const positionGeofenceIds = (position as bookcarsTypes.TraccarPosition & { geofenceIds?: number[] })?.geofenceIds || []

    for (const geofenceId of positionGeofenceIds) {
      if (typeof geofenceId === 'number') {
        geofenceIds.add(geofenceId)
      }
    }
  }

  for (const event of events) {
    if (typeof event?.geofenceId === 'number') {
      geofenceIds.add(event.geofenceId)
    }
  }

  for (const interval of report) {
    if (typeof interval?.geofenceId === 'number') {
      geofenceIds.add(interval.geofenceId)
    }
  }

  return geofenceIds
}

export const isConfigured = () => env.TRACCAR_ENABLED && !!env.TRACCAR_USERNAME && !!env.TRACCAR_PASSWORD

export const getDevices = async (): Promise<bookcarsTypes.TraccarDevice[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/devices')
  return response.data
}

export const getDevice = async (deviceId: number): Promise<bookcarsTypes.TraccarDevice | undefined> => {
  ensureEnabled()
  const response = await getClient().get('/api/devices', { params: { id: deviceId } })
  return response.data
}

export const getPositions = async (deviceId: number): Promise<bookcarsTypes.TraccarPosition[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/positions', { params: { deviceId } })
  return response.data
}

export const getRoute = async (deviceId: number, from: string, to: string): Promise<bookcarsTypes.TraccarPosition[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/reports/route', { params: { deviceId, from, to } })
  return response.data
}

type TraccarGeofenceReport = { geofenceId?: number }

export const getGeofenceReport = async (deviceId: number, from: string, to: string): Promise<TraccarGeofenceReport[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/reports/geofences', { params: { deviceId, from, to } })
  return response.data
}

export const getGeofences = async (deviceId?: number): Promise<bookcarsTypes.TraccarGeofence[]> => {
  ensureEnabled()

  if (!deviceId) {
    const response = await getClient().get('/api/geofences')
    return response.data
  }

  try {
    const response = await getClient().get('/api/geofences', { params: { deviceId } })
    return response.data
  } catch (error) {
    if (!isInvalidDeviceGeofenceFilterError(error)) {
      throw error
    }

    const [allGeofences, allowedGeofenceIds] = await Promise.all([
      getGeofences(),
      getFallbackGeofenceIds(deviceId),
    ])

    return uniqueById(allGeofences.filter((geofence: { id?: number }) => (
      typeof geofence.id === 'number' && allowedGeofenceIds.has(geofence.id)
    )))
  }
}

export const getEvents = async (deviceId: number, from: string, to: string, type?: string): Promise<bookcarsTypes.TraccarEvent[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/events', { params: { deviceId, from, to, type } })
  return response.data
}

export const getSnapshot = async (deviceId: number) => {
  const from = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()
  const to = new Date().toISOString()

  const [positions, geofences, geofenceExitEvents] = await Promise.all([
    getPositions(deviceId),
    getGeofences(deviceId),
    getEvents(deviceId, from, to, 'geofenceExit'),
  ])

  return {
    currentPosition: positions[0] || null,
    positions,
    geofences,
    geofenceExitEvents,
  }
}
