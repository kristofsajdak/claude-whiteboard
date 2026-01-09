import React, { useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { useCanvas } from './hooks/useCanvas'
import { JoinModal } from './components/JoinModal'

export default function App() {
  const { elements, participantCount, sessionName, version, onChange } = useCanvas()
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('whiteboard-name')
  })

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
          key={version}
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
