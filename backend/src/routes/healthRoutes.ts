import express from 'express'
import mongoose from 'mongoose'

const routes = express.Router()

routes.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'

  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    version: process.env.npm_package_version || '1.0.0',
  })
})

export default routes
