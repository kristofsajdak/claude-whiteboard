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
