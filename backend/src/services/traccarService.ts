import axios, { AxiosError, AxiosInstance } from 'axios'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'

let client: AxiosInstance | null = null

const GEOFENCE_FALLBACK_LOOKBACK_DAYS = 30

const safeAxiosErrorDetails = (error: AxiosError) => {
  const config = (error.config ?? {}) as any
  const params = config?.params

  return {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    method: config.method,
    baseURL: config.baseURL,
    url: config.url,
    params,
    responseData: error.response?.data,
  }
}

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

    client.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (axios.isAxiosError(error)) {
          logger.error('[traccar.http] Request failed', safeAxiosErrorDetails(error))
        }
        return Promise.reject(error)
      },
    )
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

const isInvalidPositionsFilterError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false
  }

  return error.response?.status === 400
}

const isNotFoundError = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 404

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

const toLatLng = (first: number, second: number): [number, number] => {
  if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
    return [second, first]
  }

  return [first, second]
}

const geofenceAreaToGeoJson = (area?: string) => {
  if (!area) {
    return undefined
  }

  const normalized = area.trim()
  const shapeType = normalized.split('(', 1)[0]?.trim().toUpperCase()

  if (shapeType === 'POLYGON') {
    const values = (normalized.match(/[+-]?\d+(?:\.\d+)?/g) || [])
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    const ring: [number, number][] = []
    for (let i = 0; i + 1 < values.length; i += 2) {
      const [lat, lng] = toLatLng(values[i], values[i + 1])
      ring.push([lng, lat])
    }

    if (ring.length >= 3) {
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push(first)
      }

      return {
        type: 'Polygon',
        coordinates: [ring],
      }
    }
  }

  if (shapeType === 'RECTANGLE') {
    const values = (normalized.match(/[+-]?\d+(?:\.\d+)?/g) || [])
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    if (values.length >= 4) {
      const [lat1, lng1] = toLatLng(values[0], values[1])
      const [lat2, lng2] = toLatLng(values[2], values[3])
      const north = Math.max(lat1, lat2)
      const south = Math.min(lat1, lat2)
      const east = Math.max(lng1, lng2)
      const west = Math.min(lng1, lng2)

      return {
        type: 'Polygon',
        coordinates: [[
          [west, north],
          [east, north],
          [east, south],
          [west, south],
          [west, north],
        ]],
      }
    }
  }

  return undefined
}

const normalizeGeofence = (geofence: bookcarsTypes.TraccarGeofence): bookcarsTypes.TraccarGeofence => ({
  ...geofence,
  geojson: geofence.geojson || geofenceAreaToGeoJson(geofence.area),
})

const sanitizeGeofencePayload = (payload: bookcarsTypes.UpsertTraccarGeofencePayload): bookcarsTypes.UpsertTraccarGeofencePayload => ({
  name: payload.name.trim(),
  description: payload.description?.trim(),
  area: payload.area.trim(),
  calendarId: payload.calendarId,
  attributes: payload.attributes || {},
})

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

const getEventsFromReports = async (params: {
  deviceId: number | number[]
  from: string
  to: string
  type?: string | string[]
}) => {
  const response = await getClient().get('/api/reports/events', { params })
  return response.data as bookcarsTypes.TraccarEvent[]
}

const mapListReport = async <T>(path: string, deviceId: number, from: string, to: string) => {
  const response = await getClient().get(path, { params: { deviceId, from, to } })
  return (response.data || []) as T[]
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

export const getPositions = async (deviceId?: number): Promise<bookcarsTypes.TraccarPosition[]> => {
  ensureEnabled()

  if (typeof deviceId !== 'number') {
    const response = await getClient().get('/api/positions')
    return response.data
  }

  try {
    const response = await getClient().get('/api/positions', { params: { deviceId } })
    return response.data
  } catch (error) {
    // Some Traccar versions don't support filtering positions by deviceId and reply 400.
    if (!isInvalidPositionsFilterError(error)) {
      throw error
    }

    const response = await getClient().get('/api/positions')
    const positions: bookcarsTypes.TraccarPosition[] = response.data || []
    return positions.filter((position: any) => position?.deviceId === deviceId)
  }
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
    return (response.data as bookcarsTypes.TraccarGeofence[]).map(normalizeGeofence)
  }

  try {
    const response = await getClient().get('/api/geofences', { params: { deviceId } })
    return (response.data as bookcarsTypes.TraccarGeofence[]).map(normalizeGeofence)
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
    ))).map(normalizeGeofence)
  }
}

