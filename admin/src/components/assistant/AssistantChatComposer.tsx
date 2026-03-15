import React from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { strings } from '@/lang/assistant'

interface AssistantChatComposerProps {
  value: string
  loading?: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

const AssistantChatComposer = ({
  value,
  loading,
  onChange,
  onSubmit,
}: AssistantChatComposerProps) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <Box>
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
          disabled={loading}
        />
        <Button
          variant="contained"
          className="btn-primary"
          startIcon={loading ? <CircularProgress color="inherit" size={16} /> : <SendIcon />}
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          sx={{ minWidth: 150, height: 56 }}
        >
          {loading ? strings.LOADING : strings.SEND}
        </Button>
      </Stack>
    </Box>
  )
}

export default AssistantChatComposer
