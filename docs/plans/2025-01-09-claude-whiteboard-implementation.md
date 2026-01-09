# Claude Whiteboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a collaborative AI-powered whiteboard with a canvas server (Excalidraw + REST API) and an MCP server for Claude Code integration.

**Architecture:** Two npm packages - `claude-whiteboard-server` hosts the canvas with real-time sync via WebSocket, and `claude-whiteboard-mcp` provides tools for Claude Code to interact with the canvas. The server persists state to disk; the MCP server is stateless except for the connected URL.

**Tech Stack:** Node.js, TypeScript, Express, WebSocket (ws), React, Vite, Excalidraw, @modelcontextprotocol/sdk, @ngrok/ngrok

---

## Phase 1: Project Setup

### Task 1: Initialize monorepo structure

**Files:**
- Create: `package.json`
- Create: `packages/server/package.json`
- Create: `packages/mcp/package.json`
- Create: `tsconfig.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/mcp/tsconfig.json`

**Step 1: Create root package.json for monorepo**

```json
{
  "name": "claude-whiteboard",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev:server": "npm run dev --workspace=packages/server",
    "dev:mcp": "npm run dev --workspace=packages/mcp"
  }
}
```

**Step 2: Create server package.json**

```json
{
  "name": "claude-whiteboard-server",
  "version": "0.1.0",
  "description": "Collaborative whiteboard server with Excalidraw",
  "main": "dist/index.js",
  "bin": {
    "claude-whiteboard-server": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc && vite build",
    "dev": "tsx watch src/cli.ts",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0",
    "@ngrok/ngrok": "^1.0.0",
    "commander": "^11.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.10",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vitest": "^1.2.0"
  }
}
```

**Step 3: Create mcp package.json**

```json
{
  "name": "claude-whiteboard-mcp",
  "version": "0.1.0",
  "description": "MCP server for Claude Code whiteboard integration",
  "main": "dist/index.js",
  "bin": {
    "claude-whiteboard-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0"
  }
}
```

**Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true
  }
}
```

**Step 5: Create server tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 6: Create mcp tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 7: Install dependencies**

Run: `npm install`

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo with server and mcp packages"
```

---

## Phase 2: Canvas Server - Core API

### Task 2: Create Express server with health endpoint

**Files:**
- Create: `packages/server/src/server.ts`
- Create: `packages/server/src/server.test.ts`

**Step 1: Write failing test**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/server.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/server.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/server/src/server.ts packages/server/src/server.test.ts
git commit -m "feat(server): add express server with health endpoint"
```

---

### Task 3: Add canvas state management

**Files:**
- Create: `packages/server/src/canvas-store.ts`
- Create: `packages/server/src/canvas-store.test.ts`
- Create: `packages/server/src/types.ts`

**Step 1: Create types file**

```typescript
// packages/server/src/types.ts
export interface ExcalidrawElement {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  [key: string]: unknown
}

export interface CanvasState {
  elements: ExcalidrawElement[]
  appState?: Record<string, unknown>
}

export interface Session {
  name: string
  created: string
  lastModified: string
}

export interface Savepoint {
  name: string
  timestamp: string
}
```

**Step 2: Write failing test for canvas store**

```typescript
// packages/server/src/canvas-store.test.ts
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
```

**Step 3: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/canvas-store.test.ts`
Expected: FAIL - module not found

**Step 4: Write implementation**

```typescript
// packages/server/src/canvas-store.ts
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
```

**Step 5: Run test to verify it passes**

Run: `cd packages/server && npx vitest run src/canvas-store.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/server/src/types.ts packages/server/src/canvas-store.ts packages/server/src/canvas-store.test.ts
git commit -m "feat(server): add canvas store with persistence and savepoints"
```

---

### Task 4: Add REST API endpoints

**Files:**
- Modify: `packages/server/src/server.ts`
- Create: `packages/server/src/api.ts`
- Modify: `packages/server/src/server.test.ts`

**Step 1: Add failing tests for API endpoints**

