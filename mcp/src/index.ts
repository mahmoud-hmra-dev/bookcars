#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { api, setAuthToken, getAuthToken, getApiUrl } from './api.js'
import { connectLogger, logRequest, getLogsCollection } from './logger.js'

const server = new McpServer({
  name: 'bookcars-admin',
  version: '1.0.0',
})

// Monkey-patch server.tool to auto-log all tool calls
const originalTool = server.tool.bind(server)
const patchedTool = function (...args: [any, ...any[]]) {
  const handler = args[args.length - 1]
  const toolName = args[0] as string

  args[args.length - 1] = async (params: any, extra: any) => {
    const start = Date.now()
    try {
      const result = await handler(params, extra)
      const text = result?.content?.[0]?.text || ''
      await logRequest({
        tool: toolName,
        params,
        status: 'success',
        response: text.length > 2000 ? text.slice(0, 2000) + '...' : text,
        duration: Date.now() - start,
      })
      return result
    } catch (e: any) {
      await logRequest({
        tool: toolName,
        params,
        status: 'error',
        error: e.message,
        duration: Date.now() - start,
      })
      throw e
    }
  }

  return originalTool(...(args as [any, any, any, any]))
}
server.tool = patchedTool as typeof server.tool

// ============================================================
// AUTH TOOLS
// ============================================================

