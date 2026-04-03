import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as env from '../config/env.config'
import Car from '../models/Car'
import * as traccarService from '../services/traccarService'

const parseDate = (value: string | undefined, fallback: Date) => {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return date
}

const getCarWithTracking = async (id: string) => {
  const car = await Car.findById(id)
  if (!car) {
    throw new Error('Car not found')
  }

  if (!car.tracking?.deviceId) {
    throw new Error('Traccar device not linked')
  }

  return car
}

const parseId = (value: string, label: string) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}`)
  }

  return parsed
}

const sanitizeGeofencePayload = (payload: Partial<bookcarsTypes.UpsertTraccarGeofencePayload>) => {
  const name = payload.name?.trim()
  const area = payload.area?.trim()

  if (!name) {
    throw new Error('Geofence name is required')
  }

  if (!area) {
    throw new Error('Geofence area is required')
  }

  return {
    name,
    description: payload.description?.trim(),
    area,
    calendarId: payload.calendarId,
    attributes: payload.attributes || {},
  }
}

const sanitizeCommandPayload = (payload: Partial<bookcarsTypes.TraccarCommand>, deviceId: number): bookcarsTypes.TraccarCommand => {
  const type = payload.type?.trim()
  if (!type) {
    throw new Error('Command type is required')
  }

  return {
    deviceId,
    type,
    textChannel: !!payload.textChannel,
    attributes: payload.attributes || {},
  }
}

const getPositionDate = (position?: bookcarsTypes.TraccarPosition | null) => {
  if (!position) {
    return 0
  }

  const value = position.fixTime || position.deviceTime || position.serverTime
  const date = value ? new Date(value).getTime() : 0
  return Number.isFinite(date) ? date : 0
}

const getPositionTimestamp = (position?: bookcarsTypes.TraccarPosition | null) => (
  position?.deviceTime || position?.fixTime || position?.serverTime
)

const FLEET_STALE_AFTER_MINUTES = 15
const MOVING_SPEED_KMH = 8
const STOPPED_SPEED_KMH = 1
const DEFAULT_EVENT_LIMIT = 80

const getTrackedCars = () => Car.find({
  'tracking.enabled': true,
  'tracking.deviceId': { $exists: true, $ne: null },
}).populate('supplier', 'fullName')

const getDateValue = (value?: Date | string | number | null) => {
  if (!value) {
    return 0
  }

  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
}

const getPositionAttributes = (position?: bookcarsTypes.TraccarPosition | null) => position?.attributes || {}

const getBooleanAttribute = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'number') {
      return value > 0
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', 'yes', 'on', '1'].includes(normalized)) {
        return true
      }
      if (['false', 'no', 'off', '0'].includes(normalized)) {
        return false
      }
    }
  }

  return undefined
}

const getNumberAttribute = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return undefined
}

const resolveFleetStatus = ({
  isLinked,
  deviceStatus,
  position,
  stale,
  speedKmh,
  ignition,
  motion,
}: {
  isLinked: boolean
  deviceStatus?: string
  position: bookcarsTypes.TraccarPosition | null
  stale: boolean
  speedKmh: number
  ignition?: boolean
  motion?: boolean
}): bookcarsTypes.TraccarFleetStatus => {
  if (!isLinked) {
    return 'unlinked'
  }

  const normalizedDeviceStatus = deviceStatus?.trim().toLowerCase()
  if (normalizedDeviceStatus === 'offline') {
    return 'offline'
  }

  if (!position) {
    return normalizedDeviceStatus === 'online' ? 'noGps' : 'offline'
  }

  if (stale) {
    return 'stale'
  }

  if (speedKmh >= MOVING_SPEED_KMH || motion === true) {
    return 'moving'
  }

  if (speedKmh > STOPPED_SPEED_KMH || ignition === true) {
    return 'idle'
  }

  return 'stopped'
}

const buildFleetHealth = (items: bookcarsTypes.TraccarFleetItem[]): bookcarsTypes.TraccarFleetHealth => ({
  totalCars: items.length,
  linkedCars: items.filter((item) => typeof item.deviceId === 'number').length,
  liveCars: items.filter((item) => !!item.position).length,
  onlineCars: items.filter((item) => item.deviceStatus?.trim().toLowerCase() === 'online').length,
  movingCars: items.filter((item) => item.movementStatus === 'moving').length,
  idleCars: items.filter((item) => item.movementStatus === 'idle').length,
  stoppedCars: items.filter((item) => item.movementStatus === 'stopped').length,
  offlineCars: items.filter((item) => item.movementStatus === 'offline').length,
  staleCars: items.filter((item) => item.movementStatus === 'stale').length,
  noGpsCars: items.filter((item) => item.movementStatus === 'noGps').length,
  unlinkedCars: items.filter((item) => item.movementStatus === 'unlinked').length,
  lastRefreshAt: new Date(),
})

const parseEventTypes = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => `${entry}`.split(',')).map((entry) => entry.trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean)
  }

  return []
}

const getSupplierName = (car: any) => {
  const supplier = car?.supplier
  if (supplier && typeof supplier === 'object' && typeof supplier.fullName === 'string') {
    return supplier.fullName
  }

  return undefined
}

export const getDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await traccarService.getDevices()
    res.json(devices)
  } catch (err) {
    logger.error('[traccar.getDevices] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getAllGeofences = async (_req: Request, res: Response) => {
  try {
    const geofences = await traccarService.getGeofences()
    res.json(geofences)
  } catch (err) {
    logger.error('[traccar.getAllGeofences] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getFleetOverview = async (_req: Request, res: Response) => {
  try {
    const cars = await getTrackedCars()

    if (!cars.length) {
      res.json({
        items: [],
        health: buildFleetHealth([]),
      })
      return
    }

    const [positions, devices] = await Promise.all([
      traccarService.getPositions(),
      traccarService.getDevices(),
    ])

    const latestPositionByDeviceId = new Map<number, bookcarsTypes.TraccarPosition>()
    for (const position of positions) {
      const positionWithDevice = position as bookcarsTypes.TraccarPosition & { deviceId?: number }
      const deviceId = positionWithDevice.deviceId
      if (typeof deviceId !== 'number') {
        continue
      }

      const current = latestPositionByDeviceId.get(deviceId)
      if (!current || getPositionDate(position) >= getPositionDate(current)) {
        latestPositionByDeviceId.set(deviceId, position)
      }
    }

    const deviceById = new Map<number, bookcarsTypes.TraccarDevice>()
    for (const device of devices) {
      if (typeof device.id === 'number') {
        deviceById.set(device.id, device)
      }
    }

    const now = Date.now()
    const items = cars.map((car) => {
      const linkedDeviceId = car.tracking?.deviceId as number
      const device = deviceById.get(linkedDeviceId)
      const position = latestPositionByDeviceId.get(linkedDeviceId) || null
      const positionAttributes = getPositionAttributes(position)
      const speedKmh = typeof position?.speed === 'number' && Number.isFinite(position.speed)
        ? Math.round(position.speed * 1.852 * 100) / 100
        : 0
      const ignition = getBooleanAttribute(positionAttributes, ['ignition', 'ignitionOn', 'io239'])
      const motion = getBooleanAttribute(positionAttributes, ['motion', 'moving'])
      const batteryLevel = getNumberAttribute(positionAttributes, ['batteryLevel', 'battery', 'charge'])
      const odometer = getNumberAttribute(positionAttributes, ['odometer', 'totalDistance'])
      const lastPositionAt = getPositionTimestamp(position)
      const lastDeviceUpdate = device?.lastUpdate
      const lastSeenAt = Math.max(getDateValue(lastPositionAt), getDateValue(lastDeviceUpdate), getDateValue(car.tracking?.lastSyncedAt))
      const staleMinutes = lastSeenAt > 0 ? Math.max(0, Math.round((now - lastSeenAt) / 60000)) : undefined
      const stale = typeof staleMinutes === 'number' ? staleMinutes >= FLEET_STALE_AFTER_MINUTES : false
      const movementStatus = resolveFleetStatus({
        isLinked: typeof linkedDeviceId === 'number',
        deviceStatus: device?.status || car.tracking?.status,
        position,
        stale,
        speedKmh,
        ignition,
        motion,
      })

      return {
        carId: String(car._id),
        carName: car.name,
        supplierName: getSupplierName(car),
        licensePlate: car.licensePlate,
        deviceId: linkedDeviceId,
        trackingEnabled: !!car.tracking?.enabled,
        deviceName: device?.name || car.tracking?.deviceName,
        deviceStatus: device?.status || car.tracking?.status,
        movementStatus,
        stale,
        staleMinutes,
        lastEventType: car.tracking?.lastEventType,
        lastSyncedAt: car.tracking?.lastSyncedAt,
        lastPositionAt,
        lastDeviceUpdate,
        ignition,
        motion,
        speedKmh,
        odometer,
        batteryLevel,
        address: position?.address,
        position,
      } satisfies bookcarsTypes.TraccarFleetItem
    })

    res.json({
      items,
      health: buildFleetHealth(items),
    })
  } catch (err) {
    logger.error('[traccar.getFleetOverview] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const linkDevice = async (req: Request, res: Response) => {
  const { carId } = req.params
  const { deviceId, deviceName, notes, enabled } = req.body

  try {
    if (!deviceId || Number.isNaN(Number(deviceId))) {
      throw new Error('Invalid deviceId')
    }

    const car = await Car.findById(carId)
    if (!car) {
      res.status(404).send('Car not found')
      return
    }

    const now = new Date()
    car.tracking = {
      ...car.tracking,
      enabled: enabled ?? true,
      deviceId: Number(deviceId),
      deviceName: deviceName || car.tracking?.deviceName,
      notes,
      linkedAt: car.tracking?.linkedAt || now,
      lastSyncedAt: now,
    }

    await car.save()
    res.json(car.tracking)
  } catch (err) {
    logger.error('[traccar.linkDevice] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const createGeofence = async (req: Request, res: Response) => {
  try {
    const geofence = await traccarService.createGeofence(sanitizeGeofencePayload(req.body))
    res.json(geofence)
  } catch (err) {
    logger.error('[traccar.createGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const updateGeofence = async (req: Request, res: Response) => {
  try {
    const geofence = await traccarService.updateGeofence(parseId(req.params.geofenceId, 'geofenceId'), sanitizeGeofencePayload(req.body))
    res.json(geofence)
  } catch (err) {
    logger.error('[traccar.updateGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const deleteGeofence = async (req: Request, res: Response) => {
  try {
    await traccarService.deleteGeofence(parseId(req.params.geofenceId, 'geofenceId'))
    res.status(204).send()
  } catch (err) {
    logger.error('[traccar.deleteGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const unlinkDevice = async (req: Request, res: Response) => {
  const { carId } = req.params

  try {
    const car = await Car.findById(carId)
    if (!car) {
      res.status(404).send('Car not found')
      return
    }

    car.tracking = { enabled: false }
    await car.save()

    res.json(car.tracking)
  } catch (err) {
    logger.error('[traccar.unlinkDevice] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getCurrentPositions = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const positions = await traccarService.getPositions(car.tracking?.deviceId as number)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(positions)
  } catch (err) {
    logger.error('[traccar.getCurrentPositions] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getCommandTypes = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const commandTypes = await traccarService.getCommandTypes(car.tracking?.deviceId as number)
    res.json(commandTypes)
  } catch (err) {
    logger.error('[traccar.getCommandTypes] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const sendDeviceCommand = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const command = await traccarService.sendCommand(sanitizeCommandPayload(req.body, car.tracking?.deviceId as number))

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
      lastEventType: 'commandSent',
    }

    await car.save()
    res.json(command)
  } catch (err) {
    logger.error('[traccar.sendDeviceCommand] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getRouteHistory = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const route = await traccarService.getRoute(car.tracking?.deviceId as number, from.toISOString(), to.toISOString())

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(route)
  } catch (err) {
    logger.error('[traccar.getRouteHistory] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getGeofences = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofences = await traccarService.getGeofences(car.tracking?.deviceId as number)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json(geofences)
  } catch (err) {
    logger.error('[traccar.getGeofences] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const linkGeofence = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofenceId = parseId(req.params.geofenceId, 'geofenceId')

    await traccarService.linkDeviceGeofence(car.tracking?.deviceId as number, geofenceId)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()
    res.json(await traccarService.getGeofences(car.tracking?.deviceId as number))
  } catch (err) {
    logger.error('[traccar.linkGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const unlinkGeofence = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const geofenceId = parseId(req.params.geofenceId, 'geofenceId')

    await traccarService.unlinkDeviceGeofence(car.tracking?.deviceId as number, geofenceId)

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()
    res.json(await traccarService.getGeofences(car.tracking?.deviceId as number))
  } catch (err) {
    logger.error('[traccar.unlinkGeofence] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getGeofenceAlerts = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const events = await traccarService.getEvents(
      car.tracking?.deviceId as number,
      from.toISOString(),
      to.toISOString(),
      'geofenceExit',
    )

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
      lastEventType: 'geofenceExit',
    }

    await car.save()

    res.json(events)
  } catch (err) {
    logger.error('[traccar.getGeofenceAlerts] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getEventCenter = async (req: Request, res: Response) => {
  try {
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)
    const limitValue = Number.parseInt(req.query.limit as string, 10)
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : DEFAULT_EVENT_LIMIT
    const eventTypes = parseEventTypes(req.query.types)

    const cars = req.query.carId
      ? [await getCarWithTracking(req.query.carId as string)]
      : await getTrackedCars()

    if (!cars.length) {
      res.json([])
      return
    }

    const geofencesPromise = traccarService.getGeofences().catch(() => [])
    const deviceById = new Map<number, {
      carId: string
      carName?: string
      supplierName?: string
      licensePlate?: string
      deviceName?: string
    }>()

    for (const car of cars) {
      const deviceId = car.tracking?.deviceId
      if (typeof deviceId !== 'number') {
        continue
      }

      deviceById.set(deviceId, {
        carId: String(car._id),
        carName: car.name,
        supplierName: getSupplierName(car),
        licensePlate: car.licensePlate,
        deviceName: car.tracking?.deviceName,
      })
    }

    const deviceIds = [...deviceById.keys()]
    const [events, geofences] = await Promise.all([
      traccarService.getFleetEvents(deviceIds, from.toISOString(), to.toISOString(), eventTypes.length > 0 ? eventTypes : undefined),
      geofencesPromise,
    ])

    const geofenceLookup = new Map<number, string>()
    geofences.forEach((geofence) => {
      if (typeof geofence.id === 'number' && geofence.name) {
        geofenceLookup.set(geofence.id, geofence.name)
      }
    })

    const enriched = (events
      .map((event): bookcarsTypes.TraccarEventCenterEntry | null => {
        const deviceId = event.deviceId
        const meta = typeof deviceId === 'number' ? deviceById.get(deviceId) : undefined
        if (!meta) {
          return null
        }

        const speed = getNumberAttribute(event.attributes || {}, ['speed'])
        const address = typeof event.attributes?.address === 'string' ? event.attributes.address : undefined

        return {
          id: event.id,
          carId: meta.carId,
          carName: meta.carName,
          supplierName: meta.supplierName,
          licensePlate: meta.licensePlate,
          deviceId,
          deviceName: meta.deviceName,
          geofenceId: event.geofenceId,
          geofenceName: typeof event.geofenceId === 'number' ? geofenceLookup.get(event.geofenceId) : undefined,
          type: event.type,
          eventTime: event.eventTime,
          positionId: getNumberAttribute(event.attributes || {}, ['positionId']),
          address,
          speed,
          attributes: event.attributes,
          event,
        } satisfies bookcarsTypes.TraccarEventCenterEntry
      })
      .filter(Boolean) as bookcarsTypes.TraccarEventCenterEntry[])
      .sort((left, right) => getDateValue(right.eventTime) - getDateValue(left.eventTime))
      .slice(0, limit)

    res.json(enriched)
  } catch (err) {
    logger.error('[traccar.getEventCenter] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getVehicleReports = async (req: Request, res: Response) => {
  try {
    const car = await getCarWithTracking(req.params.carId)
    const now = new Date()
    const from = parseDate(req.query.from as string | undefined, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const to = parseDate(req.query.to as string | undefined, now)

    const [summary, trips, stops] = await Promise.all([
      traccarService.getSummary(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => null),
      traccarService.getTrips(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => []),
      traccarService.getStops(car.tracking?.deviceId as number, from.toISOString(), to.toISOString()).catch(() => []),
    ])

    car.tracking = {
      ...car.tracking,
      lastSyncedAt: new Date(),
    }

    await car.save()

    res.json({
      summary,
      trips,
      stops,
    } satisfies bookcarsTypes.TraccarVehicleReportBundle)
  } catch (err) {
    logger.error('[traccar.getVehicleReports] Error', err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

export const getIntegrationStatus = async (_req: Request, res: Response) => {
  res.json({ enabled: env.TRACCAR_ENABLED, baseUrl: env.TRACCAR_BASE_URL })
}
