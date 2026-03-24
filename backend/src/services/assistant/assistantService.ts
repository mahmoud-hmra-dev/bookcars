import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../../models/Booking'
import Car from '../../models/Car'
import Location from '../../models/Location'
import LocationValue from '../../models/LocationValue'
import User from '../../models/User'
import * as logger from '../../utils/logger'
import { normalizeAssistantText, parseAssistantMessage } from './assistantParser'
import { localizeAssistantResponse, resolveAssistantIntentWithLlm } from './assistantLlmResolver'
import { AssistantConversationTurn, AssistantResponse, ParsedAssistantIntent } from './assistantTypes'

const MAX_RESULTS = 10
const MAX_HISTORY_TURNS = 6

const PAID_STATUSES = [
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Deposit,
]

const BLOCKING_BOOKING_STATUSES = [
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Deposit,
  bookcarsTypes.BookingStatus.Reserved,
]

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildFlexibleNamePattern = (value: string) => {
  const normalized = normalizeAssistantText(value)
  const escaped = escapeRegex(normalized)
  return escaped
    .replace(/youssef/g, '(?:youssef|يوسف)')
    .replace(/يوسف/g, '(?:youssef|يوسف)')
}

const isObjectId = (value?: string) => !!(value && mongoose.Types.ObjectId.isValid(value))
const toObjectId = (value: string) => new mongoose.Types.ObjectId(value)
const matchNormalized = (source: string | null | undefined, query: string) => normalizeAssistantText(source || '').includes(normalizeAssistantText(query))

const sanitizeAssistantHistory = (history: AssistantConversationTurn[] = []) => history
  .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
  .map((turn) => ({ role: turn.role, text: turn.text.trim() }))
  .filter((turn) => turn.text)
  .slice(-MAX_HISTORY_TURNS)

const withLanguageMetadata = (
  parsed: ParsedAssistantIntent,
  history: AssistantConversationTurn[],
  response: Omit<AssistantResponse, 'inputLanguage' | 'replyLanguage' | 'contextUsed'>,
): AssistantResponse => ({
  ...response,
  inputLanguage: parsed.inputLanguage || 'en',
  replyLanguage: parsed.replyLanguage || parsed.inputLanguage || 'en',
  contextUsed: {
    historyTurns: history.length,
  },
})

const withResolutionSource = (parsed: ParsedAssistantIntent, data?: Record<string, unknown>) => ({
  ...(data || {}),
  resolutionSource: parsed.source,
})

const findSuppliers = async (searchTerm: string) => {
  const regex = new RegExp(buildFlexibleNamePattern(searchTerm), 'i')
  const suppliers = await User.find({
    type: bookcarsTypes.UserType.Supplier,
    expireAt: null,
    $or: [
      { fullName: { $regex: regex } },
      { email: { $regex: regex } },
      { phone: { $regex: regex } },
    ],
  })
    .select('_id fullName email phone active verified payLater licenseRequired')
    .sort({ fullName: 1, _id: 1 })
    .limit(MAX_RESULTS)
    .lean()

  if (suppliers.length > 0) {
    return suppliers
  }

  const fallbackSuppliers = await User.find({
    type: bookcarsTypes.UserType.Supplier,
    expireAt: null,
  })
    .select('_id fullName email phone active verified payLater licenseRequired')
    .sort({ fullName: 1, _id: 1 })
    .limit(100)
    .lean()

  return fallbackSuppliers
    .filter((supplier) => matchNormalized(supplier.fullName, searchTerm) || matchNormalized(supplier.email, searchTerm) || matchNormalized(supplier.phone, searchTerm))
    .slice(0, MAX_RESULTS)
}

const findCustomers = async (searchTerm: string) => {
  const regex = new RegExp(buildFlexibleNamePattern(searchTerm), 'i')
  const customers = await User.find({
    type: bookcarsTypes.UserType.User,
    expireAt: null,
    $or: [
      { fullName: { $regex: regex } },
      { email: { $regex: regex } },
      { phone: { $regex: regex } },
    ],
  })
    .select('_id fullName email phone active verified blacklisted createdAt')
    .sort({ createdAt: -1, _id: 1 })
    .limit(MAX_RESULTS)
    .lean()

  if (customers.length > 0) {
    return customers
  }

  const fallbackCustomers = await User.find({
    type: bookcarsTypes.UserType.User,
    expireAt: null,
  })
    .select('_id fullName email phone active verified blacklisted createdAt')
    .sort({ createdAt: -1, _id: 1 })
    .limit(150)
    .lean()

  return fallbackCustomers
    .filter((customer) => matchNormalized(customer.fullName, searchTerm) || matchNormalized(customer.email, searchTerm) || matchNormalized(customer.phone, searchTerm))
    .slice(0, MAX_RESULTS)
}

