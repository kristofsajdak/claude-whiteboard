import React, { useState } from 'react'

interface JoinModalProps {
  onJoin: (name: string) => void
}

export function JoinModal({ onJoin }: JoinModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      localStorage.setItem('whiteboard-name', name.trim())
      onJoin(name.trim())
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '24px', borderRadius: '8px', minWidth: '300px' }}>
        <h2 style={{ marginBottom: '16px' }}>Join Whiteboard</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoFocus
          style={{ width: '100%', padding: '8px', marginBottom: '16px', fontSize: '16px' }}
        />
        <button type="submit" style={{ width: '100%', padding: '8px', fontSize: '16px' }}>
          Join
        </button>
      </form>
    </div>
  )
}