```typescript
// Add to packages/server/src/server.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/server && npx vitest run src/server.test.ts`
Expected: FAIL - 404 on /api/canvas

**Step 3: Create API router**

```typescript
// packages/server/src/api.ts
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
```

**Step 4: Update server to use API router**

```typescript
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
```

**Step 5: Update test setup to use temp directory**

```typescript
// packages/server/src/server.test.ts - update beforeAll
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
  // ... rest of tests
})
```

**Step 6: Run tests to verify they pass**

Run: `cd packages/server && npx vitest run src/server.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/server/src/api.ts packages/server/src/server.ts packages/server/src/server.test.ts
git commit -m "feat(server): add REST API for canvas and savepoints"
```

---

### Task 5: Add WebSocket support for real-time sync

**Files:**
- Create: `packages/server/src/websocket.ts`
- Modify: `packages/server/src/server.ts`

**Step 1: Create WebSocket handler**

```typescript
// packages/server/src/websocket.ts
import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { CanvasStore } from './canvas-store.js'
import type { CanvasState } from './types.js'

interface Client {
  ws: WebSocket
  name?: string
}

export class CanvasWebSocket {
  private wss: WebSocketServer
  private clients: Set<Client> = new Set()
  private store: CanvasStore

  constructor(server: Server, store: CanvasStore) {
    this.store = store
    this.wss = new WebSocketServer({ server })

    this.wss.on('connection', (ws) => {
      const client: Client = { ws }
      this.clients.add(client)

      // Send current canvas state on connect
      this.store.getCanvas().then((canvas) => {
        ws.send(JSON.stringify({ type: 'canvas:update', payload: canvas }))
      })

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString())
          await this.handleMessage(client, message)
        } catch (err) {
          console.error('WebSocket message error:', err)
        }
      })

      ws.on('close', () => {
        this.clients.delete(client)
        this.broadcastParticipantCount()
      })

      this.broadcastParticipantCount()
    })
  }

  private async handleMessage(client: Client, message: { type: string; payload?: unknown }) {
    switch (message.type) {
      case 'canvas:change':
        await this.store.setCanvas(message.payload as CanvasState)
        this.broadcast({ type: 'canvas:update', payload: message.payload }, client.ws)
        break
      case 'client:name':
        client.name = message.payload as string
        this.broadcastParticipantCount()
        break
    }
  }

  private broadcast(message: object, exclude?: WebSocket) {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
      if (client.ws !== exclude && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data)
      }
    }
  }

  broadcastCanvasUpdate(canvas: CanvasState) {
    this.broadcast({ type: 'canvas:update', payload: canvas })
  }

  private broadcastParticipantCount() {
    this.broadcast({
      type: 'participants:update',
      payload: { count: this.clients.size }
    })
  }

  getParticipantCount(): number {
    return this.clients.size
  }
}
```

**Step 2: Update server to include WebSocket**

```typescript
// packages/server/src/server.ts - add import and update result
import { CanvasWebSocket } from './websocket.js'

interface ServerResult {
  server: Server
  port: number
  app: express.Express
  store: CanvasStore
  wss: CanvasWebSocket
}

// In createServer, after app.use('/api', ...) add:
  const wss = new CanvasWebSocket(server, store)

// Update return to include wss:
  resolve({ server, port, app, store, wss })
```

**Step 3: Update API to broadcast changes**

```typescript
// packages/server/src/api.ts - update createApiRouter signature
export function createApiRouter(store: CanvasStore, broadcast?: (canvas: CanvasState) => void): Router {

// In PUT /canvas handler, after setCanvas:
      if (broadcast) {
        const canvas = await store.getCanvas()
        broadcast(canvas)
      }

// In POST /savepoints/:name handler, after rollback:
      if (broadcast) {
        const canvas = await store.getCanvas()
        broadcast(canvas)
      }
```

**Step 4: Wire up broadcast in server.ts**