const findCars = async (searchTerm: string) => {
  const regex = new RegExp(escapeRegex(searchTerm), 'i')
  const cars = await Car.find({
    $or: [
      { name: { $regex: regex } },
      { licensePlate: { $regex: regex } },
    ],
  })
    .populate<{ supplier: { fullName?: string, email?: string } }>('supplier')
    .sort({ updatedAt: -1, _id: 1 })
    .limit(MAX_RESULTS)
    .lean()

  if (cars.length > 0) {
    return cars
  }

  const fallbackCars = await Car.find({})
    .populate<{ supplier: { fullName?: string, email?: string } }>('supplier')
    .sort({ updatedAt: -1, _id: 1 })
    .limit(150)
    .lean()

  return fallbackCars
    .filter((car) => matchNormalized(car.name, searchTerm) || matchNormalized(car.licensePlate, searchTerm) || matchNormalized(car.supplier?.fullName, searchTerm))
    .slice(0, MAX_RESULTS)
}

const getBookingSearchFilter = (searchTerm: string): Record<string, unknown> => {
  const regex = new RegExp(escapeRegex(searchTerm), 'i')

  if (isObjectId(searchTerm)) {
    return {
      $or: [
        { _id: toObjectId(searchTerm) },
        { 'driver._id': toObjectId(searchTerm) },
        { 'supplier._id': toObjectId(searchTerm) },
        { 'car._id': toObjectId(searchTerm) },
      ],
    }
  }

  return {
    $or: [
      { 'driver.fullName': { $regex: regex } },
      { 'driver.email': { $regex: regex } },
      { 'supplier.fullName': { $regex: regex } },
      { 'supplier.email': { $regex: regex } },
      { 'car.name': { $regex: regex } },
    ],
  }
}

const searchBookings = async (searchTerm: string) => {
  const match: Record<string, unknown> = {
    $and: [
      { expireAt: null },
      getBookingSearchFilter(searchTerm),
    ],
  }

  return Booking.aggregate([
    {
      $lookup: {
        from: 'User',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: '$supplier' },
    {
      $lookup: {
        from: 'User',
        localField: 'driver',
        foreignField: '_id',
        as: 'driver',
      },
    },
    { $unwind: '$driver' },
    {
      $lookup: {
        from: 'Car',
        localField: 'car',
        foreignField: '_id',
        as: 'car',
      },
    },
    { $unwind: '$car' },
    { $match: match },
    { $sort: { createdAt: -1, _id: 1 } },
    { $limit: MAX_RESULTS },
    {
      $project: {
        _id: 1,
        status: 1,
        from: 1,
        to: 1,
        createdAt: 1,
        price: 1,
        'driver._id': 1,
        'driver.fullName': 1,
        'driver.email': 1,
        'supplier._id': 1,
        'supplier.fullName': 1,
        'supplier.email': 1,
        'car._id': 1,
        'car.name': 1,
      },
    },
  ])
}

const summarizeBookings = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  const match: Record<string, unknown> = { expireAt: null }

  if (parsed.dateRange) {
    match.from = { $gte: parsed.dateRange.from, $lte: parsed.dateRange.to }
  }

  const requestedStatuses: string[] = []
  if (parsed.filters?.unpaid) {
    match.status = { $nin: PAID_STATUSES }
    requestedStatuses.push('unpaid')
  } else if (parsed.filters?.paid) {
    match.status = { $in: PAID_STATUSES }
    requestedStatuses.push('paid')
  } else if (parsed.filters?.cancelled) {
    match.status = bookcarsTypes.BookingStatus.Cancelled
    requestedStatuses.push('cancelled')
  } else if (parsed.filters?.reserved) {
    match.status = bookcarsTypes.BookingStatus.Reserved
    requestedStatuses.push('reserved')
  }

  const bookings = await Booking.find(match)
    .populate<{ driver: { fullName?: string, email?: string } }>('driver')
    .populate<{ supplier: { fullName?: string, email?: string } }>('supplier')
    .populate<{ car: { name?: string } }>('car')
    .sort({ from: 1, _id: 1 })
    .limit(MAX_RESULTS)
    .lean()

  const total = await Booking.countDocuments(match)
  const summaryLabel = [requestedStatuses.join(', '), parsed.dateRange?.label ?? null].filter(Boolean).join(' ')

  return withLanguageMetadata(parsed, history, {
    intent: 'booking_summary',
    status: 'success',
    reply: total > 0
      ? `Found ${total} ${summaryLabel || ''} booking${total > 1 ? 's' : ''}.`.replace(/\s+/g, ' ').trim()
      : `No ${summaryLabel || ''} bookings found.`.replace(/\s+/g, ' ').trim(),
    data: withResolutionSource(parsed, {
      total,
      filters: {
        unpaid: !!parsed.filters?.unpaid,
        paid: !!parsed.filters?.paid,
        cancelled: !!parsed.filters?.cancelled,
        reserved: !!parsed.filters?.reserved,
        dateRange: parsed.dateRange ? {
          label: parsed.dateRange.label,
          from: parsed.dateRange.from,
          to: parsed.dateRange.to,
        } : undefined,
      },
      bookings: bookings.map((booking) => ({
        _id: booking._id,
        status: booking.status,
        from: booking.from,
        to: booking.to,
        price: booking.price,
        driver: booking.driver ? {
          fullName: booking.driver.fullName,
          email: booking.driver.email,
        } : null,
        supplier: booking.supplier ? {
          fullName: booking.supplier.fullName,
          email: booking.supplier.email,
        } : null,
        car: booking.car ? {
          name: booking.car.name,
        } : null,
      })),
    }),
    suggestedActions: total > MAX_RESULTS ? ['Refine by driver, supplier, or exact date.'] : undefined,
  })
}

