import { MongoClient, Db, Collection } from 'mongodb'

interface RequestLog {
  tool: string
  params: Record<string, unknown>
  status: 'success' | 'error'
  response?: string
  error?: string
  duration: number
  timestamp: Date
  ip?: string
}

let db: Db | null = null
let logs: Collection<RequestLog> | null = null

export async function connectLogger(): Promise<void> {
  const uri = process.env.MCP_MONGO_URI || 'mongodb://admin:admin@mongo:27017/mcp_logs?authSource=admin'
  const client = new MongoClient(uri)
  await client.connect()
  db = client.db()
  logs = db.collection<RequestLog>('request_logs')

  // Create indexes
  await logs.createIndex({ timestamp: -1 })
  await logs.createIndex({ tool: 1 })
  await logs.createIndex({ status: 1 })
  await logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }) // TTL: 90 days

  console.error('[MCP Logger] Connected to MongoDB')
}

export async function logRequest(entry: Omit<RequestLog, 'timestamp'>): Promise<void> {
  if (!logs) return
  try {
    await logs.insertOne({ ...entry, timestamp: new Date() })
  } catch (e) {
    console.error('[MCP Logger] Failed to log:', e)
  }
}

export function getLogsCollection(): Collection<RequestLog> | null {
  return logs
}