```typescript
// In createServer:
  app.use('/api', createApiRouter(store, (canvas) => wss.broadcastCanvasUpdate(canvas)))
```

**Step 5: Commit**

```bash
git add packages/server/src/websocket.ts packages/server/src/server.ts packages/server/src/api.ts
git commit -m "feat(server): add WebSocket for real-time canvas sync"
```

---

## Phase 3: Frontend

### Task 6: Set up Vite React frontend

**Files:**
- Create: `packages/server/vite.config.ts`
- Create: `packages/server/index.html`
- Create: `packages/server/src/client/main.tsx`
- Create: `packages/server/src/client/App.tsx`

**Step 1: Create vite.config.ts**

```typescript
// packages/server/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  build: {
    outDir: 'dist/client',
    emptyDirOnBuild: true
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
})
```

**Step 2: Create index.html**

```html
<!-- packages/server/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Whiteboard</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #root { height: 100%; width: 100%; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

**Step 3: Create main.tsx**

```tsx
// packages/server/src/client/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 4: Create App.tsx**

```tsx
// packages/server/src/client/App.tsx
import React from 'react'

export default function App() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px' }}>Claude Whiteboard</h1>
        <div>
          <button style={{ marginRight: '8px' }}>Savepoint</button>
          <button>Undo</button>
        </div>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Excalidraw canvas will go here</p>
      </main>
      <footer style={{ padding: '8px 16px', borderTop: '1px solid #ddd', fontSize: '12px' }}>
        Session: loading... | Participants: 0
      </footer>
    </div>
  )
}
```

**Step 5: Add React dependencies to package.json**

```json
// Add to packages/server/package.json dependencies:
  "react": "^18.2.0",
  "react-dom": "^18.2.0"

// Add to devDependencies:
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0"
```

**Step 6: Run npm install and verify build**

Run: `cd packages/server && npm install && npx vite build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add packages/server/vite.config.ts packages/server/index.html packages/server/src/client packages/server/package.json
git commit -m "feat(server): add Vite React frontend scaffold"
```

---

### Task 7: Integrate Excalidraw component

**Files:**
- Modify: `packages/server/package.json`
- Create: `packages/server/src/client/hooks/useCanvas.ts`
- Modify: `packages/server/src/client/App.tsx`

**Step 1: Add Excalidraw dependency**

```json
// Add to packages/server/package.json dependencies:
  "@excalidraw/excalidraw": "^0.17.0"
```

**Step 2: Create useCanvas hook**

```typescript
// packages/server/src/client/hooks/useCanvas.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

interface CanvasState {
  elements: ExcalidrawElement[]
}

interface UseCanvasReturn {
  elements: ExcalidrawElement[]
  participantCount: number
  sessionName: string
  onChange: (elements: ExcalidrawElement[]) => void
  onSavepoint: (name: string) => Promise<void>
  onUndo: () => Promise<void>
}

export function useCanvas(): UseCanvasReturn {
  const [elements, setElements] = useState<ExcalidrawElement[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [sessionName, setSessionName] = useState('loading...')
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'canvas:update':
          setElements(message.payload.elements || [])
          break
        case 'participants:update':
          setParticipantCount(message.payload.count)
          break
      }
    }

    // Fetch session info
    fetch('/api/session')
      .then(res => res.json())
      .then(data => setSessionName(data.name))
      .catch(() => {})

    return () => {
      ws.close()
    }
  }, [])

  const onChange = useCallback((newElements: ExcalidrawElement[]) => {
    setElements(newElements)

    // Debounce WebSocket sends
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'canvas:change',
          payload: { elements: newElements }
        }))
      }
    }, 100)
  }, [])

  const onSavepoint = useCallback(async (name: string) => {
    await fetch('/api/savepoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
  }, [])

  const onUndo = useCallback(async () => {
    const res = await fetch('/api/savepoints')
    const savepoints = await res.json()
    if (savepoints.length > 0) {
      const latest = savepoints[savepoints.length - 1]
      await fetch(`/api/savepoints/${latest.name}`, { method: 'POST' })
    }
  }, [])

  return { elements, participantCount, sessionName, onChange, onSavepoint, onUndo }
}
```

