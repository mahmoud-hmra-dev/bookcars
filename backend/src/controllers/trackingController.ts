import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Car from '../models/Car'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import * as logger from '../utils/logger'
import * as traccarApi from '../services/traccarApi'

type TrackingStatus =
  | 'ok'
  | 'no_fix_yet'
  | 'not_mapped'
  | 'device_not_found'
  | 'car_not_found'
  | 'traccar_not_configured'
  | 'traccar_error'
  | 'rate_limited'

type TrackedCar = {
  carId: string
  name: string
  licensePlate?: string
  traccarDeviceId?: number | null
  traccarUniqueId?: string | null
}

type CarTrackingPayload = {
  status: TrackingStatus
  car: TrackedCar | null
  position?: traccarApi.NormalizedPosition | null
  pollAfterSeconds: number
}

type FleetTrackingPayload = {
  status: TrackingStatus
  pollAfterSeconds: number
  cars: Array<TrackedCar & { status: TrackingStatus; position?: traccarApi.NormalizedPosition | null }>
}

const pollIntervalSeconds = env.TRACCAR_MIN_POLL_INTERVAL || 5
const pollIntervalMs = pollIntervalSeconds * 1000
const lastRequestByAdmin: Record<string, number> = {}

const mapCar = (car: any): TrackedCar => ({
  carId: car._id.toString(),
  name: car.name,
  licensePlate: car.licensePlate,
  traccarDeviceId: car.traccarDeviceId ?? null,
  traccarUniqueId: car.traccarUniqueId ?? null,
})

const enforceRateLimit = (adminId: string, scope: string): boolean => {
  const key = `${adminId}:${scope}`
  const now = Date.now()
  const last = lastRequestByAdmin[key]

  if (last && now - last < pollIntervalMs) {
    return false
  }

  lastRequestByAdmin[key] = now
  return true
}

export const getCarTracking = async (req: Request, res: Response) => {
  const { carId } = req.params
  const admin = res.locals.admin as { id?: string } | undefined

  if (!helper.isValidObjectId(carId)) {
    const payload: CarTrackingPayload = {
      status: 'car_not_found',
      car: null,
      position: null,
      pollAfterSeconds: pollIntervalSeconds,
    }
    res.status(400).send(payload)
    return
  }

  if (!enforceRateLimit(admin?.id || 'admin', `car-${carId}`)) {
    const payload: CarTrackingPayload = {
      status: 'rate_limited',
      car: null,
      position: null,
      pollAfterSeconds: pollIntervalSeconds,
    }
    res.status(429).send(payload)
    return
  }

  try {
    const car = await Car.findById(new mongoose.Types.ObjectId(carId))
      .select('name licensePlate traccarDeviceId traccarUniqueId')
      .lean()

    if (!car) {
      const payload: CarTrackingPayload = {
        status: 'car_not_found',
        car: null,
        position: null,
        pollAfterSeconds: pollIntervalSeconds,
      }
      res.status(404).send(payload)
      return
    }

    if (!car.traccarDeviceId && !car.traccarUniqueId) {
      res.status(404).send({
        status: 'not_mapped',
        pollAfterSeconds: pollIntervalSeconds,
        car: mapCar(car),
        position: null,
      })
      return
    }

    if (!car.traccarDeviceId) {
      res.status(404).send({
        status: 'not_mapped',
        pollAfterSeconds: pollIntervalSeconds,
        car: mapCar(car),
        position: null,
      })
      return
    }

    const device = await traccarApi.getDevice(car.traccarDeviceId)
    if (!device) {
      res.status(404).send({
        status: 'device_not_found',
        pollAfterSeconds: pollIntervalSeconds,
        car: mapCar(car),
        position: null,
      })
      return
    }

    if (!device.positionId) {
      const payload: CarTrackingPayload = {
        status: 'no_fix_yet',
        car: mapCar(car),
        position: null,
        pollAfterSeconds: pollIntervalSeconds,
      }
      res.json(payload)
      return
    }

    const position = await traccarApi.getPosition(device.positionId)
    if (!position) {
      res.json({ status: 'no_fix_yet', car: mapCar(car), position: null, pollAfterSeconds: pollIntervalSeconds })
      return
    }

    const payload: CarTrackingPayload = {
      status: 'ok',
      car: mapCar(car),
      position,
      pollAfterSeconds: pollIntervalSeconds,
    }

    res.json(payload)
  } catch (err) {
    if (err instanceof Error && err.message === traccarApi.TRACCAR_NOT_CONFIGURED) {
      const payload: CarTrackingPayload = {
        status: 'traccar_not_configured',
        car: null,
        position: null,
        pollAfterSeconds: pollIntervalSeconds,
      }
      res.status(503).send(payload)
      return
    }

    logger.error(`[tracking.getCarTracking] ${carId}`, err)
    const payload: CarTrackingPayload = {
      status: 'traccar_error',
      car: null,
      position: null,
      pollAfterSeconds: pollIntervalSeconds,
    }
    res.status(502).send(payload)
  }
}

export const getFleetTracking = async (req: Request, res: Response) => {
  const admin = res.locals.admin as { id?: string } | undefined

  if (!enforceRateLimit(admin?.id || 'admin', 'fleet')) {
    const payload: FleetTrackingPayload = {
      status: 'rate_limited',
      pollAfterSeconds: pollIntervalSeconds,
      cars: [],
    }
    res.status(429).send(payload)
    return
  }

  try {
    const cars = await Car.find({
      traccarDeviceId: { $exists: true, $ne: null },
    })
      .select('name licensePlate traccarDeviceId traccarUniqueId')
      .lean()

    const payload: FleetTrackingPayload = {
      status: 'ok',
      pollAfterSeconds: pollIntervalSeconds,
      cars: [],
    }

    for (const car of cars) {
      const trackedCar = mapCar(car)
      try {
        const device = await traccarApi.getDevice(car.traccarDeviceId as number)
        if (!device) {
          payload.cars.push({ ...trackedCar, status: 'device_not_found' })
          continue
        }

        if (!device.positionId) {
          payload.cars.push({ ...trackedCar, status: 'no_fix_yet' })
          continue
        }

        const position = await traccarApi.getPosition(device.positionId)
        if (!position) {
          payload.cars.push({ ...trackedCar, status: 'no_fix_yet' })
          continue
        }

        payload.cars.push({ ...trackedCar, status: 'ok', position })
      } catch (err) {
        if (err instanceof Error && err.message === traccarApi.TRACCAR_NOT_CONFIGURED) {
          const errorPayload: FleetTrackingPayload = {
            status: 'traccar_not_configured',
            pollAfterSeconds: pollIntervalSeconds,
            cars: [],
          }
          res.status(503).send(errorPayload)
          return
        }
        logger.error(`[tracking.getFleetTracking] ${car._id}`, err)
        payload.cars.push({ ...trackedCar, status: 'traccar_error' })
      }
    }

    res.json(payload)
  } catch (err) {
    if (err instanceof Error && err.message === traccarApi.TRACCAR_NOT_CONFIGURED) {
      const payload: FleetTrackingPayload = {
        status: 'traccar_not_configured',
        pollAfterSeconds: pollIntervalSeconds,
        cars: [],
      }
      res.status(503).send(payload)
      return
    }

    logger.error('[tracking.getFleetTracking]', err)
    const payload: FleetTrackingPayload = {
      status: 'traccar_error',
      pollAfterSeconds: pollIntervalSeconds,
      cars: [],
    }
    res.status(502).send(payload)
  }
}
