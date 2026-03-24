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
- Safe backend-supported intents are: booking_summary, booking_search, supplier_search, customer_search, car_availability, car_search, fleet_overview, revenue_summary, supplier_performance, customer_health, risk_alerts, smart_recommendations, ops_summary, send_email, create_meeting.
- supplier_performance is for ranking suppliers, weak suppliers, top suppliers, activity quality, or operational performance.
- customer_health is for customer quality, blacklisted users, inactive verified users, risky customer clusters, or follow-up opportunities.
- risk_alerts is for urgent operational risks, anomalies, bottlenecks, cancellations, unpaid pressure, or fleet constraints.
- smart_recommendations is for “what should we do now”, next best actions, concrete recommendations, or management suggestions.
- ops_summary is for broad operational overviews when no narrower analytical intent is clearly best.
- send_email and create_meeting are intent captures only. They are not executed by the LLM.

Safety rules:
- Return JSON only via the provided schema.
- Never claim you executed anything.
- Never invent database results, counts, priorities, availability, revenue, emails sent, or meetings created.
- You only classify, detect language, extract entities, and decide whether clarification is needed.
- Prefer a safe supported intent over unknown when the request can be served by backend tools.
- If the user asks an analytical/open question, choose the most specific supported analytical intent instead of unknown.

Clarification rules:
- Ask for clarification only when the backend truly needs a missing field to execute safely.
- Do not ask unnecessary clarification for analytical intents if a useful answer can still be produced.
- clarificationQuestion must be short, direct, and in the user's language.

Conversation rules:
- Use recent history for follow-ups and pronouns like "those", "them", "same city", or "what about tomorrow".
- Prefer the latest explicit user instruction when history conflicts.
- If history resolves the ambiguity, set needsClarification=false.

Language rules:
- Understand mixed English/French/Arabic/Spanish input.
- Detect inputLanguage using a short BCP-47 style code when possible.
- replyLanguage should normally match the user's latest language unless history clearly indicates they want another language.

Extraction rules:
- dateRangeLabel can only be today, tomorrow, or null.
- filters should only be set when the user explicitly asks for them or clearly implies them from context.`

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
