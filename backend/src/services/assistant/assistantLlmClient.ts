import axios from 'axios'
import * as env from '../../config/env.config'
import { buildAssistantLlmSystemPrompt, buildAssistantLlmUserPrompt, ASSISTANT_LLM_RESPONSE_SCHEMA } from './assistantPrompt'

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export const isAssistantLlmEnabled = () => env.ASSISTANT_LLM_ENABLED && !!env.OPENAI_API_KEY

export const fetchAssistantLlmResolution = async (message: string, parserContext: Record<string, unknown>) => {
  if (!isAssistantLlmEnabled()) {
    return null
  }

  const response = await axios.post<OpenAiChatCompletionResponse>('https://api.openai.com/v1/chat/completions', {
    model: env.ASSISTANT_LLM_MODEL,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: ASSISTANT_LLM_RESPONSE_SCHEMA,
    },
    messages: [
      {
        role: 'system',
        content: buildAssistantLlmSystemPrompt(),
      },
      {
        role: 'user',
        content: buildAssistantLlmUserPrompt(message, parserContext),
      },
    ],
  }, {
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  })

  const content = response.data?.choices?.[0]?.message?.content
  return content ? JSON.parse(content) : null
}
