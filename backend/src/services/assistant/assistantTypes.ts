export type AssistantIntent =
  | 'dashboard_overview'
  | 'bookings_overview'
  | 'fleet_overview'
  | 'suppliers_overview'
  | 'customers_overview'
  | 'risk_overview'
  | 'revenue_overview'
  | 'search_bookings'
  | 'search_cars'
  | 'search_suppliers'
  | 'search_customers'
  | 'draft_supplier_message'
  | 'draft_customer_message'
  | 'draft_followup_plan'
  | 'draft_task_list'
  | 'unknown'

export type AssistantStatus = 'success' | 'needs_clarification' | 'error'

export interface AssistantConversationTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface AssistantResponseCard {
  type: 'metric' | 'decision' | 'alert' | 'list' | 'draft' | 'table'
  title: string
  value?: string | number
  severity?: 'info' | 'success' | 'warning' | 'error'
  items?: string[]
  rows?: Record<string, unknown>[]
  body?: string
}

export interface AssistantResponse {
  intent: AssistantIntent
  status: AssistantStatus
  title: string
  summary: string
  reply: string
  cards: AssistantResponseCard[]
  suggestions: string[]
  data?: Record<string, unknown>
}
