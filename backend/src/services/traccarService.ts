import axios, { AxiosInstance } from 'axios'
import * as env from '../config/env.config'

let client: AxiosInstance | null = null

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

export const isConfigured = () => env.TRACCAR_ENABLED && !!env.TRACCAR_USERNAME && !!env.TRACCAR_PASSWORD

export const getDevices = async () => {
  ensureEnabled()
  const response = await getClient().get('/api/devices')
  return response.data
}

export const getDevice = async (deviceId: number) => {
  ensureEnabled()
  const response = await getClient().get('/api/devices', { params: { id: deviceId } })
  return response.data
}

export const getPositions = async (deviceId: number) => {
  ensureEnabled()
  const response = await getClient().get('/api/positions', { params: { deviceId } })
  return response.data
}

export const getRoute = async (deviceId: number, from: string, to: string) => {
  ensureEnabled()
  const response = await getClient().get('/api/reports/route', { params: { deviceId, from, to } })
  return response.data
}

export const getGeofences = async (deviceId?: number) => {
  ensureEnabled()
  const response = await getClient().get('/api/geofences', { params: deviceId ? { deviceId } : {} })
  return response.data
}

export const getEvents = async (deviceId: number, from: string, to: string, type?: string) => {
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
