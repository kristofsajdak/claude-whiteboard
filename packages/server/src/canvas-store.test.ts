import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CanvasStore } from './canvas-store.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('CanvasStore', () => {
  let store: CanvasStore
  let testDir: string

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'canvas-test-'))
    store = new CanvasStore(testDir, 'test-session')
    await store.init()
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('initializes with empty canvas', async () => {
    const canvas = await store.getCanvas()
    expect(canvas).toEqual({ elements: [] })
  })

  it('saves and retrieves canvas', async () => {
    const canvas = { elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }] }
    await store.setCanvas(canvas)
    const retrieved = await store.getCanvas()
    expect(retrieved).toEqual(canvas)
  })

  it('creates and lists savepoints', async () => {
    const canvas = { elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }] }
    await store.setCanvas(canvas)
    await store.createSavepoint('my-savepoint')

    const savepoints = await store.listSavepoints()
    expect(savepoints).toHaveLength(1)
    expect(savepoints[0].name).toBe('my-savepoint')
  })

  it('rolls back to savepoint', async () => {
    const canvas1 = { elements: [{ id: '1', type: 'rectangle', x: 0, y: 0, width: 100, height: 100 }] }
    await store.setCanvas(canvas1)
    await store.createSavepoint('before-change')

    const canvas2 = { elements: [{ id: '2', type: 'ellipse', x: 50, y: 50, width: 200, height: 200 }] }
    await store.setCanvas(canvas2)

    await store.rollback('before-change')
    const retrieved = await store.getCanvas()
    expect(retrieved).toEqual(canvas1)
  })
})
