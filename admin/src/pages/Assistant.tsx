import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import AssistantChatComposer from '@/components/assistant/AssistantChatComposer'
import AssistantMessageList, { AssistantConversationMessage } from '@/components/assistant/AssistantMessageList'
import { strings } from '@/lang/assistant'
import * as AssistantService from '@/services/AssistantService'
import * as helper from '@/utils/helper'

const quickExamples = [
  'show unpaid bookings today',
  'find booking Mahmoud',
  'find supplier Youssef',
  'available cars tomorrow in Beirut',
]

const Assistant = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([])

  const canUseAssistant = useMemo(() => helper.admin(user), [user])

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const submitMessage = async (overrideMessage?: string) => {
    const nextMessage = (overrideMessage ?? message).trim()
    if (!nextMessage || loading) {
      return
    }

    const userMessage: AssistantConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextMessage,
    }

    setMessages((prev) => [...prev, userMessage])
    setMessage('')
    setLoading(true)

    try {
      const response = await AssistantService.sendMessage(nextMessage)

      const assistantMessage: AssistantConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
        response,
        suggestedActions: response.suggestedActions,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      helper.error(err)
      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: strings.RETRY,
          response: {
            intent: 'unknown',
            status: 'error',
            reply: strings.RETRY,
            inputLanguage: 'en',
            replyLanguage: 'en',
          },
        },
      ]))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict admin>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Paper elevation={10} sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <SmartToyIcon color="primary" />
                <div>
                  <Typography variant="h5">{strings.TITLE}</Typography>
                  <Typography variant="body2" color="text.secondary">{strings.SUBTITLE}</Typography>
                </div>
              </Stack>

              {canUseAssistant && (
                <>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>{strings.EXAMPLES_TITLE}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {quickExamples.map((example) => (
                        <Chip
                          key={example}
                          label={example}
                          clickable
                          color="primary"
                          variant="outlined"
                          onClick={() => {
                            setMessage(example)
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <AssistantChatComposer
                    value={message}
                    loading={loading}
                    onChange={setMessage}
                    onSubmit={() => {
                      void submitMessage()
                    }}
                  />
                </>
              )}
            </Stack>
          </Paper>

          {!canUseAssistant ? (
            <Alert severity="warning" variant="outlined">
              Admin access is required to use the assistant.
            </Alert>
          ) : (
            <AssistantMessageList
              messages={messages}
              onSuggestedActionClick={(value) => {
                setMessage(value)
                void submitMessage(value)
              }}
            />
          )}
        </Stack>
      </Box>
    </Layout>
  )
}

export default Assistant
