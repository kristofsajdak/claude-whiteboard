// packages/server/src/server.ts
import express from 'express'
import type { Server } from 'http'

interface ServerOptions {
  port?: number
}

interface ServerResult {
  server: Server
  port: number
  app: express.Express
}

export async function createServer(options: ServerOptions = {}): Promise<ServerResult> {
  const app = express()

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  return new Promise((resolve) => {
    const server = app.listen(options.port ?? 0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, port, app })
    })
  })
}
