# Claude Whiteboard - Design Document

A collaborative AI-powered diagramming tool where multiple participants interact with Claude to create and manipulate Excalidraw diagrams.

## Overview

Claude Whiteboard lets a host run a local server that exposes a shared Excalidraw canvas to the internet via ngrok. Participants join via a secret link, see the same canvas, and can either submit prompts for Claude to process or directly manipulate the canvas.

### Core Flow

1. Host starts the whiteboard server locally pointing at a project folder
2. Bundled ngrok exposes it, generating a shareable URL
3. Participants open the URL, enter their name, and join
4. Everyone sees the same Excalidraw canvas
5. Anyone can submit prompts (queued, processed sequentially by Claude)
6. Anyone can grab the canvas lock to directly manipulate elements
7. All changes sync to all participants in real-time
8. Full history maintained on disk for rollback

### Architecture

```
┌─────────────────────────────────────────────┐
│  Host's Local Machine                       │
│  ┌─────────────┐    ┌──────────────────┐   │
│  │ Claude Code │◄──►│  Local Webserver │   │
│  │    CLI      │    │  (Node.js)       │   │
│  └─────────────┘    └────────┬─────────┘   │
│        │                     │              │
│        ▼                     │              │
│   Local git folder           │              │
└──────────────────────────────┼──────────────┘
                               │
                          ┌────▼────┐
                          │  ngrok  │
                          │(bundled)│
                          └────┬────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   Participant 1          Participant 2          Participant 3
   (browser)              (browser)              (browser)
```

## Prompt & Canvas Flow

### Prompt Submission

1. Participant types prompt in input box, hits submit
2. Prompt added to queue (visible to all participants)
3. Queue processed sequentially (one prompt at a time)
4. Any queued prompt can be cancelled by anyone (trust-based)

### Prompt Execution

1. Server builds context with current canvas JSON + user prompt + project path
2. Server calls: `claude -p "<context>" --cwd /path/to/project`
3. Claude responds with updated Excalidraw JSON
4. Server validates JSON, pushes to history, saves to disk
5. Server broadcasts new state to all clients via WebSocket
6. Lock automatically held by "Claude" during execution

### Prompt Template

```
You are a whiteboard assistant. You receive an Excalidraw canvas JSON and a user request.
Respond ONLY with the updated Excalidraw JSON - no explanation, no markdown.

Current canvas:
<JSON>

User request: "<prompt>"

Project context available at: /path/to/project
```

### Error Handling

- If Claude returns invalid JSON: keep current state, show error to participants
- If Claude Code times out (120s): show timeout message, release lock, remove from queue

## Locking & Direct Editing

### Trust-Based Lock Model

- Single lock, anyone or anything can grab it at any time
- Click "Take Control" → you have the lock, can edit canvas
- Someone else clicks "Take Control" → they now have it, you lose it
- Prompt starts executing → Claude has the lock automatically
- No explicit release button needed

### UI Indicator

- Shows: "🔒 [Name] is editing" or "🔒 Claude is thinking..."
- "Take Control" button always visible

### While Locked

- Lock holder can drag, resize, draw, delete elements directly
- Changes broadcast to all viewers in real-time
- Other participants see canvas updating but can't edit
- Prompt submission still works (queues up)

### While Unlocked

- Canvas is view-only for everyone
- Prompt submission is the only way to make changes

## Persistence

### Folder Structure

```
.claude-whiteboard/
├── ngrok-token             # stored auth token
└── sessions/
    ├── auth-flow-diagrams/
    │   ├── canvas.json          # current canvas state
    │   ├── history/
    │   │   ├── 001.json
    │   │   ├── 002.json
    │   │   └── ...
    │   ├── queue.json           # pending prompts
    │   └── session.json         # { name, description, created, lastModified }
    └── api-architecture/
        └── ...
```

### When to Save

- **On every prompt completion** - save new canvas state to history + canvas.json
- **During direct editing** - save canvas.json every 3 seconds while lock is held (debounced)
- **On lock grab** - snapshot to history (captures human edits as a checkpoint)

