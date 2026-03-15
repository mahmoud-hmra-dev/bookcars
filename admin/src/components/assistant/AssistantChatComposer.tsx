import React from 'react'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import MicIcon from '@mui/icons-material/Mic'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import { strings } from '@/lang/assistant'

interface AssistantChatComposerProps {
  value: string
  loading?: boolean
  recording?: boolean
  transcribing?: boolean
  voiceSupported?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const AssistantChatComposer = ({
  value,
  loading,
  recording,
  transcribing,
  voiceSupported,
  onChange,
  onSubmit,
  onStartRecording,
  onStopRecording,
}: AssistantChatComposerProps) => {
  const busy = !!loading || !!transcribing

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <Box>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            label={strings.INPUT_LABEL}
            placeholder={strings.INPUT_PLACEHOLDER}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy || !!recording}
          />

          <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
            <Tooltip title={!voiceSupported ? strings.VOICE_NOT_SUPPORTED : recording ? strings.STOP_RECORDING : strings.START_RECORDING}>
              <span>
                <IconButton
                  color={recording ? 'error' : 'primary'}
                  onClick={recording ? onStopRecording : onStartRecording}
                  disabled={busy || !voiceSupported}
                  sx={{ width: 56, height: 56, border: 1, borderColor: 'divider' }}
                >
                  {recording ? <StopCircleIcon /> : <MicIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Button
              variant="contained"
              className="btn-primary"
              startIcon={busy ? <CircularProgress color="inherit" size={16} /> : <SendIcon />}
              onClick={onSubmit}
              disabled={busy || !!recording || !value.trim()}
              sx={{ minWidth: 150, height: 56 }}
            >
              {busy ? strings.LOADING : strings.SEND}
            </Button>
          </Stack>
        </Stack>

        {recording && (
          <Typography variant="body2" color="error.main">
            {strings.RECORDING}
          </Typography>
        )}

        {!recording && transcribing && (
          <Typography variant="body2" color="text.secondary">
            {strings.TRANSCRIBING}
          </Typography>
        )}

        {!voiceSupported && (
          <Typography variant="body2" color="text.secondary">
            {strings.VOICE_NOT_SUPPORTED}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

export default AssistantChatComposer
