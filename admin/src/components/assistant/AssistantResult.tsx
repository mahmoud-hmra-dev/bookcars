import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
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
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  if (typeof value === 'string') {
    const parsedDate = Date.parse(value)
    if (!Number.isNaN(parsedDate) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(parsedDate).toLocaleString()
    }
  }

  return String(value)
}

const renderArray = (items: unknown[], depth: number): React.ReactNode => {
  if (items.length === 0) return <Typography variant="body2">[]</Typography>

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
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 'none' }}>
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
                        {isPrimitive(cellValue) ? formatPrimitive(cellValue) : renderValue(cellValue, depth + 1)}
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
  if (entries.length === 0) return <Typography variant="body2">{'{}'}</Typography>

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
  if (isPrimitive(value)) return <Typography variant="body2">{formatPrimitive(value)}</Typography>
  if (Array.isArray(value)) return renderArray(value, depth)
  if (value && typeof value === 'object') return renderObject(value as Record<string, unknown>, depth)
  return <Typography variant="body2">-</Typography>
}

const getStatusTone = (status: AssistantResponse['status']) => {
  switch (status) {
    case 'success':
      return { bg: 'success.50', border: 'success.light', chip: 'success' as const }
    case 'needs_clarification':
      return { bg: 'warning.50', border: 'warning.light', chip: 'warning' as const }
    default:
      return { bg: 'error.50', border: 'error.light', chip: 'error' as const }
  }
}

const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const asRecordArray = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)) : []

const AssistantResult = ({ response }: AssistantResultProps) => {
  const tone = getStatusTone(response.status)
  const data = response.data || {}
  const [copied, setCopied] = useState<string>('')

  const executiveSummary = typeof data.executiveSummary === 'string' ? data.executiveSummary : undefined
  const topDecision = typeof data.topDecision === 'string' ? data.topDecision : undefined
  const actionPlan = asStringArray(data.actionPlan)
  const reasons = asStringArray(data.reasons)
  const observations = asStringArray(data.observations)
  const recommendations = asStringArray(data.recommendations)
  const alerts = asRecordArray(data.alerts)
  const tasks = asRecordArray(data.tasks)
  const followupPlan = asRecordArray(data.followupPlan)
  const draft = typeof data.draft === 'string' ? data.draft : undefined
  const draftSubject = typeof data.subject === 'string' ? data.subject : undefined
  const metrics = data.metrics && typeof data.metrics === 'object' ? data.metrics as Record<string, unknown> : undefined

  const copyText = async (key: string, text?: string) => {
    if (!text || !navigator?.clipboard?.writeText) return
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1800)
  }

  const metricsEntries = useMemo(() => metrics ? Object.entries(metrics) : [], [metrics])

  return (
    <Stack spacing={1.25}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 3,
          bgcolor: tone.bg,
          borderColor: tone.border,
          boxShadow: 'none',
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip label={`${strings.INTENT}: ${response.intent}`} size="small" color={tone.chip} />
          <Chip label={`${strings.STATUS}: ${response.status}`} size="small" variant="outlined" />
          <Chip label={`${strings.LANGUAGE}: ${response.replyLanguage}`} size="small" variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {strings.STRUCTURED_RESULT}
        </Typography>
      </Paper>

      {(executiveSummary || topDecision) && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">{strings.COPILOT_BRIEF}</Typography>
              </Stack>
              {executiveSummary && <Alert severity="info" variant="outlined">{executiveSummary}</Alert>}
              {topDecision && <Alert severity="success" icon={<CheckCircleRoundedIcon />} variant="filled">{topDecision}</Alert>}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!!metricsEntries.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>{strings.KEY_METRICS}</Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {metricsEntries.map(([key, value]) => (
                <Chip key={key} label={`${formatLabel(key)}: ${formatPrimitive(value)}`} color="primary" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!!alerts.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningAmberRoundedIcon color="warning" fontSize="small" />
                <Typography variant="subtitle1">{strings.RISK_ALERTS_TITLE}</Typography>
              </Stack>
              {alerts.map((alert, index) => (
                <Alert key={`alert-${index}`} severity={(alert.severity as 'error' | 'warning' | 'info') === 'high' ? 'error' : (alert.severity as 'error' | 'warning' | 'info') === 'medium' ? 'warning' : 'info'} variant="outlined">
                  <strong>{String(alert.label || `Alert ${index + 1}`)}</strong>
                  {alert.note ? ` — ${String(alert.note)}` : ''}
                  {typeof alert.value !== 'undefined' ? ` (${formatPrimitive(alert.value)})` : ''}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!!observations.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>{strings.OBSERVATIONS}</Typography>
            <List dense>
              {observations.map((item, index) => <ListItem key={`obs-${index}`} sx={{ display: 'list-item', pl: 2 }}>{item}</ListItem>)}
            </List>
          </CardContent>
        </Card>
      )}

      {!!reasons.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>{strings.REASONS}</Typography>
            <List dense>
              {reasons.map((item, index) => <ListItem key={`reason-${index}`} sx={{ display: 'list-item', pl: 2 }}>{item}</ListItem>)}
            </List>
          </CardContent>
        </Card>
      )}

      {!!actionPlan.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>{strings.ACTION_PLAN}</Typography>
            <List dense>
              {actionPlan.map((item, index) => <ListItem key={`plan-${index}`} sx={{ display: 'list-item', pl: 2 }}>{item}</ListItem>)}
            </List>
          </CardContent>
        </Card>
      )}

      {!!recommendations.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>{strings.RECOMMENDATIONS}</Typography>
            <List dense>
              {recommendations.map((item, index) => <ListItem key={`rec-${index}`} sx={{ display: 'list-item', pl: 2 }}>{item}</ListItem>)}
            </List>
          </CardContent>
        </Card>
      )}

      {!!tasks.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AssignmentTurnedInRoundedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1">{strings.TASK_LIST}</Typography>
              </Stack>
              <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copyText('tasks', tasks.map((task) => `- ${String(task.task || '')} [${String(task.priority || '')}]`).join('\n'))}>
                {copied === 'tasks' ? strings.COPIED : strings.COPY}
              </Button>
            </Stack>
            {renderValue(tasks)}
          </CardContent>
        </Card>
      )}

      {!!followupPlan.length && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle1">{strings.FOLLOWUP_PLAN}</Typography>
              <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copyText('followup', followupPlan.map((step) => `${String(step.step || '')}. ${String(step.action || '')}`).join('\n'))}>
                {copied === 'followup' ? strings.COPIED : strings.COPY}
              </Button>
            </Stack>
            {renderValue(followupPlan)}
          </CardContent>
        </Card>
      )}

      {draft && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle1">{strings.MESSAGE_DRAFT}</Typography>
              <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => copyText('draft', `${draftSubject ? `${draftSubject}\n\n` : ''}${draft}`)}>
                {copied === 'draft' ? strings.COPIED : strings.COPY}
              </Button>
            </Stack>
            {draftSubject && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>{strings.SUBJECT}:</strong> {draftSubject}
              </Typography>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{draft}</Typography>
            </Paper>
          </CardContent>
        </Card>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, boxShadow: 'none' }}>
        <Typography variant="subtitle1" gutterBottom>{strings.RESULT}</Typography>
        {response.data ? renderValue(response.data) : <Typography variant="body2">{strings.NO_RESULT}</Typography>}
      </Paper>
    </Stack>
  )
}

export default AssistantResult
