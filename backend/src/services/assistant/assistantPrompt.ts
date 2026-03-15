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
          'car_availability',
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
            required: ['unpaid'],
            properties: {
              unpaid: {
                anyOf: [
                  { type: 'boolean' },
                  { type: 'null' },
                ],
              },
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

Rules:
- Return JSON only via the provided schema.
- You do not execute actions, query databases, or invent results.
- Only classify and extract normalized fields for the backend to execute.
- Supported intents: booking_summary, booking_search, supplier_search, car_availability, send_email, create_meeting.
- Understand the user's request in any language.
- Use unknown when the request does not match the supported intents.
- Set needsClarification=true when required fields are missing or ambiguous.
- clarificationQuestion should be a short direct question in the same language as the user when clarification is needed, otherwise null.
- Detect the user's input language and set inputLanguage using a short BCP-47 style code when possible (examples: en, fr, ar, es).
- replyLanguage should normally match inputLanguage.
- dateRangeLabel can only be today, tomorrow, or null.
- filters.unpaid should only be set when the user explicitly asks for unpaid bookings.`

export const buildAssistantLlmUserPrompt = (message: string, parserContext: Record<string, unknown>) => JSON.stringify({
  message,
  parserContext,
}, null, 2)

export const buildAssistantReplyLocalizationSystemPrompt = () => `You rewrite BookCars admin assistant replies for the admin user.

Rules:
- Return JSON only via the provided schema.
- Preserve the exact meaning of the backend result.
- Do not invent facts, counts, actions, or availability.
- Keep the tone concise, operational, and clear.
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
