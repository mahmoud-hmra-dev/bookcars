import React from 'react'
import {
  Alert,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { strings } from '@/lang/assistant'
import { AssistantResponse } from '@/services/AssistantService'

interface AssistantResultProps {
  response: AssistantResponse
}

const isPrimitive = (value: unknown) => value === null || ['string', 'number', 'boolean'].includes(typeof value)

const formatLabel = (value: string) => value
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, (char) => char.toUpperCase())

const formatPrimitive = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'string') {
    const parsedDate = Date.parse(value)
    if (!Number.isNaN(parsedDate) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(parsedDate).toLocaleString()
    }
  }

  return String(value)
}

const renderArray = (items: unknown[], depth: number): React.ReactNode => {
  if (items.length === 0) {
    return <Typography variant="body2">[]</Typography>
  }

  if (items.every((item) => isPrimitive(item))) {
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {items.map((item, index) => (
          <Chip key={`${String(item)}-${index}`} label={formatPrimitive(item)} size="small" variant="outlined" />
        ))}
      </Stack>
    )
  }

  if (items.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
    const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item as Record<string, unknown>))))

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {keys.map((key) => (
                <TableCell key={key}>{formatLabel(key)}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => {
              const record = item as Record<string, unknown>

              return (
                <TableRow key={`row-${index}`}>
                  {keys.map((key) => {
                    const cellValue = record[key]

                    return (
                      <TableCell key={`${index}-${key}`} sx={{ verticalAlign: 'top' }}>
                        {isPrimitive(cellValue)
                          ? formatPrimitive(cellValue)
                          : renderValue(cellValue, depth + 1)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  return (
    <List dense disablePadding>
      {items.map((item, index) => (
        <ListItem key={`item-${index}`} disableGutters sx={{ display: 'list-item', pl: 2 }}>
          {renderValue(item, depth + 1)}
        </ListItem>
      ))}
    </List>
  )
}

const renderObject = (value: Record<string, unknown>, depth: number): React.ReactNode => {
  const entries = Object.entries(value)

  if (entries.length === 0) {
    return <Typography variant="body2">{'{}'}</Typography>
  }

  return (
    <Stack spacing={1.5} divider={<Divider flexItem />}>
      {entries.map(([key, entryValue]) => (
        <Box key={`${depth}-${key}`}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {formatLabel(key)}
          </Typography>
          {renderValue(entryValue, depth + 1)}
        </Box>
      ))}
    </Stack>
  )
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (isPrimitive(value)) {
    return <Typography variant="body2">{formatPrimitive(value)}</Typography>
  }

  if (Array.isArray(value)) {
    return renderArray(value, depth)
  }

  if (value && typeof value === 'object') {
    return renderObject(value as Record<string, unknown>, depth)
  }

  return <Typography variant="body2">-</Typography>
}

const getSeverity = (status: AssistantResponse['status']) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'needs_clarification':
      return 'warning'
    default:
      return 'error'
  }
}

const AssistantResult = ({ response }: AssistantResultProps) => (
  <Stack spacing={2}>
    <Alert severity={getSeverity(response.status)} variant="outlined">
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip label={`${strings.INTENT}: ${response.intent}`} size="small" />
        <Chip label={`${strings.STATUS}: ${response.status}`} size="small" variant="outlined" />
      </Stack>
      <Typography variant="body2">{response.reply}</Typography>
    </Alert>

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        {strings.RESULT}
      </Typography>
      {response.data ? renderValue(response.data) : <Typography variant="body2">{strings.NO_RESULT}</Typography>}
    </Paper>
  </Stack>
)

export default AssistantResult
