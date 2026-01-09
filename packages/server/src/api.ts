import { Router } from 'express'
import type { CanvasStore } from './canvas-store.js'

export function createApiRouter(store: CanvasStore): Router {
  const router = Router()

  router.get('/canvas', async (req, res) => {
    try {
      const canvas = await store.getCanvas()
      res.json(canvas)
    } catch (err) {
      res.status(500).json({ error: 'Failed to get canvas' })
    }
  })

  router.put('/canvas', async (req, res) => {
    try {
      await store.setCanvas(req.body)
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to update canvas' })
    }
  })

  router.get('/savepoints', async (req, res) => {
    try {
      const savepoints = await store.listSavepoints()
      res.json(savepoints)
    } catch (err) {
      res.status(500).json({ error: 'Failed to list savepoints' })
    }
  })

  router.post('/savepoints', async (req, res) => {
    try {
      const { name } = req.body
      if (!name) {
        return res.status(400).json({ error: 'Name is required' })
      }
      await store.createSavepoint(name)
      res.status(201).json({ success: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to create savepoint' })
    }
  })

  router.post('/savepoints/:name', async (req, res) => {
    try {
      await store.rollback(req.params.name)
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: 'Failed to rollback' })
    }
  })

  return router
}