export const getGeofence = async (geofenceId: number): Promise<bookcarsTypes.TraccarGeofence> => {
  ensureEnabled()
  const response = await getClient().get('/api/geofences', { params: { id: geofenceId } })
  const geofences = (response.data as bookcarsTypes.TraccarGeofence[]).map(normalizeGeofence)
  const geofence = geofences.find((item) => item.id === geofenceId)

  if (!geofence) {
    throw new Error('Geofence not found')
  }

  return geofence
}

export const createGeofence = async (payload: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  ensureEnabled()
  const response = await getClient().post('/api/geofences', sanitizeGeofencePayload(payload))
  return normalizeGeofence(response.data as bookcarsTypes.TraccarGeofence)
}

export const updateGeofence = async (geofenceId: number, payload: bookcarsTypes.UpsertTraccarGeofencePayload): Promise<bookcarsTypes.TraccarGeofence> => {
  ensureEnabled()
  const current = await getGeofence(geofenceId)
  const next = sanitizeGeofencePayload(payload)
  const response = await getClient().put(`/api/geofences/${geofenceId}`, {
    id: geofenceId,
    name: next.name,
    description: next.description ?? current.description,
    area: next.area,
    calendarId: next.calendarId ?? current.calendarId,
    attributes: {
      ...(current.attributes || {}),
      ...(next.attributes || {}),
    },
  })
  return normalizeGeofence(response.data as bookcarsTypes.TraccarGeofence)
}

export const deleteGeofence = async (geofenceId: number) => {
  ensureEnabled()
  await getClient().delete(`/api/geofences/${geofenceId}`)
}

export const linkDeviceGeofence = async (deviceId: number, geofenceId: number) => {
  ensureEnabled()
  await getClient().post('/api/permissions', { deviceId, geofenceId })
}

export const unlinkDeviceGeofence = async (deviceId: number, geofenceId: number) => {
  ensureEnabled()
  await getClient().delete('/api/permissions', { data: { deviceId, geofenceId } })
}

export const getEvents = async (deviceId: number, from: string, to: string, type?: string): Promise<bookcarsTypes.TraccarEvent[]> => {
  ensureEnabled()

  try {
    const response = await getClient().get('/api/events', { params: { deviceId, from, to, type } })
    return response.data
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }

    try {
      const response = await getClient().get('/api/reports/events', { params: { deviceId, from, to, type } })
      return response.data
    } catch (fallbackError) {
      if (!isNotFoundError(fallbackError)) {
        throw fallbackError
      }

      // Some Traccar builds expose neither endpoint consistently.
      // For UI stability, return an empty list instead of failing the whole page.
      return []
    }
  }
}

export const getFleetEvents = async (
  deviceIds: number[],
  from: string,
  to: string,
  types?: string[],
): Promise<bookcarsTypes.TraccarEvent[]> => {
  ensureEnabled()

  const filteredDeviceIds = [...new Set(deviceIds.filter((deviceId) => Number.isFinite(deviceId)))]
  if (!filteredDeviceIds.length) {
    return []
  }

  try {
    return await getEventsFromReports({
      deviceId: filteredDeviceIds,
      from,
      to,
      type: types && types.length > 0 ? types : undefined,
    })
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }

    const batches = await Promise.all(
      filteredDeviceIds.map((deviceId) => getEvents(deviceId, from, to, types && types.length === 1 ? types[0] : undefined)),
    )

    return batches.flat()
  }
}

export const getCommandTypes = async (deviceId: number): Promise<bookcarsTypes.TraccarCommandType[]> => {
  ensureEnabled()
  const response = await getClient().get('/api/commands/types', { params: { deviceId } })
  return response.data
}

export const sendCommand = async (payload: bookcarsTypes.TraccarCommand): Promise<bookcarsTypes.TraccarCommand> => {
  ensureEnabled()
  const response = await getClient().post('/api/commands/send', payload)
  return response.data
}

export const getStops = async (deviceId: number, from: string, to: string): Promise<bookcarsTypes.TraccarStopReport[]> => {
  ensureEnabled()
  return mapListReport<bookcarsTypes.TraccarStopReport>('/api/reports/stops', deviceId, from, to)
}

export const getTrips = async (deviceId: number, from: string, to: string): Promise<bookcarsTypes.TraccarTripReport[]> => {
  ensureEnabled()
  return mapListReport<bookcarsTypes.TraccarTripReport>('/api/reports/trips', deviceId, from, to)
}

export const getSummary = async (deviceId: number, from: string, to: string): Promise<bookcarsTypes.TraccarSummaryReport | null> => {
  ensureEnabled()
  const items = await mapListReport<bookcarsTypes.TraccarSummaryReport>('/api/reports/summary', deviceId, from, to)
  return items[0] || null
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
