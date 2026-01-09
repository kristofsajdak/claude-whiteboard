# claude-whiteboard-server

Canvas server for Claude Whiteboard with Excalidraw UI and real-time sync.

## Usage

```bash
# Start new session
npx claude-whiteboard-server

# Resume existing session
npx claude-whiteboard-server --session my-session

# Run without ngrok (local only)
npx claude-whiteboard-server --no-ngrok

# List available sessions
npx claude-whiteboard-server --list
```

## API

### REST

- `GET /api/canvas` - Get current canvas state
- `PUT /api/canvas` - Update canvas state
- `GET /api/savepoints` - List savepoints
- `POST /api/savepoints` - Create savepoint
- `POST /api/savepoints/:name` - Rollback to savepoint

### WebSocket

Connect to the server URL for real-time updates.

Events:
- `canvas:update` - Canvas state changed
- `participants:update` - Participant count changed
