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
        type: 'string',
      },
      entities: {
        type: 'object',
        additionalProperties: false,
        required: ['searchTerm', 'email', 'locationQuery', 'dateRangeLabel', 'filters'],
        properties: {
          searchTerm: {
            anyOf: [
              { type: 'string' },
              { type: 'null' },
            ],
          },
          email: {
            anyOf: [
              { type: 'string' },
              { type: 'null' },
            ],
          },
          locationQuery: {
            anyOf: [
              { type: 'string' },
              { type: 'null' },
            ],
          },
          dateRangeLabel: {
            anyOf: [
              { type: 'string', enum: ['today', 'tomorrow'] },
              { type: 'null' },
            ],
          },
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
- Safe backend-supported intents are: booking_summary, booking_search, supplier_search, customer_search, car_availability, car_search, fleet_overview, revenue_summary, supplier_performance, customer_health, risk_alerts, smart_recommendations, executive_decision_support, ops_summary, send_email, create_meeting.
- executive_decision_support is for questions like: what should management do now, give me an action plan, summarize the situation and tell me the best next move, or connect all current signals into one recommendation.

Safety rules:
- Return JSON only via the provided schema.
- Never claim you executed anything.
- Never invent database results, counts, priorities, availability, revenue, emails sent, or meetings created.
- You only classify, detect language, extract entities, and decide whether clarification is needed.
- Prefer the most specific supported analytical intent over unknown.

Clarification rules:
- Ask for clarification only when the backend truly needs a missing field to execute safely.
- Do not ask unnecessary clarification for analytical intents if a useful answer can still be produced.
- clarificationQuestion must be short, direct, and in the user's language.`

export const buildAssistantLlmUserPrompt = (
  message: string,
  parserContext: Record<string, unknown>,
  conversationContext: Record<string, unknown>,
) => JSON.stringify({
  message,
  parserContext,
  conversationContext,
}, null, 2)

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
) => JSON.stringify({
  targetLanguage,
  reply,
  context,
}, null, 2)
