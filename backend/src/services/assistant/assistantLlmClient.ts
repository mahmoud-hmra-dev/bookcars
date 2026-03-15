import axios from 'axios'
import * as env from '../../config/env.config'
import {
  buildAssistantLlmSystemPrompt,
  buildAssistantLlmUserPrompt,
  ASSISTANT_LLM_RESPONSE_SCHEMA,
  ASSISTANT_REPLY_LLM_RESPONSE_SCHEMA,
  buildAssistantReplyLocalizationSystemPrompt,
  buildAssistantReplyLocalizationUserPrompt,
} from './assistantPrompt'

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const postAssistantChatCompletion = async (messages: Array<{ role: 'system' | 'user', content: string }>, schema: Record<string, unknown>) => {
  const response = await axios.post<OpenAiChatCompletionResponse>('https://api.openai.com/v1/chat/completions', {
    model: env.ASSISTANT_LLM_MODEL,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: schema,
    },
    messages,
  }, {
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  })

  const content = response.data?.choices?.[0]?.message?.content
  return content ? JSON.parse(content) : null
}

export const isAssistantLlmEnabled = () => env.ASSISTANT_LLM_ENABLED && !!env.OPENAI_API_KEY

export const fetchAssistantLlmResolution = async (
  message: string,
  parserContext: Record<string, unknown>,
  conversationContext: Record<string, unknown>,
) => {
  if (!isAssistantLlmEnabled()) {
    return null
  }

  return postAssistantChatCompletion([
    {
      role: 'system',
      content: buildAssistantLlmSystemPrompt(),
    },
    {
      role: 'user',
      content: buildAssistantLlmUserPrompt(message, parserContext, conversationContext),
    },
  ], ASSISTANT_LLM_RESPONSE_SCHEMA)
}

export const localizeAssistantReply = async (
  reply: string,
  targetLanguage: string,
  context: Record<string, unknown>,
): Promise<{ reply: string, replyLanguage: string } | null> => {
  if (!isAssistantLlmEnabled()) {
    return null
  }

  return postAssistantChatCompletion([
    {
      role: 'system',
      content: buildAssistantReplyLocalizationSystemPrompt(),
    },
    {
      role: 'user',
      content: buildAssistantReplyLocalizationUserPrompt(reply, targetLanguage, context),
    },
  ], ASSISTANT_REPLY_LLM_RESPONSE_SCHEMA)
}