const handleBookingSearch = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return withLanguageMetadata(parsed, history, {
      intent: 'booking_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which booking to find by ID, driver name, supplier name, or email.',
      suggestedActions: ['Try: find booking Mahmoud'],
    })
  }

  const bookings = await searchBookings(parsed.searchTerm)

  return withLanguageMetadata(parsed, history, {
    intent: 'booking_search',
    status: 'success',
    reply: bookings.length > 0
      ? `Found ${bookings.length} matching booking${bookings.length > 1 ? 's' : ''}.`
      : `No bookings matched "${parsed.searchTerm}".`,
    data: withResolutionSource(parsed, {
      searchTerm: parsed.searchTerm,
      bookings,
    }),
    suggestedActions: bookings.length === 0 ? ['Try a full name, email, or booking ID.'] : undefined,
  })
}

const handleSupplierSearch = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return withLanguageMetadata(parsed, history, {
      intent: 'supplier_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which supplier to find by full name or email.',
      suggestedActions: ['Try: find supplier Youssef'],
    })
  }

  const suppliers = await findSuppliers(parsed.searchTerm)

  return withLanguageMetadata(parsed, history, {
    intent: 'supplier_search',
    status: 'success',
    reply: suppliers.length > 0
      ? `Found ${suppliers.length} matching supplier${suppliers.length > 1 ? 's' : ''}.`
      : `No suppliers matched "${parsed.searchTerm}".`,
    data: withResolutionSource(parsed, {
      searchTerm: parsed.searchTerm,
      suppliers,
    }),
    suggestedActions: suppliers.length === 0 ? ['Try a full name, Arabic spelling, or email address.'] : undefined,
  })
}

const handleCustomerSearch = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return withLanguageMetadata(parsed, history, {
      intent: 'customer_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which customer to find by full name, email, or phone.',
      suggestedActions: ['Try: find customer Mahmoud'],
    })
  }

  const customers = await findCustomers(parsed.searchTerm)

  return withLanguageMetadata(parsed, history, {
    intent: 'customer_search',
    status: 'success',
    reply: customers.length > 0
      ? `Found ${customers.length} matching customer${customers.length > 1 ? 's' : ''}.`
      : `No customers matched "${parsed.searchTerm}".`,
    data: withResolutionSource(parsed, {
      searchTerm: parsed.searchTerm,
      customers,
    }),
    suggestedActions: customers.length === 0 ? ['Try a full name, phone number, or email.'] : undefined,
  })
}

const resolveLocationIds = async (locationQuery: string) => {
  const regex = new RegExp(escapeRegex(locationQuery), 'i')
  const values = await LocationValue.find({ value: { $regex: regex } })
    .select('_id value language')
    .limit(20)
    .lean()

  let locationValueIds = values.map((value) => value._id)

  if (locationValueIds.length === 0) {
    const allValues = await LocationValue.find({}).select('_id value language').limit(200).lean()
    locationValueIds = allValues
      .filter((value) => matchNormalized(value.value, locationQuery))
      .map((value) => value._id)
  }

  if (locationValueIds.length === 0) {
    return { locations: [], values: [] }
  }

  const locations = await Location.find({ values: { $in: locationValueIds } })
    .select('_id values')
    .lean()

  return { locations, values }
}

