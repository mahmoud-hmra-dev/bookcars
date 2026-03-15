import { ParsedAssistantIntent, ParsedDateRange } from './assistantTypes'

const normalizeArabic = (value: string) => value
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const normalizeAssistantText = (value: string) => normalizeWhitespace(normalizeArabic(value.toLowerCase()))

const getDayRange = (daysToAdd: number, label: 'today' | 'tomorrow'): ParsedDateRange => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + daysToAdd)

  const end = new Date(start)
  end.setHours(23, 59, 59, 999)

  return {
    label,
    from: start,
    to: end,
  }
}

const parseDateRange = (message: string) => {
  if (message.includes('tomorrow')) {
    return getDayRange(1, 'tomorrow')
  }

  if (message.includes('today')) {
    return getDayRange(0, 'today')
  }

  return undefined
}

const parseSearchTerm = (message: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = message.match(pattern)
    const value = match?.[1]?.trim()
    if (value) {
      return value
    }
  }

  return undefined
}

export const parseAssistantMessage = (message: string): ParsedAssistantIntent => {
  const normalizedMessage = normalizeAssistantText(message || '')
  const dateRange = parseDateRange(normalizedMessage)

  if (/^(send email|email)\b/.test(normalizedMessage)) {
    const email = normalizedMessage.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0]
    return {
      intent: 'send_email',
      originalMessage: message,
      normalizedMessage,
      email,
    }
  }

  if (/^(create meeting|schedule meeting|book meeting)\b/.test(normalizedMessage)) {
    const searchTerm = parseSearchTerm(normalizedMessage, [
      /with supplier\s+(.+?)(?:\s+today|\s+tomorrow|\s+at\s+\d{1,2}(?::\d{2})?)?$/,
      /with\s+(.+?)(?:\s+today|\s+tomorrow|\s+at\s+\d{1,2}(?::\d{2})?)?$/,
    ])

    return {
      intent: 'create_meeting',
      originalMessage: message,
      normalizedMessage,
      searchTerm,
      dateRange,
    }
  }

  if (normalizedMessage.includes('available cars') || normalizedMessage.startsWith('available car')) {
    const locationQuery = parseSearchTerm(normalizedMessage, [
      /(?:available cars?|cars? available)(?:\s+\w+)?\s+in\s+(.+)$/,
      /in\s+(.+)$/,
    ])

    return {
      intent: 'car_availability',
      originalMessage: message,
      normalizedMessage,
      locationQuery,
      dateRange,
    }
  }

  if (normalizedMessage.startsWith('find supplier')) {
    const searchTerm = parseSearchTerm(normalizedMessage, [/find supplier\s+(.+)$/])
    return {
      intent: 'supplier_search',
      originalMessage: message,
      normalizedMessage,
      searchTerm,
    }
  }

  if (normalizedMessage.startsWith('find booking')) {
    const searchTerm = parseSearchTerm(normalizedMessage, [/find booking\s+(.+)$/])
    return {
      intent: 'booking_search',
      originalMessage: message,
      normalizedMessage,
      searchTerm,
    }
  }

  if (normalizedMessage.includes('booking') || normalizedMessage.includes('bookings')) {
    return {
      intent: 'booking_summary',
      originalMessage: message,
      normalizedMessage,
      dateRange,
      filters: {
        unpaid: normalizedMessage.includes('unpaid'),
      },
    }
  }

  return {
    intent: 'unknown',
    originalMessage: message,
    normalizedMessage,
  }
}
