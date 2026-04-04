import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Car from '../models/Car'
import User from '../models/User'
import Location from '../models/Location'
import LocationValue from '../models/LocationValue'
import Country from '../models/Country'
import * as logger from '../utils/logger'

const SUPPLIER_PASSWORD = '123123123'

const suppliers = [
  {
    fullName: 'Cedar Drive Lebanon',
    email: 'info@cedardrive.lb',
    phone: '+96170123456',
    location: { name: 'Beirut - Hamra', lat: 33.8938, lng: 35.5018 },
    bio: 'Premium car rental in the heart of Hamra, Beirut.',
  },
  {
    fullName: 'Phoenicia Car Rental',
    email: 'rent@phoeniciacars.lb',
    phone: '+96171234567',
    location: { name: 'Beirut - Achrafieh', lat: 33.8869, lng: 35.5208 },
    bio: 'Reliable fleet serving Achrafieh and Gemmayzeh.',
  },
  {
    fullName: 'Mount Lebanon Rent',
    email: 'contact@mountlebanonrent.lb',
    phone: '+96172345678',
    location: { name: 'Jounieh', lat: 33.9808, lng: 35.6179 },
    bio: 'Best rates in Jounieh and the Keserwan district.',
  },
  {
    fullName: 'Bekaa Valley Cars',
    email: 'info@bekaacars.lb',
    phone: '+96173456789',
    location: { name: 'Zahlé', lat: 33.8460, lng: 35.9023 },
    bio: 'Serving the Bekaa Valley with competitive prices.',
  },
  {
    fullName: 'North Star Rental',
    email: 'rent@northstarlb.com',
    phone: '+96176123456',
    location: { name: 'Tripoli', lat: 34.4367, lng: 35.8497 },
    bio: 'Top car rental agency in Tripoli, North Lebanon.',
  },
  {
    fullName: 'South Coast Autos',
    email: 'cars@southcoastautos.lb',
    phone: '+96177234567',
    location: { name: 'Sidon (Saida)', lat: 33.5632, lng: 35.3717 },
    bio: 'Serving Sidon and the South Lebanon coast.',
  },
  {
    fullName: 'Baalbek Heritage Rentals',
    email: 'info@baalbek-rentals.lb',
    phone: '+96178345678',
    location: { name: 'Baalbek', lat: 34.0043, lng: 36.2060 },
    bio: 'Explore the ancient city and beyond with our fleet.',
  },
  {
    fullName: 'Metn Premium Cars',
    email: 'contact@metnpremium.lb',
    phone: '+96179456789',
    location: { name: 'Dbayeh - Metn', lat: 33.9154, lng: 35.5895 },
    bio: 'Luxury and economy vehicles in the Metn district.',
  },
  {
    fullName: 'Airport Express Rental',
    email: 'rent@airportexpress.lb',
    phone: '+96181123456',
    location: { name: 'Khalde - Beirut Airport Area', lat: 33.8208, lng: 35.4888 },
    bio: 'Conveniently located near Beirut Rafic Hariri Airport.',
  },
  {
    fullName: 'Tyre Road Rentals',
    email: 'info@tyreroad.lb',
    phone: '+96179123456',
    location: { name: 'Tyre (Sour)', lat: 33.2705, lng: 35.2038 },
    bio: 'Discover the beautiful South with our vehicles.',
  },
]

