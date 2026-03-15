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

export const parseAssistantMessage = (message: string): ParsedAssistantIntent => {
  const normalizedMessage = normalizeAssistantText(message || '')
  const dateRange = parseDateRange(normalizedMessage)
  const inputLanguage = inferInputLanguage(message || '')
  const replyLanguage = inputLanguage

  const email = normalizedMessage.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0]
  const supplierSearchTerm = parseSearchTerm(normalizedMessage, [/find supplier\s+(.+)$/])
  const bookingSearchTerm = parseSearchTerm(normalizedMessage, [/find booking\s+(.+)$/])
  const meetingSearchTerm = parseSearchTerm(normalizedMessage, [
    /with supplier\s+(.+?)(?:\s+today|\s+tomorrow|\s+at\s+\d{1,2}(?::\d{2})?)?$/,
    /with\s+(.+?)(?:\s+today|\s+tomorrow|\s+at\s+\d{1,2}(?::\d{2})?)?$/,
  ])
  const locationQuery = parseSearchTerm(normalizedMessage, [
    /(?:available cars?|cars? available)(?:\s+\w+)?\s+in\s+(.+)$/,
    /in\s+(.+)$/,
  ])

  return {
    intent: 'unknown',
    originalMessage: message,
    normalizedMessage,
    email,
    searchTerm: supplierSearchTerm || bookingSearchTerm || meetingSearchTerm,
    locationQuery,
    dateRange,
    filters: {
      unpaid: normalizedMessage.includes('unpaid') || normalizedMessage.includes('غير مدفوع') || normalizedMessage.includes('impay') || normalizedMessage.includes('impag'),
    },
    source: 'llm_primary',
    confidence: 0.2,
    fallbackRecommended: false,
    needsClarification: false,
    inputLanguage,
    replyLanguage,
  }
}
