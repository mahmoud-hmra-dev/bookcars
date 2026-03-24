import * as bookcarsTypes from ':bookcars-types'
import Booking from '../../models/Booking'
import Car from '../../models/Car'
import Notification from '../../models/Notification'
import User from '../../models/User'
import { AssistantConversationTurn, AssistantIntent, AssistantResponse, AssistantResponseCard } from './assistantTypes'

const PAID_STATUSES = [
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Deposit,
]

const normalize = (value: string) => value.toLowerCase().trim()
const containsAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term))

const metricCard = (title: string, value: string | number, severity: AssistantResponseCard['severity'] = 'info'): AssistantResponseCard => ({
  type: 'metric',
  title,
  value,
  severity,
})

const listCard = (title: string, items: string[], severity: AssistantResponseCard['severity'] = 'info'): AssistantResponseCard => ({
  type: 'list',
  title,
  items,
  severity,
})

const draftCard = (title: string, body: string): AssistantResponseCard => ({
  type: 'draft',
  title,
  body,
})

const tableCard = (title: string, rows: Record<string, unknown>[]): AssistantResponseCard => ({
  type: 'table',
  title,
  rows,
})

const decisionCard = (title: string, body: string, severity: AssistantResponseCard['severity'] = 'success'): AssistantResponseCard => ({
  type: 'decision',
  title,
  body,
  severity,
})

const alertCard = (title: string, items: string[], severity: AssistantResponseCard['severity'] = 'warning'): AssistantResponseCard => ({
  type: 'alert',
  title,
  items,
  severity,
})

const makeResponse = (payload: AssistantResponse): AssistantResponse => payload

const detectIntent = (message: string): AssistantIntent => {
  const text = normalize(message)

  if (containsAny(text, ['supplier message', 'رسالة مورد', 'message supplier'])) return 'draft_supplier_message'
  if (containsAny(text, ['customer message', 'رسالة عميل', 'message customer'])) return 'draft_customer_message'
  if (containsAny(text, ['follow-up', 'follow up', 'خطة متابعة'])) return 'draft_followup_plan'
  if (containsAny(text, ['task list', 'todo', 'مهام'])) return 'draft_task_list'
  if (containsAny(text, ['search booking', 'find booking', 'ابحث عن حجز'])) return 'search_bookings'
  if (containsAny(text, ['search car', 'find car', 'ابحث عن سيارة'])) return 'search_cars'
  if (containsAny(text, ['search supplier', 'find supplier', 'ابحث عن مورد'])) return 'search_suppliers'
  if (containsAny(text, ['search customer', 'find customer', 'ابحث عن عميل'])) return 'search_customers'
  if (containsAny(text, ['revenue', 'income', 'إيراد', 'ايراد'])) return 'revenue_overview'
  if (containsAny(text, ['risk', 'alert', 'مخاطر', 'تنبيهات'])) return 'risk_overview'
  if (containsAny(text, ['supplier performance', 'suppliers overview', 'الموردين'])) return 'suppliers_overview'
  if (containsAny(text, ['customer health', 'customers overview', 'العملاء'])) return 'customers_overview'
  if (containsAny(text, ['fleet', 'cars overview', 'الأسطول', 'السيارات'])) return 'fleet_overview'
  if (containsAny(text, ['booking overview', 'bookings overview', 'الحجوزات'])) return 'bookings_overview'
  if (containsAny(text, ['dashboard', 'overview', 'ملخص', 'what should we do', 'ماذا نفعل'])) return 'dashboard_overview'

  return 'unknown'
}

const extractSearchTerm = (message: string) => {
  const trimmed = message.trim()
  const parts = trimmed.split(/find booking|find car|find supplier|find customer|ابحث عن حجز|ابحث عن سيارة|ابحث عن مورد|ابحث عن عميل/i)
  return parts.length > 1 ? parts[1].trim() : trimmed
}

