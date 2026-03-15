import { AssistantDateRangeLabel, ParsedAssistantIntent, ParsedDateRange } from './assistantTypes'

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

const inferInputLanguage = (value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    return 'en'
  }

  if (/[\u0600-\u06FF]/.test(normalized)) {
    return 'ar'
  }

  if (/[¿¡]/.test(normalized) || /\b(hola|buscar|reserva|reservas|coche|coches|proveedor|mañana|hoy|disponible|disponibles|prioridad|seguimiento)\b/i.test(normalized)) {
    return 'es'
  }

  if (/\b(bonjour|réservation|réservations|voiture|voitures|fournisseur|demain|aujourd'hui|disponible|disponibles|priorite|priorité|suivi)\b/i.test(normalized)) {
    return 'fr'
  }

  return 'en'
}

export const getDayRange = (daysToAdd: number, label: AssistantDateRangeLabel): ParsedDateRange => {
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

export const getDateRangeFromLabel = (label?: AssistantDateRangeLabel) => {
  if (label === 'tomorrow') {
    return getDayRange(1, 'tomorrow')
  }

  if (label === 'today') {
    return getDayRange(0, 'today')
  }

  return undefined
}

const parseDateRange = (message: string) => getDateRangeFromLabel(
  message.includes('tomorrow')
    ? 'tomorrow'
    : message.includes('today')
      ? 'today'
      : undefined,
)

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

const shouldUseLlmForLanguage = (inputLanguage: string) => inputLanguage !== 'en'

const isOpsSummaryQuery = (message: string) => {
  if (!message) {
    return false
  }

  return [
    'ops summary',
    'operations summary',
    'what needs attention',
    'needs attention',
    'what should i prioritize',
    'what should we prioritize',
    'prioritize',
    'priorities',
    'follow up',
    'follow-up',
    'what needs follow up',
    'general analysis',
    'overview',
    'status overview',
    'anything urgent',
  ].some((pattern) => message.includes(pattern))
}

export const shouldFallbackToAssistantLlm = (parsed: ParsedAssistantIntent) => parsed.intent === 'unknown'
  || !!parsed.fallbackRecommended
  || shouldUseLlmForLanguage(parsed.inputLanguage || 'en')

export const parseAssistantMessage = (message: string): ParsedAssistantIntent => {
  const normalizedMessage = normalizeAssistantText(message || '')
  const dateRange = parseDateRange(normalizedMessage)
  const inputLanguage = inferInputLanguage(message || '')
  const replyLanguage = inputLanguage

  if (/^(send email|email)\b/.test(normalizedMessage)) {
    const email = normalizedMessage.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0]
    return {
      intent: 'send_email',
      originalMessage: message,
      normalizedMessage,
      email,
      source: 'parser',
      confidence: email ? 0.85 : 0.55,
      fallbackRecommended: !email,
      needsClarification: !email,
      clarificationQuestion: !email ? 'Who should receive the email?' : undefined,
      inputLanguage,
      replyLanguage,
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
      source: 'parser',
      confidence: searchTerm && dateRange ? 0.88 : 0.58,
      fallbackRecommended: !searchTerm || !dateRange,
      needsClarification: !searchTerm || !dateRange,
      clarificationQuestion: !searchTerm
        ? 'Who should the meeting be with?'
        : !dateRange
          ? 'When should I schedule the meeting?'
          : undefined,
      inputLanguage,
      replyLanguage,
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
      source: 'parser',
      confidence: locationQuery && dateRange ? 0.92 : 0.45,
      fallbackRecommended: !locationQuery || !dateRange,
      needsClarification: !locationQuery || !dateRange,
      clarificationQuestion: !dateRange
        ? 'Which date should I check for car availability?'
        : !locationQuery
          ? 'Which location should I search for available cars?'
          : undefined,
      inputLanguage,
      replyLanguage,
    }
  }

  if (normalizedMessage.startsWith('find supplier')) {
    const searchTerm = parseSearchTerm(normalizedMessage, [/find supplier\s+(.+)$/])
    return {
      intent: 'supplier_search',
      originalMessage: message,
      normalizedMessage,
      searchTerm,
      source: 'parser',
      confidence: searchTerm ? 0.9 : 0.45,
      fallbackRecommended: !searchTerm,
      needsClarification: !searchTerm,
      clarificationQuestion: !searchTerm ? 'Which supplier should I look for?' : undefined,
      inputLanguage,
      replyLanguage,
    }
  }

  if (normalizedMessage.startsWith('find booking')) {
    const searchTerm = parseSearchTerm(normalizedMessage, [/find booking\s+(.+)$/])
    return {
      intent: 'booking_search',
      originalMessage: message,
      normalizedMessage,
      searchTerm,
      source: 'parser',
      confidence: searchTerm ? 0.9 : 0.45,
      fallbackRecommended: !searchTerm,
      needsClarification: !searchTerm,
      clarificationQuestion: !searchTerm ? 'Which booking should I look for?' : undefined,
      inputLanguage,
      replyLanguage,
    }
  }

  if (isOpsSummaryQuery(normalizedMessage)) {
    return {
      intent: 'ops_summary',
      originalMessage: message,
      normalizedMessage,
      dateRange,
      filters: {
        unpaid: normalizedMessage.includes('unpaid'),
      },
      source: 'parser',
      confidence: 0.86,
      fallbackRecommended: false,
      needsClarification: false,
      inputLanguage,
      replyLanguage,
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
      source: 'parser',
      confidence: 0.82,
      fallbackRecommended: false,
      needsClarification: false,
      inputLanguage,
      replyLanguage,
    }
  }

  return {
    intent: 'unknown',
    originalMessage: message,
    normalizedMessage,
    source: 'parser',
    confidence: 0.1,
    fallbackRecommended: true,
    needsClarification: true,
    clarificationQuestion: 'What would you like me to help with: bookings, suppliers, cars, email, meetings, or operations summary?',
    inputLanguage,
    replyLanguage,
  }
}
