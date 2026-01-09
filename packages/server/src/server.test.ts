// packages/server/src/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from './server.js'
import type { Server } from 'http'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Server', () => {
  let server: Server
  let port: number
  let testDir: string

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'server-test-'))
    const result = await createServer({ port: 0, dataDir: testDir, sessionName: 'test' })
    server = result.server
    port = result.port
  })

  afterAll(async () => {
    server.close()
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${port}/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ status: 'ok' })
  })

  describe('Canvas API', () => {
    it('GET /api/canvas returns canvas state', async () => {
      const res = await fetch(`http://localhost:${port}/api/canvas`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('elements')
    })

    it('PUT /api/canvas updates canvas state', async () => {
      const canvas = { elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }] }
      const res = await fetch(`http://localhost:${port}/api/canvas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canvas)
      })
      expect(res.status).toBe(200)

      const getRes = await fetch(`http://localhost:${port}/api/canvas`)
      const data = await getRes.json()
      expect(data.elements).toHaveLength(1)
    })

    it('GET /api/savepoints returns empty list initially', async () => {
      const res = await fetch(`http://localhost:${port}/api/savepoints`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual([])
    })

    it('POST /api/savepoints creates savepoint', async () => {
      const res = await fetch(`http://localhost:${port}/api/savepoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-savepoint' })
      })
      expect(res.status).toBe(201)

      const listRes = await fetch(`http://localhost:${port}/api/savepoints`)
      const data = await listRes.json()
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('test-savepoint')
    })

    it('POST /api/savepoints/:name rolls back', async () => {
      // Set initial canvas
      await fetch(`http://localhost:${port}/api/canvas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }] })
      })

      // Create savepoint
      await fetch(`http://localhost:${port}/api/savepoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'rollback-test' })
      })

      // Modify canvas
      await fetch(`http://localhost:${port}/api/canvas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: [] })
      })

      // Rollback
      const res = await fetch(`http://localhost:${port}/api/savepoints/rollback-test`, {
        method: 'POST'
      })
      expect(res.status).toBe(200)

      // Verify
      const getRes = await fetch(`http://localhost:${port}/api/canvas`)
      const data = await getRes.json()
      expect(data.elements).toHaveLength(1)
    })
  })
})