const buildDashboardOverview = async (): Promise<AssistantResponse> => {
  const [unpaidBookings, paidBookings, activeSuppliers, riskySuppliers, availableCars, fullyBookedCars, unreadNotifications] = await Promise.all([
    Booking.countDocuments({ expireAt: null, status: { $nin: PAID_STATUSES } }),
    Booking.countDocuments({ expireAt: null, status: { $in: PAID_STATUSES } }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, active: true }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, $or: [{ active: { $ne: true } }, { verified: { $ne: true } }] }),
    Car.countDocuments({ available: true, comingSoon: { $ne: true }, fullyBooked: { $ne: true } }),
    Car.countDocuments({ fullyBooked: true }),
    Notification.countDocuments({ isRead: false }),
  ])

  const actions: string[] = []
  if (unpaidBookings > 0) actions.push(`Follow up ${unpaidBookings} unpaid bookings immediately.`)
  if (riskySuppliers > 0) actions.push(`Review ${riskySuppliers} inactive or unverified suppliers.`)
  if (fullyBookedCars > 0) actions.push(`Check fleet pressure caused by ${fullyBookedCars} fully booked cars.`)
  if (unreadNotifications > 0) actions.push(`Clear ${unreadNotifications} unread notifications.`)
  if (actions.length === 0) actions.push('Operations look stable. Focus on conversion and response speed.')

  return makeResponse({
    intent: 'dashboard_overview',
    status: 'success',
    title: 'Operations dashboard overview',
    summary: 'A concise operational snapshot for the admin team.',
    reply: actions[0],
    cards: [
      decisionCard('Top decision', actions[0]),
      metricCard('Unpaid bookings', unpaidBookings, unpaidBookings > 0 ? 'warning' : 'success'),
      metricCard('Paid bookings', paidBookings, 'success'),
      metricCard('Active suppliers', activeSuppliers),
      metricCard('Risky suppliers', riskySuppliers, riskySuppliers > 0 ? 'warning' : 'success'),
      metricCard('Available cars', availableCars),
      metricCard('Fully booked cars', fullyBookedCars, fullyBookedCars > 0 ? 'warning' : 'success'),
      metricCard('Unread notifications', unreadNotifications, unreadNotifications > 0 ? 'warning' : 'success'),
      listCard('Recommended actions', actions),
    ],
    suggestions: ['bookings overview', 'fleet overview', 'risk overview', 'draft supplier message'],
  })
}

const buildBookingsOverview = async (): Promise<AssistantResponse> => {
  const [total, unpaid, cancelled, recent] = await Promise.all([
    Booking.countDocuments({ expireAt: null }),
    Booking.countDocuments({ expireAt: null, status: { $nin: PAID_STATUSES } }),
    Booking.countDocuments({ expireAt: null, status: bookcarsTypes.BookingStatus.Cancelled }),
    Booking.find({ expireAt: null }).sort({ createdAt: -1 }).limit(8).select('_id status from to price').lean(),
  ])

  return makeResponse({
    intent: 'bookings_overview',
    status: 'success',
    title: 'Bookings overview',
    summary: 'Current booking flow snapshot.',
    reply: `There are ${total} bookings in the system and ${unpaid} still need payment follow-up.`,
    cards: [
      metricCard('Total bookings', total),
      metricCard('Unpaid bookings', unpaid, unpaid > 0 ? 'warning' : 'success'),
      metricCard('Cancelled bookings', cancelled, cancelled > 0 ? 'warning' : 'success'),
      tableCard('Recent bookings', recent.map((item) => ({ id: item._id, status: item.status, from: item.from, to: item.to, price: item.price }))),
    ],
    suggestions: ['search bookings', 'draft follow-up plan', 'risk overview'],
  })
}

const buildFleetOverview = async (): Promise<AssistantResponse> => {
  const [totalCars, availableCars, fullyBookedCars, comingSoonCars, recentCars] = await Promise.all([
    Car.countDocuments({}),
    Car.countDocuments({ available: true, comingSoon: { $ne: true }, fullyBooked: { $ne: true } }),
    Car.countDocuments({ fullyBooked: true }),
    Car.countDocuments({ comingSoon: true }),
    Car.find({}).sort({ updatedAt: -1 }).limit(8).select('_id name dailyPrice available fullyBooked comingSoon').lean(),
  ])

  return makeResponse({
    intent: 'fleet_overview',
    status: 'success',
    title: 'Fleet overview',
    summary: 'Availability and pressure across the fleet.',
    reply: `Fleet health: ${availableCars} available cars out of ${totalCars}.`,
    cards: [
      metricCard('Total cars', totalCars),
      metricCard('Available cars', availableCars, 'success'),
      metricCard('Fully booked cars', fullyBookedCars, fullyBookedCars > 0 ? 'warning' : 'success'),
      metricCard('Coming soon cars', comingSoonCars),
      tableCard('Recent fleet updates', recentCars.map((item) => ({ id: item._id, name: item.name, dailyPrice: item.dailyPrice, available: item.available, fullyBooked: item.fullyBooked, comingSoon: item.comingSoon }))),
    ],
    suggestions: ['search cars', 'risk overview', 'dashboard overview'],
  })
}

