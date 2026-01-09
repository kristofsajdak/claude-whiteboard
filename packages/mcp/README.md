# claude-whiteboard-mcp

MCP server for Claude Code integration with Claude Whiteboard.

## Installation

Add to your Claude Code MCP configuration:

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

## Tools

| Tool | Description |
|------|-------------|
| `canvas_connect` | Connect to a whiteboard session by URL |
| `canvas_get` | Fetch current canvas JSON |
| `canvas_set` | Push new canvas JSON |
| `canvas_savepoint` | Create named checkpoint |
| `canvas_rollback` | Restore to savepoint |
| `canvas_history` | List savepoints |

## Usage

```
You: Connect to whiteboard https://abc123.ngrok.io
Claude: [calls canvas_connect]
Claude: Connected to whiteboard 'my-session'

You: Add a diagram showing the auth flow from our codebase
Claude: [calls canvas_get, reads local files, calls canvas_set]
Claude: Added auth flow diagram with login, token validation, and logout components
```
