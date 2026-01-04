import axios, { AxiosInstance } from 'axios'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'

export const TRACCAR_NOT_CONFIGURED = 'TRACCAR_NOT_CONFIGURED'

export type TraccarDevice = {
  id: number
  uniqueId?: string
  positionId?: number
  name?: string
}

export type TraccarPosition = {
  id: number
  deviceId: number
  latitude: number
  longitude: number
  speed?: number
  course?: number
  fixTime?: string
  deviceTime?: string
  serverTime?: string
  address?: string
}

export type NormalizedPosition = {
  lat: number
  lon: number
  speed?: number
  course?: number
  fixTime?: string
  address?: string
}

let client: AxiosInstance | null = null

const getClient = () => {
  if (!env.TRACCAR_BASE_URL || !env.TRACCAR_USER || !env.TRACCAR_PASS) {
    throw new Error(TRACCAR_NOT_CONFIGURED)
  }

  if (!client) {
    client = axios.create({
      baseURL: helper.trimEnd(env.TRACCAR_BASE_URL, '/'),
      timeout: 10_000,
      auth: {
        username: env.TRACCAR_USER,
        password: env.TRACCAR_PASS,
      },
    })
  }

  return client
}

const normalizePosition = (position: TraccarPosition): NormalizedPosition => ({
  lat: position.latitude,
  lon: position.longitude,
  speed: position.speed,
  course: position.course,
  fixTime: position.fixTime || position.deviceTime || position.serverTime,
  address: position.address,
})

export const getDevice = async (deviceId: number): Promise<TraccarDevice | null> => {
  const api = getClient()

  try {
    const res = await api.get(`/api/devices/${deviceId}`)
    return res.data as TraccarDevice
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null
    }
    throw err
  }
}

export const getLastPositionByDevice = async (deviceId: number): Promise<NormalizedPosition | null> => {
  const device = await getDevice(deviceId)
  if (!device?.positionId) {
    return null
  }

  return getPosition(device.positionId)
}

export const getPosition = async (positionId: number): Promise<NormalizedPosition | null> => {
  const api = getClient()

  try {
    const res = await api.get(`/api/positions/${positionId}`)
    const position = res.data as TraccarPosition | undefined
    if (!position) {
      return null
    }
    return normalizePosition(position)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null
    }
    throw err
  }
}