**Step 3: Update App.tsx with Excalidraw**

```tsx
// packages/server/src/client/App.tsx
import React, { useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { useCanvas } from './hooks/useCanvas'

export default function App() {
  const { elements, participantCount, sessionName, onChange, onSavepoint, onUndo } = useCanvas()
  const [showSavepointModal, setShowSavepointModal] = useState(false)
  const [savepointName, setSavepointName] = useState('')

  const handleSavepoint = async () => {
    if (savepointName.trim()) {
      await onSavepoint(savepointName.trim())
      setSavepointName('')
      setShowSavepointModal(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px' }}>Claude Whiteboard</h1>
        <div>
          <button onClick={() => setShowSavepointModal(true)} style={{ marginRight: '8px' }}>
            Savepoint
          </button>
          <button onClick={onUndo}>Undo</button>
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          initialData={{ elements }}
          onChange={(newElements) => onChange(newElements as any)}
        />
      </main>

      <footer style={{ padding: '8px 16px', borderTop: '1px solid #ddd', fontSize: '12px' }}>
        Session: {sessionName} | Participants: {participantCount}
      </footer>

      {showSavepointModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '300px' }}>
            <h2 style={{ marginBottom: '16px' }}>Create Savepoint</h2>
            <input
              type="text"
              value={savepointName}
              onChange={(e) => setSavepointName(e.target.value)}
              placeholder="Savepoint name"
              style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSavepointModal(false)}>Cancel</button>
              <button onClick={handleSavepoint}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Add session endpoint to API**

```typescript
// Add to packages/server/src/api.ts:
  router.get('/session', async (req, res) => {
    try {
      const session = await store.getSession()
      res.json(session)
    } catch (err) {
      res.status(500).json({ error: 'Failed to get session' })
    }
  })
```

**Step 5: Install dependencies and verify**

Run: `cd packages/server && npm install`

**Step 6: Commit**

```bash
git add packages/server/package.json packages/server/src/client packages/server/src/api.ts
git commit -m "feat(server): integrate Excalidraw with real-time sync"
```

---

### Task 8: Add name join modal

**Files:**
- Create: `packages/server/src/client/components/JoinModal.tsx`
- Modify: `packages/server/src/client/App.tsx`

**Step 1: Create JoinModal component**

```tsx
// packages/server/src/client/components/JoinModal.tsx
import React, { useState } from 'react'

interface JoinModalProps {
  onJoin: (name: string) => void
}

export function JoinModal({ onJoin }: JoinModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      localStorage.setItem('whiteboard-name', name.trim())
      onJoin(name.trim())
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '24px', borderRadius: '8px', minWidth: '300px' }}>
        <h2 style={{ marginBottom: '16px' }}>Join Whiteboard</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoFocus
          style={{ width: '100%', padding: '8px', marginBottom: '16px', fontSize: '16px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '8px', fontSize: '16px' }}>
          Join
        </button>
      </form>
    </div>
  )
}
```

**Step 2: Update App.tsx to use JoinModal**

```tsx
// packages/server/src/client/App.tsx - add at top of component:
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('whiteboard-name')
  })

// Add before return, after hooks:
  if (!userName) {
    return <JoinModal onJoin={setUserName} />
  }

// Add import:
import { JoinModal } from './components/JoinModal'
```

**Step 3: Commit**

```bash
git add packages/server/src/client/components packages/server/src/client/App.tsx
git commit -m "feat(server): add name join modal for participants"
```

---

### Task 9: Serve frontend from Express

**Files:**
- Modify: `packages/server/src/server.ts`
- Update: `packages/server/package.json` build script

**Step 1: Update server to serve static files**

```typescript
// packages/server/src/server.ts - add import
import path from 'path'
import { fileURLToPath } from 'url'

// Add after API routes:
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const clientPath = path.join(__dirname, 'client')

  // Serve static files
  app.use(express.static(clientPath))

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'))
  })
