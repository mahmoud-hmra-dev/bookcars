import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../../models/Booking'
import Car from '../../models/Car'
import Location from '../../models/Location'
import LocationValue from '../../models/LocationValue'
import User from '../../models/User'
import * as logger from '../../utils/logger'
import { normalizeAssistantText, parseAssistantMessage, shouldFallbackToAssistantLlm } from './assistantParser'
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

const summarizeBookings = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => {
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

  return withLanguageMetadata(parsed, history, {
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
    data: {
      searchTerm: parsed.searchTerm,
      bookings,
      resolutionSource: parsed.source,
    },
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
    data: {
      searchTerm: parsed.searchTerm,
      suppliers,
      matchingNotes: 'Current matching is practical MVP matching across fullName/email with Arabic normalization and a small Youssef/يوسف alias fallback.',
      resolutionSource: parsed.source,
    },
    suggestedActions: suppliers.length === 0 ? ['Try a full name, Arabic spelling, or email address.'] : undefined,
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
      data: {
        searchLocation: parsed.locationQuery,
        availableCars: [],
        resolutionSource: parsed.source,
      },
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
      supplier: car.supplier ? {
        fullName: car.supplier.fullName,
        email: car.supplier.email,
      } : null,
      dailyPrice: car.dailyPrice,
      available: car.available,
      blockOnPay: !!car.blockOnPay,
    }))

  return withLanguageMetadata(parsed, history, {
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
    activeSuppliers,
    inactiveSuppliers,
    availableCarsCount,
    sampleUnpaidBookings,
    sampleUpcomingBookings,
  ] = await Promise.all([
    Booking.countDocuments(baseMatch),
    Booking.countDocuments({ ...baseMatch, status: { $nin: PAID_STATUSES } }),
    Booking.countDocuments({ ...dateMatch, to: { $gte: now } }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, active: true }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, $or: [{ active: { $ne: true } }, { verified: { $ne: true } }] }),
    Car.countDocuments({ available: true, comingSoon: { $ne: true }, fullyBooked: { $ne: true } }),
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

  if (upcomingBookings > 0) {
    priorities.push(`Monitor ${upcomingBookings} upcoming booking${upcomingBookings > 1 ? 's' : ''} for ${activeRange.label}.`)
  }

  if (inactiveSuppliers > 0) {
    priorities.push(`Review ${inactiveSuppliers} supplier account${inactiveSuppliers > 1 ? 's' : ''} that are inactive or unverified.`)
  }

  if (priorities.length === 0) {
    priorities.push('No immediate operational risks detected in the current lightweight checks.')
  }

  const reply = [
    `Ops summary for ${activeRange.label}:`,
    `- ${priorities[0]}`,
    priorities[1] ? `- ${priorities[1]}` : null,
    priorities[2] ? `- ${priorities[2]}` : null,
    `- Fleet signal: ${availableCarsCount} cars currently marked available.`,
  ].filter(Boolean).join('\n')

  return withLanguageMetadata(parsed, history, {
    intent: 'ops_summary',
    status: 'success',
    reply,
    data: {
      dateRange: activeRange,
      metrics: {
        totalOpenBookings,
        unpaidBookings,
        upcomingBookings,
        activeSuppliers,
        inactiveOrUnverifiedSuppliers: inactiveSuppliers,
        availableCarsCount,
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
      resolutionSource: parsed.source,
    },
    suggestedActions: [
      'show unpaid bookings today',
      'find supplier Youssef',
      'available cars tomorrow in Beirut',
    ],
  })
}

const handleSendEmail = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => withLanguageMetadata(parsed, history, {
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

const handleCreateMeeting = async (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): Promise<AssistantResponse> => withLanguageMetadata(parsed, history, {
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

const buildUnknownAssistantResponse = (parsed: ParsedAssistantIntent, history: AssistantConversationTurn[]): AssistantResponse => withLanguageMetadata(parsed, history, {
  intent: 'unknown',
  status: 'needs_clarification',
  reply: parsed.clarificationQuestion || 'I can help with booking summaries, booking search, supplier search, car availability, operations summaries, email drafting, or meeting requests.',
  data: {
    resolutionSource: parsed.source,
  },
  suggestedActions: [
    'show unpaid bookings today',
    'find booking Mahmoud',
    'find supplier Youssef',
    'available cars tomorrow in Beirut',
    'what needs attention today?',
  ],
})

const resolveAssistantIntent = async (message: string, history: AssistantConversationTurn[] = []) => {
  const parsed = parseAssistantMessage(message)

  if (!shouldFallbackToAssistantLlm(parsed)) {
    return parsed
  }

  const llmResolved = await resolveAssistantIntentWithLlm(parsed, history)
  return llmResolved || parsed
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
    case 'car_availability':
      response = await handleCarAvailability(parsed, safeHistory)
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
