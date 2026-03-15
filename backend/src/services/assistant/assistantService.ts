import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../../models/Booking'
import Car from '../../models/Car'
import Location from '../../models/Location'
import LocationValue from '../../models/LocationValue'
import User from '../../models/User'
import * as logger from '../../utils/logger'
import { normalizeAssistantText, parseAssistantMessage, shouldFallbackToAssistantLlm } from './assistantParser'
import { resolveAssistantIntentWithLlm } from './assistantLlmResolver'
import { AssistantResponse, ParsedAssistantIntent } from './assistantTypes'

const MAX_RESULTS = 10

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

const findSuppliers = async (searchTerm: string) => {
  const regex = new RegExp(buildFlexibleNamePattern(searchTerm), 'i')
  const suppliers = await User.find({
    type: bookcarsTypes.UserType.Supplier,
    expireAt: null,
    $or: [
      { fullName: { $regex: regex } },
      { email: { $regex: regex } },
    ],
  })
    .select('_id fullName email phone active verified')
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
    .select('_id fullName email phone active verified')
    .sort({ fullName: 1, _id: 1 })
    .limit(100)
    .lean()

  return fallbackSuppliers
    .filter((supplier) => matchNormalized(supplier.fullName, searchTerm) || matchNormalized(supplier.email, searchTerm))
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

const summarizeBookings = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => {
  const match: Record<string, unknown> = { expireAt: null }

  if (parsed.dateRange) {
    match.from = { $gte: parsed.dateRange.from, $lte: parsed.dateRange.to }
  }

  if (parsed.filters?.unpaid) {
    match.status = { $nin: PAID_STATUSES }
  }

  const bookings = await Booking.find(match)
    .populate<{ driver: { fullName?: string, email?: string } }>('driver')
    .populate<{ supplier: { fullName?: string, email?: string } }>('supplier')
    .populate<{ car: { name?: string } }>('car')
    .sort({ from: 1, _id: 1 })
    .limit(MAX_RESULTS)
    .lean()

  const total = await Booking.countDocuments(match)
  const summaryLabel = [parsed.filters?.unpaid ? 'unpaid' : null, parsed.dateRange?.label ?? null].filter(Boolean).join(' ')

  return {
    intent: 'booking_summary',
    status: 'success',
    reply: total > 0
      ? `Found ${total} ${summaryLabel || ''} booking${total > 1 ? 's' : ''}.`.replace(/\s+/g, ' ').trim()
      : `No ${summaryLabel || ''} bookings found.`.replace(/\s+/g, ' ').trim(),
    data: {
      total,
      filters: {
        unpaid: !!parsed.filters?.unpaid,
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
      resolutionSource: parsed.source,
    },
    suggestedActions: total > MAX_RESULTS ? ['Refine by driver, supplier, or exact date.'] : undefined,
  }
}

const handleBookingSearch = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return {
      intent: 'booking_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which booking to find by ID, driver name, supplier name, or email.',
      suggestedActions: ['Try: find booking Mahmoud'],
    }
  }

  const bookings = await searchBookings(parsed.searchTerm)

  return {
    intent: 'booking_search',
    status: 'success',
    reply: bookings.length > 0
      ? `Found ${bookings.length} matching booking${bookings.length > 1 ? 's' : ''}.`
      : `No bookings matched "${parsed.searchTerm}".`,
    data: {
      searchTerm: parsed.searchTerm,
      bookings,
      resolutionSource: parsed.source,
    },
    suggestedActions: bookings.length === 0 ? ['Try a full name, email, or booking ID.'] : undefined,
  }
}

