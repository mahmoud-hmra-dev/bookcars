import React from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded'
import { strings } from '@/lang/assistant'
import { AssistantResponse } from '@/services/AssistantService'

interface Props {
  response: AssistantResponse
  onUseText?: (text: string) => void
}

const AssistantResult = ({ response, onUseText }: Props) => {
  const copy = async (text?: string) => {
    if (!text || !navigator?.clipboard?.writeText) return
    await navigator.clipboard.writeText(text)
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip label={`${strings.INTENT}: ${response.intent}`} size="small" color="primary" />
          <Chip label={`${strings.STATUS}: ${response.status}`} size="small" variant="outlined" />
        </Stack>
        <Typography variant="h6">{response.title}</Typography>
        <Typography variant="body2" color="text.secondary">{response.summary}</Typography>
      </Paper>

      {response.cards.map((card, index) => (
        <Card key={`${card.title}-${index}`} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1">{card.title}</Typography>

              {card.type === 'metric' && (
                <Alert severity={card.severity || 'info'} variant="outlined">
                  <strong>{String(card.value ?? '-')}</strong>
                </Alert>
              )}

              {card.type === 'decision' && (
                <Alert severity={card.severity || 'success'} variant="filled">{card.body}</Alert>
              )}

              {card.type === 'alert' && (
                <Alert severity={card.severity || 'warning'} variant="outlined">
                  <Stack>
                    {(card.items || []).map((item) => <Typography key={item} variant="body2">• {item}</Typography>)}
                  </Stack>
                </Alert>
              )}

              {card.type === 'list' && (
                <Stack spacing={0.75}>
                  {(card.items || []).map((item) => <Typography key={item} variant="body2">• {item}</Typography>)}
                </Stack>
              )}

              {card.type === 'draft' && (
                <Stack spacing={1.25}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{card.body}</Typography>
                  </Paper>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copy(card.body)}>{strings.COPY}</Button>
                    {onUseText && <Button size="small" startIcon={<EditNoteRoundedIcon />} onClick={() => onUseText(card.body || '')}>{strings.USE_IN_COMPOSER}</Button>}
                  </Stack>
                </Stack>
              )}

              {card.type === 'table' && !!card.rows?.length && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(card.rows[0]).map((key) => <TableCell key={key}>{key}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {card.rows.map((row, rowIndex) => (
                      <TableRow key={`row-${rowIndex}`}>
                        {Object.keys(card.rows?.[0] || {}).map((key) => <TableCell key={`${rowIndex}-${key}`}>{String(row[key] ?? '')}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

export default AssistantResult