const handleCarAvailability = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  if (!parsed.dateRange) {
    return withLanguageMetadata(parsed, history, {
      intent: 'car_availability',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which date to check, for example today or tomorrow.',
      suggestedActions: ['Try: available cars tomorrow in Beirut'],
    })
  }

  if (!parsed.locationQuery) {
    return withLanguageMetadata(parsed, history, {
      intent: 'car_availability',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which location to search.',
      suggestedActions: ['Try: available cars tomorrow in Beirut'],
    })
  }

  const { locations } = await resolveLocationIds(parsed.locationQuery)
  const locationIds = locations.map((location) => location._id)

  if (locationIds.length === 0) {
    return withLanguageMetadata(parsed, history, {
      intent: 'car_availability',
      status: 'success',
      reply: `No locations matched "${parsed.locationQuery}".`,
      data: withResolutionSource(parsed, {
        searchLocation: parsed.locationQuery,
        availableCars: [],
      }),
      suggestedActions: ['Try another spelling or a broader city name.'],
    })
  }

  const overlappingBookings = await Booking.find({
    expireAt: null,
    status: { $in: BLOCKING_BOOKING_STATUSES },
    from: { $lte: parsed.dateRange.to },
    to: { $gte: parsed.dateRange.from },
  })
    .select('car')
    .lean()

  const blockedCarIds = new Set(overlappingBookings.map((booking) => booking.car?.toString()).filter(Boolean))

  const cars = await Car.find({
    available: true,
    comingSoon: { $ne: true },
    fullyBooked: { $ne: true },
    locations: { $in: locationIds },
  })
    .populate<{ supplier: { fullName?: string, email?: string } }>('supplier')
    .sort({ dailyPrice: 1, _id: 1 })
    .limit(50)
    .lean()

  const availableCars = cars
    .filter((car) => !car.blockOnPay || !blockedCarIds.has(car._id.toString()))
    .slice(0, MAX_RESULTS)
    .map((car) => ({
      _id: car._id,
      name: car.name,
      licensePlate: car.licensePlate,
      supplier: car.supplier ? {
        fullName: car.supplier.fullName,
        email: car.supplier.email,
      } : null,
      dailyPrice: car.dailyPrice,
      deposit: car.deposit,
      available: car.available,
      blockOnPay: !!car.blockOnPay,
    }))

  return withLanguageMetadata(parsed, history, {
    intent: 'car_availability',
    status: 'success',
    reply: availableCars.length > 0
      ? `Found ${availableCars.length} available car${availableCars.length > 1 ? 's' : ''} for ${parsed.dateRange.label} in ${parsed.locationQuery}.`
      : `No available cars found for ${parsed.dateRange.label} in ${parsed.locationQuery}.`,
    data: withResolutionSource(parsed, {
      searchLocation: parsed.locationQuery,
      dateRange: {
        label: parsed.dateRange.label,
        from: parsed.dateRange.from,
        to: parsed.dateRange.to,
      },
      availableCars,
    }),
    suggestedActions: availableCars.length === 0 ? ['Try another location or date.'] : undefined,
  })
}

const handleCarSearch = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return withLanguageMetadata(parsed, history, {
      intent: 'car_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which car to find by name, plate, or supplier.',
      suggestedActions: ['Try: find car BMW'],
    })
  }

  const cars = await findCars(parsed.searchTerm)

  return withLanguageMetadata(parsed, history, {
    intent: 'car_search',
    status: 'success',
    reply: cars.length > 0
      ? `Found ${cars.length} matching car${cars.length > 1 ? 's' : ''}.`
      : `No cars matched "${parsed.searchTerm}".`,
    data: withResolutionSource(parsed, {
      searchTerm: parsed.searchTerm,
      cars: cars.map((car) => ({
        _id: car._id,
        name: car.name,
        licensePlate: car.licensePlate,
        dailyPrice: car.dailyPrice,
        deposit: car.deposit,
        available: car.available,
        fullyBooked: car.fullyBooked,
        comingSoon: car.comingSoon,
        trips: car.trips,
        supplier: car.supplier ? {
          fullName: car.supplier.fullName,
          email: car.supplier.email,
        } : null,
      })),
    }),
    suggestedActions: cars.length === 0 ? ['Try the plate number, supplier name, or broader car name.'] : undefined,
  })
}

