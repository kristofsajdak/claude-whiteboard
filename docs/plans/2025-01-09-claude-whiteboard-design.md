# Claude Whiteboard - Design Document

A collaborative AI-powered diagramming tool where multiple participants use their own Claude Code instances to interact with a shared Excalidraw canvas.

## Overview

Claude Whiteboard is a decentralized collaborative whiteboard. Anyone can host a canvas server (exposed via ngrok), share the secret URL, and participants connect using an MCP server in their local Claude Code. Each participant has their own Claude instance with access to their own local codebase.

### Core Flow

1. Someone starts the canvas server locally
2. ngrok exposes it, generating a shareable URL
3. URL shared out-of-band (WhatsApp, Slack, etc.)
4. Participants connect their Claude Code to the canvas via MCP: `canvas_connect <url>`
5. Everyone can view/edit the canvas directly in browser
6. Everyone can use Claude + MCP to make AI-assisted modifications
7. Changes from any source sync to all viewers in real-time
8. Savepoints maintained on server for rollback

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Canvas Server                         │
│                    (anyone can host via ngrok)                  │
│                                                                 │
│   • Web UI: Excalidraw canvas, real-time sync                   │
│   • REST API: get/set JSON, savepoints, rollback                │
│   • WebSocket: broadcasts changes to all viewers                │
│   • No AI - just state management                               │
└───────────────┬─────────────────────────────────┬───────────────┘
                │                                 │
        ┌───────┴───────┐                 ┌───────┴───────┐
        │  Browser(s)   │                 │  MCP Clients  │
        │               │                 │               │
        │ View & edit   │                 │ Claude Code   │
        │ directly      │                 │ + local repos │
        └───────────────┘                 └───────────────┘
```

### Two Interaction Modes

1. **Direct (Browser)** - Open the shared URL, draw/move things in Excalidraw
2. **AI-Assisted (MCP)** - Claude fetches canvas, modifies it using local codebase context, pushes update

Changes from either mode sync to everyone via WebSocket.

## MCP Server

Each participant runs the MCP server in their Claude Code instance. It connects to the shared canvas server.

### Tools

| Tool | Description |
|------|-------------|
| `canvas_connect` | Connect to a whiteboard session by URL. Sets context for subsequent calls. |
| `canvas_get` | Fetch current canvas JSON from connected whiteboard. |
| `canvas_set` | Push new canvas JSON to connected whiteboard. |
| `canvas_savepoint` | Create a named checkpoint on the server. |
| `canvas_rollback` | Restore canvas to a previous savepoint. |
| `canvas_history` | List available savepoints with timestamps. |

### Participant Workflow

```
User: "Connect to this whiteboard: https://abc123.ngrok.io"
Claude: [calls canvas_connect]
Claude: "Connected to whiteboard 'auth-flow-diagrams'"

User: "Add a box for the user service based on our auth code"
Claude: [calls canvas_get to fetch current state]
Claude: [reads local files for context]
Claude: [generates updated Excalidraw JSON]
Claude: [calls canvas_set to push changes]
Claude: "Added user service box connected to the auth gateway"
```

### MCP Server Installation

```bash
# Install globally
npm install -g claude-whiteboard-mcp

# Or use npx (auto-downloads)
npx claude-whiteboard-mcp
```

### Claude Code MCP Configuration

```json
{
  "mcpServers": {
    "canvas": {
      "command": "npx",
      "args": ["claude-whiteboard-mcp"]
    }
  }
}
```

No URL configuration needed - participants use `canvas_connect` dynamically.

## Canvas Server

The canvas server is a simple state server with a web UI. It has no AI capabilities - just stores and syncs Excalidraw JSON.

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/canvas` | GET | Fetch current canvas JSON |
| `/api/canvas` | PUT | Update canvas JSON |
| `/api/savepoints` | GET | List all savepoints |
| `/api/savepoints` | POST | Create new savepoint `{ name: string }` |
| `/api/savepoints/:name` | POST | Rollback to savepoint |

### WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `canvas:update` | server → client | Full canvas JSON |
| `canvas:change` | client → server | Full canvas JSON |

### Conflict Resolution

**Last write wins** - no locking, no queuing. Participants coordinate via voice/chat. Trust-based collaboration.