const carTemplates = [
  {
    name: 'Toyota Yaris 2024', licenseSuffix: 'TY24', minimumAge: 21, dailyPrice: 35, discountedDailyPrice: 30,
    weeklyPrice: 210, discountedWeeklyPrice: 190, monthlyPrice: 750, discountedMonthlyPrice: 680,
    deposit: 300, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 8, collisionDamageWaiver: 9, fullInsurance: 15,
    additionalDriver: 10, range: bookcarsTypes.CarRange.Mini,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen], rating: 4, co2: 115,
  },
  {
    name: 'Honda Civic 2024', licenseSuffix: 'HC24', minimumAge: 21, dailyPrice: 45, discountedDailyPrice: 38,
    weeklyPrice: 270, discountedWeeklyPrice: 245, monthlyPrice: 950, discountedMonthlyPrice: 860,
    deposit: 400, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 0, theftProtection: 9, collisionDamageWaiver: 11, fullInsurance: 17,
    additionalDriver: 11, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 4, co2: 125,
  },
  {
    name: 'Toyota Corolla 2024', licenseSuffix: 'TC24', minimumAge: 21, dailyPrice: 50, discountedDailyPrice: 43,
    weeklyPrice: 300, discountedWeeklyPrice: 270, monthlyPrice: 1050, discountedMonthlyPrice: 940,
    deposit: 400, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 9, collisionDamageWaiver: 11, fullInsurance: 16,
    additionalDriver: 10, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.AppleCarPlay], rating: 4, co2: 130,
  },
  {
    name: 'Hyundai Elantra 2024', licenseSuffix: 'HE24', minimumAge: 21, dailyPrice: 42, discountedDailyPrice: 36,
    weeklyPrice: 252, discountedWeeklyPrice: 228, monthlyPrice: 900, discountedMonthlyPrice: 810,
    deposit: 350, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 5, theftProtection: 8, collisionDamageWaiver: 10, fullInsurance: 16,
    additionalDriver: 10, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen], rating: 3, co2: 120,
  },
  {
    name: 'Nissan Sentra 2024', licenseSuffix: 'NS24', minimumAge: 21, dailyPrice: 40, discountedDailyPrice: 35,
    weeklyPrice: 240, discountedWeeklyPrice: 215, monthlyPrice: 860, discountedMonthlyPrice: 780,
    deposit: 350, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 0, theftProtection: 8, collisionDamageWaiver: 10, fullInsurance: 15,
    additionalDriver: 10, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth], rating: 3, co2: 125,
  },
  {
    name: 'Kia Cerato 2024', licenseSuffix: 'KC24', minimumAge: 21, dailyPrice: 38, discountedDailyPrice: 33,
    weeklyPrice: 228, discountedWeeklyPrice: 200, monthlyPrice: 820, discountedMonthlyPrice: 740,
    deposit: 300, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 0, theftProtection: 7, collisionDamageWaiver: 9, fullInsurance: 14,
    additionalDriver: 9, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen], rating: 4, co2: 120,
  },
  {
    name: 'Mitsubishi Outlander 2023', licenseSuffix: 'MO23', minimumAge: 21, dailyPrice: 80, discountedDailyPrice: 70,
    weeklyPrice: 480, discountedWeeklyPrice: 430, monthlyPrice: 1700, discountedMonthlyPrice: 1530,
    deposit: 700, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 7, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 13, collisionDamageWaiver: 15, fullInsurance: 23,
    additionalDriver: 14, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 4, co2: 165,
  },
  {
    name: 'Toyota RAV4 2024', licenseSuffix: 'TR24', minimumAge: 21, dailyPrice: 90, discountedDailyPrice: 78,
    weeklyPrice: 540, discountedWeeklyPrice: 490, monthlyPrice: 1900, discountedMonthlyPrice: 1700,
    deposit: 800, available: true, type: bookcarsTypes.CarType.Hybrid, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 14, collisionDamageWaiver: 16, fullInsurance: 24,
    additionalDriver: 14, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 5, co2: 110,
  },
  {
    name: 'Kia Sportage 2024', licenseSuffix: 'KS24', minimumAge: 21, dailyPrice: 75, discountedDailyPrice: 65,
    weeklyPrice: 450, discountedWeeklyPrice: 405, monthlyPrice: 1600, discountedMonthlyPrice: 1440,
    deposit: 650, available: true, type: bookcarsTypes.CarType.Hybrid, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 12, collisionDamageWaiver: 14, fullInsurance: 22,
    additionalDriver: 13, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 4, co2: 108,
  },
  {
    name: 'Hyundai Tucson 2024', licenseSuffix: 'HT24', minimumAge: 21, dailyPrice: 78, discountedDailyPrice: 68,
    weeklyPrice: 470, discountedWeeklyPrice: 420, monthlyPrice: 1650, discountedMonthlyPrice: 1480,
    deposit: 700, available: true, type: bookcarsTypes.CarType.Hybrid, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 13, collisionDamageWaiver: 15, fullInsurance: 23,
    additionalDriver: 14, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay], rating: 4, co2: 112,
  },
  {
    name: 'Mercedes GLC 2023', licenseSuffix: 'MG23', minimumAge: 25, dailyPrice: 160, discountedDailyPrice: 140,
    weeklyPrice: 960, discountedWeeklyPrice: 865, monthlyPrice: 3400, discountedMonthlyPrice: 3060,
    deposit: 1800, available: true, type: bookcarsTypes.CarType.Diesel, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: 300,
    cancellation: -1, amendments: -1, theftProtection: 25, collisionDamageWaiver: 30, fullInsurance: 45,
    additionalDriver: 20, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 5, co2: 175,
  },
  {
    name: 'BMW 3 Series 2023', licenseSuffix: 'B3S23', minimumAge: 25, dailyPrice: 150, discountedDailyPrice: 130,
    weeklyPrice: 900, discountedWeeklyPrice: 810, monthlyPrice: 3200, discountedMonthlyPrice: 2880,
    deposit: 1600, available: true, type: bookcarsTypes.CarType.Diesel, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: 300,
    cancellation: -1, amendments: -1, theftProtection: 22, collisionDamageWaiver: 28, fullInsurance: 42,
    additionalDriver: 20, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 5, co2: 168,
  },
  {
    name: 'Audi A4 2023', licenseSuffix: 'AA423', minimumAge: 25, dailyPrice: 145, discountedDailyPrice: 128,
    weeklyPrice: 870, discountedWeeklyPrice: 780, monthlyPrice: 3100, discountedMonthlyPrice: 2790,
    deposit: 1500, available: true, type: bookcarsTypes.CarType.Diesel, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: 300,
    cancellation: -1, amendments: -1, theftProtection: 22, collisionDamageWaiver: 27, fullInsurance: 40,
    additionalDriver: 20, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay], rating: 5, co2: 162,
  },
  {
    name: 'Range Rover Evoque 2023', licenseSuffix: 'RRE23', minimumAge: 25, dailyPrice: 200, discountedDailyPrice: 175,
    weeklyPrice: 1200, discountedWeeklyPrice: 1080, monthlyPrice: 4200, discountedMonthlyPrice: 3780,
    deposit: 2500, available: true, type: bookcarsTypes.CarType.Diesel, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: 250,
    cancellation: -1, amendments: -1, theftProtection: 35, collisionDamageWaiver: 40, fullInsurance: 60,
    additionalDriver: 25, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 5, co2: 195,
  },
  {
    name: 'Toyota Land Cruiser 2024', licenseSuffix: 'TLC24', minimumAge: 25, dailyPrice: 220, discountedDailyPrice: 195,
    weeklyPrice: 1320, discountedWeeklyPrice: 1188, monthlyPrice: 4600, discountedMonthlyPrice: 4140,
    deposit: 3000, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 7, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: 300,
    cancellation: -1, amendments: -1, theftProtection: 40, collisionDamageWaiver: 45, fullInsurance: 65,
    additionalDriver: 25, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 5, co2: 260,
  },
  {
    name: 'Jeep Wrangler 2023', licenseSuffix: 'JW23', minimumAge: 23, dailyPrice: 130, discountedDailyPrice: 115,
    weeklyPrice: 780, discountedWeeklyPrice: 700, monthlyPrice: 2800, discountedMonthlyPrice: 2520,
    deposit: 1400, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Manual,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull, mileage: -1,
    cancellation: 15, amendments: 10, theftProtection: 20, collisionDamageWaiver: 25, fullInsurance: 38,
    additionalDriver: 18, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.Touchscreen], rating: 4, co2: 240,
  },
  {
    name: 'Toyota Camry 2024', licenseSuffix: 'TCM24', minimumAge: 21, dailyPrice: 65, discountedDailyPrice: 57,
    weeklyPrice: 390, discountedWeeklyPrice: 350, monthlyPrice: 1400, discountedMonthlyPrice: 1260,
    deposit: 550, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: -1, amendments: -1, theftProtection: 11, collisionDamageWaiver: 13, fullInsurance: 20,
    additionalDriver: 12, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AppleCarPlay], rating: 4, co2: 148,
  },
  {
    name: 'Volkswagen Passat 2023', licenseSuffix: 'VP23', minimumAge: 21, dailyPrice: 72, discountedDailyPrice: 63,
    weeklyPrice: 432, discountedWeeklyPrice: 390, monthlyPrice: 1550, discountedMonthlyPrice: 1395,
    deposit: 600, available: true, type: bookcarsTypes.CarType.Diesel, gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 0, theftProtection: 11, collisionDamageWaiver: 13, fullInsurance: 21,
    additionalDriver: 13, range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.Touchscreen, bookcarsTypes.CarMultimedia.Bluetooth, bookcarsTypes.CarMultimedia.AndroidAuto], rating: 4, co2: 138,
  },
  {
    name: 'Renault Duster 2024', licenseSuffix: 'RD24', minimumAge: 21, dailyPrice: 55, discountedDailyPrice: 48,
    weeklyPrice: 330, discountedWeeklyPrice: 298, monthlyPrice: 1200, discountedMonthlyPrice: 1080,
    deposit: 450, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Manual,
    aircon: true, seats: 5, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 10, amendments: 5, theftProtection: 9, collisionDamageWaiver: 11, fullInsurance: 17,
    additionalDriver: 10, range: bookcarsTypes.CarRange.Maxi,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth], rating: 3, co2: 145,
  },
  {
    name: 'Chevrolet Spark 2024', licenseSuffix: 'CS24', minimumAge: 21, dailyPrice: 28, discountedDailyPrice: 24,
    weeklyPrice: 168, discountedWeeklyPrice: 150, monthlyPrice: 620, discountedMonthlyPrice: 558,
    deposit: 250, available: true, type: bookcarsTypes.CarType.Gasoline, gearbox: bookcarsTypes.GearboxType.Manual,
    aircon: true, seats: 4, doors: 4, fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike, mileage: -1,
    cancellation: 0, amendments: 0, theftProtection: 6, collisionDamageWaiver: 8, fullInsurance: 12,
    additionalDriver: 8, range: bookcarsTypes.CarRange.Mini,
    multimedia: [bookcarsTypes.CarMultimedia.Bluetooth], rating: 3, co2: 100,
  },
]