const handleFleetOverview = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  const [
    totalCars,
    availableCars,
    unavailableCars,
    fullyBookedCars,
    comingSoonCars,
    topCars,
  ] = await Promise.all([
    Car.countDocuments({}),
    Car.countDocuments({ available: true, comingSoon: { $ne: true }, fullyBooked: { $ne: true } }),
    Car.countDocuments({ available: false }),
    Car.countDocuments({ fullyBooked: true }),
    Car.countDocuments({ comingSoon: true }),
    Car.find({})
      .populate<{ supplier: { fullName?: string } }>('supplier')
      .sort({ trips: -1, updatedAt: -1, _id: 1 })
      .limit(5)
      .lean(),
  ])

  return withLanguageMetadata(parsed, history, {
    intent: 'fleet_overview',
    status: 'success',
    reply: `Fleet overview: ${availableCars} available, ${fullyBookedCars} fully booked, ${comingSoonCars} coming soon, ${unavailableCars} unavailable, out of ${totalCars} total cars.`,
    data: withResolutionSource(parsed, {
      metrics: {
        totalCars,
        availableCars,
        unavailableCars,
        fullyBookedCars,
        comingSoonCars,
      },
      topUtilizedCars: topCars.map((car) => ({
        _id: car._id,
        name: car.name,
        licensePlate: car.licensePlate,
        trips: car.trips,
        available: car.available,
        fullyBooked: car.fullyBooked,
        supplier: car.supplier?.fullName || null,
      })),
    }),
    suggestedActions: ['show available cars today', 'find car BMW', 'what needs attention today?'],
  })
}

const handleRevenueSummary = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  const match: Record<string, unknown> = {
    expireAt: null,
    status: { $in: PAID_STATUSES },
  }

  if (parsed.dateRange) {
    match.from = { $gte: parsed.dateRange.from, $lte: parsed.dateRange.to }
  }

  const paidBookings = await Booking.find(match)
    .populate<{ supplier: { fullName?: string } }>('supplier')
    .sort({ from: 1, _id: 1 })
    .lean()

  const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.price || 0), 0)
  const bookingCount = paidBookings.length
  const avgBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0

  const supplierRevenueMap = new Map<string, { supplierId: string, supplierName: string, revenue: number, bookings: number }>()
  for (const booking of paidBookings) {
    const supplierId = booking.supplier?._id?.toString() || 'unknown'
    const existing = supplierRevenueMap.get(supplierId) || {
      supplierId,
      supplierName: booking.supplier?.fullName || 'Unknown supplier',
      revenue: 0,
      bookings: 0,
    }

    existing.revenue += booking.price || 0
    existing.bookings += 1
    supplierRevenueMap.set(supplierId, existing)
  }

  const topSuppliers = Array.from(supplierRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return withLanguageMetadata(parsed, history, {
    intent: 'revenue_summary',
    status: 'success',
    reply: bookingCount > 0
      ? `Revenue summary${parsed.dateRange ? ` for ${parsed.dateRange.label}` : ''}: ${bookingCount} paid bookings totaling ${totalRevenue.toFixed(2)}.`
      : `No paid bookings found${parsed.dateRange ? ` for ${parsed.dateRange.label}` : ''}.`,
    data: withResolutionSource(parsed, {
      filters: {
        dateRange: parsed.dateRange ? {
          label: parsed.dateRange.label,
          from: parsed.dateRange.from,
          to: parsed.dateRange.to,
        } : undefined,
      },
      metrics: {
        bookingCount,
        totalRevenue,
        avgBookingValue,
      },
      topSuppliers,
    }),
    suggestedActions: ['show paid bookings today', 'what needs attention today?'],
  })
}

