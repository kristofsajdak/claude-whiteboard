// packages/server/src/server.ts
import express from 'express'
import type { Server } from 'http'
import { CanvasStore } from './canvas-store.js'
import { createApiRouter } from './api.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

interface ServerOptions {
  port?: number
  dataDir?: string
  sessionName?: string
}

interface ServerResult {
  server: Server
  port: number
  app: express.Express
  store: CanvasStore
}

export async function createServer(options: ServerOptions = {}): Promise<ServerResult> {
  const app = express()
  app.use(express.json())

  const dataDir = options.dataDir ?? path.join(os.tmpdir(), 'claude-whiteboard')
  const sessionName = options.sessionName ?? `session-${Date.now()}`

  const store = new CanvasStore(dataDir, sessionName)
  await store.init()

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', createApiRouter(store))

  return new Promise((resolve) => {
    const server = app.listen(options.port ?? 0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, port, app, store })
    })
  })
}
