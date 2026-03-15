export type AssistantIntent =
  | 'booking_summary'
  | 'booking_search'
  | 'supplier_search'
  | 'car_availability'
  | 'send_email'
  | 'create_meeting'
  | 'unknown'

export type AssistantStatus = 'success' | 'needs_clarification' | 'error'

export interface AssistantResponse {
  intent: AssistantIntent
  status: AssistantStatus
  reply: string
  data?: Record<string, unknown>
  suggestedActions?: string[]
}

export interface ParsedDateRange {
  label: 'today' | 'tomorrow'
  from: Date
  to: Date
}

export interface ParsedAssistantIntent {
  intent: AssistantIntent
  originalMessage: string
  normalizedMessage: string
  searchTerm?: string
  email?: string
  locationQuery?: string
  dateRange?: ParsedDateRange
  filters?: {
    unpaid?: boolean
  }
}
