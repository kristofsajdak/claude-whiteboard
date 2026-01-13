import { useState, useEffect, useRef, useCallback } from 'react'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

interface CanvasState {
  elements: ExcalidrawElement[]
}

interface UseCanvasReturn {
  elements: ExcalidrawElement[]
  participantCount: number
  sessionName: string
  remoteVersion: number
  onChange: (elements: ExcalidrawElement[], appState?: any) => void
}

// Compute a hash of element content (ignoring selection state)
// This lets us detect actual changes vs just selection/hover changes
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
  const [remoteVersion, setRemoteVersion] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  // Track when we're receiving a remote update to avoid echo loops
  const isRemoteUpdateRef = useRef(false)
  // Track the last sent content hash to avoid sending unchanged content
  const lastSentHashRef = useRef<string>('')

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case 'canvas:update': {
          // Mark that we're receiving a remote update - this prevents
          // the onChange handler from sending this back to the server
          isRemoteUpdateRef.current = true
          const remoteElements = message.payload.elements || []
          // Update our hash to match remote state (prevents re-sending)
          lastSentHashRef.current = getElementsContentHash(remoteElements)
          setElements(remoteElements)
          // Increment version to trigger useEffect in App.tsx
          setRemoteVersion(v => v + 1)
          // Clear the flag after React has processed the update
          // Use requestAnimationFrame to ensure Excalidraw's onChange has fired
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

    // Fetch session info
    fetch('/api/session')
      .then(res => res.json())
      .then(data => setSessionName(data.name))
      .catch(() => {})

    return () => {
      ws.close()
    }
  }, [])

  const onChange = useCallback((newElements: ExcalidrawElement[], appState?: any) => {
    // Skip if this onChange was triggered by a remote update
    // (prevents echo loop between clients)
    if (isRemoteUpdateRef.current) {
      return
    }

    setElements(newElements)

    // Check if content actually changed (not just selection/hover)
    const newHash = getElementsContentHash(newElements)
    if (newHash === lastSentHashRef.current) {
      // No actual content change, don't send to server
      return
    }

    // Debounce WebSocket sends
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Re-check hash in case it changed during debounce
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

  return { elements, participantCount, sessionName, remoteVersion, onChange }
}