### Session Naming

- Auto-generated from first prompt (Claude creates a slug)
- Example: "extract auth flow diagrams" → `auth-flow-diagrams`
- If name conflicts, append `-2`, `-3`, etc.

### History

- No limit on history snapshots
- Each snapshot is a complete canvas state
- Undo pops last state and broadcasts previous

## Frontend UI

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Claude Whiteboard          [Take Control] [Undo]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              Excalidraw Canvas                      │
│              (main area)                            │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Prompt queue: (2 pending)                          │
│  • "Add auth service box" - Alice        [Cancel]   │
│  • "Connect to database" - Bob           [Cancel]   │
├─────────────────────────────────────────────────────┤
│  [____________________________] [Send]              │
│  🔒 Claude is thinking...                           │
└─────────────────────────────────────────────────────┘
```

### Components

- **Header**: title, Take Control button, Undo button
- **Canvas**: Excalidraw component, fills most of screen
- **Queue**: collapsible list of pending prompts with cancel buttons
- **Input**: text box + send button
- **Status**: who/what currently holds lock

### Join Flow

- On first visit: modal prompts "Enter your name to join"
- Name stored in localStorage (persists on refresh)

## Tech Stack

### Server (Node.js)

- Express for HTTP (serve static frontend)
- WebSocket (`ws` library) for real-time sync
- Child process to spawn `claude -p` commands
- `@ngrok/ngrok` package for bundled tunneling

### Frontend

- React (Vite for bundling)
- `@excalidraw/excalidraw` component
- Native WebSocket for server connection

### Server State

```javascript
{
  canvas: { /* excalidraw JSON */ },
  history: [ /* array of past canvas states */ ],
  queue: [ { id, prompt, submitter } ],
  lock: { holder: "Alice" | "claude" | null }
}
```

### WebSocket Messages

| Message | Direction | Purpose |
|---------|-----------|---------|
| `canvas:update` | server → client | New canvas state |
| `queue:update` | server → client | Queue changed |
| `lock:update` | server → client | Lock holder changed |
| `prompt:submit` | client → server | Submit prompt |
| `prompt:cancel` | client → server | Cancel queued prompt |
| `lock:take` | client → server | Grab the lock |

## Startup & CLI

### Usage

```bash
# Start new session
npx claude-whiteboard --folder ./my-project

# Resume existing session
npx claude-whiteboard --folder ./my-project --session auth-flow-diagrams

# List available sessions
npx claude-whiteboard --folder ./my-project --list
```

### Startup Sequence

1. Check for existing sessions in `.claude-whiteboard/sessions/`
2. If sessions exist, prompt: "Resume [session-name] or start new?"
3. Start Express + WebSocket server on random available port
4. Launch ngrok tunnel (prompt for token on first run if needed)
5. Print shareable URL:
   ```
   ✓ Whiteboard running
   ✓ Share this link: https://abc123.ngrok.io

   Press Ctrl+C to stop
   ```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--folder <path>` | Project folder for Claude context (required) |
| `--port <number>` | Use specific port |
| `--no-ngrok` | Local only, no tunnel |
| `--session <name>` | Resume specific session |
| `--list` | Show available sessions and exit |

### First-Time Setup

```
Enter your ngrok auth token (from ngrok.com/dashboard): ****
✓ Token saved to .claude-whiteboard/ngrok-token

✓ Whiteboard running
✓ Share this link: https://abc123.ngrok.io
```

## Dependencies

### Runtime

- Node.js 18+
- Claude Code CLI (installed and authenticated)

### NPM Packages

- `express` - HTTP server
- `ws` - WebSocket server
- `@ngrok/ngrok` - Tunneling
- `@excalidraw/excalidraw` - Canvas component
- `react`, `react-dom` - Frontend framework
- `vite` - Build tool

## Future Considerations (Not in Scope)

- Multiple canvases per session
- Export to PNG/SVG
- Participant permissions/roles
- Voice/video integration
- Mobile-optimized UI
