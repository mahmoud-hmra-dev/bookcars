import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Avatar, Box, Card, CardContent, Chip, Paper, Stack, Typography } from '@mui/material'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import AssistantChatComposer from '@/components/assistant/AssistantChatComposer'
import AssistantMessageList, { AssistantConversationMessage } from '@/components/assistant/AssistantMessageList'
import { strings } from '@/lang/assistant'
import * as AssistantService from '@/services/AssistantService'
import * as helper from '@/utils/helper'

const quickPrompts = [
  'dashboard overview',
  'bookings overview',
  'fleet overview',
  'suppliers overview',
  'customers overview',
  'risk overview',
  'revenue overview',
  'draft supplier message',
  'draft customer message',
  'draft follow-up plan',
  'draft task list',
]

const Assistant = () => {
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const canUseAssistant = useMemo(() => helper.admin(user), [user])

  useEffect(() => {
    setVoiceSupported(typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia)
    return () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const onLoad = async (_user?: bookcarsTypes.User) => setUser(_user)

  const submit = async (override?: string) => {
    const text = (override ?? message).trim()
    if (!text || loading || transcribing || recording) return

    const userMessage: AssistantConversationMessage = { id: `u-${Date.now()}`, role: 'user', text }
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setMessage('')
    setLoading(true)

    try {
      const history = nextHistory.slice(-7, -1).map((entry) => ({ role: entry.role, text: entry.text }))
      const response = await AssistantService.sendMessage(text, history)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: response.reply, response, suggestions: response.suggestions }])
    } catch (err) {
      helper.error(err)
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: strings.RETRY }])
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
    if (!audioBlob.size) return
    setTranscribing(true)

    try {
      const filename = `assistant-recording.${audioBlob.type.includes('ogg') ? 'ogg' : 'webm'}`
      const { transcript, response } = await AssistantService.sendVoiceMessage(audioBlob, filename)
      setMessages((prev) => [...prev,
        { id: `uv-${Date.now()}`, role: 'user', text: transcript, transcript, source: 'voice' },
        { id: `av-${Date.now()}`, role: 'assistant', text: response.reply, response, suggestions: response.suggestions },
      ])
    } catch (err) {
      helper.error(err)
      setMessages((prev) => [...prev, { id: `ve-${Date.now()}`, role: 'assistant', text: strings.VOICE_ERROR }])
    } finally {
      setTranscribing(false)
    }
  }

  const startRecording = async () => {
    if (!voiceSupported || loading || transcribing || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
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
          <Paper elevation={0} sx={{ p: 3, borderRadius: 5, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main' }}><SmartToyRoundedIcon /></Avatar>
                <Box>
                  <Typography variant="h4">{strings.TITLE}</Typography>
                  <Typography variant="body1" color="text.secondary">{strings.SUBTITLE}</Typography>
                  <Typography variant="body2" color="text.secondary">{strings.CHAT_HELPER}</Typography>
                </Box>
              </Stack>
              <Card variant="outlined" sx={{ minWidth: 320, borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>{strings.EXAMPLES_TITLE}</Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {quickPrompts.map((prompt) => <Chip key={prompt} label={prompt} clickable color="primary" variant="outlined" onClick={() => setMessage(prompt)} />)}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Paper>

          {!canUseAssistant ? (
            <Alert severity="warning" variant="outlined">Admin access is required to use the assistant.</Alert>
          ) : (
            <Stack spacing={2}>
              <AssistantMessageList
                messages={messages}
                loading={loading}
                transcribing={transcribing}
                onSuggestion={(text) => { setMessage(text); void submit(text) }}
                onUseText={(text) => setMessage(text)}
              />

              <AssistantChatComposer
                value={message}
                loading={loading}
                recording={recording}
                transcribing={transcribing}
                voiceSupported={voiceSupported}
                onChange={setMessage}
                onSubmit={() => { void submit() }}
                onStartRecording={() => { void startRecording() }}
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