const handleOpsSummary = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
  const now = new Date()
  const activeRange = parsed.dateRange ?? {
    label: 'today',
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  }

  const baseMatch: Record<string, unknown> = { expireAt: null }
  const dateMatch: Record<string, unknown> = {
    expireAt: null,
    from: { $gte: activeRange.from, $lte: activeRange.to },
  }

  const [
    totalOpenBookings,
    unpaidBookings,
    upcomingBookings,
    cancelledBookings,
    activeSuppliers,
    inactiveSuppliers,
    availableCarsCount,
    fullyBookedCarsCount,
    sampleUnpaidBookings,
    sampleUpcomingBookings,
  ] = await Promise.all([
    Booking.countDocuments(baseMatch),
    Booking.countDocuments({ ...baseMatch, status: { $nin: PAID_STATUSES } }),
    Booking.countDocuments({ ...dateMatch, to: { $gte: now } }),
    Booking.countDocuments({ ...baseMatch, status: bookcarsTypes.BookingStatus.Cancelled }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, active: true }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, $or: [{ active: { $ne: true } }, { verified: { $ne: true } }] }),
    Car.countDocuments({ available: true, comingSoon: { $ne: true }, fullyBooked: { $ne: true } }),
    Car.countDocuments({ fullyBooked: true }),
    Booking.find({ ...baseMatch, status: { $nin: PAID_STATUSES } })
      .populate<{ driver: { fullName?: string }, supplier: { fullName?: string }, car: { name?: string } }>('driver supplier car')
      .sort({ from: 1, _id: 1 })
      .limit(3)
      .lean(),
    Booking.find({ ...dateMatch, to: { $gte: now } })
      .populate<{ driver: { fullName?: string }, supplier: { fullName?: string }, car: { name?: string } }>('driver supplier car')
      .sort({ from: 1, _id: 1 })
      .limit(3)
      .lean(),
  ])

  const priorities: string[] = []

  if (unpaidBookings > 0) {
    priorities.push(`Follow up on ${unpaidBookings} unpaid booking${unpaidBookings > 1 ? 's' : ''}.`)
  }

  if (fullyBookedCarsCount > 0) {
    priorities.push(`${fullyBookedCarsCount} car${fullyBookedCarsCount > 1 ? 's are' : ' is'} fully booked and may constrain demand.`)
  }

  if (inactiveSuppliers > 0) {
    priorities.push(`Review ${inactiveSuppliers} supplier account${inactiveSuppliers > 1 ? 's' : ''} that are inactive or unverified.`)
  }

  if (cancelledBookings > 0) {
    priorities.push(`${cancelledBookings} cancelled booking${cancelledBookings > 1 ? 's' : ''} may need review.`)
  }

  if (priorities.length === 0) {
    priorities.push('No immediate operational risks detected in the current checks.')
  }

  const reply = [
    `Ops summary for ${activeRange.label}:`,
    ...priorities.slice(0, 4).map((item) => `- ${item}`),
    `- Fleet signal: ${availableCarsCount} cars currently marked available.`,
    `- Supplier signal: ${activeSuppliers} active suppliers.`,
    `- Booking signal: ${upcomingBookings} upcoming bookings in range.`,
  ].join('\n')

  return withLanguageMetadata(parsed, history, {
    intent: 'ops_summary',
    status: 'success',
    reply,
    data: withResolutionSource(parsed, {
      dateRange: activeRange,
      metrics: {
        totalOpenBookings,
        unpaidBookings,
        upcomingBookings,
        cancelledBookings,
        activeSuppliers,
        inactiveOrUnverifiedSuppliers: inactiveSuppliers,
        availableCarsCount,
        fullyBookedCarsCount,
      },
      priorities,
      samples: {
        unpaidBookings: sampleUnpaidBookings.map((booking) => ({
          _id: booking._id,
          status: booking.status,
          from: booking.from,
          to: booking.to,
          driver: booking.driver ? booking.driver.fullName : null,
          supplier: booking.supplier ? booking.supplier.fullName : null,
          car: booking.car ? booking.car.name : null,
        })),
        upcomingBookings: sampleUpcomingBookings.map((booking) => ({
          _id: booking._id,
          status: booking.status,
          from: booking.from,
          to: booking.to,
          driver: booking.driver ? booking.driver.fullName : null,
          supplier: booking.supplier ? booking.supplier.fullName : null,
          car: booking.car ? booking.car.name : null,
        })),
      },
    }),
    suggestedActions: [
      'show unpaid bookings today',
      'find supplier Youssef',
      'available cars tomorrow in Beirut',
      'show revenue today',
    ],
  })
}

const handleSendEmail = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => withLanguageMetadata(parsed, history, {
  intent: 'send_email',
  status: 'needs_clarification',
  reply: parsed.email
    ? `Email sending is not enabled in this assistant yet. I captured ${parsed.email}, but a safe reviewed send flow still needs to be implemented.`
    : parsed.clarificationQuestion || 'Email sending is not enabled in this assistant yet. Tell me the recipient, subject, and body when the safe send flow is ready.',
  data: withResolutionSource(parsed, {
    email: parsed.email,
  }),
  suggestedActions: ['Collect recipient, subject, and message body before enabling sending.'],
})

