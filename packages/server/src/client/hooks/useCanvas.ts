import { useState, useEffect, useRef, useCallback } from 'react'
import { restoreElements } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

interface UseCanvasReturn {
  elements: ExcalidrawElement[]
  participantCount: number
  sessionName: string
  onChange: (elements: ExcalidrawElement[]) => void
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void
}

// Compute a hash of element content (ignoring selection state)
function getElementsContentHash(elements: ExcalidrawElement[]): string {
  return elements
    .filter(el => !el.isDeleted)
    .map(el => `${el.id}:${el.version}`)
    .sort()
    .join(',')
}

export function useCanvas(): UseCanvasReturn {
  const [elements, setElements] = useState<ExcalidrawElement[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [sessionName, setSessionName] = useState('loading...')
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isRemoteUpdateRef = useRef(false)
  const lastSentHashRef = useRef<string>('')

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'canvas:update': {
          isRemoteUpdateRef.current = true
          const remoteElements = message.payload.elements || []
          lastSentHashRef.current = getElementsContentHash(remoteElements)

          if (excalidrawAPIRef.current) {
            // Get current local elements for reconciliation
            const localElements = excalidrawAPIRef.current.getSceneElementsIncludingDeleted()

            // CRITICAL: Restore elements with refreshDimensions to recalculate text metrics
            // Without this, text elements won't render properly
            const restoredElements = restoreElements(
              remoteElements,
              localElements,
              { refreshDimensions: true, repairBindings: true }
            )

            // Update scene - this preserves viewport position
            excalidrawAPIRef.current.updateScene({
              elements: restoredElements as any
            })
          } else {
            // Fallback for initial load before API is ready
            setElements(remoteElements)
          }

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              isRemoteUpdateRef.current = false
            })
          })
          break
        }
        case 'participants:update':
          setParticipantCount(message.payload.count)
          break
      }
    }

    fetch('/api/session')
      .then(res => res.json())
      .then(data => setSessionName(data.name))
      .catch(() => {})

    return () => {
      ws.close()
    }
  }, [])

  const onChange = useCallback((newElements: ExcalidrawElement[]) => {
    if (isRemoteUpdateRef.current) {
      return
    }

    setElements(newElements)

    const newHash = getElementsContentHash(newElements)
    if (newHash === lastSentHashRef.current) {
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const currentHash = getElementsContentHash(newElements)
        if (currentHash !== lastSentHashRef.current) {
          lastSentHashRef.current = currentHash
          wsRef.current.send(JSON.stringify({
            type: 'canvas:change',
            payload: { elements: newElements }
          }))
        }
      }
    }, 100)
  }, [])

  const setExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api
  }, [])

  return { elements, participantCount, sessionName, onChange, setExcalidrawAPI }
}
