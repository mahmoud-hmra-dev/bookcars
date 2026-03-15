import * as env from '../../config/env.config'

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions'
const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'

export const isAssistantVoiceEnabled = () => !!env.OPENAI_API_KEY

export const transcribeAssistantAudio = async (
  buffer: Buffer,
  mimetype: string,
  filename: string,
): Promise<string> => {
  if (!isAssistantVoiceEnabled()) {
    throw new Error('Assistant voice transcription is not configured.')
  }

  const formData = new FormData()
  const bytes = new Uint8Array(buffer)
  const blob = new Blob([bytes], { type: mimetype || 'application/octet-stream' })

  formData.append('file', blob, filename || 'assistant-recording.webm')
  formData.append('model', DEFAULT_TRANSCRIPTION_MODEL)
  formData.append('response_format', 'json')

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI transcription failed: ${response.status} ${errorText}`)
  }

  const data = await response.json() as { text?: string }
  return data.text?.trim() || ''
}