```

**Step 2: Update build script**

```json
// packages/server/package.json - update scripts:
  "build": "tsc && vite build",
  "build:server": "tsc",
  "build:client": "vite build"
```

**Step 3: Commit**

```bash
git add packages/server/src/server.ts packages/server/package.json
git commit -m "feat(server): serve frontend from Express in production"
```

---

## Phase 4: CLI & ngrok

### Task 10: Create CLI with commander

**Files:**
- Create: `packages/server/src/cli.ts`

**Step 1: Create CLI**

```typescript
// packages/server/src/cli.ts
#!/usr/bin/env node
import { Command } from 'commander'
import { createServer } from './server.js'
import ngrok from '@ngrok/ngrok'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import readline from 'readline'

const program = new Command()

async function getDataDir(): Promise<string> {
  const dir = path.join(process.cwd(), '.claude-whiteboard')
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function getNgrokToken(dataDir: string): Promise<string> {
  const tokenPath = path.join(dataDir, 'ngrok-token')

  try {
    return (await fs.readFile(tokenPath, 'utf-8')).trim()
  } catch {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise((resolve) => {
      rl.question('Enter your ngrok auth token (from ngrok.com/dashboard): ', async (token) => {
        rl.close()
        await fs.writeFile(tokenPath, token.trim())
        console.log('✓ Token saved')
        resolve(token.trim())
      })
    })
  }
}

async function listSessions(dataDir: string): Promise<string[]> {
  const sessionsDir = path.join(dataDir, 'sessions')
  try {
    return await fs.readdir(sessionsDir)
  } catch {
    return []
  }
}

program
  .name('claude-whiteboard-server')
  .description('Collaborative whiteboard server with Excalidraw')
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-s, --session <name>', 'Session name (creates new or resumes existing)')
  .option('--no-ngrok', 'Run without ngrok tunnel')
  .option('--list', 'List available sessions')
  .action(async (options) => {
    const dataDir = await getDataDir()

    if (options.list) {
      const sessions = await listSessions(dataDir)
      if (sessions.length === 0) {
        console.log('No sessions found')
      } else {
        console.log('Available sessions:')
        sessions.forEach(s => console.log(`  - ${s}`))
      }
      process.exit(0)
    }

    const sessionName = options.session || `session-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}`

    console.log(`Starting whiteboard session: ${sessionName}`)

    const { server, port } = await createServer({
      port: parseInt(options.port),
      dataDir,
      sessionName
    })

    console.log(`✓ Server running on port ${port}`)

    if (options.ngrok !== false) {
      const token = await getNgrokToken(dataDir)
      const listener = await ngrok.connect({
        addr: port,
        authtoken: token
      })

      console.log('')
      console.log('✓ Canvas server running')
      console.log(`✓ Share this link: ${listener.url()}`)
      console.log('')
      console.log('Participants can connect their Claude Code with:')
      console.log(`  "Connect to whiteboard ${listener.url()}"`)
      console.log('')
      console.log('Press Ctrl+C to stop')
    } else {
      console.log(`✓ Running locally at http://localhost:${port}`)
    }

    process.on('SIGINT', () => {
      console.log('\nShutting down...')
      server.close()
      process.exit(0)
    })
  })

program.parse()
```

**Step 2: Add shebang to package.json bin**

Already set in Task 1.

**Step 3: Test CLI locally**

Run: `cd packages/server && npx tsx src/cli.ts --no-ngrok`
Expected: Server starts successfully

**Step 4: Commit**

```bash
git add packages/server/src/cli.ts
git commit -m "feat(server): add CLI with ngrok integration"
```

---

## Phase 5: MCP Server

### Task 11: Create MCP server scaffold

**Files:**
- Create: `packages/mcp/src/index.ts`

**Step 1: Create MCP server**

```typescript
// packages/mcp/src/index.ts
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

let connectedUrl: string | null = null

const server = new Server(
  {
    name: 'claude-whiteboard-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'canvas_connect',
        description: 'Connect to a whiteboard session by URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The whiteboard URL (e.g., https://abc123.ngrok.io)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'canvas_get',
        description: 'Fetch current canvas JSON from connected whiteboard',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'canvas_set',
        description: 'Push new canvas JSON to connected whiteboard',
        inputSchema: {
          type: 'object',
          properties: {
            elements: {
              type: 'array',
              description: 'Array of Excalidraw elements',
            },
          },
          required: ['elements'],
        },
      },
      {
        name: 'canvas_savepoint',
        description: 'Create a named checkpoint on the server',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the savepoint',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'canvas_rollback',
        description: 'Restore canvas to a previous savepoint',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the savepoint to restore',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'canvas_history',
        description: 'List available savepoints with timestamps',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'canvas_connect': {
      const url = (args as { url: string }).url.replace(/\/$/, '')
      try {
        const res = await fetch(`${url}/health`)
        if (!res.ok) throw new Error('Health check failed')
        connectedUrl = url

        const sessionRes = await fetch(`${url}/api/session`)
        const session = await sessionRes.json()

        return {
          content: [
            {
              type: 'text',
              text: `Connected to whiteboard '${session.name}' at ${url}`,
            },
          ],
        }
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to connect to ${url}: ${err}`,
            },
          ],
          isError: true,
        }
      }
    }

    case 'canvas_get': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/canvas`)
        const canvas = await res.json()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(canvas, null, 2),
            },
          ],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to get canvas: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_set': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/canvas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements: (args as { elements: unknown[] }).elements }),
        })
        if (!res.ok) throw new Error('Failed to update canvas')
        return {
          content: [{ type: 'text', text: 'Canvas updated successfully' }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to set canvas: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_savepoint': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: (args as { name: string }).name }),
        })
        if (!res.ok) throw new Error('Failed to create savepoint')
        return {
          content: [{ type: 'text', text: `Savepoint '${(args as { name: string }).name}' created` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to create savepoint: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_rollback': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints/${(args as { name: string }).name}`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Failed to rollback')
        return {
          content: [{ type: 'text', text: `Rolled back to '${(args as { name: string }).name}'` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to rollback: ${err}` }],
          isError: true,
        }
      }
    }

    case 'canvas_history': {
      if (!connectedUrl) {
        return {
          content: [{ type: 'text', text: 'Not connected. Use canvas_connect first.' }],
          isError: true,
        }
      }
      try {
        const res = await fetch(`${connectedUrl}/api/savepoints`)
        const savepoints = await res.json()
        if (savepoints.length === 0) {
          return {
            content: [{ type: 'text', text: 'No savepoints found' }],
          }
        }
        const list = savepoints.map((s: { name: string; timestamp: string }) =>
          `- ${s.name} (${s.timestamp})`
        ).join('\n')
        return {
          content: [{ type: 'text', text: `Savepoints:\n${list}` }],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Failed to list savepoints: ${err}` }],
          isError: true,
        }
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Claude Whiteboard MCP server running')
}

main().catch(console.error)
```

**Step 2: Build and verify**

Run: `cd packages/mcp && npx tsc`
Expected: Compiles without errors

**Step 3: Commit**

```bash
git add packages/mcp/src/index.ts
git commit -m "feat(mcp): add MCP server with all canvas tools"
```

---

## Phase 6: Integration Testing

### Task 12: End-to-end test

**Files:**
- Create: `packages/server/src/e2e.test.ts`

**Step 1: Create E2E test**

```typescript
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
```

**Step 2: Add ws as dev dependency for tests**

```json
// Add to packages/server/package.json devDependencies:
  "ws": "^8.16.0"
```

**Step 3: Run E2E tests**

Run: `cd packages/server && npm install && npx vitest run src/e2e.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/server/src/e2e.test.ts packages/server/package.json
git commit -m "test(server): add E2E tests for full workflow"
```

---

## Phase 7: Final Polish

### Task 13: Add README files

**Files:**
- Create: `README.md`
- Create: `packages/server/README.md`
- Create: `packages/mcp/README.md`

**Step 1: Create root README**

```markdown
# Claude Whiteboard

A collaborative AI-powered whiteboard where multiple participants use their own Claude Code instances to interact with a shared Excalidraw canvas.

## Packages

- **[claude-whiteboard-server](./packages/server)** - Canvas server with Excalidraw UI
- **[claude-whiteboard-mcp](./packages/mcp)** - MCP server for Claude Code integration

## Quick Start

### 1. Start the canvas server

```bash
npx claude-whiteboard-server
```

This starts a local server and exposes it via ngrok. You'll get a shareable URL.

### 2. Share the URL

Send the ngrok URL to participants via WhatsApp, Slack, etc.

### 3. Participants connect their Claude Code

Add the MCP server to Claude Code config:

```json
{
  "mcpServers": {
    "canvas": {
      "command": "npx",
      "args": ["claude-whiteboard-mcp"]
    }
  }
}
```

Then in Claude Code:

```
"Connect to whiteboard https://abc123.ngrok.io"
```

## How It Works

- **Browser**: View and directly edit the Excalidraw canvas
- **Claude Code + MCP**: AI-assisted modifications using your local codebase as context

All changes sync in real-time to all participants.

## License

MIT
```

**Step 2: Create server README**

```markdown
# claude-whiteboard-server

Canvas server for Claude Whiteboard with Excalidraw UI and real-time sync.

## Usage

```bash
# Start new session
npx claude-whiteboard-server

# Resume existing session
npx claude-whiteboard-server --session my-session

# Run without ngrok (local only)
npx claude-whiteboard-server --no-ngrok

# List available sessions
npx claude-whiteboard-server --list
```

## API

### REST

- `GET /api/canvas` - Get current canvas state
- `PUT /api/canvas` - Update canvas state
- `GET /api/savepoints` - List savepoints
- `POST /api/savepoints` - Create savepoint
- `POST /api/savepoints/:name` - Rollback to savepoint

### WebSocket

Connect to the server URL for real-time updates.

Events:
- `canvas:update` - Canvas state changed
- `participants:update` - Participant count changed
```

**Step 3: Create MCP README**

```markdown
# claude-whiteboard-mcp

MCP server for Claude Code integration with Claude Whiteboard.

## Installation

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "canvas": {
      "command": "npx",
      "args": ["claude-whiteboard-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `canvas_connect` | Connect to a whiteboard session by URL |
| `canvas_get` | Fetch current canvas JSON |
| `canvas_set` | Push new canvas JSON |
| `canvas_savepoint` | Create named checkpoint |
| `canvas_rollback` | Restore to savepoint |
| `canvas_history` | List savepoints |

## Usage

```
You: Connect to whiteboard https://abc123.ngrok.io
Claude: [calls canvas_connect]
Claude: Connected to whiteboard 'my-session'

You: Add a diagram showing the auth flow from our codebase
Claude: [calls canvas_get, reads local files, calls canvas_set]
Claude: Added auth flow diagram with login, token validation, and logout components
```
```

**Step 4: Commit**

```bash
git add README.md packages/server/README.md packages/mcp/README.md
git commit -m "docs: add README files for project and packages"
```

---

### Task 14: Final build and test

**Step 1: Install all dependencies**

Run: `npm install`

**Step 2: Build all packages**

Run: `npm run build`

**Step 3: Run all tests**

Run: `npm test --workspaces`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final build verification"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1 | Project setup (monorepo, TypeScript) |
| 2 | 2-5 | Canvas server core (Express, store, API, WebSocket) |
| 3 | 6-9 | Frontend (Vite, React, Excalidraw, join modal) |
| 4 | 10 | CLI with ngrok |
| 5 | 11 | MCP server |
| 6 | 12 | E2E testing |
| 7 | 13-14 | Documentation and final verification |

**Total: 14 tasks**
