import { Request, Response } from 'express'
import { safeProcessAssistantMessage } from '../services/assistant/assistantService'

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
