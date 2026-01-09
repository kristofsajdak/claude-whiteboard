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

Each Excalidraw element needs at minimum:
- `id`: unique string (generate: `{type}-{Date.now()}-{random4chars}`)
- `type`: rectangle, ellipse, diamond, text, arrow, line, freedraw
- `x`, `y`: position coordinates
- `width`, `height`: dimensions (except for line/arrow which use points)
- `strokeColor`: border color (e.g., "#1e1e1e")
- `backgroundColor`: fill color (e.g., "#a5d8ff") or "transparent"
- `fillStyle`: "solid", "hachure", or "cross-hatch"
- `strokeWidth`: 1, 2, or 4
- `roughness`: 0 (sharp), 1 (normal), 2 (sketchy)
- `opacity`: 100 (fully opaque)
- `angle`: 0 (no rotation)
- `seed`: random number for roughjs rendering

For text elements, also include:
- `text`: the actual text content
- `fontSize`: number (e.g., 20)
- `fontFamily`: 1 (hand-drawn), 2 (normal), 3 (monospace)
- `textAlign`: "left", "center", "right"
- `verticalAlign`: "top", "middle"

For arrows/lines, use `points` array instead of width/height:
- `points`: [[0, 0], [100, 50]] (relative coordinates from x,y)
- `startArrowhead`: null, "arrow", "bar", "dot", "triangle"
- `endArrowhead`: null, "arrow", "bar", "dot", "triangle"

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
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 100,
    "strokeColor": "#1e1e1e",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "roughness": 1,
    "opacity": 100,
    "angle": 0,
    "seed": 12345
  }]}'
```
