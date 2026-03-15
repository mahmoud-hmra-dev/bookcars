export const ASSISTANT_LLM_RESPONSE_SCHEMA = {
  name: 'assistant_intent_resolution',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['intent', 'needsClarification', 'clarificationQuestion', 'confidence', 'entities'],
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

export const buildAssistantLlmSystemPrompt = () => `You classify BookCars admin assistant requests into a safe structured intent.

Rules:
- Return JSON only via the provided schema.
- You do not execute actions, query databases, or invent results.
- Only classify and extract normalized fields for the backend to execute.
- Supported intents: booking_summary, booking_search, supplier_search, car_availability, send_email, create_meeting.
- Use unknown when the request does not match the supported intents.
- Set needsClarification=true when required fields are missing or ambiguous.
- clarificationQuestion should be a short direct question when clarification is needed, otherwise null.
- dateRangeLabel can only be today, tomorrow, or null.
- filters.unpaid should only be set when the user explicitly asks for unpaid bookings.`

export const buildAssistantLlmUserPrompt = (message: string, parserContext: Record<string, unknown>) => JSON.stringify({
  message,
  parserContext,
}, null, 2)
