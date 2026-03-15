export type AssistantIntent =
  | 'booking_summary'
  | 'booking_search'
  | 'supplier_search'
  | 'car_availability'
  | 'send_email'
  | 'create_meeting'
  | 'unknown'

export type AssistantStatus = 'success' | 'needs_clarification' | 'error'
export type AssistantSource = 'parser' | 'llm'
export type AssistantDateRangeLabel = 'today' | 'tomorrow'

export interface AssistantResponse {
  intent: AssistantIntent
  status: AssistantStatus
  reply: string
  replyLanguage: string
  inputLanguage: string
  data?: Record<string, unknown>
  suggestedActions?: string[]
}

export interface ParsedDateRange {
  label: AssistantDateRangeLabel
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
  source?: AssistantSource
  confidence?: number
  fallbackRecommended?: boolean
  needsClarification?: boolean
  clarificationQuestion?: string
  inputLanguage?: string
  replyLanguage?: string
}

export interface AssistantLlmResolution {
  intent: AssistantIntent
  searchTerm?: string
  email?: string
  locationQuery?: string
  dateRangeLabel?: AssistantDateRangeLabel
  filters?: {
    unpaid?: boolean
  }
  needsClarification: boolean
  clarificationQuestion?: string
  confidence?: number
  inputLanguage?: string
  replyLanguage?: string
}
