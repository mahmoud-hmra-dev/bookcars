import React, { useEffect, useRef } from 'react'
import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import AssistantResult from '@/components/assistant/AssistantResult'
import { strings } from '@/lang/assistant'
import { AssistantResponse } from '@/services/AssistantService'

export interface AssistantConversationMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  transcript?: string
  source?: 'text' | 'voice'
  response?: AssistantResponse
  suggestions?: string[]
}

interface Props {
  messages: AssistantConversationMessage[]
  loading?: boolean
  transcribing?: boolean
  onSuggestion: (text: string) => void
  onUseText: (text: string) => void
}

const AssistantMessageList = ({ messages, loading, transcribing, onSuggestion, onUseText }: Props) => {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading, transcribing])

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 4, minHeight: 420, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
      <Stack spacing={2}>
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <Stack key={message.id} direction="row" spacing={1.5} justifyContent={isUser ? 'flex-end' : 'flex-start'} alignItems="flex-end">
              {!isUser && <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToyRoundedIcon fontSize="small" /></Avatar>}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, maxWidth: { xs: '100%', md: '78%' }, bgcolor: isUser ? 'primary.main' : 'background.paper', color: isUser ? 'primary.contrastText' : 'text.primary' }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                    <Typography variant="subtitle2">{isUser ? strings.YOU : strings.ASSISTANT}</Typography>
                    {isUser && message.source === 'voice' && <Chip size="small" icon={<GraphicEqRoundedIcon />} label={strings.VOICE_TRANSCRIPT} variant="outlined" />}
                  </Stack>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>
                  {!isUser && message.response && <AssistantResult response={message.response} onUseText={onUseText} />}
                  {!isUser && !!message.suggestions?.length && <Box><Typography variant="subtitle2" color="text.secondary" gutterBottom>{strings.SUGGESTED_ACTIONS}</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{message.suggestions.map((item) => <Chip key={item} label={item} clickable color="primary" variant="outlined" onClick={() => onSuggestion(item)} />)}</Stack></Box>}
                </Stack>
              </Paper>
              {isUser && <Avatar sx={{ bgcolor: 'grey.900' }}><PersonRoundedIcon fontSize="small" /></Avatar>}
            </Stack>
          )
        })}

        {(loading || transcribing) && <Typography variant="body2" color="text.secondary">{transcribing ? strings.TRANSCRIBING : strings.THINKING}</Typography>}
        <div ref={bottomRef} />
      </Stack>
    </Paper>
  )
}

export default AssistantMessageList
