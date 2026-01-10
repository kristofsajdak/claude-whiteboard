---
name: canvas
description: Use when user wants to interact with a whiteboard/canvas - connect, draw, update, or manage savepoints via direct HTTP calls
---

# Canvas Whiteboard Skill

Interact with the canvas server directly via curl. No MCP server needed.

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

**For element properties, bindings, and examples, read `EXCALIDRAW-SPEC.md` in this skill directory.**

Element types: `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`, `image`, `frame`

**Always use arrow bindings** for flow diagrams, sequence diagrams, and any connected shapes. Bindings keep arrows attached when shapes move.

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

## Example: Adding a Rectangle

```bash
# 1. Get current state
curl -s http://localhost:3000/api/canvas

# 2. Add new element to existing elements array and PUT
curl -s -X PUT http://localhost:3000/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": [...existing..., {
    "id": "rect-1704567890-a1b2",
    "type": "rectangle",
    "x": 100, "y": 100,
    "width": 200, "height": 100,
    "strokeColor": "#1e1e1e",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "angle": 0,
    "seed": 12345,
    "version": 1,
    "versionNonce": 67890,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "updated": 1704567890000,
    "link": null,
    "locked": false,
    "frameId": null,
    "roundness": {"type": 3}
  }]}'
```

## Performance

Use **Task tool with `model: haiku`** for mechanical operations:
- Connect / health check
- Get canvas JSON
- PUT canvas update (after content is generated)
- Savepoint operations (list, create, rollback)

Reserve the **main conversation** (best model) for:
- Understanding user intent
- Analyzing canvas state
- Generating new Excalidraw elements
- Reading and applying EXCALIDRAW-SPEC.md
