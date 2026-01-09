// packages/server/src/server.ts
import express from 'express'
import type { Server } from 'http'
import { CanvasStore } from './canvas-store.js'
import { createApiRouter } from './api.js'
import { CanvasWebSocket } from './websocket.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

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
  wss: CanvasWebSocket
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

  return new Promise((resolve) => {
    const server = app.listen(options.port ?? 0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0

      const wss = new CanvasWebSocket(server, store)

      app.use('/api', createApiRouter(store, (canvas) => wss.broadcastCanvasUpdate(canvas)))

      // Serve static files from dist/client
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      // In dev mode (src/), look for ../dist/client; in prod (dist/), look for ./client
      const clientPath = __dirname.endsWith('src')
        ? path.join(__dirname, '..', 'dist', 'client')
        : path.join(__dirname, 'client')

      app.use(express.static(clientPath))

      // SPA fallback - send index.html for all non-API routes
      app.get('*', (req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'))
      })

      resolve({ server, port, app, store, wss })
    })
  })
}
