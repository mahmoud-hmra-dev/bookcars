import * as logger from '../../utils/logger'
import { getDateRangeFromLabel } from './assistantParser'
import { fetchAssistantLlmResolution, isAssistantLlmEnabled } from './assistantLlmClient'
import { AssistantIntent, AssistantLlmResolution, ParsedAssistantIntent } from './assistantTypes'

const SUPPORTED_INTENTS: AssistantIntent[] = [
  'booking_summary',
  'booking_search',
  'supplier_search',
  'car_availability',
  'send_email',
  'create_meeting',
  'unknown',
]

const isSupportedIntent = (intent: unknown): intent is AssistantIntent => typeof intent === 'string'
  && SUPPORTED_INTENTS.includes(intent as AssistantIntent)

const normalizeLlmResolution = (message: string, normalizedMessage: string, resolution: AssistantLlmResolution): ParsedAssistantIntent | null => {
  if (!isSupportedIntent(resolution.intent)) {
    return null
  }

  return {
    intent: resolution.intent,
    originalMessage: message,
    normalizedMessage,
    searchTerm: resolution.searchTerm || undefined,
    email: resolution.email || undefined,
    locationQuery: resolution.locationQuery || undefined,
    dateRange: getDateRangeFromLabel(resolution.dateRangeLabel),
    filters: {
      unpaid: resolution.filters?.unpaid || undefined,
    },
    source: 'llm',
    confidence: resolution.confidence,
    fallbackRecommended: false,
    needsClarification: resolution.needsClarification,
    clarificationQuestion: resolution.clarificationQuestion || undefined,
  }
}

export const resolveAssistantIntentWithLlm = async (parsed: ParsedAssistantIntent): Promise<ParsedAssistantIntent | null> => {
  if (!isAssistantLlmEnabled()) {
    return null
  }

  try {
    const llmResolution = await fetchAssistantLlmResolution(parsed.originalMessage, {
      normalizedMessage: parsed.normalizedMessage,
      parserIntent: parsed.intent,
      parserConfidence: parsed.confidence,
      searchTerm: parsed.searchTerm ?? null,
      email: parsed.email ?? null,
      locationQuery: parsed.locationQuery ?? null,
      dateRangeLabel: parsed.dateRange?.label ?? null,
      filters: {
        unpaid: parsed.filters?.unpaid ?? null,
      },
      needsClarification: parsed.needsClarification ?? false,
      clarificationQuestion: parsed.clarificationQuestion ?? null,
    })

    if (!llmResolution) {
      return null
    }

    return normalizeLlmResolution(parsed.originalMessage, parsed.normalizedMessage, llmResolution as AssistantLlmResolution)
  } catch (err) {
    logger.error('[assistant.resolveAssistantIntentWithLlm] ERROR', err)
    return null
  }
}