const buildSuppliersOverview = async (): Promise<AssistantResponse> => {
  const suppliers = await User.find({ type: bookcarsTypes.UserType.Supplier, expireAt: null })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('_id fullName email active verified payLater')
    .lean()

  const inactiveCount = suppliers.filter((supplier) => !supplier.active || !supplier.verified).length

  return makeResponse({
    intent: 'suppliers_overview',
    status: 'success',
    title: 'Suppliers overview',
    summary: 'Operational state of supplier accounts.',
    reply: inactiveCount > 0 ? `${inactiveCount} supplier accounts need attention.` : 'Supplier accounts look healthy in the current sample.',
    cards: [
      metricCard('Suppliers in sample', suppliers.length),
      metricCard('Suppliers needing attention', inactiveCount, inactiveCount > 0 ? 'warning' : 'success'),
      tableCard('Suppliers', suppliers.map((supplier) => ({ id: supplier._id, name: supplier.fullName, email: supplier.email, active: supplier.active, verified: supplier.verified, payLater: supplier.payLater }))),
    ],
    suggestions: ['search suppliers', 'draft supplier message', 'risk overview'],
  })
}

const buildCustomersOverview = async (): Promise<AssistantResponse> => {
  const customers = await User.find({ type: bookcarsTypes.UserType.User, expireAt: null })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('_id fullName email active verified blacklisted')
    .lean()

  const blacklisted = customers.filter((customer) => customer.blacklisted).length

  return makeResponse({
    intent: 'customers_overview',
    status: 'success',
    title: 'Customers overview',
    summary: 'Quick quality and trust snapshot for customer accounts.',
    reply: blacklisted > 0 ? `${blacklisted} customers are blacklisted in the current sample.` : 'No blacklisted customers in the current sample.',
    cards: [
      metricCard('Customers in sample', customers.length),
      metricCard('Blacklisted customers', blacklisted, blacklisted > 0 ? 'warning' : 'success'),
      tableCard('Customers', customers.map((customer) => ({ id: customer._id, name: customer.fullName, email: customer.email, active: customer.active, verified: customer.verified, blacklisted: customer.blacklisted }))),
    ],
    suggestions: ['search customers', 'draft customer message', 'dashboard overview'],
  })
}

const buildRevenueOverview = async (): Promise<AssistantResponse> => {
  const paidBookings = await Booking.find({ expireAt: null, status: { $in: PAID_STATUSES } }).select('price').lean()
  const totalRevenue = paidBookings.reduce((sum, booking) => sum + (booking.price || 0), 0)

  return makeResponse({
    intent: 'revenue_overview',
    status: 'success',
    title: 'Revenue overview',
    summary: 'Revenue based on paid bookings only.',
    reply: `Paid bookings currently represent ${totalRevenue.toFixed(2)} in tracked revenue.`,
    cards: [
      metricCard('Paid bookings', paidBookings.length, 'success'),
      metricCard('Tracked revenue', totalRevenue.toFixed(2), 'success'),
    ],
    suggestions: ['bookings overview', 'dashboard overview'],
  })
}

