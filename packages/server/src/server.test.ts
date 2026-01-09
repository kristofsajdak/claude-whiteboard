// packages/server/src/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from './server.js'
import type { Server } from 'http'

describe('Server', () => {
  let server: Server
  let port: number

  beforeAll(async () => {
    const result = await createServer({ port: 0 })
    server = result.server
    port = result.port
  })

  afterAll(() => {
    server.close()
  })

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${port}/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok' })
  })
})
