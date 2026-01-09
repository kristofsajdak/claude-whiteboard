# Claude Whiteboard

A collaborative AI-powered whiteboard where multiple participants use their own Claude Code instances to interact with a shared Excalidraw canvas.

## Packages

- **[claude-whiteboard-server](./packages/server)** - Canvas server with Excalidraw UI
- **[claude-whiteboard-mcp](./packages/mcp)** - MCP server for Claude Code integration

## Quick Start

### 1. Start the canvas server

```bash
npx claude-whiteboard-server
```

This starts a local server and exposes it via ngrok. You'll get a shareable URL.

### 2. Share the URL

Send the ngrok URL to participants via WhatsApp, Slack, etc.

### 3. Participants connect their Claude Code

Add the MCP server to Claude Code config:

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

Then in Claude Code:

```
"Connect to whiteboard https://abc123.ngrok.io"
```

## How It Works

- **Browser**: View and directly edit the Excalidraw canvas
- **Claude Code + MCP**: AI-assisted modifications using your local codebase as context

All changes sync in real-time to all participants.

## License

MIT
