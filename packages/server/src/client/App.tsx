import React, { useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { useCanvas } from './hooks/useCanvas'
import { JoinModal } from './components/JoinModal'

export default function App() {
  const { elements, participantCount, sessionName, onChange, onSavepoint, onUndo } = useCanvas()
  const [showSavepointModal, setShowSavepointModal] = useState(false)
  const [savepointName, setSavepointName] = useState('')
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('whiteboard-name')
  })

  const handleSavepoint = async () => {
    if (savepointName.trim()) {
      await onSavepoint(savepointName.trim())
      setSavepointName('')
      setShowSavepointModal(false)
    }
  }

  if (!userName) {
    return <JoinModal onJoin={setUserName} />
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
