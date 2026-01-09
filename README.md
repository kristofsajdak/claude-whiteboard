# Claude Whiteboard

> **Work in Progress** - Plugin installation is still being troubleshot. Check back soon.

A collaborative AI-powered whiteboard where multiple participants use their own Claude Code instances to interact with a shared Excalidraw canvas.

## Quick Start

### 1. Install and build the server

```bash
git clone https://github.com/kristofsajdak/claude-whiteboard.git
cd claude-whiteboard
npm install
npm run build
```

### 2. Start the canvas server

```bash
# Local only
cd packages/server && npx tsx src/cli.ts --no-ngrok

# With ngrok (shareable URL)
cd packages/server && npx tsx src/cli.ts
```

Open http://localhost:3000 in your browser.

### 3. Install the Claude Code plugin

In Claude Code, run:

```
/plugin marketplace add kristofsajdak/claude-whiteboard
/plugin install canvas@claude-whiteboard
```

Restart Claude Code.

### 4. Configure sandbox (one-time)

Run `/sandbox` in Claude Code and allow `Bash(curl:*)` for network access to the canvas server.

### 5. Connect to the whiteboard

In any project, tell Claude:

```
"Connect to whiteboard at http://localhost:3000"
```

Claude will use the canvas skill to interact with the whiteboard directly.

## How It Works

- **Browser**: View and directly edit the Excalidraw canvas
- **Claude Code + Plugin**: AI-assisted modifications via direct HTTP calls

All changes sync in real-time to all participants.

## Sharing with Team

1. Each team member installs the plugin (step 3 above)
2. Start the server with ngrok: `npx tsx src/cli.ts`
3. Share the ngrok URL with your team
4. Everyone connects: `"Connect to whiteboard at https://abc123.ngrok.io"`

## Packages

- **[packages/server](./packages/server)** - Canvas server with Excalidraw UI
- **[packages/mcp](./packages/mcp)** - MCP server (legacy, slower alternative)
- **[plugin](./plugin)** - Claude Code plugin with canvas skill

## License

MIT