const buildRiskOverview = async (): Promise<AssistantResponse> => {
  const [unpaidBookings, riskySuppliers, fullyBookedCars, unreadNotifications] = await Promise.all([
    Booking.countDocuments({ expireAt: null, status: { $nin: PAID_STATUSES } }),
    User.countDocuments({ type: bookcarsTypes.UserType.Supplier, expireAt: null, $or: [{ active: { $ne: true } }, { verified: { $ne: true } }] }),
    Car.countDocuments({ fullyBooked: true }),
    Notification.countDocuments({ isRead: false }),
  ])

  const alerts: string[] = []
  if (unpaidBookings > 0) alerts.push(`${unpaidBookings} bookings still need payment follow-up.`)
  if (riskySuppliers > 0) alerts.push(`${riskySuppliers} supplier accounts require review.`)
  if (fullyBookedCars > 0) alerts.push(`${fullyBookedCars} cars are fully booked and may reduce flexibility.`)
  if (unreadNotifications > 0) alerts.push(`${unreadNotifications} unread notifications may hide pending actions.`)
  if (alerts.length === 0) alerts.push('No obvious operational risks detected in the quick scan.')

  return makeResponse({
    intent: 'risk_overview',
    status: 'success',
    title: 'Risk overview',
    summary: 'Operational risk alerts built from project data.',
    reply: alerts[0],
    cards: [
      alertCard('Risk alerts', alerts, alerts.length > 1 ? 'warning' : 'success'),
      metricCard('Unpaid bookings', unpaidBookings, unpaidBookings > 0 ? 'warning' : 'success'),
      metricCard('Risky suppliers', riskySuppliers, riskySuppliers > 0 ? 'warning' : 'success'),
      metricCard('Fully booked cars', fullyBookedCars, fullyBookedCars > 0 ? 'warning' : 'success'),
      metricCard('Unread notifications', unreadNotifications, unreadNotifications > 0 ? 'warning' : 'success'),
    ],
    suggestions: ['dashboard overview', 'draft follow-up plan', 'draft supplier message'],
  })
}

const buildSearchTable = async (intent: AssistantIntent, message: string): Promise<AssistantResponse> => {
  const term = extractSearchTerm(message)
  const regex = new RegExp(term, 'i')

  if (intent === 'search_bookings') {
    const rows = await Booking.find({ expireAt: null }).sort({ createdAt: -1 }).limit(20).select('_id status from to price').lean()
    const filtered = rows.filter((row) => String(row._id).includes(term) || String(row.status).match(regex))
    return makeResponse({ intent, status: 'success', title: 'Booking search', summary: `Search results for ${term}.`, reply: `Found ${filtered.length} booking result(s).`, cards: [tableCard('Bookings', filtered.map((row) => ({ id: row._id, status: row.status, from: row.from, to: row.to, price: row.price })))], suggestions: ['bookings overview'] })
  }

  if (intent === 'search_cars') {
    const rows = await Car.find({ $or: [{ name: { $regex: regex } }, { licensePlate: { $regex: regex } }] }).limit(20).select('_id name licensePlate dailyPrice available fullyBooked').lean()
    return makeResponse({ intent, status: 'success', title: 'Car search', summary: `Search results for ${term}.`, reply: `Found ${rows.length} car result(s).`, cards: [tableCard('Cars', rows.map((row) => ({ id: row._id, name: row.name, licensePlate: row.licensePlate, dailyPrice: row.dailyPrice, available: row.available, fullyBooked: row.fullyBooked })))], suggestions: ['fleet overview'] })
  }

  if (intent === 'search_suppliers') {
    const rows = await User.find({ type: bookcarsTypes.UserType.Supplier, expireAt: null, $or: [{ fullName: { $regex: regex } }, { email: { $regex: regex } }] }).limit(20).select('_id fullName email active verified').lean()
    return makeResponse({ intent, status: 'success', title: 'Supplier search', summary: `Search results for ${term}.`, reply: `Found ${rows.length} supplier result(s).`, cards: [tableCard('Suppliers', rows.map((row) => ({ id: row._id, name: row.fullName, email: row.email, active: row.active, verified: row.verified })))], suggestions: ['suppliers overview', 'draft supplier message'] })
  }

  const rows = await User.find({ type: bookcarsTypes.UserType.User, expireAt: null, $or: [{ fullName: { $regex: regex } }, { email: { $regex: regex } }] }).limit(20).select('_id fullName email active verified blacklisted').lean()
  return makeResponse({ intent, status: 'success', title: 'Customer search', summary: `Search results for ${term}.`, reply: `Found ${rows.length} customer result(s).`, cards: [tableCard('Customers', rows.map((row) => ({ id: row._id, name: row.fullName, email: row.email, active: row.active, verified: row.verified, blacklisted: row.blacklisted })))], suggestions: ['customers overview', 'draft customer message'] })
}

