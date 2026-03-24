import * as logger from '../../utils/logger'
import { getDateRangeFromLabel } from './assistantParser'
import { fetchAssistantLlmResolution, isAssistantLlmEnabled, localizeAssistantReply } from './assistantLlmClient'
import { AssistantConversationTurn, AssistantIntent, AssistantLlmResolution, AssistantResponse, ParsedAssistantIntent } from './assistantTypes'

const SUPPORTED_INTENTS: AssistantIntent[] = [
  'booking_summary',
  'booking_search',
  'supplier_search',
  'customer_search',
  'car_availability',
  'car_search',
  'fleet_overview',
  'revenue_summary',
  'supplier_performance',
  'customer_health',
  'risk_alerts',
  'smart_recommendations',
  'ops_summary',
  'send_email',
  'create_meeting',
  'unknown',
]

const isSupportedIntent = (intent: unknown): intent is AssistantIntent => typeof intent === 'string'
  && SUPPORTED_INTENTS.includes(intent as AssistantIntent)

const normalizeLanguage = (language?: string) => {
  const value = (language || 'en').trim().toLowerCase()
  return value || 'en'
}

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
      paid: resolution.filters?.paid || undefined,
      cancelled: resolution.filters?.cancelled || undefined,
      reserved: resolution.filters?.reserved || undefined,
      active: resolution.filters?.active || undefined,
    },
    source: 'llm_primary',
    confidence: resolution.confidence,
    fallbackRecommended: false,
    needsClarification: resolution.needsClarification,
    clarificationQuestion: resolution.clarificationQuestion || undefined,
    inputLanguage: normalizeLanguage(resolution.inputLanguage),
    replyLanguage: normalizeLanguage(resolution.replyLanguage || resolution.inputLanguage),
  }
}

export const resolveAssistantIntentWithLlm = async (
  parsed: ParsedAssistantIntent,
  history: AssistantConversationTurn[] = [],
): Promise<ParsedAssistantIntent | null> => {
  if (!isAssistantLlmEnabled()) {
    return null
  }

  try {
    const llmResolution = await fetchAssistantLlmResolution(parsed.originalMessage, {
      normalizedMessage: parsed.normalizedMessage,
      extractedEntities: {
        searchTerm: parsed.searchTerm ?? null,
        email: parsed.email ?? null,
        locationQuery: parsed.locationQuery ?? null,
        dateRangeLabel: parsed.dateRange?.label ?? null,
        filters: {
          unpaid: parsed.filters?.unpaid ?? null,
          paid: parsed.filters?.paid ?? null,
          cancelled: parsed.filters?.cancelled ?? null,
          reserved: parsed.filters?.reserved ?? null,
          active: parsed.filters?.active ?? null,
        },
      },
      inputLanguage: parsed.inputLanguage ?? 'en',
      replyLanguage: parsed.replyLanguage ?? parsed.inputLanguage ?? 'en',
    }, {
      recentTurns: history.slice(-6),
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

export const localizeAssistantResponse = async (
  response: AssistantResponse,
  parsed: ParsedAssistantIntent,
): Promise<AssistantResponse> => {
  const targetLanguage = normalizeLanguage(parsed.replyLanguage || parsed.inputLanguage)

  if (!targetLanguage || targetLanguage === 'en') {
    return {
      ...response,
      inputLanguage: normalizeLanguage(parsed.inputLanguage),
      replyLanguage: targetLanguage || 'en',
    }
  }

  try {
    const localized = await localizeAssistantReply(response.reply, targetLanguage, {
      intent: response.intent,
      status: response.status,
      data: response.data ?? null,
      suggestedActions: response.suggestedActions ?? null,
      originalMessage: parsed.originalMessage,
    })

    if (!localized?.reply) {
      return {
        ...response,
        inputLanguage: normalizeLanguage(parsed.inputLanguage),
        replyLanguage: targetLanguage,
      }
    }

    return {
      ...response,
      reply: localized.reply,
      inputLanguage: normalizeLanguage(parsed.inputLanguage),
      replyLanguage: normalizeLanguage(localized.replyLanguage || targetLanguage),
    }
  } catch (err) {
    logger.error('[assistant.localizeAssistantResponse] ERROR', err)
    return {
      ...response,
      inputLanguage: normalizeLanguage(parsed.inputLanguage),
      replyLanguage: targetLanguage,
    }
  }
}
