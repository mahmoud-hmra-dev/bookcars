import 'dotenv/config'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as databaseHelper from '../utils/databaseHelper'
import Car from '../models/Car'
import User from '../models/User'
import Location from '../models/Location'
import * as logger from '../utils/logger'

/**
 * Demo car seed data.
 *
 * Each entry contains realistic rental car information.
 * The `supplier` and `locations` fields are resolved at runtime
 * from existing database records.
 */
const demoCars = [
  {
    name: 'Toyota Camry 2024',
    licensePlate: 'DEMO-TC24',
    minimumAge: 21,
    dailyPrice: 65,
    discountedDailyPrice: 55,
    weeklyPrice: 390,
    discountedWeeklyPrice: 350,
    monthlyPrice: 1400,
    discountedMonthlyPrice: 1250,
    deposit: 500,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
    mileage: -1, // unlimited
    cancellation: -1, // included
    amendments: -1, // included
    theftProtection: 10,
    collisionDamageWaiver: 12,
    fullInsurance: 20,
    additionalDriver: 15,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
      bookcarsTypes.CarMultimedia.AndroidAuto,
    ],
    rating: 4,
    co2: 145,
  },
  {
    name: 'BMW X5 2023',
    licensePlate: 'DEMO-BX23',
    minimumAge: 25,
    dailyPrice: 150,
    discountedDailyPrice: 130,
    weeklyPrice: 900,
    discountedWeeklyPrice: 800,
    monthlyPrice: 3200,
    discountedMonthlyPrice: 2900,
    deposit: 1500,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    mileage: 300, // 300 km/day limit
    cancellation: -1,
    amendments: -1,
    theftProtection: 20,
    collisionDamageWaiver: 25,
    fullInsurance: 35,
    additionalDriver: 20,
    range: bookcarsTypes.CarRange.Maxi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
      bookcarsTypes.CarMultimedia.AndroidAuto,
    ],
    rating: 5,
    co2: 190,
  },
  {
    name: 'Mercedes C-Class 2024',
    licensePlate: 'DEMO-MC24',
    minimumAge: 25,
    dailyPrice: 130,
    discountedDailyPrice: 115,
    weeklyPrice: 780,
    discountedWeeklyPrice: 700,
    monthlyPrice: 2800,
    discountedMonthlyPrice: 2500,
    deposit: 1200,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    mileage: 250,
    cancellation: -1,
    amendments: -1,
    theftProtection: 18,
    collisionDamageWaiver: 22,
    fullInsurance: 30,
    additionalDriver: 18,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
    ],
    rating: 5,
    co2: 155,
  },
  {
    name: 'Honda Civic 2023',
    licensePlate: 'DEMO-HC23',
    minimumAge: 21,
    dailyPrice: 50,
    discountedDailyPrice: 42,
    weeklyPrice: 300,
    discountedWeeklyPrice: 270,
    monthlyPrice: 1100,
    discountedMonthlyPrice: 950,
    deposit: 400,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Manual,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
    mileage: -1,
    cancellation: -1,
    amendments: 5,
    theftProtection: 8,
    collisionDamageWaiver: 10,
    fullInsurance: 18,
    additionalDriver: 12,
    range: bookcarsTypes.CarRange.Mini,
    multimedia: [
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.Touchscreen,
    ],
    rating: 4,
    co2: 130,
  },
  {
    name: 'Audi A4 2024',
    licensePlate: 'DEMO-AA24',
    minimumAge: 23,
    dailyPrice: 110,
    discountedDailyPrice: 95,
    weeklyPrice: 660,
    discountedWeeklyPrice: 590,
    monthlyPrice: 2400,
    discountedMonthlyPrice: 2100,
    deposit: 1000,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    mileage: 200,
    cancellation: -1,
    amendments: -1,
    theftProtection: 15,
    collisionDamageWaiver: 20,
    fullInsurance: 28,
    additionalDriver: 18,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AndroidAuto,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
    ],
    rating: 5,
    co2: 135,
  },
  {
    name: 'Tesla Model 3 2024',
    licensePlate: 'DEMO-TM24',
    minimumAge: 23,
    dailyPrice: 120,
    discountedDailyPrice: 105,
    weeklyPrice: 720,
    discountedWeeklyPrice: 650,
    monthlyPrice: 2600,
    discountedMonthlyPrice: 2300,
    deposit: 1000,
    available: true,
    type: bookcarsTypes.CarType.Electric,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
    cancellation: -1,
    amendments: -1,
    theftProtection: 18,
    collisionDamageWaiver: 22,
    fullInsurance: 30,
    additionalDriver: 15,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
      bookcarsTypes.CarMultimedia.AndroidAuto,
    ],
    rating: 5,
    co2: 0,
  },
  {
    name: 'Nissan Altima 2023',
    licensePlate: 'DEMO-NA23',
    minimumAge: 21,
    dailyPrice: 55,
    discountedDailyPrice: 47,
    weeklyPrice: 330,
    discountedWeeklyPrice: 295,
    monthlyPrice: 1200,
    discountedMonthlyPrice: 1050,
    deposit: 450,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
    mileage: -1,
    cancellation: 10,
    amendments: 5,
    theftProtection: 9,
    collisionDamageWaiver: 11,
    fullInsurance: 19,
    additionalDriver: 12,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.Touchscreen,
    ],
    rating: 3,
    co2: 140,
  },
  {
    name: 'Hyundai Tucson 2024',
    licensePlate: 'DEMO-HT24',
    minimumAge: 21,
    dailyPrice: 75,
    discountedDailyPrice: 65,
    weeklyPrice: 450,
    discountedWeeklyPrice: 400,
    monthlyPrice: 1600,
    discountedMonthlyPrice: 1400,
    deposit: 600,
    available: true,
    type: bookcarsTypes.CarType.Hybrid,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    mileage: -1,
    cancellation: -1,
    amendments: -1,
    theftProtection: 12,
    collisionDamageWaiver: 14,
    fullInsurance: 22,
    additionalDriver: 15,
    range: bookcarsTypes.CarRange.Maxi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AndroidAuto,
      bookcarsTypes.CarMultimedia.AppleCarPlay,
    ],
    rating: 4,
    co2: 105,
  },
  {
    name: 'Ford Mustang 2023',
    licensePlate: 'DEMO-FM23',
    minimumAge: 25,
    dailyPrice: 140,
    discountedDailyPrice: 125,
    weeklyPrice: 840,
    discountedWeeklyPrice: 750,
    monthlyPrice: 3000,
    discountedMonthlyPrice: 2700,
    deposit: 1500,
    available: true,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Manual,
    aircon: true,
    seats: 4,
    doors: 2,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    mileage: 200,
    cancellation: 20,
    amendments: 10,
    theftProtection: 25,
    collisionDamageWaiver: 30,
    fullInsurance: 40,
    additionalDriver: 20,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
    ],
    rating: 5,
    co2: 230,
  },
  {
    name: 'Kia Sportage 2024',
    licensePlate: 'DEMO-KS24',
    minimumAge: 21,
    dailyPrice: 60,
    discountedDailyPrice: 50,
    weeklyPrice: 360,
    discountedWeeklyPrice: 320,
    monthlyPrice: 1300,
    discountedMonthlyPrice: 1150,
    deposit: 500,
    available: true,
    type: bookcarsTypes.CarType.Hybrid,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
    mileage: -1,
    cancellation: -1,
    amendments: -1,
    theftProtection: 10,
    collisionDamageWaiver: 12,
    fullInsurance: 20,
    additionalDriver: 14,
    range: bookcarsTypes.CarRange.Maxi,
    multimedia: [
      bookcarsTypes.CarMultimedia.Touchscreen,
      bookcarsTypes.CarMultimedia.Bluetooth,
      bookcarsTypes.CarMultimedia.AndroidAuto,
    ],
    rating: 4,
    co2: 110,
  },
]

