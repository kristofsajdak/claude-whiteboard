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
