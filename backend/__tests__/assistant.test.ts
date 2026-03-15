import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import Booking from '../src/models/Booking'
import Car from '../src/models/Car'

let ADMIN_TOKEN: string
let LOCATION_ID: string
let SUPPLIER_ID: string
let DRIVER_ID: string
let BOOKING_ID: string
let CAR_ID: string

beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  ADMIN_TOKEN = await testHelper.signinAsAdmin()
  LOCATION_ID = await testHelper.createLocation('Beirut', 'Beyrouth')

  const supplier = new User({
    fullName: 'يوسف Youssef',
    email: 'youssef.assistant@test.bookcars.ma',
    language: 'en',
    type: bookcarsTypes.UserType.Supplier,
    verified: true,
    active: true,
  })
  await supplier.save()
  SUPPLIER_ID = supplier._id.toString()

  const driver = new User({
    fullName: 'Mahmoud Hamra',
    email: 'mahmoud.assistant@test.bookcars.ma',
    language: 'en',
    type: bookcarsTypes.UserType.User,
    verified: true,
    active: true,
  })
  await driver.save()
  DRIVER_ID = driver._id.toString()

  const car = new Car({
    name: 'Toyota Yaris',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 45,
    deposit: 500,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: 1000,
    cancellation: 0,
    amendments: 0,
    theftProtection: 0,
    collisionDamageWaiver: 0,
    fullInsurance: 0,
    additionalDriver: 0,
    range: bookcarsTypes.CarRange.Midi,
  })
  await car.save()
  CAR_ID = car._id.toString()

  const todayStart = new Date()
  todayStart.setHours(10, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(18, 0, 0, 0)

  const booking = new Booking({
    supplier: SUPPLIER_ID,
    car: CAR_ID,
    driver: DRIVER_ID,
    pickupLocation: LOCATION_ID,
    dropOffLocation: LOCATION_ID,
    from: todayStart,
    to: todayEnd,
    status: bookcarsTypes.BookingStatus.Pending,
    cancellation: true,
    amendments: true,
    theftProtection: false,
    collisionDamageWaiver: false,
    fullInsurance: false,
    additionalDriver: false,
    price: 120,
  })
  await booking.save()
  BOOKING_ID = booking._id.toString()
})

afterAll(async () => {
  await testHelper.signout(ADMIN_TOKEN)
  await Booking.deleteMany({ _id: { $in: [BOOKING_ID] } })
  await Car.deleteMany({ _id: { $in: [CAR_ID] } })
  await User.deleteMany({ _id: { $in: [SUPPLIER_ID, DRIVER_ID] } })
  await testHelper.deleteLocation(LOCATION_ID)
  await testHelper.close()
  await databaseHelper.close()
})

describe('POST /api/assistant/message', () => {
  it('should return a booking summary for unpaid bookings today', async () => {
    const res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'show unpaid bookings today' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('booking_summary')
    expect(res.body.status).toBe('success')
    expect(res.body.inputLanguage).toBe('en')
    expect(res.body.replyLanguage).toBe('en')
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    expect(res.body.contextUsed.historyTurns).toBe(0)
  })

  it('should find a booking by driver name', async () => {
    const res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'find booking Mahmoud' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('booking_search')
    expect(res.body.status).toBe('success')
    expect(res.body.replyLanguage).toBe('en')
    expect(res.body.data.bookings[0]._id).toBe(BOOKING_ID)
  })

  it('should find a supplier with Arabic and Latin matching', async () => {
    let res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'find supplier يوسف' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('supplier_search')
    expect(res.body.status).toBe('success')
    expect(res.body.data.suppliers[0]._id).toBe(SUPPLIER_ID)

    res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'find supplier Youssef' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('supplier_search')
    expect(res.body.status).toBe('success')
    expect(res.body.data.suppliers[0]._id).toBe(SUPPLIER_ID)
  })

  it('should return available cars for tomorrow in Beirut', async () => {
    const res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'available cars tomorrow in Beirut' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('car_availability')
    expect(res.body.status).toBe('success')
    expect(res.body.data.availableCars.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.availableCars[0]._id).toBe(CAR_ID)
  })

  it('should return a safe ops summary for broad operational questions', async () => {
    const res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'what needs attention today?' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('ops_summary')
    expect(res.body.status).toBe('success')
    expect(res.body.data.metrics.unpaidBookings).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(res.body.data.priorities)).toBe(true)
  })

  it('should accept lightweight history payloads', async () => {
    const res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({
        message: 'what needs attention today?',
        history: [
          { role: 'user', text: 'Show me today bookings' },
          { role: 'assistant', text: 'Found 1 booking today.' },
        ],
      })

    expect(res.statusCode).toBe(200)
    expect(res.body.contextUsed.historyTurns).toBe(2)
  })

  it('should keep email and meeting actions as stubs', async () => {
    let res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'send email to mahmoud@example.com' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('send_email')
    expect(res.body.status).toBe('needs_clarification')

    res = await request(app)
      .post('/api/assistant/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)
      .send({ message: 'create meeting with supplier Youssef tomorrow at 11' })

    expect(res.statusCode).toBe(200)
    expect(res.body.intent).toBe('create_meeting')
    expect(res.body.status).toBe('needs_clarification')
  })
})

describe('POST /api/assistant/voice/message', () => {
  it('should require an audio file', async () => {
    const res = await request(app)
      .post('/api/assistant/voice/message')
      .set(env.X_ACCESS_TOKEN, ADMIN_TOKEN)

    expect(res.statusCode).toBe(400)
    expect(res.body.intent).toBe('unknown')
    expect(res.body.reply).toBe('Audio file is required.')
  })
})
