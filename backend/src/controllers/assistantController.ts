import { Request, Response } from 'express'
import { safeProcessAssistantMessage } from '../services/assistant/assistantService'
import { isAssistantVoiceEnabled, transcribeAssistantAudio } from '../services/assistant/assistantVoiceService'

interface AssistantMessagePayload {
  message?: string
}

export const message = async (req: Request, res: Response) => {
  const { body }: { body: AssistantMessagePayload } = req
  const text = body?.message?.trim()

  if (!text) {
    res.status(400).json({
      intent: 'unknown',
      status: 'needs_clarification',
      reply: 'Message is required.',
      suggestedActions: ['Provide a message string in the request body.'],
    })
    return
  }

  const response = await safeProcessAssistantMessage(text)
  res.json(response)
}

export const voiceMessage = async (req: Request, res: Response) => {
  const audioFile = req.file

  if (!audioFile) {
    res.status(400).json({
      intent: 'unknown',
      status: 'needs_clarification',
      reply: 'Audio file is required.',
      suggestedActions: ['Upload an audio file in the audio field.'],
    })
    return
  }

  if (!isAssistantVoiceEnabled()) {
    res.status(503).json({
      intent: 'unknown',
      status: 'error',
      reply: 'Voice transcription is not configured on the server.',
      suggestedActions: ['Set the OpenAI API key to enable voice input.'],
    })
    return
  }

  const transcript = await transcribeAssistantAudio(
    audioFile.buffer,
    audioFile.mimetype,
    audioFile.originalname,
  )

  if (!transcript) {
    res.status(400).json({
      intent: 'unknown',
      status: 'needs_clarification',
      reply: 'The audio could not be transcribed into text.',
      suggestedActions: ['Try recording a shorter and clearer voice message.'],
    })
    return
  }

  const response = await safeProcessAssistantMessage(transcript)

  res.json({
    transcript,
    response,
  })
}
