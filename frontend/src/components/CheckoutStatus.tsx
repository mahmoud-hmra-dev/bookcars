import React, { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import { DirectionsCar as CarIcon } from '@mui/icons-material'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as helper from '@/utils/helper'
import { getDateFnsLocale } from '@/utils/locale'
import * as BookingService from '@/services/BookingService'
import * as PaymentService from '@/services/PaymentService'
import { strings } from '@/lang/checkout-status'
import { strings as commonStrings } from '@/lang/common'
import { strings as checkoutStrings } from '@/lang/checkout'
import Toast from '@/components/Toast'

import '@/assets/css/checkout-status.css'

interface CheckoutStatusProps {
  bookingId: string,
  payLater?: boolean,
  language: string,
  status: 'success' | 'error'
  className?: string
}

const CheckoutStatus = (
  {
    bookingId,
    payLater,
    language,
    status,
    className,
  }: CheckoutStatusProps
) => {
  const navigate = useNavigate()
  const [booking, setBooking] = useState<bookcarsTypes.Booking>()
  const [price, setPrice] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const _booking = await BookingService.getBooking(bookingId)
      setBooking(_booking)
      setPrice(await PaymentService.convertPrice(_booking.price!))
      setLoading(false)
    }

    if (bookingId) {
      init()
    }
  }, [bookingId])

  if (loading) {
    return null
  }

  const _fr = language === 'fr'
  const _ar = language === 'ar'
  const _locale = getDateFnsLocale(language)
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : _ar ? 'eee، d LLL yyyy، p' : 'eee, d LLL yyyy, p'
  const days = (booking && bookcarsHelper.days(new Date(booking.from), new Date(booking.to))) || 0
  const success = status === 'success'

  return booking && (
    <div className={`checkout-status ${className || ''}`}>
      <Toast
        title={strings.CONGRATULATIONS}
        text={success
          ? payLater ? strings.SUCCESS_PAY_LATER : strings.SUCCESS
          : strings.ERROR}
        status={status}
      />

      {success && (
        <div className="details">
          <div className="status-details-container">
            <div className="status-info">
              <CarIcon />
              <span>{checkoutStrings.BOOKING_DETAILS}</span>
            </div>
            <div className="status-details">
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.CAR}</span>
                <div className="status-detail-value">
                  <span>{(booking.car as bookcarsTypes.Car).name}</span>
                </div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.DAYS}</span>
                <div className="status-detail-value">
                  {`${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(
                    format(new Date(booking.from), _format, { locale: _locale }),
                  )} - ${bookcarsHelper.capitalize(format(new Date(booking.to), _format, { locale: _locale }))})`}
                </div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{commonStrings.PICK_UP_LOCATION}</span>
                <div className="status-detail-value">{(booking.pickupLocation as bookcarsTypes.Location).name}</div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                <div className="status-detail-value">{(booking.dropOffLocation as bookcarsTypes.Location).name}</div>
              </div>
              <div className="status-detail">
                <span className="status-detail-title">{checkoutStrings.COST}</span>
                <div className="status-detail-value status-price">{bookcarsHelper.formatPrice(price, commonStrings.CURRENCY, language)}</div>
              </div>
            </div>
            <div className="status-actions">
              <Button
                variant="contained"
                className="btn-primary"
                onClick={() => navigate('/bookings')}
              >
                {strings.GO_TO_BOOKINGS}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutStatus
