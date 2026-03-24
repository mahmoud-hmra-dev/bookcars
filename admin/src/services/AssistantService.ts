import axiosInstance from './axiosInstance'

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
  | 'message_draft'
  | 'followup_plan'
  | 'tasklist_generation'
  | 'ops_summary'
  | 'send_email'
  | 'create_meeting'
  | 'unknown'

export type AssistantStatus = 'success' | 'needs_clarification' | 'error'

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

interface AssistantMessagePayload {
  message: string
  history?: AssistantConversationTurn[]
}

export interface AssistantVoiceResponse {
  transcript: string
  response: AssistantResponse
}

export const sendMessage = (message: string, history: AssistantConversationTurn[] = []): Promise<AssistantResponse> => (
  axiosInstance
    .post(
      '/api/assistant/message',
      { message, history } as AssistantMessagePayload,
      { withCredentials: true }
    )
    .then((res) => res.data)
)

export const sendVoiceMessage = (audio: Blob, filename: string): Promise<AssistantVoiceResponse> => {
  const formData = new FormData()
  formData.append('audio', audio, filename)

  return axiosInstance
    .post('/api/assistant/voice/message', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}
