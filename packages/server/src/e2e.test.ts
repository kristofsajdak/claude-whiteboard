// packages/server/src/e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from './server.js'
import type { Server } from 'http'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import WebSocket from 'ws'

describe('E2E', () => {
  let server: Server
  let port: number
  let testDir: string

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-test-'))
    const result = await createServer({ port: 0, dataDir: testDir, sessionName: 'e2e-test' })
    server = result.server
    port = result.port
  })

  afterAll(async () => {
    server.close()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('full workflow: connect, get, set, savepoint, rollback', async () => {
    // 1. Health check
    const healthRes = await fetch(`http://localhost:${port}/health`)
    expect(healthRes.status).toBe(200)

    // 2. Get initial empty canvas
    const getRes1 = await fetch(`http://localhost:${port}/api/canvas`)
    const canvas1 = await getRes1.json()
    expect(canvas1.elements).toEqual([])

    // 3. Set canvas with an element
    const element = { id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }
    await fetch(`http://localhost:${port}/api/canvas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements: [element] })
    })

    // 4. Create savepoint
    await fetch(`http://localhost:${port}/api/savepoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'checkpoint-1' })
    })

    // 5. Modify canvas
    await fetch(`http://localhost:${port}/api/canvas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements: [] })
    })

    // 6. Verify canvas is empty
    const getRes2 = await fetch(`http://localhost:${port}/api/canvas`)
    const canvas2 = await getRes2.json()
    expect(canvas2.elements).toEqual([])

    // 7. Rollback
    await fetch(`http://localhost:${port}/api/savepoints/checkpoint-1`, {
      method: 'POST'
    })

    // 8. Verify canvas restored
    const getRes3 = await fetch(`http://localhost:${port}/api/canvas`)
    const canvas3 = await getRes3.json()
    expect(canvas3.elements).toHaveLength(1)
    expect(canvas3.elements[0].id).toBe('1')
  })

  it('WebSocket receives updates', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`)
      let messageCount = 0

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString())
        messageCount++

        if (message.type === 'canvas:update' && messageCount === 1) {
          // Initial state received, now trigger an update via API
          fetch(`http://localhost:${port}/api/canvas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ elements: [{ id: 'ws-test', type: 'ellipse', x: 0, y: 0, width: 50, height: 50 }] })
          })
        }

        if (message.type === 'canvas:update' && messageCount > 1) {
          ws.close()
          resolve()
        }
      })

      ws.on('error', reject)

      setTimeout(() => {
        ws.close()
        reject(new Error('Timeout waiting for WebSocket update'))
      }, 5000)
    })
  })
})