server.tool(
  'auth_login',
  'Sign in as admin to get access token. Must be called first before any other tool.',
  { email: z.string().describe('Admin email'), password: z.string().describe('Admin password') },
  async ({ email, password }) => {
    try {
      const res = await api<{ accessToken?: string }>('POST', '/api/sign-in/admin', { email, password, mobile: true })
      if (res.accessToken) {
        setAuthToken(res.accessToken)
        return { content: [{ type: 'text' as const, text: `Logged in successfully. Token stored.` }] }
      }
      return { content: [{ type: 'text' as const, text: `Login failed - no token received. Response: ${JSON.stringify(res)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Login error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'auth_status',
  'Check if currently authenticated and show API URL',
  {},
  async () => {
    const token = getAuthToken()
    const url = getApiUrl()
    return {
      content: [{
        type: 'text' as const,
        text: token
          ? `Authenticated. API: ${url}`
          : `Not authenticated. API: ${url}. Use auth_login first.`,
      }],
    }
  },
)

// ============================================================
// SUPPLIER MANAGEMENT
// ============================================================

server.tool(
  'supplier_list',
  'List all suppliers with pagination and optional search',
  {
    page: z.number().default(1).describe('Page number'),
    size: z.number().default(20).describe('Page size'),
    search: z.string().optional().describe('Search keyword'),
  },
  async ({ page, size, search }) => {
    try {
      const url = `/api/suppliers/${page}/${size}${search ? `?s=${encodeURIComponent(search)}` : ''}`
      const data = await api('GET', url)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'supplier_get',
  'Get supplier details by ID',
  { id: z.string().describe('Supplier ID') },
  async ({ id }) => {
    try {
      const data = await api('GET', `/api/supplier/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'supplier_update',
  'Update a supplier',
  {
    id: z.string().describe('Supplier ID'),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    payLater: z.boolean().optional(),
    licenseRequired: z.boolean().optional(),
    minimumRentalDays: z.number().optional(),
    blacklisted: z.boolean().optional(),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('PUT', '/api/update-supplier', { _id: id, ...updates })
      return { content: [{ type: 'text' as const, text: `Supplier updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'supplier_delete',
  'Delete a supplier by ID (cascades to cars, bookings, etc.)',
  { id: z.string().describe('Supplier ID') },
  async ({ id }) => {
    try {
      await api('DELETE', `/api/delete-supplier/${id}`)
      return { content: [{ type: 'text' as const, text: `Supplier ${id} deleted successfully.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// CAR MANAGEMENT
// ============================================================

server.tool(
  'car_list',
  'List cars with pagination and filters',
  {
    page: z.number().default(1),
    size: z.number().default(20),
    suppliers: z.array(z.string()).optional().describe('Supplier IDs to filter by'),
    fuel: z.array(z.string()).optional().describe('Fuel types: diesel, gasoline, electric, hybrid, plugInHybrid'),
    gearbox: z.array(z.string()).optional().describe('Gearbox types: automatic, manual'),
    availability: z.array(z.string()).optional().describe('Availability: available, unavailable'),
    keyword: z.string().optional().describe('Search keyword'),
  },
  async ({ page, size, suppliers, fuel, gearbox, availability, keyword }) => {
    try {
      const body: Record<string, unknown> = {}
      if (suppliers) body.suppliers = suppliers
      if (fuel) body.fuel = fuel
      if (gearbox) body.gearbox = gearbox
      if (availability) body.availability = availability
      const url = `/api/cars/${page}/${size}${keyword ? `?s=${encodeURIComponent(keyword)}` : ''}`
      const data = await api('POST', url, body)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'car_get',
  'Get car details by ID',
  { id: z.string().describe('Car ID'), language: z.string().default('en') },
  async ({ id, language }) => {
    try {
      const data = await api('GET', `/api/car/${id}/${language}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'car_create',
  'Create a new rental car',
  {
    name: z.string().describe('Car name e.g. "Toyota Camry 2024"'),
    supplier: z.string().describe('Supplier ID'),
    locations: z.array(z.string()).describe('Location IDs where car is available'),
    dailyPrice: z.number().describe('Daily rental price'),
    deposit: z.number().describe('Deposit amount'),
    minimumAge: z.number().default(21),
    seats: z.number().default(5),
    doors: z.number().default(4),
    type: z.string().default('gasoline').describe('Fuel type: diesel, gasoline, electric, hybrid, plugInHybrid'),
    gearbox: z.string().default('automatic').describe('Gearbox: automatic, manual'),
    aircon: z.boolean().default(true),
    mileage: z.number().default(-1).describe('Mileage limit per day. -1 for unlimited'),
    fuelPolicy: z.string().default('likeForLike').describe('Fuel policy: likeForLike, fullToFull, freeTank'),
    range: z.string().default('midi').describe('Car range: mini, midi, maxi, scooter'),
    available: z.boolean().default(true),
    cancellation: z.number().default(-1).describe('Cancellation fee. -1 for free'),
    amendments: z.number().default(-1).describe('Amendment fee. -1 for free'),
    theftProtection: z.number().default(0),
    collisionDamageWaiver: z.number().default(0),
    fullInsurance: z.number().default(0),
    additionalDriver: z.number().default(0),
    licensePlate: z.string().optional(),
    weeklyPrice: z.number().optional(),
    monthlyPrice: z.number().optional(),
    hourlyPrice: z.number().optional(),
    co2: z.number().optional(),
    rating: z.number().optional(),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/create-car', params)
      return { content: [{ type: 'text' as const, text: `Car created: ${JSON.stringify(data, null, 2)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'car_update',
  'Update an existing car',
  {
    id: z.string().describe('Car ID'),
    name: z.string().optional(),
    dailyPrice: z.number().optional(),
    deposit: z.number().optional(),
    available: z.boolean().optional(),
    seats: z.number().optional(),
    doors: z.number().optional(),
    type: z.string().optional(),
    gearbox: z.string().optional(),
    aircon: z.boolean().optional(),
    mileage: z.number().optional(),
    fuelPolicy: z.string().optional(),
    range: z.string().optional(),
    locations: z.array(z.string()).optional(),
    licensePlate: z.string().optional(),
    minimumAge: z.number().optional(),
    cancellation: z.number().optional(),
    amendments: z.number().optional(),
    theftProtection: z.number().optional(),
    collisionDamageWaiver: z.number().optional(),
    fullInsurance: z.number().optional(),
    additionalDriver: z.number().optional(),
    tracking: z.boolean().optional().describe('Enable GPS tracking'),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('PUT', '/api/update-car', { _id: id, ...updates })
      return { content: [{ type: 'text' as const, text: `Car updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'car_delete',
  'Delete a car by ID',
  { id: z.string().describe('Car ID') },
  async ({ id }) => {
    try {
      await api('DELETE', `/api/delete-car/${id}`)
      return { content: [{ type: 'text' as const, text: `Car ${id} deleted.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'car_check',
  'Check if a car is used in bookings (before deletion)',
  { id: z.string().describe('Car ID') },
  async ({ id }) => {
    try {
      const data = await api('GET', `/api/check-car/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// BOOKING MANAGEMENT
// ============================================================

server.tool(
  'booking_list',
  'List bookings with filters and pagination',
  {
    page: z.number().default(1),
    size: z.number().default(20),
    language: z.string().default('en'),
    suppliers: z.array(z.string()).optional().describe('Supplier IDs'),
    statuses: z.array(z.string()).optional().describe('Status filters: pending, deposit, paid, confirmed, cancelled, void'),
    from: z.string().optional().describe('From date ISO string'),
    to: z.string().optional().describe('To date ISO string'),
    keyword: z.string().optional(),
  },
  async ({ page, size, language, suppliers, statuses, from, to, keyword }) => {
    try {
      const body: Record<string, unknown> = {}
      if (suppliers) body.suppliers = suppliers
      if (statuses) body.statuses = statuses
      if (from) body.from = from
      if (to) body.to = to
      if (keyword) body.keyword = keyword
      const data = await api('POST', `/api/bookings/${page}/${size}/${language}`, body)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'booking_get',
  'Get booking details by ID',
  { id: z.string().describe('Booking ID'), language: z.string().default('en') },
  async ({ id, language }) => {
    try {
      const data = await api('GET', `/api/booking/${id}/${language}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'booking_create',
  'Create a new booking',
  {
    supplier: z.string().describe('Supplier ID'),
    car: z.string().describe('Car ID'),
    driver: z.string().describe('Driver user ID'),
    pickupLocation: z.string().describe('Pickup location ID'),
    dropOffLocation: z.string().describe('Drop-off location ID'),
    from: z.string().describe('Pickup date ISO string'),
    to: z.string().describe('Return date ISO string'),
    status: z.string().default('pending').describe('Booking status'),
    price: z.number().describe('Total price'),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/create-booking', { booking: params })
      return { content: [{ type: 'text' as const, text: `Booking created: ${JSON.stringify(data, null, 2)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'booking_update',
  'Update a booking',
  {
    id: z.string().describe('Booking ID'),
    status: z.string().optional().describe('Booking status: pending, deposit, paid, confirmed, cancelled, void'),
    from: z.string().optional(),
    to: z.string().optional(),
    price: z.number().optional(),
    car: z.string().optional(),
    pickupLocation: z.string().optional(),
    dropOffLocation: z.string().optional(),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('PUT', '/api/update-booking', { _id: id, ...updates })
      return { content: [{ type: 'text' as const, text: `Booking updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'booking_update_status',
  'Update only booking status',
  {
    ids: z.array(z.string()).describe('Booking IDs'),
    status: z.string().describe('New status: pending, deposit, paid, confirmed, cancelled, void'),
  },
  async ({ ids, status }) => {
    try {
      const data = await api('POST', '/api/update-booking-status', { ids, status })
      return { content: [{ type: 'text' as const, text: `Status updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'booking_delete',
  'Delete bookings by IDs',
  { ids: z.array(z.string()).describe('Booking IDs to delete') },
  async ({ ids }) => {
    try {
      await api('POST', '/api/delete-bookings', ids)
      return { content: [{ type: 'text' as const, text: `${ids.length} booking(s) deleted.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// USER MANAGEMENT
// ============================================================

server.tool(
  'user_list',
  'List users with pagination',
  {
    page: z.number().default(1),
    size: z.number().default(20),
    keyword: z.string().optional(),
    types: z.array(z.string()).optional().describe('User types: admin, supplier, user'),
  },
  async ({ page, size, keyword, types }) => {
    try {
      const body: Record<string, unknown> = {}
      if (types) body.types = types
      const url = `/api/users/${page}/${size}${keyword ? `?s=${encodeURIComponent(keyword)}` : ''}`
      const data = await api('POST', url, body)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'user_get',
  'Get user profile by ID',
  { id: z.string().describe('User ID') },
  async ({ id }) => {
    try {
      const data = await api('GET', `/api/user/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'user_create',
  'Create a new user',
  {
    email: z.string().describe('User email'),
    fullName: z.string().describe('Full name'),
    type: z.string().default('user').describe('User type: admin, supplier, user'),
    phone: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    password: z.string().optional().describe('Password (auto-generated if empty)'),
    language: z.string().default('en'),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/create-user', params)
      return { content: [{ type: 'text' as const, text: `User created: ${JSON.stringify(data, null, 2)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'user_update',
  'Update a user profile',
  {
    id: z.string().describe('User ID'),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    enableEmailNotifications: z.boolean().optional(),
    payLater: z.boolean().optional(),
    blacklisted: z.boolean().optional(),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('POST', '/api/update-user', { _id: id, ...updates })
      return { content: [{ type: 'text' as const, text: `User updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'user_delete',
  'Delete users by IDs',
  { ids: z.array(z.string()).describe('User IDs to delete') },
  async ({ ids }) => {
    try {
      await api('POST', '/api/delete-users', ids)
      return { content: [{ type: 'text' as const, text: `${ids.length} user(s) deleted.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// LOCATION MANAGEMENT
// ============================================================

server.tool(
  'location_list',
  'List locations with pagination',
  {
    page: z.number().default(1),
    size: z.number().default(50),
    language: z.string().default('en'),
    keyword: z.string().optional(),
  },
  async ({ page, size, language, keyword }) => {
    try {
      const url = `/api/locations/${page}/${size}/${language}${keyword ? `?s=${encodeURIComponent(keyword)}` : ''}`
      const data = await api('GET', url)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'location_get',
  'Get location by ID',
  { id: z.string(), language: z.string().default('en') },
  async ({ id, language }) => {
    try {
      const data = await api('GET', `/api/location/${id}/${language}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'location_create',
  'Create a new location',
  {
    country: z.string().describe('Country ID'),
    names: z.array(z.object({ language: z.string(), name: z.string() })).describe('Location names in different languages'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/create-location', params)
      return { content: [{ type: 'text' as const, text: `Location created: ${JSON.stringify(data, null, 2)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'location_update',
  'Update a location',
  {
    id: z.string().describe('Location ID'),
    country: z.string().optional(),
    names: z.array(z.object({ language: z.string(), name: z.string() })).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('PUT', `/api/update-location/${id}`, updates)
      return { content: [{ type: 'text' as const, text: `Location updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'location_delete',
  'Delete a location',
  { id: z.string().describe('Location ID') },
  async ({ id }) => {
    try {
      await api('DELETE', `/api/delete-location/${id}`)
      return { content: [{ type: 'text' as const, text: `Location ${id} deleted.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'location_check',
  'Check if a location is used by cars',
  { id: z.string() },
  async ({ id }) => {
    try {
      const data = await api('GET', `/api/check-location/${id}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// COUNTRY MANAGEMENT
// ============================================================

server.tool(
  'country_list',
  'List countries with pagination',
  { page: z.number().default(1), size: z.number().default(50), language: z.string().default('en') },
  async ({ page, size, language }) => {
    try {
      const data = await api('GET', `/api/countries/${page}/${size}/${language}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'country_create',
  'Create a new country',
  {
    names: z.array(z.object({ language: z.string(), name: z.string() })).describe('Country names in different languages'),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/create-country', params)
      return { content: [{ type: 'text' as const, text: `Country created: ${JSON.stringify(data, null, 2)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'country_update',
  'Update a country',
  {
    id: z.string(),
    names: z.array(z.object({ language: z.string(), name: z.string() })).optional(),
  },
  async (params) => {
    try {
      const { id, ...updates } = params
      const data = await api('PUT', `/api/update-country/${id}`, updates)
      return { content: [{ type: 'text' as const, text: `Country updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'country_delete',
  'Delete a country',
  { id: z.string() },
  async ({ id }) => {
    try {
      await api('DELETE', `/api/delete-country/${id}`)
      return { content: [{ type: 'text' as const, text: `Country ${id} deleted.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// NOTIFICATION MANAGEMENT
// ============================================================

server.tool(
  'notification_list',
  'List notifications for a user',
  { userId: z.string(), page: z.number().default(1), size: z.number().default(20) },
  async ({ userId, page, size }) => {
    try {
      const data = await api('GET', `/api/notifications/${userId}/${page}/${size}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'notification_count',
  'Get unread notification count',
  { userId: z.string() },
  async ({ userId }) => {
    try {
      const data = await api('GET', `/api/notification-counter/${userId}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'notification_mark_read',
  'Mark notifications as read',
  { userId: z.string(), ids: z.array(z.string()).describe('Notification IDs') },
  async ({ userId, ids }) => {
    try {
      await api('POST', `/api/mark-notifications-as-read/${userId}`, { ids })
      return { content: [{ type: 'text' as const, text: `Marked ${ids.length} as read.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'notification_delete',
  'Delete notifications',
  { userId: z.string(), ids: z.array(z.string()) },
  async ({ userId, ids }) => {
    try {
      await api('POST', `/api/delete-notifications/${userId}`, { ids })
      return { content: [{ type: 'text' as const, text: `Deleted ${ids.length} notification(s).` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// SETTINGS
// ============================================================

server.tool(
  'settings_get',
  'Get platform settings (min pickup hours, rental hours, etc.)',
  {},
  async () => {
    try {
      const data = await api('GET', '/api/settings')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'settings_update',
  'Update platform settings',
  {
    minPickupHours: z.number().optional().describe('Minimum hours before pickup'),
    minRentalHours: z.number().optional().describe('Minimum rental duration in hours'),
    minPickupDropoffHour: z.number().optional().describe('Earliest pickup/dropoff hour (0-23)'),
    maxPickupDropoffHour: z.number().optional().describe('Latest pickup/dropoff hour (0-23)'),
  },
  async (params) => {
    try {
      const data = await api('PUT', '/api/update-settings', params)
      return { content: [{ type: 'text' as const, text: `Settings updated. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// BANK DETAILS
// ============================================================

server.tool(
  'bank_details_get',
  'Get bank account details',
  {},
  async () => {
    try {
      const data = await api('GET', '/api/bank-details')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'bank_details_update',
  'Create or update bank details',
  {
    accountHolder: z.string().describe('Account holder name'),
    bankName: z.string().describe('Bank name'),
    iban: z.string().describe('IBAN'),
    swiftBic: z.string().optional().describe('SWIFT/BIC code'),
    showBankDetailsPage: z.boolean().optional().describe('Show bank details on frontend'),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/upsert-bank-details', params)
      return { content: [{ type: 'text' as const, text: `Bank details saved. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// GPS TRACKING (Traccar)
// ============================================================

server.tool(
  'tracking_status',
  'Get GPS tracking integration status',
  {},
  async () => {
    try {
      const data = await api('GET', '/api/status')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_devices',
  'List all GPS tracking devices',
  {},
  async () => {
    try {
      const data = await api('GET', '/api/devices')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_fleet',
  'Get fleet overview with all vehicle statuses',
  {},
  async () => {
    try {
      const data = await api('GET', '/api/fleet')
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_position',
  'Get current GPS position of a car',
  { carId: z.string().describe('Car ID') },
  async ({ carId }) => {
    try {
      const data = await api('GET', `/api/positions/${carId}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_route',
  'Get route history of a car',
  {
    carId: z.string().describe('Car ID'),
    from: z.string().optional().describe('Start date ISO string (defaults to 24h ago)'),
    to: z.string().optional().describe('End date ISO string (defaults to now)'),
  },
  async ({ carId, from, to }) => {
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString() ? `?${params}` : ''
      const data = await api('GET', `/api/route/${carId}${qs}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_reports',
  'Get vehicle reports (trips, stops, summary)',
  { carId: z.string() },
  async ({ carId }) => {
    try {
      const data = await api('GET', `/api/reports/${carId}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_link_device',
  'Link a GPS device to a car',
  { carId: z.string(), deviceId: z.string().optional(), uniqueId: z.string().optional() },
  async (params) => {
    try {
      const { carId, ...body } = params
      const data = await api('POST', `/api/link/${carId}`, body)
      return { content: [{ type: 'text' as const, text: `Device linked. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_unlink_device',
  'Unlink GPS device from a car',
  { carId: z.string() },
  async ({ carId }) => {
    try {
      await api('POST', `/api/unlink/${carId}`)
      return { content: [{ type: 'text' as const, text: `Device unlinked from car ${carId}.` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_send_command',
  'Send a command to a GPS device (e.g. engine stop)',
  {
    carId: z.string(),
    type: z.string().describe('Command type'),
    attributes: z.record(z.string(), z.unknown()).optional(),
  },
  async ({ carId, type, attributes }) => {
    try {
      const data = await api('POST', `/api/commands/${carId}/send`, { type, attributes })
      return { content: [{ type: 'text' as const, text: `Command sent. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_geofences',
  'List all geofences or geofences for a specific car',
  { carId: z.string().optional().describe('Car ID (optional, for car-specific geofences)') },
  async ({ carId }) => {
    try {
      const url = carId ? `/api/geofences/${carId}` : '/api/geofences'
      const data = await api('GET', url)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_create_geofence',
  'Create a geofence zone',
  {
    name: z.string().describe('Geofence name'),
    area: z.string().describe('WKT geometry string (POLYGON, CIRCLE, etc.)'),
    description: z.string().optional(),
  },
  async (params) => {
    try {
      const data = await api('POST', '/api/geofences', params)
      return { content: [{ type: 'text' as const, text: `Geofence created. ${JSON.stringify(data)}` }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

server.tool(
  'tracking_events',
  'Get fleet-wide event center (alerts, events)',
  {
    from: z.string().optional(),
    to: z.string().optional(),
    carId: z.string().optional(),
    types: z.string().optional().describe('Comma-separated event types'),
    limit: z.number().optional(),
  },
  async ({ from, to, carId, types, limit }) => {
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (carId) params.set('carId', carId)
      if (types) params.set('types', types)
      if (limit) params.set('limit', String(limit))
      const qs = params.toString() ? `?${params}` : ''
      const data = await api('GET', `/api/events-center${qs}`)
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// AI ASSISTANT
// ============================================================

server.tool(
  'assistant_message',
  'Send a message to the built-in AI assistant',
  {
    message: z.string().describe('Text message to send'),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string(),
    })).optional().describe('Conversation history'),
  },
  async ({ message, history }) => {
    try {
      const data = await api('POST', '/api/assistant/message', { message, history: history || [] })
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
    } catch (e: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${e.response?.data || e.message}` }] }
    }
  },
)

// ============================================================
// REQUEST LOGS (query the MCP logs database)
// ============================================================

server.tool(
  'logs_query',
  'Query MCP request logs. Filter by tool name, status, or date range.',
  {
    tool: z.string().optional().describe('Filter by tool name'),
    status: z.enum(['success', 'error']).optional(),
    limit: z.number().default(20).describe('Max results'),
    from: z.string().optional().describe('From date ISO string'),
    to: z.string().optional().describe('To date ISO string'),
  },
  async ({ tool: toolFilter, status, limit, from, to }) => {
    const col = getLogsCollection()
    if (!col) {
      return { content: [{ type: 'text' as const, text: 'Logging not connected.' }] }
    }
    const filter: Record<string, unknown> = {}
    if (toolFilter) filter.tool = toolFilter
    if (status) filter.status = status
    if (from || to) {
      filter.timestamp = {}
      if (from) (filter.timestamp as any).$gte = new Date(from)
      if (to) (filter.timestamp as any).$lte = new Date(to)
    }
    const docs = await col.find(filter).sort({ timestamp: -1 }).limit(limit).toArray()
    return { content: [{ type: 'text' as const, text: JSON.stringify(docs, null, 2) }] }
  },
)

server.tool(
  'logs_stats',
  'Get summary statistics of MCP usage (total calls, errors, top tools)',
  { days: z.number().default(7).describe('Number of days to look back') },
  async ({ days }) => {
    const col = getLogsCollection()
    if (!col) {
      return { content: [{ type: 'text' as const, text: 'Logging not connected.' }] }
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const [stats] = await col.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]).toArray()
    const topTools = await col.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: '$tool', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray()
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ period: `${days} days`, ...stats, topTools }, null, 2),
      }],
    }
  },
)

// ============================================================
// START SERVER
// ============================================================

async function main() {
  // Connect to MongoDB for request logging
  try {
    await connectLogger()
    console.error('[MCP] Request logging enabled')
  } catch (e) {
    console.error('[MCP] Warning: Could not connect to MongoDB for logging, continuing without logging:', e)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[MCP] Server running (API: ${getApiUrl()})`)
}

main().catch((err) => {
  console.error('MCP Server error:', err)
  process.exit(1)
})