/**
 * POST /api/seed-lebanon
 * Seeds 10 Lebanese suppliers and 20 cars each into the database.
 * Admin only.
 */
export const seedLebanon = async (req: Request, res: Response) => {
  const log: string[] = []

  try {
    // 1. Lebanon country — find or create
    let countryDoc: any

    // First try: find by a LocationValue with value 'Lebanon'
    const lebValueEn = await (LocationValue as any).findOne({ language: 'en', value: 'Lebanon' })
    if (lebValueEn) {
      countryDoc = await (Country as any).findOne({ values: { $in: [lebValueEn._id] } })
    }

    // Second try: just grab any country (single-country setups)
    if (!countryDoc) {
      countryDoc = await (Country as any).findOne({})
    }

    // Last resort: create Lebanon country from scratch
    if (!countryDoc) {
      const cvEn = await new LocationValue({ language: 'en', value: 'Lebanon' }).save()
      const cvAr = await new LocationValue({ language: 'ar', value: 'لبنان' }).save()
      const cvFr = await new LocationValue({ language: 'fr', value: 'Liban' }).save()
      countryDoc = await new Country({ values: [cvEn._id, cvAr._id, cvFr._id] }).save()
      log.push('Created country: Lebanon')
    } else {
      log.push(`Using country: ${lebValueEn?.value || countryDoc._id}`)
    }

    const adminUser = await User.findOne({ type: bookcarsTypes.UserType.Admin })
    if (!adminUser) {
      res.status(500).json({ success: false, message: 'No admin user found. Run setup first.', log })
      return
    }

    let totalCars = 0

    // 2. Suppliers + locations + cars
    for (const supplierData of suppliers) {
      let supplierUser = await User.findOne({ email: supplierData.email })

      if (!supplierUser) {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(SUPPLIER_PASSWORD, salt)
        supplierUser = await new User({
          email: supplierData.email,
          fullName: supplierData.fullName,
          phone: supplierData.phone,
          password: hashedPassword,
          type: bookcarsTypes.UserType.Supplier,
          active: true,
          verified: true,
          verifiedAt: new Date(),
          language: 'en',
          enableEmailNotifications: true,
          payLater: true,
          licenseRequired: false,
          minimumRentalDays: 1,
          latitude: supplierData.location.lat,
          longitude: supplierData.location.lng,
        }).save()
        log.push(`Created supplier: ${supplierData.fullName}`)
      } else {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(SUPPLIER_PASSWORD, salt)
        await User.updateOne(
          { _id: supplierUser._id },
          {
            $set: {
              active: true,
              verified: true,
              password: hashedPassword,
              latitude: supplierData.location.lat,
              longitude: supplierData.location.lng,
            },
          },
        )
        log.push(`Updated supplier: ${supplierData.fullName}`)
      }

      // Location
      const locationNameEn = supplierData.location.name
      let existingLocValue = await (LocationValue as any).findOne({ language: 'en', value: locationNameEn })
      let locationDoc: any

      if (!existingLocValue) {
        const lvEn = await new LocationValue({ language: 'en', value: locationNameEn }).save()
        const lvAr = await new LocationValue({ language: 'ar', value: locationNameEn }).save()
        const lvFr = await new LocationValue({ language: 'fr', value: locationNameEn }).save()
        locationDoc = await new Location({
          country: countryDoc._id,
          latitude: supplierData.location.lat,
          longitude: supplierData.location.lng,
          values: [lvEn._id, lvAr._id, lvFr._id],
          supplier: supplierUser._id,
        }).save()
        log.push(`  Created location: ${locationNameEn}`)
      } else {
        locationDoc = await (Location as any).findOne({ values: existingLocValue._id })
        if (!locationDoc) {
          locationDoc = await new Location({
            country: countryDoc._id,
            latitude: supplierData.location.lat,
            longitude: supplierData.location.lng,
            values: [existingLocValue._id],
            supplier: supplierUser._id,
          }).save()
        }
        log.push(`  Found location: ${locationNameEn}`)
      }

      // Cars
      let carCount = 0
      for (const template of carTemplates) {
        const licensePlate = `LB-${supplierData.fullName.replace(/\s/g, '').substring(0, 4).toUpperCase()}-${template.licenseSuffix}`
        const existing = await Car.findOne({ licensePlate })
        if (existing) {
          continue
        }
        const { licenseSuffix: _ls, ...carData } = template
        await new Car({
          ...carData,
          minimumAge: Math.max(carData.minimumAge, env.MINIMUM_AGE),
          licensePlate,
          supplier: supplierUser._id,
          locations: [locationDoc._id],
        }).save()
        carCount++
      }
      totalCars += carCount
      log.push(`  Added ${carCount} car(s) for ${supplierData.fullName}`)
    }

    log.push(`✅ Done — ${totalCars} cars created across ${suppliers.length} suppliers.`)
    logger.info('Seed Lebanon completed via admin UI')
    res.status(200).json({ success: true, log })
  } catch (err: any) {
    logger.error('Seed Lebanon error:', err)
    res.status(500).json({ success: false, message: err.message || 'Seed failed', log })
  }
}