const handleCreateMeeting = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => withLanguageMetadata(parsed, history, {
  intent: 'create_meeting',
  status: 'needs_clarification',
  reply: parsed.searchTerm
    ? `Meeting creation is not enabled yet. I captured ${parsed.searchTerm}${parsed.dateRange ? ` for ${parsed.dateRange.label}` : ''}, but calendar integration still needs a reviewed implementation.`
    : parsed.clarificationQuestion || 'Meeting creation is not enabled yet. Tell me who, when, and which calendar once scheduling is implemented.',
  data: withResolutionSource(parsed, {
    supplierOrAttendee: parsed.searchTerm,
    dateRange: parsed.dateRange ? {
      label: parsed.dateRange.label,
      from: parsed.dateRange.from,
      to: parsed.dateRange.to,
    } : undefined,
  }),
  suggestedActions: ['Confirm attendees, exact time, timezone, and calendar before enabling creation.'],
})

const buildUnknownAssistantResponse = (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): AssistantResponse => withLanguageMetadata(parsed, history, {
  intent: 'unknown',
  status: 'needs_clarification',
  reply: parsed.clarificationQuestion || 'I can help with bookings, suppliers, customers, cars, fleet overview, revenue summaries, email drafting, or meeting requests.',
  data: withResolutionSource(parsed),
  suggestedActions: [
    'show unpaid bookings today',
    'find booking Mahmoud',
    'find supplier Youssef',
    'find customer Mahmoud',
    'available cars tomorrow in Beirut',
    'show revenue today',
    'what needs attention today?',
  ],
})

const fallbackResolveAssistantIntent = (message: string): ParsedAssistantIntent => {
  const extracted = parseAssistantMessage(message)
  const normalizedMessage = extracted.normalizedMessage

  if (/^(send email|email|ارسل ايميل|ارسل بريد)/.test(normalizedMessage)) {
    return {
      ...extracted,
      intent: 'send_email',
      source: 'system_fallback',
      confidence: extracted.email ? 0.78 : 0.5,
      needsClarification: !extracted.email,
      clarificationQuestion: !extracted.email ? 'Who should receive the email?' : undefined,
    }
  }

  if (/^(create meeting|schedule meeting|book meeting|انشئ اجتماع|حدد اجتماع)/.test(normalizedMessage)) {
    return {
      ...extracted,
      intent: 'create_meeting',
      source: 'system_fallback',
      confidence: extracted.searchTerm && extracted.dateRange ? 0.8 : 0.52,
      needsClarification: !extracted.searchTerm || !extracted.dateRange,
      clarificationQuestion: !extracted.searchTerm
        ? 'Who should the meeting be with?'
        : !extracted.dateRange
          ? 'When should I schedule the meeting?'
          : undefined,
    }
  }

  if (normalizedMessage.includes('available cars') || normalizedMessage.includes('السيارات المتاحه') || normalizedMessage.includes('السيارات المتوفره')) {
    return {
      ...extracted,
      intent: 'car_availability',
      source: 'system_fallback',
      confidence: extracted.locationQuery && extracted.dateRange ? 0.84 : 0.46,
      needsClarification: !extracted.dateRange || !extracted.locationQuery,
      clarificationQuestion: !extracted.dateRange
        ? 'Which date should I check for car availability?'
        : !extracted.locationQuery
          ? 'Which location should I search for available cars?'
          : undefined,
    }
  }

  if (normalizedMessage.startsWith('find supplier') || normalizedMessage.includes('ابحث عن المورد') || normalizedMessage.startsWith('supplier ')) {
    return {
      ...extracted,
      intent: 'supplier_search',
      source: 'system_fallback',
      confidence: extracted.searchTerm ? 0.82 : 0.45,
      needsClarification: !extracted.searchTerm,
      clarificationQuestion: !extracted.searchTerm ? 'Which supplier should I look for?' : undefined,
    }
  }

  if (normalizedMessage.startsWith('find customer') || normalizedMessage.startsWith('find driver') || normalizedMessage.includes('ابحث عن العميل') || normalizedMessage.includes('ابحث عن السائق')) {
    return {
      ...extracted,
      intent: 'customer_search',
      source: 'system_fallback',
      confidence: extracted.searchTerm ? 0.82 : 0.45,
      needsClarification: !extracted.searchTerm,
      clarificationQuestion: !extracted.searchTerm ? 'Which customer should I look for?' : undefined,
    }
  }

  if (normalizedMessage.startsWith('find car') || normalizedMessage.includes('ابحث عن سياره') || normalizedMessage.startsWith('car ')) {
    return {
      ...extracted,
      intent: 'car_search',
      source: 'system_fallback',
      confidence: extracted.searchTerm ? 0.82 : 0.45,
      needsClarification: !extracted.searchTerm,
      clarificationQuestion: !extracted.searchTerm ? 'Which car should I look for?' : undefined,
    }
  }

  if (normalizedMessage.includes('revenue') || normalizedMessage.includes('income') || normalizedMessage.includes('الايراد') || normalizedMessage.includes('الايرادات') || normalizedMessage.includes('الدخل')) {
    return {
      ...extracted,
      intent: 'revenue_summary',
      source: 'system_fallback',
      confidence: 0.75,
    }
  }

  if (normalizedMessage.includes('fleet') || normalizedMessage.includes('inventory') || normalizedMessage.includes('الاسطول') || normalizedMessage.includes('السيارات')) {
    return {
      ...extracted,
      intent: 'fleet_overview',
      source: 'system_fallback',
      confidence: 0.72,
    }
  }

  if ([
    'ops summary', 'operations summary', 'what needs attention', 'needs attention', 'what should i prioritize',
    'what should we prioritize', 'prioritize', 'priorities', 'follow up', 'follow-up', 'what needs follow up',
    'general analysis', 'overview', 'status overview', 'anything urgent', 'ماذا يحتاج اهتمام', 'وش المهم', 'ما الذي يحتاج متابعه',
  ].some((pattern) => normalizedMessage.includes(pattern))) {
    return {
      ...extracted,
      intent: 'ops_summary',
      source: 'system_fallback',
      confidence: 0.72,
    }
  }

  if (normalizedMessage.includes('booking') || normalizedMessage.includes('bookings') || normalizedMessage.includes('الحجز') || normalizedMessage.includes('الحجوزات')) {
    return {
      ...extracted,
      intent: 'booking_summary',
      source: 'system_fallback',
      confidence: 0.7,
    }
  }

  return {
    ...extracted,
    intent: 'unknown',
    source: 'system_fallback',
    confidence: 0.18,
    needsClarification: true,
    clarificationQuestion: 'What would you like me to help with: bookings, suppliers, customers, cars, fleet, revenue, or operations?',
  }
}