## Frontend UI

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Claude Whiteboard              [Savepoint] [Undo]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│              Excalidraw Canvas                      │
│              (main area)                            │
│                                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Session: auth-flow-diagrams                        │
│  Participants: 3 connected                          │
└─────────────────────────────────────────────────────┘
```

### Components

- **Header**: session name, Savepoint button, Undo button
- **Canvas**: Excalidraw component, fills most of screen, fully editable
- **Footer**: session info, participant count

### Join Flow

- On first visit: modal prompts "Enter your name to join"
- Name stored in localStorage (persists on refresh)
- Name shown to other participants

## Persistence

### Folder Structure (on host machine)

```
.claude-whiteboard/
├── ngrok-token             # stored auth token
└── sessions/
    └── auth-flow-diagrams/
        ├── canvas.json          # current canvas state
        ├── savepoints/
        │   ├── initial.json
        │   ├── after-auth-diagram.json
        │   └── ...
        └── session.json         # { name, created, lastModified }
```

### When to Save

- **On every canvas change** - debounced, save canvas.json every 3 seconds during activity
- **On savepoint creation** - copy canvas.json to savepoints folder with given name
- **On server shutdown** - final save of current state

### Session Naming

- Auto-generated from first canvas modification (Claude on server generates a slug)
- Or manually named when starting: `--session my-session-name`

### Savepoint Naming

- User-provided via UI button or MCP tool
- Examples: "initial", "after-auth-flow", "before-refactor"

## Tech Stack

### Canvas Server (Node.js)

- Express for HTTP (serve static frontend + REST API)
- WebSocket (`ws` library) for real-time sync
- `@ngrok/ngrok` package for bundled tunneling
- File system for persistence

### MCP Server (Node.js)

- `@modelcontextprotocol/sdk` for MCP implementation
- `node-fetch` for HTTP calls to canvas server
- Stateful connection (remembers connected URL)

### Frontend

- React (Vite for bundling)
- `@excalidraw/excalidraw` component
- Native WebSocket for server connection

## Startup & CLI

### Starting the Canvas Server

```bash
# Start new session
npx claude-whiteboard-server

# Start with specific session name
npx claude-whiteboard-server --session auth-flow-diagrams

# Resume existing session
npx claude-whiteboard-server --session auth-flow-diagrams

# List available sessions
npx claude-whiteboard-server --list
```

### Startup Sequence

1. Check for existing sessions in `.claude-whiteboard/sessions/`
2. If `--session` provided, load or create that session
3. Otherwise start fresh session (name auto-generated later)
4. Start Express + WebSocket server on random available port
5. Launch ngrok tunnel (prompt for token on first run if needed)
6. Print shareable URL:
   ```
   ✓ Canvas server running
   ✓ Share this link: https://abc123.ngrok.io

   Participants can connect their Claude Code with:
     "Connect to whiteboard https://abc123.ngrok.io"

   Press Ctrl+C to stop
   ```

### CLI Flags

| Flag | Description |
|------|-------------|
| `--port <number>` | Use specific port |
| `--no-ngrok` | Local only, no tunnel |
| `--session <name>` | Use/create specific session |
| `--list` | Show available sessions and exit |

### First-Time Setup

```
Enter your ngrok auth token (from ngrok.com/dashboard): ****
✓ Token saved to .claude-whiteboard/ngrok-token

✓ Canvas server running
✓ Share this link: https://abc123.ngrok.io
```

## Package Structure

Two npm packages:

### 1. `claude-whiteboard-server`

The canvas server that hosts sessions.

```bash
npx claude-whiteboard-server
```

### 2. `claude-whiteboard-mcp`

The MCP server for Claude Code integration.

```bash
# Added to Claude Code MCP config
{
  "mcpServers": {
    "canvas": {
      "command": "npx",
      "args": ["claude-whiteboard-mcp"]
    }
  }
}
```

## Dependencies

### Canvas Server

- `express` - HTTP server
- `ws` - WebSocket server
- `@ngrok/ngrok` - Tunneling
- `@excalidraw/excalidraw` - Canvas component
- `react`, `react-dom` - Frontend framework
- `vite` - Build tool

### MCP Server

- `@modelcontextprotocol/sdk` - MCP protocol
- `node-fetch` - HTTP client

## Summary: Original vs New Design

| Aspect | Original Design | New Design |
|--------|----------------|------------|
| Claude runs on | Host only | Everyone's machine |
| Codebase context | Host's repo | Each person's local repo |
| Canvas server | Claude + UI + API | Just UI + API (no AI) |
| Prompt handling | Queue, sequential | Parallel, independent |
| Locking | Trust-based grab | None, last write wins |
| Integration | Browser only | Browser + MCP |
| Packages | 1 (monolith) | 2 (server + MCP) |

## Future Considerations (Not in Scope)

- Multiple canvases per session
- Export to PNG/SVG
- Participant permissions/roles
- Voice/video integration
- Mobile-optimized UI
- Cursor presence (see who's looking where)
