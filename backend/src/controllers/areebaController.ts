import crypto from 'node:crypto'
import axios from 'axios'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as env from '../config/env.config'
import Booking from '../models/Booking'
import User from '../models/User'
import Car from '../models/Car'
import * as bookingController from './bookingController'

const AREEBA_API_BASE = 'https://epayment.areeba.com/api/rest/version/60'

const getAuthToken = () =>
  Buffer.from(`merchant.${env.AREEBA_MERCHANT_ID}:${env.AREEBA_API_CODE}`).toString('base64')

/**
 * Create an Areeba checkout session.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 */
export const createSession = async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body as bookcarsTypes.CreateAreebaSessionPayload
    const orderId = crypto.randomUUID()
    const formattedAmount = Number(amount).toFixed(2)

    const url = `${AREEBA_API_BASE}/merchant/${env.AREEBA_MERCHANT_ID}/session`
    const { data } = await axios.post(url, {
      apiOperation: 'CREATE_CHECKOUT_SESSION',
      interaction: {
        operation: 'PURCHASE',
      },
      order: {
        id: orderId,
        amount: formattedAmount,
        currency: currency.toUpperCase(),
      },
    }, {
      headers: {
        Authorization: `Basic ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (data?.result !== 'SUCCESS' || !data?.session?.id) {
      logger.error('[areeba.createSession] Failed to create session', data)
      res.status(400).send('Failed to create Areeba session')
      return
    }

    const result: bookcarsTypes.AreebaSessionResult = {
      sessionId: data.session.id,
      orderId,
      merchantId: env.AREEBA_MERCHANT_ID,
    }

    res.json(result)
  } catch (err) {
    logger.error(`[areeba.createSession] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Verify an Areeba payment and finalize the booking.
 *
 * @async
 * @param {Request} req
 * @param {Response} res
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { bookingId, sessionId, orderId } = req.body as bookcarsTypes.VerifyAreebaPaymentPayload

    // Verify with Areeba API
    const url = `${AREEBA_API_BASE}/merchant/${env.AREEBA_MERCHANT_ID}/order/${orderId}`
    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Basic ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    })

    if (data?.result !== 'SUCCESS') {
      logger.warn(`[areeba.verifyPayment] Payment not successful for order ${orderId}`, data)
      res.status(400).send('Payment not verified')
      return
    }

    // Update booking
    const booking = await Booking.findOne({ _id: bookingId, sessionId, expireAt: { $ne: null } })
    if (!booking) {
      res.status(404).send('Booking not found')
      return
    }

    booking.expireAt = undefined

    let status = bookcarsTypes.BookingStatus.Paid
    if (booking.isDeposit) {
      status = bookcarsTypes.BookingStatus.Deposit
    } else if (booking.isPayedInFull) {
      status = bookcarsTypes.BookingStatus.PaidInFull
    }
    booking.status = status
    await booking.save()

    const car = await Car.findById(booking.car)
    if (car) {
      car.trips += 1
      await car.save()
    }

    const supplier = await User.findById(booking.supplier)
    const user = await User.findById(booking.driver)

    if (user) {
      user.expireAt = undefined
      await user.save()
    }

    if (supplier && user) {
      await bookingController.confirm(user, supplier, booking, false)

      i18n.locale = supplier.language
      await bookingController.notify(user, booking._id.toString(), supplier, i18n.t('BOOKING_PAID_NOTIFICATION'))

      const admin = !!env.ADMIN_EMAIL && (await User.findOne({ email: env.ADMIN_EMAIL, type: bookcarsTypes.UserType.Admin }))
      if (admin) {
        i18n.locale = admin.language
        await bookingController.notify(user, booking._id.toString(), admin, i18n.t('BOOKING_PAID_NOTIFICATION'))
      }
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[areeba.verifyPayment] ${i18n.t('ERROR')}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}
