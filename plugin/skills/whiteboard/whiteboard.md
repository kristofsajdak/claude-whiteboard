---
name: whiteboard:whiteboard
description: Use when user wants to interact with a whiteboard
model: haiku
---

# Whiteboard I/O Skill

Pure I/O operations for the whiteboard canvas server. Connect, read, write, savepoints.

**This skill handles:**
- Connecting to whiteboard servers
- Reading canvas content
- Writing/updating canvas content
- Managing savepoints

**This skill does NOT handle:**
- Format conversion (use whiteboard:excalidraw)
- PlantUML parsing (use whiteboard:plantuml)

## Connecting

When user asks to connect to a whiteboard:

1. Extract the URL (e.g., http://localhost:3000)
2. Verify connection:
   ```bash
   curl -s {URL}/health
   ```
3. If successful, fetch session info:
   ```bash
   curl -s {URL}/api/session
   ```
4. Remember the URL for subsequent operations
5. Tell user: "Connected to '{session.name}' at {URL}"

## Reading Canvas

When user asks what's on the canvas or needs current state:

```bash
curl -s {URL}/api/canvas
```

Returns JSON with `elements` array. Summarize what's there rather than dumping raw JSON unless asked.

## Updating Canvas

### Full Replace (when regenerating everything)

```bash
curl -s -X PUT {URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": [...]}'
```

### Adding Elements (preferred for incremental work)

1. Get current canvas
2. Append new element(s) to the elements array
3. Set the updated canvas

### Updating Specific Elements

1. Get current canvas
2. Find element by id
3. Modify properties
4. Set the updated canvas

### Deleting Elements

1. Get current canvas
2. Filter out element(s) by id
3. Set the updated canvas

## Savepoints

### Create savepoint

```bash
curl -s -X POST {URL}/api/savepoints \
  -H "Content-Type: application/json" \
  -d '{"name": "checkpoint-name"}'
```

### List savepoints

```bash
curl -s {URL}/api/savepoints
```

### Rollback to savepoint

```bash
curl -s -X POST {URL}/api/savepoints/{name}
```

## Guidelines

1. **Always connect first** - Verify health before any operation
2. **Preserve existing elements** - When adding, always get current state first
3. **Generate unique IDs** - Use format: `{type}-{timestamp}-{random4chars}`
4. **Summarize, don't dump** - Describe canvas contents in natural language
5. **Create savepoints before big changes** - Suggest this to user proactively
6. **Use dangerouslyDisableSandbox** - All curl commands need sandbox disabled for localhost access