async function seed() {
  // Connect to the database
  const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)
  if (!connected) {
    logger.error('Failed to connect to the database')
    process.exit(1)
  }

  try {
    // Find a supplier to assign the cars to.
    // Prefer a user with type 'supplier'; fall back to 'admin' if none exists.
    let supplier = await User.findOne({ type: bookcarsTypes.UserType.Supplier })
    if (!supplier) {
      supplier = await User.findOne({ type: bookcarsTypes.UserType.Admin })
    }
    if (!supplier) {
      logger.error('No supplier or admin user found in the database. Please run the setup script first.')
      process.exit(1)
    }
    logger.info(`Using supplier: ${supplier.fullName} (${supplier._id})`)

    // Find at least one location to assign the cars to.
    const locations = await Location.find().limit(5)
    if (locations.length === 0) {
      logger.error('No locations found in the database. Please create at least one location first.')
      process.exit(1)
    }
    const locationIds = locations.map((loc) => loc._id)
    logger.info(`Using ${locationIds.length} location(s)`)

    // Insert demo cars
    let insertedCount = 0
    for (const carData of demoCars) {
      // Check if a car with the same name already exists to avoid duplicates
      const existing = await Car.findOne({ name: carData.name })
      if (existing) {
        logger.info(`Skipping "${carData.name}" - already exists`)
        continue
      }

      const car = new Car({
        ...carData,
        supplier: supplier._id,
        locations: locationIds,
      })

      await car.save()
      logger.info(`Inserted "${carData.name}" (daily: $${carData.dailyPrice})`)
      insertedCount += 1
    }

    logger.info(`Seed complete: ${insertedCount} car(s) inserted, ${demoCars.length - insertedCount} skipped`)
  } catch (err) {
    logger.error('Error during seeding:', err)
    process.exit(1)
  } finally {
    await databaseHelper.close()
    process.exit(0)
  }
}

seed()
