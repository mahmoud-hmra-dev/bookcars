import React from 'react'
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import MicRoundedIcon from '@mui/icons-material/MicRounded'
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded'
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
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        background: (theme) => theme.palette.mode === 'dark'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))'
          : 'linear-gradient(180deg, #ffffff, #fbfdff)',
      }}
    >
      <Stack spacing={1.25}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={8}
          label={strings.INPUT_LABEL}
          placeholder={strings.INPUT_PLACEHOLDER}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy || !!recording}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{
            '& .MuiInputBase-root': {
              px: 1,
              py: 0.5,
              fontSize: 15,
            },
          }}
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box>
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
            {!recording && !transcribing && !voiceSupported && (
              <Typography variant="body2" color="text.secondary">
                {strings.VOICE_NOT_SUPPORTED}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={!voiceSupported ? strings.VOICE_NOT_SUPPORTED : recording ? strings.STOP_RECORDING : strings.START_RECORDING}>
              <span>
                <IconButton
                  color={recording ? 'error' : 'primary'}
                  onClick={recording ? onStopRecording : onStartRecording}
                  disabled={busy || !voiceSupported}
                  sx={{
                    width: 48,
                    height: 48,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  {recording ? <StopCircleRoundedIcon /> : <MicRoundedIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <IconButton
              color="primary"
              onClick={onSubmit}
              disabled={busy || !!recording || !value.trim()}
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              {busy ? <CircularProgress color="inherit" size={20} /> : <SendRoundedIcon />}
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
}

export default AssistantChatComposer
