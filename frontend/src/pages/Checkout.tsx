import React, { useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  Checkbox,
  Link,
  FormControlLabel,
  RadioGroup,
  Radio,
  CircularProgress,
} from '@mui/material'
import {
  DirectionsCar as CarIcon,
  Person as DriverIcon,
  Settings as PaymentOptionsIcon,
  Payment as LicenseIcon,
  AssignmentTurnedIn as ChecklistIcon,
  LocalShipping as DeliveryIcon,
  Store as StoreIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material'
import Switch from '@mui/material/Switch'
import { format } from 'date-fns'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import validator from 'validator'
import { createSchema, FormFields } from '@/models/CheckoutForm'
import CarList from '@/components/CarList'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { getDateFnsLocale } from '@/utils/locale'
import * as BookingService from '@/services/BookingService'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/checkout'
import * as helper from '@/utils/helper'
import * as UserService from '@/services/UserService'
import * as CarService from '@/services/CarService'
import * as LocationService from '@/services/LocationService'
import * as PaymentService from '@/services/PaymentService'
import * as StripeService from '@/services/StripeService'
import * as AreebaService from '@/services/AreebaService'
import * as PayPalService from '@/services/PayPalService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import DatePicker from '@/components/DatePicker'
import SocialLogin from '@/components/SocialLogin'
import Map from '@/components/Map'
import DriverLicense from '@/components/DriverLicense'
import Progress from '@/components/Progress'
import CheckoutStatus from '@/components/CheckoutStatus'
import NoMatch from './NoMatch'
import CheckoutOptions from '@/components/CheckoutOptions'
import Footer from '@/components/Footer'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'
import Backdrop from '@/components/SimpleBackdrop'
import Unauthorized from '@/components/Unauthorized'
import DeliveryLocationPicker, { DeliveryLocationInfo } from '@/components/DeliveryLocationPicker'

import '@/assets/css/checkout.css'

//
// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
//
const stripePromise = env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe ? loadStripe(env.STRIPE_PUBLISHABLE_KEY) : null

const Checkout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [visible, setVisible] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [noMatch, setNoMatch] = useState(false)
  const [emailRegistered, setEmailRegistered] = useState(false)
  const [emailInfo, setEmailInfo] = useState(true)
  const [phoneInfo, setPhoneInfo] = useState(true)
  const [price, setPrice] = useState(0)
  const [depositPrice, setDepositPrice] = useState(0)
  const [success, setSuccess] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [recaptchaError, setRecaptchaError] = useState(false)
  const adRequired = true
  const [adManuallyChecked, setAdManuallyChecked] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string>()
  const [sessionId, setSessionId] = useState<string>()
  // const [distance, setDistance] = useState('')
  const [licenseRequired, setLicenseRequired] = useState(false)
  const [license, setLicense] = useState<string | null>(null)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryLocationInfo | null>(null)
  const [wantDelivery, setWantDelivery] = useState(false)
  const [payPalLoaded, setPayPalLoaded] = useState(false)
  const [payPalInit, setPayPalInit] = useState(false)
  const [payPalProcessing, setPayPalProcessing] = useState(false)

  const birthDateRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverBirthDateRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverEmailRef = useRef<HTMLInputElement | null>(null)
  const additionalDriverPhoneRef = useRef<HTMLInputElement | null>(null)

  const _fr = language === 'fr'
  const _es = language === 'es'
  const _ar = language === 'ar'
  const _locale = getDateFnsLocale(language)
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : _es ? 'eee, d LLLL yyyy HH:mm' : _ar ? 'eee، d LLL yyyy، p' : 'eee, d LLL yyyy, p'
  const bookingDetailHeight = env.SUPPLIER_IMAGE_HEIGHT + 10
  const days = bookcarsHelper.days(from, to)
  const daysLabel = from && to && `${helper.getDaysShort(days)} (${bookcarsHelper.capitalize(format(from, _format, { locale: _locale }))} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`

  const schema = createSchema(car)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
    setFocus,
    trigger,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    shouldUnregister: false,
    defaultValues: {
      additionalDriverEmail: '',
      additionalDriverPhone: '',
    }
  })

  const additionalDriverEmail = useWatch({ control, name: 'additionalDriverEmail' })
  const additionalDriverPhone = useWatch({ control, name: 'additionalDriverPhone' })

  const additionalDriver = useWatch({ control, name: 'additionalDriver' })
  const payLater = useWatch({ control, name: 'payLater' })
  const payDeposit = useWatch({ control, name: 'payDeposit' })
  const payInFull = useWatch({ control, name: 'payInFull' })

  const getCheckoutSigninReturnTo = () => {
    const state = location.state as {
      carId?: string
      pickupLocationId?: string
      dropOffLocationId?: string
      from?: Date | number | string
      to?: Date | number | string
    } | null

    if (!state?.carId || !state.pickupLocationId || !state.dropOffLocationId || !state.from || !state.to) {
      return '/sign-in'
    }

    const params = new URLSearchParams({
      from: 'checkout',
      c: state.carId,
      p: state.pickupLocationId,
      d: state.dropOffLocationId,
      f: String(new Date(state.from).getTime()),
      t: String(new Date(state.to).getTime()),
    })

    return `/sign-in?${params.toString()}`
  }

  const validateEmail = (email: string) => {
    return validator.isEmail(email)
  }

  const validatePhone = (phone: string) => {
    return validator.isMobilePhone(phone)
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!car || !pickupLocation || !dropOffLocation || !from || !to) {
        helper.error()
        return
      }

      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        setRecaptchaError(true)
        return
      }

      if (!authenticated) {
        // check email
        const status = await UserService.validateEmail({ email: data.email! })
        if (status === 200) {
          setEmailRegistered(false)
          setEmailInfo(true)
        } else {
          setEmailRegistered(true)
          setEmailInfo(false)
          return
        }
      }

      if (car.supplier.licenseRequired && !license) {
        setLicenseRequired(true)
        return
      }

      setPaymentFailed(false)

      let driver: bookcarsTypes.User | undefined
      let _additionalDriver: bookcarsTypes.AdditionalDriver | undefined

      if (!authenticated) {
        driver = {
          email: data.email,
          phone: data.phone,
          fullName: data.fullName!,
          birthDate: data.birthDate,
          language: UserService.getLanguage(),
          license: license || undefined,
        }
      }

      let amount = price
      if (payDeposit) {
        amount = depositPrice
      } else if (payInFull) {
        amount = price + depositPrice
      }

      const basePrice = await bookcarsHelper.convertPrice(amount, PaymentService.getCurrency(), env.BASE_CURRENCY)

      const booking: bookcarsTypes.Booking = {
        supplier: car.supplier._id as string,
        car: car._id,
        driver: authenticated ? user?._id : undefined,
        pickupLocation: pickupLocation._id,
        dropOffLocation: dropOffLocation._id,
        from,
        to,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: data.cancellation,
        amendments: data.amendments,
        theftProtection: data.theftProtection,
        collisionDamageWaiver: data.collisionDamageWaiver,
        fullInsurance: data.fullInsurance,
        additionalDriver,
        price: basePrice,
      }

      if (adRequired && additionalDriver && data.additionalDriverBirthDate) {
        _additionalDriver = {
          fullName: data.additionalDriverFullName!,
          email: data.additionalDriverEmail!,
          phone: data.additionalDriverPhone!,
          birthDate: data.additionalDriverBirthDate,
        }
      }

      //
      // Stripe Payment Gateway
      //
      let _customerId: string | undefined
      let _sessionId: string | undefined
      let areebaPaymentUrl: string | undefined
      if (!payLater) {
        if (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe) {
          const name = bookcarsHelper.truncateString(`${env.WEBSITE_NAME} - ${car.name}`, StripeService.ORDER_NAME_MAX_LENGTH)
          const _description = `${env.WEBSITE_NAME} - ${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
          const description = bookcarsHelper.truncateString(_description, StripeService.ORDER_DESCRIPTION_MAX_LENGTH)

          let finalPrice = price
          if (payDeposit) {
            finalPrice = depositPrice
          } else if (payInFull) {
            finalPrice = price + depositPrice
          }

          const payload: bookcarsTypes.CreatePaymentPayload = {
            amount: finalPrice,
            currency: PaymentService.getCurrency(),
            locale: language,
            receiptEmail: (!authenticated ? driver?.email : user?.email) as string,
            name,
            description,
            customerName: (!authenticated ? driver?.fullName : user?.fullName) as string,
          }
          const res = await StripeService.createCheckoutSession(payload)
          setClientSecret(res.clientSecret)
          _sessionId = res.sessionId
          _customerId = res.customerId
        } else if (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal) {
          setPayPalLoaded(true)
        } else {
          _sessionId = crypto.randomUUID()
        }
      }

      booking.isDeposit = payDeposit
      booking.isPayedInFull = payInFull

      const payload: bookcarsTypes.CheckoutPayload = {
        driver,
        booking,
        additionalDriver: _additionalDriver,
        payLater: !!data.payLater,
        sessionId: _sessionId,
        customerId: _customerId,
        payPal: env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal,
      }

      const { status, bookingId: _bookingId } = await BookingService.checkout(payload)

      if (status === 200) {
        if (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Areeba && !payLater) {
          let finalPrice = price
          if (payDeposit) {
            finalPrice = depositPrice
          } else if (payInFull) {
            finalPrice = price + depositPrice
          }

          const callbackBase = env.API_HOST.replace(/\/$/, '')
          const successCallback = `${callbackBase}/api/areeba/success/${encodeURIComponent(_bookingId)}/${encodeURIComponent(_sessionId as string)}`
          const cancelCallback = `${callbackBase}/api/areeba/cancel/${encodeURIComponent(_bookingId)}/${encodeURIComponent(_sessionId as string)}`
          const errorCallback = `${callbackBase}/api/areeba/error/${encodeURIComponent(_bookingId)}/${encodeURIComponent(_sessionId as string)}`

          areebaPaymentUrl = await AreebaService.createPaymentLink(env.AREEBA_API_HOST, {
            project_id: env.AREEBA_PROJECT_ID,
            project_name: env.WEBSITE_NAME,
            prodact_id: car._id as string,
            user_id: ((!authenticated ? driver?._id : user?._id) || _bookingId) as string,
            firstName: ((!authenticated ? driver?.fullName : user?.fullName) || '').split(' ').slice(0, 1).join(' '),
            lastName: ((!authenticated ? driver?.fullName : user?.fullName) || '').split(' ').slice(1).join(' '),
            email: ((!authenticated ? driver?.email : user?.email) || '') as string,
            price: finalPrice,
            currency: PaymentService.getCurrency(),
            successCallback,
            cancelCallback,
            errorCallback,
          })
        }

        if (payLater) {
          setVisible(false)
          setSuccess(true)
        }
        setBookingId(_bookingId)
        setSessionId(_sessionId)

        if (areebaPaymentUrl) {
          window.location.assign(areebaPaymentUrl)
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onError = () => {
    const firstErrorField = Object.keys(errors)[0] as keyof FormFields
    if (firstErrorField) {
      if (firstErrorField === 'birthDate' && birthDateRef.current) {
        birthDateRef.current.focus()
      }
      if (firstErrorField === 'additionalDriverBirthDate' && additionalDriverBirthDateRef.current) {
        additionalDriverBirthDateRef.current.focus()
      } else if (firstErrorField === 'additionalDriverEmail' && additionalDriverEmailRef.current) {
        additionalDriverEmailRef.current.focus()
      } else if (firstErrorField === 'additionalDriverPhone' && additionalDriverPhoneRef.current) {
        additionalDriverPhoneRef.current.focus()
      } else {
        setFocus(firstErrorField)
      }
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setAuthenticated(_user !== undefined)
    setLanguage(UserService.getLanguage())

    const { state } = location
    if (!state) {
      setNoMatch(true)
      return
    }

    const { carId } = state
    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { from: _from } = state
    const { to: _to } = state

    if (!carId || !pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setNoMatch(true)
      return
    }

    let _car
    let _pickupLocation
    let _dropOffLocation

    try {
      _car = await CarService.getCar(carId)
      if (!_car) {
        setNoMatch(true)
        return
      }

      _pickupLocation = await LocationService.getLocation(pickupLocationId)

      if (!_pickupLocation) {
        setNoMatch(true)
        return
      }

      // if (_pickupLocation.latitude && _pickupLocation.longitude) {
      //   const l = await helper.getLocation()
      //   if (l) {
      //     const d = bookcarsHelper.distance(_pickupLocation.latitude, _pickupLocation.longitude, l[0], l[1], 'K')
      //     setDistance(bookcarsHelper.formatDistance(d, UserService.getLanguage()))
      //   }
      // }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setNoMatch(true)
        return
      }

      const priceChangeRate = _car.supplier.priceChangeRate || 0
      const _price = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(_car, _from, _to, priceChangeRate))
      let _depositPrice = _car.deposit > 0 ? await PaymentService.convertPrice(_car.deposit) : 0
      _depositPrice += _depositPrice * (priceChangeRate / 100)

      const included = (val: number) => val === 0

      setCar(_car)
      setPrice(_price)
      setDepositPrice(_depositPrice)
      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setValue('cancellation', included(_car.cancellation))
      setValue('amendments', included(_car.amendments))
      setValue('theftProtection', included(_car.theftProtection))
      setValue('collisionDamageWaiver', included(_car.collisionDamageWaiver))
      setValue('fullInsurance', included(_car.fullInsurance))
      setLicense(_user?.license || null)
      setVisible(true)
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {!user?.blacklisted && visible && car && from && to && pickupLocation && dropOffLocation && (
          <>
            <div className="checkout">
              <Paper className="checkout-form" elevation={10}>
                <h1 className="checkout-form-title">{strings.BOOKING_HEADING}</h1>
                <form onSubmit={handleSubmit(onSubmit, onError)}>
                  <div>
                    {(
                      (pickupLocation.latitude && pickupLocation.longitude)
                      || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)
                    ) && (
                        <Map
                          position={[pickupLocation.latitude || Number(pickupLocation.parkingSpots![0].latitude), pickupLocation.longitude || Number(pickupLocation.parkingSpots![0].longitude)]}
                          initialZoom={10}
                          parkingSpots={pickupLocation.parkingSpots}
                          locations={[pickupLocation]}
                          className="map"
                        >
                          <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                        </Map>
                      )}

                    {/* ── Supplier Office Info Card (no extra map to avoid race condition) ── */}
                    {!env.HIDE_SUPPLIERS && car.supplier.latitude && car.supplier.longitude && (
                      <div className="supplier-office-info-card">
                        <div className="supplier-office-info-icon">
                          <StoreIcon fontSize="inherit" />
                        </div>
                        <div className="supplier-office-info-body">
                          <div className="supplier-office-info-title">Supplier Office</div>
                          <div className="supplier-office-info-name">{car.supplier.fullName}</div>
                        </div>
                        <a
                          className="supplier-office-info-link"
                          href={`https://maps.google.com/?q=${car.supplier.latitude},${car.supplier.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <LocationOnIcon sx={{ fontSize: 15 }} />
                          View on map
                        </a>
                      </div>
                    )}

                    {/* ── Delivery Option Toggle ───────────────────────────── */}
                    <div className="delivery-option-section">
                      <div
                        className="delivery-option-toggle"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const next = !wantDelivery
                          setWantDelivery(next)
                          if (!next) {
                            setDeliveryInfo(null)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            const next = !wantDelivery
                            setWantDelivery(next)
                            if (!next) {
                              setDeliveryInfo(null)
                            }
                          }
                        }}
                      >
                        <div className="delivery-option-toggle-left">
                          <div className="delivery-option-toggle-icon">
                            <DeliveryIcon fontSize="inherit" />
                          </div>
                          <div className="delivery-option-toggle-text">
                            <div className="delivery-option-toggle-title">Deliver to my location</div>
                            <div className="delivery-option-toggle-subtitle">
                              {wantDelivery
                                ? 'Pin your address on the map below'
                                : 'Optional — additional fee may apply based on distance'}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={wantDelivery}
                          color="success"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const next = e.target.checked
                            setWantDelivery(next)
                            if (!next) {
                              setDeliveryInfo(null)
                            }
                          }}
                        />
                      </div>

                      {wantDelivery && (
                        <>
                          <hr className="delivery-option-divider" />
                          <div className="delivery-picker-section">
                            <DeliveryLocationPicker
                              supplierLat={car.supplier.latitude || 33.8938}
                              supplierLng={car.supplier.longitude || 35.5018}
                              supplierName={car.supplier.fullName}
                              initialLat={car.supplier.latitude || 33.8938}
                              initialLng={car.supplier.longitude || 35.5018}
                              currency="$"
                              onChange={(info) => setDeliveryInfo(info)}
                            />
                          </div>
                        </>
                      )}

                      {!wantDelivery && (
                        <div className="delivery-self-pickup-notice">
                          <LocationOnIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                          <span>You will pick up the car from the supplier&apos;s office.</span>
                        </div>
                      )}
                    </div>

                    <CarList
                      cars={[car]}
                      // pickupLocationName={pickupLocation.name}
                      // distance={distance}
                      hidePrice
                      sizeAuto
                      onLoad={() => setLoadingPage(false)}
                      hideSupplier={env.HIDE_SUPPLIERS}
                    />

                    <CheckoutOptions
                      car={car}
                      from={from}
                      to={to}
                      language={language}
                      allowAdditionalDriver={!authenticated}
                      clientSecret={clientSecret}
                      payPalLoaded={payPalLoaded}
                      onPriceChange={(value) => setPrice(value)}
                      onAdManuallyCheckedChange={(value) => setAdManuallyChecked(value)}
                      onCancellationChange={(value) => setValue('cancellation', value)}
                      onAmendmentsChange={(value) => setValue('amendments', value)}
                      onTheftProtectionChange={(value) => setValue('theftProtection', value)}
                      onCollisionDamageWaiverChange={(value) => setValue('collisionDamageWaiver', value)}
                      onFullInsuranceChange={(value) => setValue('fullInsurance', value)}
                      onAdditionalDriverChange={(value) => setValue('additionalDriver', value)}
                    />

                    <div className="checkout-details-container">
                      <div className="checkout-info">
                        <CarIcon />
                        <span>{strings.BOOKING_DETAILS}</span>
                      </div>
                      <div className="checkout-details">
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.DAYS}</span>
                          <div className="checkout-detail-value">
                            {daysLabel}
                          </div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{commonStrings.PICK_UP_LOCATION}</span>
                          <div className="checkout-detail-value">{pickupLocation.name}</div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{commonStrings.DROP_OFF_LOCATION}</span>
                          <div className="checkout-detail-value">{dropOffLocation.name}</div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.CAR}</span>
                          <div className="checkout-detail-value">{`${car.name} (${bookcarsHelper.formatPrice(price / days, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`}</div>
                        </div>
                        {!env.HIDE_SUPPLIERS && (
                          <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                            <span className="checkout-detail-title">{commonStrings.SUPPLIER}</span>
                            <div className="checkout-detail-value">
                              <div className="car-supplier">
                                <img src={helper.supplierImageURL(car.supplier.avatar)} alt={car.supplier.fullName} style={{ height: env.SUPPLIER_IMAGE_HEIGHT }} />
                                <span className="car-supplier-name">{car.supplier.fullName}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.COST}</span>
                          <div className="checkout-detail-value booking-price">{bookcarsHelper.formatPrice(price, commonStrings.CURRENCY, language)}</div>
                        </div>
                        {deliveryInfo && (
                          <div className="checkout-detail delivery-fee-row" style={{ height: bookingDetailHeight }}>
                            <span className="checkout-detail-title">
                              🚗 Delivery Fee
                              <span className="delivery-distance-badge">{deliveryInfo.distanceKm.toFixed(1)} km away</span>
                            </span>
                            <div className={`checkout-detail-value ${deliveryInfo.deliveryFee === 0 ? 'delivery-free' : 'delivery-paid'}`}>
                              {deliveryInfo.deliveryFee === 0
                                ? '🎉 Free Delivery!'
                                : `$${deliveryInfo.deliveryFee}`}
                            </div>
                          </div>
                        )}
                        {deliveryInfo && (
                          <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                            <span className="checkout-detail-title">📍 Pickup Address</span>
                            <div className="checkout-detail-value" style={{ fontSize: 12, color: '#64748b' }}>
                              {deliveryInfo.address}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!authenticated && (
                      <div className="driver-details">
                        <div className="checkout-info">
                          <DriverIcon />
                          <span>{strings.DRIVER_DETAILS}</span>
                        </div>
                        <div className="driver-details-form">
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                            <OutlinedInput
                              {...register('fullName')}
                              type="text"
                              label={commonStrings.FULL_NAME}
                              required
                              error={!!errors.fullName}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                            <OutlinedInput
                              // {...register('email')}
                              type="text"
                              label={commonStrings.EMAIL}
                              error={!!errors.email || emailRegistered}
                              required
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.email) {
                                  clearErrors('email')
                                }
                                setEmailRegistered(false)
                                setEmailInfo(false)
                                setValue('email', e.target.value)
                              }}
                              onBlur={async (e) => {
                                trigger('email')
                                const email = e.target.value

                                if (validateEmail(email)) {
                                  const status = await UserService.validateEmail({ email })
                                  if (status === 200) {
                                    setEmailRegistered(false)
                                    setEmailInfo(true)
                                  } else {
                                    setEmailRegistered(true)
                                    setEmailInfo(false)
                                  }
                                } else {
                                  setEmailRegistered(false)
                                  setEmailInfo(false)
                                }
                              }}
                            />
                            <FormHelperText error={!!errors.email || emailRegistered}>
                              {(errors.email && errors.email.message) || ''}
                              {(emailRegistered && (
                                <span>
                                  <span>{commonStrings.EMAIL_ALREADY_REGISTERED}</span>
                                  <span> </span>
                                  <a href={`/sign-in?c=${car._id}&p=${pickupLocation._id}&d=${dropOffLocation._id}&f=${from.getTime()}&t=${to.getTime()}&from=checkout`}>{strings.SIGN_IN}</a>
                                </span>
                              ))
                                || ''}
                              {(emailInfo && !errors.email && strings.EMAIL_INFO) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                            <OutlinedInput
                              // {...register('phone')}
                              type="text"
                              label={commonStrings.PHONE}
                              error={!!errors.phone}
                              required
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.phone) {
                                  clearErrors('phone')
                                }
                                setPhoneInfo(false)
                                setValue('phone', e.target.value)
                              }}
                              onBlur={(e) => {
                                trigger('phone')
                                setPhoneInfo(validatePhone(e.target.value))
                              }}
                            />
                            <FormHelperText error={!!errors.phone}>
                              {(errors.phone && errors.phone.message) || ''}
                              {(phoneInfo && strings.PHONE_INFO) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <DatePicker
                              {...register('birthDate')}
                              ref={birthDateRef}
                              label={commonStrings.BIRTH_DATE}
                              variant="outlined"
                              required
                              onChange={(_birthDate) => {
                                if (errors.birthDate) {
                                  clearErrors('birthDate')
                                }
                                if (_birthDate) {
                                  setValue('birthDate', _birthDate, { shouldValidate: true })
                                } else {
                                  setValue('birthDate', undefined, { shouldValidate: true })
                                }
                              }}
                              language={language}
                            />
                            <FormHelperText error={!!errors.birthDate}>
                              {(errors.birthDate && errors.birthDate.message) || ''}
                            </FormHelperText>
                          </FormControl>

                          <div className="checkout-tos">
                            <table>
                              <tbody>
                                <tr>
                                  <td aria-label="tos">
                                    <Checkbox
                                      {...register('tos')}
                                      onChange={(e) => {
                                        if (e.target.checked && errors.tos) {
                                          clearErrors('tos')
                                        }
                                      }}
                                      color="primary"
                                    />
                                  </td>
                                  <td>
                                    <Link href="/tos" target="_blank" rel="noreferrer">
                                      {commonStrings.TOS}
                                    </Link>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={2}>
                                    <FormHelperText error={!!errors.tos}>{errors.tos?.message || ''}</FormHelperText>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <SocialLogin mode="signin" returnTo={getCheckoutSigninReturnTo()} />
                        </div>
                      </div>
                    )}

                    {car.supplier.licenseRequired && (
                      <div className="driver-details">
                        <div className="checkout-info">
                          <LicenseIcon />
                          <span>{commonStrings.DRIVER_LICENSE}</span>
                        </div>
                        <div className="driver-details-form">
                          <DriverLicense
                            user={user}
                            variant="outlined"
                            onUpload={(filename) => {
                              if (filename) {
                                setLicenseRequired(false)
                              } else {
                                setLicenseRequired(true)
                              }
                              setLicense(filename)
                            }}
                            onDelete={() => {
                              setLicenseRequired(false)
                              setLicense(null)
                            }}
                            hideDelete={!!clientSecret || payPalLoaded}
                          />
                        </div>
                      </div>
                    )}

                    {(adManuallyChecked && additionalDriver) && (
                      <div className="driver-details">
                        <div className="checkout-info">
                          <DriverIcon />
                          <span>{csStrings.ADDITIONAL_DRIVER}</span>
                        </div>
                        <div className="driver-details-form">
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                            <OutlinedInput
                              {...register('additionalDriverFullName')}
                              type="text"
                              label={commonStrings.FULL_NAME}
                              required={adRequired}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                            <OutlinedInput
                              // {...register('additionalDriverEmail')}
                              inputRef={additionalDriverEmailRef}
                              value={additionalDriverEmail}
                              type="text"
                              label={commonStrings.EMAIL}
                              error={!!errors.additionalDriverEmail}
                              required={adRequired}
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.additionalDriverEmail) {
                                  clearErrors('additionalDriverEmail')
                                }
                                setValue('additionalDriverEmail', e.target.value)
                              }}
                              onBlur={() => {
                                trigger('additionalDriverEmail')
                              }}
                            />
                            <FormHelperText error={!!errors.additionalDriverEmail}>
                              {(errors.additionalDriverEmail && errors.additionalDriverEmail.message) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <InputLabel className="required">{commonStrings.PHONE}</InputLabel>
                            <OutlinedInput
                              // {...register('additionalDriverPhone')}
                              inputRef={additionalDriverPhoneRef}
                              value={additionalDriverPhone}
                              type="text"
                              label={commonStrings.PHONE}
                              error={!!errors.additionalDriverPhone}
                              required={adRequired}
                              autoComplete="off"
                              onChange={(e) => {
                                if (errors.additionalDriverPhone) {
                                  clearErrors('additionalDriverPhone')
                                }
                                setValue('additionalDriverPhone', e.target.value)
                              }}
                              onBlur={() => {
                                trigger('additionalDriverPhone')
                              }}
                            />
                            <FormHelperText error={!!errors.additionalDriverPhone}>
                              {(errors.additionalDriverPhone && errors.additionalDriverPhone.message) || ''}
                            </FormHelperText>
                          </FormControl>
                          <FormControl fullWidth margin="dense">
                            <DatePicker
                              {...register('additionalDriverBirthDate')}
                              ref={additionalDriverBirthDateRef}
                              label={commonStrings.BIRTH_DATE}
                              variant="outlined"
                              required={adRequired}
                              onChange={(_birthDate) => {
                                if (_birthDate) {
                                  setValue('additionalDriverBirthDate', _birthDate, { shouldValidate: true })
                                } else {
                                  setValue('additionalDriverBirthDate', undefined, { shouldValidate: true })
                                }
                              }}
                              language={language}
                            />
                            <FormHelperText error={!!errors.additionalDriverBirthDate}>
                              {(errors.additionalDriverBirthDate && errors.additionalDriverBirthDate.message) || ''}
                            </FormHelperText>
                          </FormControl>
                        </div>
                      </div>
                    )}

                    {/* Payment options */}

                    <div className="payment-options-container">
                      <div className="checkout-info">
                        <PaymentOptionsIcon />
                        <span>{strings.PAYMENT_OPTIONS}</span>
                      </div>
                      <div className="payment-options">
                        <FormControl>
                          <RadioGroup
                            defaultValue={depositPrice > 0 ? 'payOnline' : 'payInFull'}
                            onChange={(e) => {
                              setValue('payLater', e.target.value === 'payLater')
                              setValue('payDeposit', e.target.value === 'payDeposit')
                              setValue('payInFull', e.target.value === 'payInFull')
                            }}
                          >
                            {car.supplier.payLater && (
                              <FormControlLabel
                                value="payLater"
                                control={<Radio />}
                                disabled={!!clientSecret || payPalLoaded}
                                className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
                                label={(
                                  <span className="payment-button">
                                    <span>{strings.PAY_LATER}</span>
                                    <span className="payment-info">{strings.PAY_LATER_INFO}</span>
                                  </span>
                                )}
                              />
                            )}
                            {
                              car.deposit > 0 && (
                                <FormControlLabel
                                  value="payDeposit"
                                  control={<Radio />}
                                  disabled={!!clientSecret || payPalLoaded}
                                  className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
                                  label={(
                                    <span className="payment-button">
                                      <span>{strings.PAY_DEPOSIT}</span>
                                      <span className="payment-info">{strings.PAY_DEPOSIT_INFO}</span>
                                    </span>
                                  )}
                                />
                              )
                            }
                            {
                              depositPrice > 0 && (
                                <FormControlLabel
                                  value="payOnline"
                                  control={<Radio />}
                                  disabled={!!clientSecret || payPalLoaded}
                                  className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
                                  label={(
                                    <span className="payment-button">
                                      <span>{strings.PAY_ONLINE}</span>
                                      <span className="payment-info">{strings.PAY_ONLINE_INFO}</span>
                                    </span>
                                  )}
                                />
                              )
                            }
                            <FormControlLabel
                              value="payInFull"
                              control={<Radio />}
                              disabled={!!clientSecret || payPalLoaded}
                              className={clientSecret || payPalLoaded ? 'payment-radio-disabled' : ''}
                              label={(
                                <span className="payment-button">
                                  <span>{strings.PAY_IN_FULL}</span>
                                  <span className="payment-info">{strings.PAY_IN_FULL_INFO}</span>
                                </span>
                              )}
                            />
                          </RadioGroup>
                        </FormControl>
                      </div>
                    </div>

                    {/* Checkout checklist */}

                    <div className="checkout-details-container">
                      <div className="checkout-info">
                        <ChecklistIcon />
                        <span>{strings.PICK_UP_CHECKLIST_TITLE}</span>
                      </div>
                      <div className="checkout-details">
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.PICK_UP_CHECKLIST_ARRIVE_ON_TIME_TITLE}</span>
                          <div className="checkout-detail-value checklist-content">
                            {strings.PICK_UP_CHECKLIST_ARRIVE_ON_TIME_CONTENT}
                          </div>
                        </div>
                        <div className="checkout-detail" style={{ height: bookingDetailHeight }}>
                          <span className="checkout-detail-title">{strings.PICK_UP_CHECKLIST_DOCUMENTS_TITLE}</span>
                          <div className="checkout-detail-value checklist-content">
                            {strings.PICK_UP_CHECKLIST_DOCUMENTS_CONTENT}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total price */}

                    <div className="payment-info">
                      <div className="payment-info-title">
                        {
                          payDeposit ? strings.DEPOSIT : `${strings.PRICE_FOR} ${days} ${days > 1 ? strings.DAYS : strings.DAY}`
                        }
                        {deliveryInfo && deliveryInfo.deliveryFee > 0 && (
                          <span className="payment-info-delivery"> + ${deliveryInfo.deliveryFee} delivery</span>
                        )}
                      </div>
                      <div className="payment-info-price">
                        {
                          bookcarsHelper.formatPrice(
                            (payDeposit ? depositPrice
                              : payInFull ? (price + depositPrice)
                                : price)
                            + (deliveryInfo?.deliveryFee || 0)
                            , commonStrings.CURRENCY, language)
                        }
                      </div>
                    </div>

                    {(!car.supplier.payLater || !payLater) && (
                      env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe
                        ? (
                          clientSecret && (
                            <div className="payment-options-container">
                              <EmbeddedCheckoutProvider
                                stripe={stripePromise}
                                options={{ clientSecret }}
                              >
                                <EmbeddedCheckout />
                              </EmbeddedCheckoutProvider>
                            </div>
                          )
                        )
                        : payPalLoaded ? (
                          <div className="payment-options-container">
                            <PayPalButtons
                              createOrder={async () => {
                                const name = bookcarsHelper.truncateString(car.name, PayPalService.ORDER_NAME_MAX_LENGTH)
                                const _description = `${car.name} - ${daysLabel} - ${pickupLocation._id === dropOffLocation._id ? pickupLocation.name : `${pickupLocation.name} - ${dropOffLocation.name}`}`
                                const description = bookcarsHelper.truncateString(_description, PayPalService.ORDER_DESCRIPTION_MAX_LENGTH)
                                let amount = price
                                if (payDeposit) {
                                  amount = depositPrice
                                } else if (payInFull) {
                                  amount = price + depositPrice
                                }
                                const orderId = await PayPalService.createOrder(bookingId!, amount, PaymentService.getCurrency(), name, description)
                                return orderId
                              }}
                              onApprove={async (data, actions) => {
                                try {
                                  setPayPalProcessing(true)
                                  await actions.order?.capture()
                                  const { orderID } = data
                                  const status = await PayPalService.checkOrder(bookingId!, orderID)

                                  if (status === 200) {
                                    setVisible(false)
                                    setSuccess(true)
                                  } else {
                                    setPaymentFailed(true)
                                  }
                                } catch (err) {
                                  helper.error(err)
                                } finally {
                                  setPayPalProcessing(false)
                                }
                              }}
                              onInit={() => {
                                setPayPalInit(true)
                              }}
                              onCancel={() => {
                                setPayPalProcessing(false)
                              }}
                              onError={() => {
                                setPayPalProcessing(false)
                              }}
                            />
                          </div>
                        ) : null
                    )}
                    <div className="checkout-buttons">
                      {(
                        (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Stripe && !clientSecret)
                        || (env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.PayPal && !payPalInit)
                        || env.PAYMENT_GATEWAY === bookcarsTypes.PaymentGateway.Areeba
                        || payLater) && (
                          <Button
                            type="submit"
                            variant="contained"
                            className="btn-checkout btn-margin-bottom"
                            aria-label="Checkout"
                            disabled={isSubmitting || (payPalLoaded && !payPalInit)}
                          >
                            {
                              (isSubmitting || (payPalLoaded && !payPalInit))
                                ? <CircularProgress color="inherit" size={24} />
                                : strings.BOOK
                            }
                          </Button>
                        )}
                      <Button
                        variant="outlined"
                        color="primary"
                        className="btn-cancel btn-margin-bottom"
                        aria-label="Cancel"
                        onClick={async () => {
                          try {
                            if (bookingId && sessionId) {
                              //
                              // Delete temporary booking on cancel.
                              // Otherwise, temporary bookings are
                              // automatically deleted through a TTL index.
                              //
                              await BookingService.deleteTempBooking(bookingId, sessionId)
                            }
                            if (!authenticated && license) {
                              await UserService.deleteTempLicense(license)
                            }
                          } catch (err) {
                            helper.error(err)
                          } finally {
                            navigate('/')
                          }
                        }}
                      >
                        {commonStrings.CANCEL}
                      </Button>
                    </div>
                  </div>
                  <div className="form-error">
                    {paymentFailed && <Error message={strings.PAYMENT_FAILED} />}
                    {recaptchaError && <Error message={commonStrings.RECAPTCHA_ERROR} />}
                    {licenseRequired && <Error message={strings.LICENSE_REQUIRED} />}
                  </div>
                </form>
              </Paper>
            </div>

            <Footer />
          </>
        )}

        {user?.blacklisted && <Unauthorized />}

        {noMatch && <NoMatch hideHeader />}

        {success && bookingId && (
          <CheckoutStatus
            bookingId={bookingId}
            language={language}
            payLater={payLater}
            status="success"
            className="status"
          />
        )}

        {payPalProcessing && <Backdrop text={strings.CHECKING} />}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />
      </Layout>

      {loadingPage && !noMatch && <Progress />}
    </>
  )
}

export default Checkout