const handleSupplierSearch = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => {
  if (!parsed.searchTerm) {
    return {
      intent: 'supplier_search',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which supplier to find by full name or email.',
      suggestedActions: ['Try: find supplier Youssef'],
    }
  }

  const suppliers = await findSuppliers(parsed.searchTerm)

  return {
    intent: 'supplier_search',
    status: 'success',
    reply: suppliers.length > 0
      ? `Found ${suppliers.length} matching supplier${suppliers.length > 1 ? 's' : ''}.`
      : `No suppliers matched "${parsed.searchTerm}".`,
    data: {
      searchTerm: parsed.searchTerm,
      suppliers,
      matchingNotes: 'Current matching is practical MVP matching across fullName/email with Arabic normalization and a small Youssef/يوسف alias fallback.',
      resolutionSource: parsed.source,
    },
    suggestedActions: suppliers.length === 0 ? ['Try a full name, Arabic spelling, or email address.'] : undefined,
  }
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

const handleCarAvailability = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => {
  if (!parsed.dateRange) {
    return {
      intent: 'car_availability',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which date to check, for example today or tomorrow.',
      suggestedActions: ['Try: available cars tomorrow in Beirut'],
    }
  }

  if (!parsed.locationQuery) {
    return {
      intent: 'car_availability',
      status: 'needs_clarification',
      reply: parsed.clarificationQuestion || 'Tell me which location to search.',
      suggestedActions: ['Try: available cars tomorrow in Beirut'],
    }
  }

  const { locations } = await resolveLocationIds(parsed.locationQuery)
  const locationIds = locations.map((location) => location._id)

  if (locationIds.length === 0) {
    return {
      intent: 'car_availability',
      status: 'success',
      reply: `No locations matched "${parsed.locationQuery}".`,
      data: {
        searchLocation: parsed.locationQuery,
        availableCars: [],
        resolutionSource: parsed.source,
      },
      suggestedActions: ['Try another spelling or a broader city name.'],
    }
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
      supplier: car.supplier ? {
        fullName: car.supplier.fullName,
        email: car.supplier.email,
      } : null,
      dailyPrice: car.dailyPrice,
      available: car.available,
      blockOnPay: !!car.blockOnPay,
    }))

  return {
    intent: 'car_availability',
    status: 'success',
    reply: availableCars.length > 0
      ? `Found ${availableCars.length} available car${availableCars.length > 1 ? 's' : ''} for ${parsed.dateRange.label} in ${parsed.locationQuery}.`
      : `No available cars found for ${parsed.dateRange.label} in ${parsed.locationQuery}.`,
    data: {
      searchLocation: parsed.locationQuery,
      dateRange: {
        label: parsed.dateRange.label,
        from: parsed.dateRange.from,
        to: parsed.dateRange.to,
      },
      availableCars,
      resolutionSource: parsed.source,
    },
    suggestedActions: availableCars.length === 0 ? ['Try another location or date.'] : undefined,
  }
}

const handleSendEmail = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => ({
  intent: 'send_email',
  status: 'needs_clarification',
  reply: parsed.email
    ? `Email sending is not enabled in this assistant yet. I captured ${parsed.email}, but a safe reviewed send flow still needs to be implemented.`
    : parsed.clarificationQuestion || 'Email sending is not enabled in this assistant yet. Tell me the recipient, subject, and body when the safe send flow is ready.',
  data: {
    email: parsed.email,
    resolutionSource: parsed.source,
  },
  suggestedActions: ['Collect recipient, subject, and message body before enabling sending.'],
})

const handleCreateMeeting = async (parsed: ParsedAssistantIntent): Promise<AssistantResponse> => ({
  intent: 'create_meeting',
  status: 'needs_clarification',
  reply: parsed.searchTerm
    ? `Meeting creation is not enabled yet. I captured ${parsed.searchTerm}${parsed.dateRange ? ` for ${parsed.dateRange.label}` : ''}, but calendar integration still needs a reviewed implementation.`
    : parsed.clarificationQuestion || 'Meeting creation is not enabled yet. Tell me who, when, and which calendar once scheduling is implemented.',
  data: {
    supplierOrAttendee: parsed.searchTerm,
    dateRange: parsed.dateRange ? {
      label: parsed.dateRange.label,
      from: parsed.dateRange.from,
      to: parsed.dateRange.to,
    } : undefined,
    resolutionSource: parsed.source,
  },
  suggestedActions: ['Confirm attendees, exact time, timezone, and calendar before enabling creation.'],
})

const buildUnknownAssistantResponse = (parsed: ParsedAssistantIntent): AssistantResponse => ({
  intent: 'unknown',
  status: 'needs_clarification',
  reply: parsed.clarificationQuestion || 'I can help with booking summaries, booking search, supplier search, car availability, email drafting, or meeting requests.',
  data: {
    resolutionSource: parsed.source,
  },
  suggestedActions: [
    'show unpaid bookings today',
    'find booking Mahmoud',
    'find supplier Youssef',
    'available cars tomorrow in Beirut',
  ],
})

const resolveAssistantIntent = async (message: string) => {
  const parsed = parseAssistantMessage(message)

  if (!shouldFallbackToAssistantLlm(parsed)) {
    return parsed
  }

  const llmResolved = await resolveAssistantIntentWithLlm(parsed)
  return llmResolved || parsed
}

export const processAssistantMessage = async (message: string): Promise<AssistantResponse> => {
  const parsed = await resolveAssistantIntent(message)

  switch (parsed.intent) {
    case 'booking_summary':
      return summarizeBookings(parsed)
    case 'booking_search':
      return handleBookingSearch(parsed)
    case 'supplier_search':
      return handleSupplierSearch(parsed)
    case 'car_availability':
      return handleCarAvailability(parsed)
    case 'send_email':
      return handleSendEmail(parsed)
    case 'create_meeting':
      return handleCreateMeeting(parsed)
    default:
      return buildUnknownAssistantResponse(parsed)
  }
}

export const safeProcessAssistantMessage = async (message: string): Promise<AssistantResponse> => {
  const parsed = parseAssistantMessage(message)

  try {
    return await processAssistantMessage(message)
  } catch (err) {
    logger.error('[assistant.processAssistantMessage] ERROR', err)

    return {
      intent: parsed.intent,
      status: 'error',
      reply: 'Something went wrong while processing the assistant request.',
    }
  }
}
