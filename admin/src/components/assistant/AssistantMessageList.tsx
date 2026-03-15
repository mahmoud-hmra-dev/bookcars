import React from 'react'
import {
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
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
  onSuggestedActionClick: (message: string) => void
}

const AssistantMessageList = ({ messages, onSuggestedActionClick }: AssistantMessageListProps) => {
  if (messages.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <Typography variant="h6" gutterBottom>{strings.EMPTY_STATE_TITLE}</Typography>
          <Typography variant="body2" color="text.secondary">{strings.EMPTY_STATE_BODY}</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Stack spacing={2}>
      {messages.map((message) => {
        const isUser = message.role === 'user'

        return (
          <Paper
            key={message.id}
            variant="outlined"
            sx={{
              p: 2,
              ml: isUser ? { xs: 0, md: 6 } : 0,
              mr: isUser ? 0 : { xs: 0, md: 6 },
              bgcolor: isUser ? 'grey.100' : 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" color="text.secondary">
                  {isUser ? strings.YOU : strings.ASSISTANT}
                </Typography>
                {isUser && message.source === 'voice' && (
                  <Chip size="small" variant="outlined" label={strings.VOICE_TRANSCRIPT} />
                )}
              </Stack>

              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.text}
              </Typography>

              {!isUser && message.response && <AssistantResult response={message.response} />}

              {!isUser && !!message.suggestedActions?.length && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>{strings.SUGGESTED_ACTIONS}</Typography>
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
        )
      })}
    </Stack>
  )
}

export default AssistantMessageList
