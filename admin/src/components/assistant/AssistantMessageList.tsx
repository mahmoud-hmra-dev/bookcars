import React, { useEffect, useRef } from 'react'
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
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
  suggestedActions?: string[]
}

interface AssistantMessageListProps {
  messages: AssistantConversationMessage[]
  loading?: boolean
  transcribing?: boolean
  onSuggestedActionClick: (message: string) => void
}

const AssistantMessageList = ({ messages, loading, transcribing, onSuggestedActionClick }: AssistantMessageListProps) => {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading, transcribing])

  if (messages.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 5 },
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 5,
          background: (theme) => theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at top, rgba(25,118,210,0.12), transparent 45%)'
            : 'radial-gradient(circle at top, rgba(25,118,210,0.08), transparent 48%), #fff',
        }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center" maxWidth={560}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            <SmartToyRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" gutterBottom>{strings.EMPTY_STATE_TITLE}</Typography>
            <Typography variant="body1" color="text.secondary">{strings.EMPTY_STATE_BODY}</Typography>
          </Box>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 5,
        maxHeight: 'calc(100vh - 280px)',
        overflowY: 'auto',
        backgroundColor: 'background.default',
      }}
    >
      <Stack spacing={2.5}>
        {messages.map((message) => {
          const isUser = message.role === 'user'

          return (
            <Stack
              key={message.id}
              direction="row"
              spacing={1.5}
              justifyContent={isUser ? 'flex-end' : 'flex-start'}
              alignItems="flex-end"
            >
              {!isUser && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <SmartToyRoundedIcon fontSize="small" />
                </Avatar>
              )}

              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.5,
                  maxWidth: { xs: '100%', md: '78%' },
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: isUser ? 'primary.light' : 'divider',
                  bgcolor: isUser ? 'primary.main' : 'background.paper',
                  color: isUser ? 'primary.contrastText' : 'text.primary',
                  boxShadow: isUser ? '0 10px 25px rgba(25, 118, 210, 0.18)' : '0 8px 20px rgba(15, 23, 42, 0.05)',
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="subtitle2" color={isUser ? 'inherit' : 'text.secondary'}>
                      {isUser ? strings.YOU : strings.ASSISTANT}
                    </Typography>
                    {isUser && message.source === 'voice' && (
                      <Chip
                        size="small"
                        icon={<GraphicEqRoundedIcon />}
                        variant="outlined"
                        label={strings.VOICE_TRANSCRIPT}
                        sx={{
                          color: isUser ? 'inherit' : undefined,
                          borderColor: isUser ? 'rgba(255,255,255,0.35)' : undefined,
                        }}
                      />
                    )}
                  </Stack>

                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.65 }}>
                    {message.text}
                  </Typography>

                  {!isUser && message.response && <AssistantResult response={message.response} />}

                  {!isUser && !!message.suggestedActions?.length && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="text.secondary">{strings.SUGGESTED_ACTIONS}</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {message.suggestedActions.map((action) => (
                          <Chip
                            key={action}
                            label={action}
                            clickable
                            color="primary"
                            variant="outlined"
                            onClick={() => onSuggestedActionClick(action)}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {isUser && (
                <Avatar sx={{ bgcolor: 'grey.900', width: 36, height: 36 }}>
                  <PersonRoundedIcon fontSize="small" />
                </Avatar>
              )}
            </Stack>
          )
        })}

        {(loading || transcribing) && (
          <Stack direction="row" spacing={1.5} alignItems="flex-end">
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <SmartToyRoundedIcon fontSize="small" />
            </Avatar>
            <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 4, maxWidth: 360 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">{strings.ASSISTANT}</Typography>
                <Typography variant="body2" color="text.secondary">{transcribing ? strings.TRANSCRIBING : strings.THINKING}</Typography>
                <Stack direction="row" spacing={0.75}>
                  {[0, 1, 2].map((dot) => (
                    <Box
                      key={dot}
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        opacity: 0.35 + (dot * 0.2),
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        )}

        <div ref={bottomRef} />
      </Stack>
    </Paper>
  )
}

export default AssistantMessageList
