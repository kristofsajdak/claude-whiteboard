import React, { useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'
import { useCanvas } from './hooks/useCanvas'
import { JoinModal } from './components/JoinModal'

export default function App() {
  const { elements, participantCount, sessionName, onChange, setExcalidrawAPI } = useCanvas()
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('whiteboard-name')
  })

  const handleExcalidrawAPI = (api: ExcalidrawImperativeAPI) => {
    // Expose for testing
    (window as any).__EXCALIDRAW_API__ = api
    // Pass to useCanvas for remote updates
    setExcalidrawAPI(api)
  }

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
          onChange={(newElements) => onChange(newElements as any)}
        />
      </main>

      <footer style={{ padding: '8px 16px', borderTop: '1px solid #ddd', fontSize: '12px' }}>
        Session: {sessionName} | Participants: {participantCount}
      </footer>
    </div>
  )
}
