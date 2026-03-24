import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'

let SUPPLIER1_ID: string
let SUPPLIER2_ID: string
let LOCATION_ID: string
let CAR_ID: string
let BOOKING_ID: string

beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  LOCATION_ID = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')

  SUPPLIER1_ID = await testHelper.createSupplier(`${testHelper.getSupplierName()}@test.bookcars.ma`, testHelper.getSupplierName())
  SUPPLIER2_ID = await testHelper.createSupplier(`${testHelper.getSupplierName()}@test.bookcars.ma`, testHelper.getSupplierName())

  const car = new Car({
    name: 'BMW X1',
    supplier: SUPPLIER1_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 78,
    deposit: 950,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
    cancellation: 0,
    amendments: 0,
    theftProtection: 9,
    collisionDamageWaiver: 12,
    fullInsurance: 20,
    additionalDriver: 0,
    range: bookcarsTypes.CarRange.Midi,
    rating: 4,
    multimedia: [bookcarsTypes.CarMultimedia.AndroidAuto],
    isDateBasedPrice: false,
    dateBasedPrices: [],
  })
  await car.save()
  CAR_ID = car._id.toString()

  const booking = new Booking({
    supplier: SUPPLIER1_ID,
    car: CAR_ID,
    driver: testHelper.getUserId(),
    pickupLocation: LOCATION_ID,
    dropOffLocation: LOCATION_ID,
    from: new Date(2024, 2, 1),
    to: new Date(2024, 2, 4),
    status: bookcarsTypes.BookingStatus.Pending,
    cancellation: true,
    amendments: true,
    theftProtection: false,
    collisionDamageWaiver: false,
    fullInsurance: false,
    price: 312,
    additionalDriver: false,
  })
  await booking.save()
  BOOKING_ID = booking._id.toString()
})

afterAll(async () => {
  await Booking.deleteMany({ _id: BOOKING_ID })
  await Car.deleteMany({ _id: CAR_ID })
  await testHelper.deleteSupplier(SUPPLIER1_ID)
  await testHelper.deleteSupplier(SUPPLIER2_ID)
  await testHelper.deleteLocation(LOCATION_ID)
  await testHelper.close()
  await databaseHelper.close()
})

describe('Booking authorization', () => {
  it('should forbid regular user from updating a booking', async () => {
    const token = await testHelper.signinAsUser()

    const payload: bookcarsTypes.UpsertBookingPayload = {
      booking: {
        _id: BOOKING_ID,
        supplier: SUPPLIER1_ID,
        car: CAR_ID,
        driver: testHelper.getUserId(),
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        status: bookcarsTypes.BookingStatus.Paid,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 999,
        additionalDriver: false,
      },
    }

    const res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)

    expect(res.statusCode).toBe(403)

    const booking = await Booking.findById(BOOKING_ID)
    expect(booking?.price).toBe(312)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Pending)

    await testHelper.signout(token)
  })

  it('should allow supplier owner to update their own booking', async () => {
    const supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    supplier!.password = supplier!.password || (await (await import('../src/utils/authHelper.js')).hashPassword(testHelper.PASSWORD))
    await supplier!.save()

    const resSignin = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .send({ email: supplier!.email, password: testHelper.PASSWORD })

    expect(resSignin.statusCode).toBe(200)
    const cookies = resSignin.headers['set-cookie'] as unknown as string[]
    const token = testHelper.getToken(cookies[1])

    const payload: bookcarsTypes.UpsertBookingPayload = {
      booking: {
        _id: BOOKING_ID,
        supplier: SUPPLIER1_ID,
        car: CAR_ID,
        driver: testHelper.getUserId(),
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        status: bookcarsTypes.BookingStatus.Reserved,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 450,
        additionalDriver: false,
      },
    }

    const res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)

    expect(res.statusCode).toBe(200)

    const booking = await Booking.findById(BOOKING_ID)
    expect(booking?.price).toBe(450)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)
  })

  it('should forbid another supplier from updating someone else\'s booking', async () => {
    const supplier = await User.findById(SUPPLIER2_ID)
    expect(supplier).toBeTruthy()
    supplier!.password = supplier!.password || (await (await import('../src/utils/authHelper.js')).hashPassword(testHelper.PASSWORD))
    await supplier!.save()

    const resSignin = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .send({ email: supplier!.email, password: testHelper.PASSWORD })

    expect(resSignin.statusCode).toBe(200)
    const cookies = resSignin.headers['set-cookie'] as unknown as string[]
    const token = testHelper.getToken(cookies[1])

    const payload: bookcarsTypes.UpsertBookingPayload = {
      booking: {
        _id: BOOKING_ID,
        supplier: SUPPLIER1_ID,
        car: CAR_ID,
        driver: testHelper.getUserId(),
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        status: bookcarsTypes.BookingStatus.Cancelled,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 1,
        additionalDriver: false,
      },
    }

    const res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)

    expect(res.statusCode).toBe(403)

    const booking = await Booking.findById(BOOKING_ID)
    expect(booking?.price).toBe(450)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)
  })

  it('should forbid regular user from deleting bookings', async () => {
    const token = await testHelper.signinAsUser()

    const res = await request(app)
      .post('/api/delete-bookings')
      .set(env.X_ACCESS_TOKEN, token)
      .send([BOOKING_ID])

    expect(res.statusCode).toBe(403)

    const booking = await Booking.findById(BOOKING_ID)
    expect(booking).toBeTruthy()

    await testHelper.signout(token)
  })
})
