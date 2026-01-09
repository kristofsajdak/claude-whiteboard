import fs from 'fs/promises'
import path from 'path'
import type { CanvasState, Session, Savepoint } from './types.js'

export class CanvasStore {
  private baseDir: string
  private sessionName: string
  private sessionDir: string

  constructor(baseDir: string, sessionName: string) {
    this.baseDir = baseDir
    this.sessionName = sessionName
    this.sessionDir = path.join(baseDir, 'sessions', sessionName)
  }

  async init(): Promise<void> {
    await fs.mkdir(path.join(this.sessionDir, 'savepoints'), { recursive: true })

    const canvasPath = path.join(this.sessionDir, 'canvas.json')
    try {
      await fs.access(canvasPath)
    } catch {
      await fs.writeFile(canvasPath, JSON.stringify({ elements: [] }))
    }

    const sessionPath = path.join(this.sessionDir, 'session.json')
    try {
      await fs.access(sessionPath)
    } catch {
      const session: Session = {
        name: this.sessionName,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2))
    }
  }

  async getCanvas(): Promise<CanvasState> {
    const canvasPath = path.join(this.sessionDir, 'canvas.json')
    const content = await fs.readFile(canvasPath, 'utf-8')
    return JSON.parse(content)
  }

  async setCanvas(canvas: CanvasState): Promise<void> {
    const canvasPath = path.join(this.sessionDir, 'canvas.json')
    await fs.writeFile(canvasPath, JSON.stringify(canvas, null, 2))

    const sessionPath = path.join(this.sessionDir, 'session.json')
    const session = JSON.parse(await fs.readFile(sessionPath, 'utf-8')) as Session
    session.lastModified = new Date().toISOString()
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2))
  }

  async createSavepoint(name: string): Promise<void> {
    const canvas = await this.getCanvas()
    const savepointPath = path.join(this.sessionDir, 'savepoints', `${name}.json`)
    const savepoint = {
      canvas,
      timestamp: new Date().toISOString()
    }
    await fs.writeFile(savepointPath, JSON.stringify(savepoint, null, 2))
  }

  async listSavepoints(): Promise<Savepoint[]> {
    const savepointsDir = path.join(this.sessionDir, 'savepoints')
    const files = await fs.readdir(savepointsDir)
    const savepoints: Savepoint[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(savepointsDir, file), 'utf-8')
        const data = JSON.parse(content)
        savepoints.push({
          name: file.replace('.json', ''),
          timestamp: data.timestamp
        })
      }
    }

    return savepoints.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  async rollback(savepointName: string): Promise<void> {
    const savepointPath = path.join(this.sessionDir, 'savepoints', `${savepointName}.json`)
    const content = await fs.readFile(savepointPath, 'utf-8')
    const { canvas } = JSON.parse(content)
    await this.setCanvas(canvas)
  }

  async getSession(): Promise<Session> {
    const sessionPath = path.join(this.sessionDir, 'session.json')
    const content = await fs.readFile(sessionPath, 'utf-8')
    return JSON.parse(content)
  }
}
