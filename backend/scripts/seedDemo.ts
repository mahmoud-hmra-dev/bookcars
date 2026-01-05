import 'dotenv/config'
import mongoose from 'mongoose'
import * as env from '../src/config/env.config'
import * as authHelper from '../src/utils/authHelper'
import * as logger from '../src/utils/logger'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import Country from '../src/models/Country'
import User from '../src/models/User'
import Car from '../src/models/Car'

const connect = async () => {
  await mongoose.connect(env.DB_URI, {
    tls: env.DB_SSL,
    tlsCertificateKeyFile: env.DB_SSL_CERT || undefined,
    tlsCAFile: env.DB_SSL_CA || undefined,
  })
  logger.info('[seedDemo] Connected to MongoDB')
}

const upsertCountry = async () => {
  const existing = await Country.findOne().lean()
  if (existing) {
    return existing._id
  }

  const value = new LocationValue({ language: 'en', value: 'Demo Country' })
  await value.save()

  const country = new Country({
    values: [value._id],
    supplier: null,
  })
  await country.save()
  return country._id
}

const upsertLocation = async (
  nameEn: string,
  longitude: number,
  latitude: number,
  countryId: mongoose.Types.ObjectId,
) => {
  const existing = await Location.findOne({ longitude, latitude }).lean()
  if (existing) {
    return existing._id
  }

  const value = new LocationValue({ language: 'en', value: nameEn })
  await value.save()

  const loc = new Location({
    country: countryId,
    longitude,
    latitude,
    values: [value._id],
    name: nameEn,
  })
  await loc.save()

  return loc._id
}

const upsertSupplier = async () => {
  const email = 'supplier.demo@bookcars.local'
  const existing = await User.findOne({ email }).lean()
  if (existing) {
    return existing._id
  }

  const password = await authHelper.hashPassword('Password123!')
  const supplier = new User({
    email,
    fullName: 'Demo Supplier',
    password,
    active: true,
    verified: true,
    language: 'en',
    type: 'supplier',
    blacklisted: false,
  })
  await supplier.save()
  return supplier._id
}

const seedCars = async (supplierId: mongoose.Types.ObjectId, locationIds: mongoose.Types.ObjectId[]) => {
  const cars = [
    {
      name: 'Demo Sedan',
      licensePlate: 'DEMO-001',
      traccarDeviceId: 1001,
      traccarUniqueId: 'demo-imei-1001',
      type: 'gasoline',
      gearbox: 'automatic',
      range: 'midi',
      seats: 5,
      doors: 4,
      aircon: true,
      dailyPrice: 50,
      deposit: 500,
    },
    {
      name: 'Demo SUV',
      licensePlate: 'DEMO-002',
      traccarDeviceId: 1002,
      traccarUniqueId: 'demo-imei-1002',
      type: 'hybrid',
      gearbox: 'automatic',
      range: 'maxi',
      seats: 7,
      doors: 5,
      aircon: true,
      dailyPrice: 80,
      deposit: 800,
    },
  ]

  for (const demo of cars) {
    const exists = await Car.findOne({ licensePlate: demo.licensePlate }).lean()
    if (exists) {
      continue
    }

    const car = new Car({
      ...demo,
      supplier: supplierId,
      minimumAge: env.MINIMUM_AGE,
      locations: locationIds,
      discountedDailyPrice: null,
      hourlyPrice: null,
      discountedHourlyPrice: null,
      biWeeklyPrice: null,
      discountedBiWeeklyPrice: null,
      weeklyPrice: null,
      discountedWeeklyPrice: null,
      monthlyPrice: null,
      discountedMonthlyPrice: null,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      fuelPolicy: 'fullToFull',
      image: null,
      multimedia: [],
      rating: 4.5,
      trips: 0,
      co2: 120,
      blockOnPay: true,
    })
    await car.save()
  }
}

const main = async () => {
  try {
    await connect()

    const countryId = await upsertCountry()
    const loc1 = await upsertLocation('Demo Downtown', -0.1276, 51.5074, countryId as mongoose.Types.ObjectId)
    const loc2 = await upsertLocation('Demo Airport', -3.7038, 40.4168, countryId as mongoose.Types.ObjectId)
    const supplierId = await upsertSupplier()
    await seedCars(supplierId as mongoose.Types.ObjectId, [loc1 as mongoose.Types.ObjectId, loc2 as mongoose.Types.ObjectId])

    logger.info('[seedDemo] Done.')
    process.exit(0)
  } catch (err) {
    logger.error('[seedDemo] Failed', err)
    process.exit(1)
  }
}

void main()
