import { AssistantIntent } from './assistantTypes'

export const getDateRangeFromLabel = () => undefined

export const parseAssistantMessage = (message: string): { intent: AssistantIntent, originalMessage: string, normalizedMessage: string } => ({
  intent: 'unknown',
  originalMessage: message,
  normalizedMessage: message.toLowerCase().trim(),
})
