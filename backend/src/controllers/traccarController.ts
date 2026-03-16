import { Request, Response } from 'express'
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

export const getDevices = async (_req: Request, res: Response) => {
  try {
    const devices = await traccarService.getDevices()
    res.json(devices)
  } catch (err) {
    logger.error('[traccar.getDevices] Error', err)
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
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
    res.status(400).send(String(err))
  }
}

export const getIntegrationStatus = async (_req: Request, res: Response) => {
  res.json({ enabled: env.TRACCAR_ENABLED, baseUrl: env.TRACCAR_BASE_URL })
}
