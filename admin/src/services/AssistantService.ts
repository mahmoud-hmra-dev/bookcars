import axiosInstance from './axiosInstance'

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
  replyLanguage: string
  inputLanguage: string
  data?: Record<string, unknown>
  suggestedActions?: string[]
}

interface AssistantMessagePayload {
  message: string
}

export const sendMessage = (message: string): Promise<AssistantResponse> => (
  axiosInstance
    .post(
      '/api/assistant/message',
      { message } as AssistantMessagePayload,
      { withCredentials: true }
    )
    .then((res) => res.data)
)
