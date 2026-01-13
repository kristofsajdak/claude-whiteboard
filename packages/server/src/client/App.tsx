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
  // Store viewport position before remount
  const savedViewportRef = useRef<{ scrollX: number; scrollY: number; zoom: { value: number } } | null>(null)

  // Save viewport before remount happens (triggered by remoteVersion key change)
  useEffect(() => {
    if (excalidrawAPIRef.current) {
      const api = excalidrawAPIRef.current
      const appState = api.getAppState()
      savedViewportRef.current = {
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom
      }
    }
  }, [remoteVersion])

  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawAPIRef.current = api
    // Expose for testing
    ;(window as any).__EXCALIDRAW_API__ = api
    // Trigger initial render of all elements (including text)
    // then restore the saved viewport position
    requestAnimationFrame(() => {
      // scrollToContent forces Excalidraw to render all elements
      api.scrollToContent()
      // If we have a saved viewport, restore it after rendering
      if (savedViewportRef.current) {
        const { scrollX, scrollY, zoom } = savedViewportRef.current
        requestAnimationFrame(() => {
          api.updateScene({
            appState: { scrollX, scrollY, zoom }
          })
        })
      }
    })
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
          key={remoteVersion}
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
