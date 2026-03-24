import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
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
  'find customer Mahmoud',
  'find car BMW',
  'available cars tomorrow in Beirut',
  'show revenue today',
  'show supplier performance',
  'show customer health',
  'show risk alerts',
  'what do you recommend now?',
  'give me an executive action plan',
  'draft a supplier message',
  'show follow-up plan',
  'generate today task list',
]

const Assistant = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const canUseAssistant = useMemo(() => helper.admin(user), [user])

  useEffect(() => {
    setVoiceSupported(typeof window !== 'undefined'
      && !!window.MediaRecorder
      && !!navigator.mediaDevices?.getUserMedia)

    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      mediaRecorderRef.current = null
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [])

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const submitMessage = async (overrideMessage?: string) => {
    const nextMessage = (overrideMessage ?? message).trim()
    if (!nextMessage || loading || transcribing || recording) {
      return
    }

    const userMessage: AssistantConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextMessage,
    }

    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setMessage('')
    setLoading(true)

    try {
      const history = nextHistory.slice(-7, -1).map((entry) => ({
        role: entry.role,
        text: entry.text,
      }))

      const response = await AssistantService.sendMessage(nextMessage, history)

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

  const stopMediaStream = () => {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    mediaRecorderRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const handleVoiceUpload = async (audioBlob: Blob) => {
    if (!audioBlob.size) {
      return
    }

    setTranscribing(true)

    try {
      const filename = `assistant-recording.${audioBlob.type.includes('ogg') ? 'ogg' : 'webm'}`
      const { transcript, response } = await AssistantService.sendVoiceMessage(audioBlob, filename)

      setMessages((prev) => ([
        ...prev,
        {
          id: `user-voice-${Date.now()}`,
          role: 'user',
          text: transcript,
          transcript,
          source: 'voice',
        },
        {
          id: `assistant-voice-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          response,
          suggestedActions: response.suggestedActions,
        },
      ]))
    } catch (err) {
      helper.error(err)
      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-voice-error-${Date.now()}`,
          role: 'assistant',
          text: strings.VOICE_ERROR,
          response: {
            intent: 'unknown',
            status: 'error',
            reply: strings.VOICE_ERROR,
            inputLanguage: 'en',
            replyLanguage: 'en',
          },
        },
      ]))
    } finally {
      setTranscribing(false)
    }
  }

  const startRecording = async () => {
    if (!voiceSupported || loading || transcribing || recording) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : undefined

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      })

      recorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        audioChunksRef.current = []
        stopMediaStream()
        setRecording(false)
        void handleVoiceUpload(audioBlob)
      })

      recorder.start()
      setRecording(true)
    } catch (err) {
      helper.error(err)
      stopMediaStream()
      setRecording(false)
      setMessages((prev) => ([
        ...prev,
        {
          id: `assistant-recording-error-${Date.now()}`,
          role: 'assistant',
          text: strings.MIC_PERMISSION_ERROR,
          response: {
            intent: 'unknown',
            status: 'error',
            reply: strings.MIC_PERMISSION_ERROR,
            inputLanguage: 'en',
            replyLanguage: 'en',
          },
        },
      ]))
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current

    if (!recorder || recorder.state === 'inactive') {
      stopMediaStream()
      setRecording(false)
      return
    }

    recorder.stop()
  }

  return (
    <Layout onLoad={onLoad} strict admin>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 5,
              border: '1px solid',
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark'
                ? 'radial-gradient(circle at top right, rgba(25,118,210,0.18), transparent 35%)'
                : 'radial-gradient(circle at top right, rgba(25,118,210,0.12), transparent 35%), #fff',
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main' }}>
                    <SmartToyRoundedIcon />
                  </Avatar>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="h4">{strings.TITLE}</Typography>
                      <Chip label={strings.CHAT_BADGE} color="primary" size="small" />
                    </Stack>
                    <Typography variant="body1" color="text.secondary">{strings.SUBTITLE}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{strings.CHAT_HELPER}</Typography>
                  </Box>
                </Stack>

                {canUseAssistant && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>{strings.EXAMPLES_TITLE}</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                      {quickExamples.map((example) => (
                        <Chip
                          key={example}
                          label={example}
                          clickable
                          color="primary"
                          variant="outlined"
                          onClick={() => setMessage(example)}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>

          {!canUseAssistant ? (
            <Alert severity="warning" variant="outlined">
              Admin access is required to use the assistant.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <AssistantMessageList
                messages={messages}
                loading={loading}
                transcribing={transcribing}
                onSuggestedActionClick={(value) => {
                  setMessage(value)
                  void submitMessage(value)
                }}
                onUseInComposer={(value) => {
                  setMessage(value)
                }}
              />

              <AssistantChatComposer
                value={message}
                loading={loading}
                recording={recording}
                transcribing={transcribing}
                voiceSupported={voiceSupported}
                onChange={setMessage}
                onSubmit={() => {
                  void submitMessage()
                }}
                onStartRecording={() => {
                  void startRecording()
                }}
                onStopRecording={stopRecording}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Layout>
  )
}

export default Assistant