const buildDraftResponse = (intent: AssistantIntent): AssistantResponse => {
  if (intent === 'draft_supplier_message') {
    const draft = 'Subject: Operations follow-up\n\nHello,\n\nPlease review your pending operational items and confirm status today, especially unpaid bookings or inactive supply issues.\n\nBest regards,\nBookCars Admin'
    return makeResponse({ intent, status: 'success', title: 'Supplier message draft', summary: 'A professional draft the admin can copy and use.', reply: 'Prepared a supplier message draft.', cards: [draftCard('Supplier draft', draft)], suggestions: ['suppliers overview', 'risk overview'] })
  }

  if (intent === 'draft_customer_message') {
    const draft = 'Subject: Booking follow-up\n\nHello,\n\nWe are contacting you regarding your booking status. Please confirm the pending information or payment update so we can proceed smoothly.\n\nBest regards,\nBookCars Admin'
    return makeResponse({ intent, status: 'success', title: 'Customer message draft', summary: 'A professional customer follow-up draft.', reply: 'Prepared a customer message draft.', cards: [draftCard('Customer draft', draft)], suggestions: ['customers overview', 'bookings overview'] })
  }

  if (intent === 'draft_followup_plan') {
    return makeResponse({ intent, status: 'success', title: 'Follow-up plan', summary: 'A professional follow-up checklist.', reply: 'Prepared a follow-up plan.', cards: [listCard('Follow-up steps', ['Review the affected records.', 'Contact the relevant supplier or customer.', 'Set a deadline for response.', 'Escalate unresolved items to management.'])], suggestions: ['draft supplier message', 'draft task list'] })
  }

  return makeResponse({ intent, status: 'success', title: 'Task list', summary: 'A practical admin task list.', reply: 'Prepared an admin task list.', cards: [listCard('Today tasks', ['Review unpaid bookings.', 'Check risky suppliers.', 'Clear unread notifications.', 'Inspect fully booked fleet pressure.'])], suggestions: ['dashboard overview', 'risk overview'] })
}

export const processAssistantMessage = async (message: string, _history: AssistantConversationTurn[] = []): Promise<AssistantResponse> => {
  const intent = detectIntent(message)

  switch (intent) {
    case 'dashboard_overview': return buildDashboardOverview()
    case 'bookings_overview': return buildBookingsOverview()
    case 'fleet_overview': return buildFleetOverview()
    case 'suppliers_overview': return buildSuppliersOverview()
    case 'customers_overview': return buildCustomersOverview()
    case 'risk_overview': return buildRiskOverview()
    case 'revenue_overview': return buildRevenueOverview()
    case 'search_bookings':
    case 'search_cars':
    case 'search_suppliers':
    case 'search_customers':
      return buildSearchTable(intent, message)
    case 'draft_supplier_message':
    case 'draft_customer_message':
    case 'draft_followup_plan':
    case 'draft_task_list':
      return buildDraftResponse(intent)
    default:
      return makeResponse({
        intent: 'unknown',
        status: 'needs_clarification',
        title: 'Assistant',
        summary: 'The request needs a clearer supported command.',
        reply: 'Ask for a dashboard overview, bookings, fleet, suppliers, customers, risk, revenue, search, or a draft action.',
        cards: [listCard('Try one of these', ['dashboard overview', 'bookings overview', 'fleet overview', 'risk overview', 'search supplier Mahmoud', 'draft supplier message'])],
        suggestions: ['dashboard overview', 'bookings overview', 'fleet overview', 'risk overview'],
      })
  }
}

export const safeProcessAssistantMessage = async (message: string, history: AssistantConversationTurn[] = []): Promise<AssistantResponse> => {
  try {
    return await processAssistantMessage(message, history)
  } catch {
    return makeResponse({
      intent: 'unknown',
      status: 'error',
      title: 'Assistant error',
      summary: 'The assistant could not process the request.',
      reply: 'Something went wrong while processing the assistant request.',
      cards: [],
      suggestions: ['dashboard overview'],
    })
  }
}
