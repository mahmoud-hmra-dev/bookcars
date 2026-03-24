export const ASSISTANT_LLM_RESPONSE_SCHEMA = {
  name: 'assistant_intent_resolution',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['intent', 'needsClarification', 'clarificationQuestion', 'confidence', 'inputLanguage', 'replyLanguage', 'entities'],
    properties: {
      intent: {
        type: 'string',
        enum: [
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
          'executive_decision_support',
          'message_draft',
          'followup_plan',
          'tasklist_generation',
          'ops_summary',
          'send_email',
          'create_meeting',
          'unknown',
        ],
      },
      needsClarification: { type: 'boolean' },
      clarificationQuestion: {
        anyOf: [
          { type: 'string' },
          { type: 'null' },
        ],
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },
      inputLanguage: {
        type: 'string',
      },
      replyLanguage: {
        type: 'string' },
      entities: {
        type: 'object',
        additionalProperties: false,
        required: ['searchTerm', 'email', 'locationQuery', 'dateRangeLabel', 'filters'],
        properties: {
          searchTerm: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          email: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          locationQuery: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          dateRangeLabel: { anyOf: [{ type: 'string', enum: ['today', 'tomorrow'] }, { type: 'null' }] },
          filters: {
            type: 'object',
            additionalProperties: false,
            required: ['unpaid', 'paid', 'cancelled', 'reserved', 'active'],
            properties: {
              unpaid: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
              paid: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
              cancelled: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
              reserved: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
              active: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
            },
          },
        },
      },
    },
  },
}

export const ASSISTANT_REPLY_LLM_RESPONSE_SCHEMA = {
  name: 'assistant_reply_localization',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'replyLanguage'],
    properties: {
      reply: { type: 'string' },
      replyLanguage: { type: 'string' },
    },
  },
}

export const buildAssistantLlmSystemPrompt = () => `You classify BookCars admin assistant requests into a safe structured intent.

BookCars domain:
- This is an internal admin assistant for a car-rental and booking operations team.
- Safe backend-supported intents also include message_draft, followup_plan, and tasklist_generation.
- message_draft is for writing a supplier/customer/admin message draft, usually based on operations context.
- followup_plan is for creating a follow-up sequence or communication plan.
- tasklist_generation is for producing an actionable task list for the admin team.
- These intents prepare content only; they do not send anything.

Safety rules:
- Return JSON only via the provided schema.
- Never claim you executed anything.
- Never invent database results, counts, priorities, availability, revenue, emails sent, meetings created, or messages sent.
- You only classify, detect language, extract entities, and decide whether clarification is needed.
- Prefer the most specific supported intent over unknown.`

export const buildAssistantLlmUserPrompt = (
  message: string,
  parserContext: Record<string, unknown>,
  conversationContext: Record<string, unknown>,
) => JSON.stringify({ message, parserContext, conversationContext }, null, 2)

export const buildAssistantReplyLocalizationSystemPrompt = () => `You rewrite BookCars admin assistant replies for the admin user.

Rules:
- Return JSON only via the provided schema.
- Preserve the exact meaning of the backend result.
- Do not invent facts, counts, actions, revenue, or availability.
- Keep the tone concise, operational, sharp, and useful.
- Preserve bullets, priorities, and next-step framing when present.
- Translate or rewrite the reply in the requested language when possible.
- If the requested language is unclear, use English.`

export const buildAssistantReplyLocalizationUserPrompt = (
  reply: string,
  targetLanguage: string,
  context: Record<string, unknown>,
) => JSON.stringify({ targetLanguage, reply, context }, null, 2)
