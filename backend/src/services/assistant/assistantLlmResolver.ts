import { AssistantConversationTurn, AssistantResponse } from './assistantTypes'

export const resolveAssistantIntentWithLlm = async (_parsed: unknown, _history: AssistantConversationTurn[] = []) => null

export const localizeAssistantResponse = async (response: AssistantResponse, _parsed: unknown): Promise<AssistantResponse> => response