const resolveAssistantIntent = async (message: string, history: AssistantConversationTurn[] = []) => {
  const extracted = parseAssistantMessage(message)
  const llmResolved = await resolveAssistantIntentWithLlm(extracted, history)

  return llmResolved || fallbackResolveAssistantIntent(message)
}

export const processAssistantMessage = async (
  message: string,
  history: AssistantConversationTurn[] = [],
): Promise<AssistantResponse> => {
  const safeHistory = sanitizeAssistantHistory(history)
  const parsed = await resolveAssistantIntent(message, safeHistory)

  let response: AssistantResponse

  switch (parsed.intent) {
    case 'booking_summary':
      response = await summarizeBookings(parsed, safeHistory)
      break
    case 'booking_search':
      response = await handleBookingSearch(parsed, safeHistory)
      break
    case 'supplier_search':
      response = await handleSupplierSearch(parsed, safeHistory)
      break
    case 'customer_search':
      response = await handleCustomerSearch(parsed, safeHistory)
      break
    case 'car_availability':
      response = await handleCarAvailability(parsed, safeHistory)
      break
    case 'car_search':
      response = await handleCarSearch(parsed, safeHistory)
      break
    case 'fleet_overview':
      response = await handleFleetOverview(parsed, safeHistory)
      break
    case 'revenue_summary':
      response = await handleRevenueSummary(parsed, safeHistory)
      break
    case 'ops_summary':
      response = await handleOpsSummary(parsed, safeHistory)
      break
    case 'send_email':
      response = await handleSendEmail(parsed, safeHistory)
      break
    case 'create_meeting':
      response = await handleCreateMeeting(parsed, safeHistory)
      break
    default:
      response = buildUnknownAssistantResponse(parsed, safeHistory)
      break
  }

  return localizeAssistantResponse(response, parsed)
}

export const safeProcessAssistantMessage = async (
  message: string,
  history: AssistantConversationTurn[] = [],
): Promise<AssistantResponse> => {
  const parsed = parseAssistantMessage(message)
  const safeHistory = sanitizeAssistantHistory(history)

  try {
    return await processAssistantMessage(message, safeHistory)
  } catch (err) {
    logger.error('[assistant.processAssistantMessage] ERROR', err)

    return {
      intent: parsed.intent,
      status: 'error',
      reply: 'Something went wrong while processing the assistant request.',
      inputLanguage: parsed.inputLanguage || 'en',
      replyLanguage: parsed.replyLanguage || parsed.inputLanguage || 'en',
      contextUsed: {
        historyTurns: safeHistory.length,
      },
    }
  }
}
