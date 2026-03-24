export type AssistantIntent =
  | 'booking_summary'
  | 'booking_search'
  | 'supplier_search'
  | 'customer_search'
  | 'car_availability'
  | 'car_search'
  | 'fleet_overview'
  | 'revenue_summary'
  | 'supplier_performance'
  | 'customer_health'
  | 'risk_alerts'
  | 'smart_recommendations'
  | 'executive_decision_support'
  | 'ops_summary'
  | 'send_email'
  | 'create_meeting'
  | 'unknown'

export type AssistantStatus = 'success' | 'needs_clarification' | 'error'
export type AssistantSource = 'llm_primary' | 'system_fallback'
export type AssistantDateRangeLabel = 'today' | 'tomorrow'

export interface AssistantConversationTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface AssistantResponse {
  intent: AssistantIntent
  status: AssistantStatus
  reply: string
  replyLanguage: string
  inputLanguage: string
  data?: Record<string, unknown>
  suggestedActions?: string[]
  contextUsed?: {
    historyTurns: number
  }
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
    paid?: boolean
    cancelled?: boolean
    reserved?: boolean
    active?: boolean
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
    paid?: boolean
    cancelled?: boolean
    reserved?: boolean
    active?: boolean
  }
  needsClarification: boolean
  clarificationQuestion?: string
  confidence?: number
  inputLanguage?: string
  replyLanguage?: string
}
