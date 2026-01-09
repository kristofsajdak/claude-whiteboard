import { useState, useEffect, useRef, useCallback } from 'react'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

interface CanvasState {
  elements: ExcalidrawElement[]
}

interface UseCanvasReturn {
  elements: ExcalidrawElement[]
  participantCount: number
  sessionName: string
  version: number
  onChange: (elements: ExcalidrawElement[]) => void
}

export function useCanvas(): UseCanvasReturn {
  const [elements, setElements] = useState<ExcalidrawElement[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [sessionName, setSessionName] = useState('loading...')
  const [version, setVersion] = useState(0)
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
          setVersion(v => v + 1)
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

  return { elements, participantCount, sessionName, version, onChange }
}
