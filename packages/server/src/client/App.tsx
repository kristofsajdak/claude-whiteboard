import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'
import { useCanvas } from './hooks/useCanvas'
import { JoinModal } from './components/JoinModal'

export default function App() {
  const { elements, participantCount, sessionName, remoteVersion, onChange } = useCanvas()
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('whiteboard-name')
  })
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const lastAppliedVersionRef = useRef(0)

  // Update Excalidraw when remote elements arrive (without remounting)
  useEffect(() => {
    if (excalidrawAPIRef.current && remoteVersion > lastAppliedVersionRef.current) {
      lastAppliedVersionRef.current = remoteVersion
      // Update elements while preserving current viewport
      excalidrawAPIRef.current.updateScene({ elements })
    }
  }, [elements, remoteVersion])

  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api
    // Expose for testing
    ;(window as any).__EXCALIDRAW_API__ = api
  }, [])

  if (!userName) {
    return <JoinModal onJoin={setUserName} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px' }}>Claude Whiteboard</h1>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <Excalidraw
          excalidrawAPI={handleExcalidrawAPI}
          initialData={{ elements }}
          onChange={(newElements, newAppState) => onChange(newElements as any, newAppState)}
        />
      </main>

      <footer style={{ padding: '8px 16px', borderTop: '1px solid #ddd', fontSize: '12px' }}>
        Session: {sessionName} | Participants: {participantCount}
      </footer>
    </div>
  )
}
