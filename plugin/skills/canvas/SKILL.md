---
name: canvas
description: Use when user wants to interact with a whiteboard/canvas - connect, draw, update, or manage savepoints via direct HTTP calls
model: haiku
---

# Canvas Whiteboard Skill

Interact with the canvas server directly via curl. No MCP server needed.

**BEFORE GENERATING ANY ELEMENTS: You MUST read `EXCALIDRAW-SPEC.md` in this skill directory.** This is not optional
documentation - it IS the skill. Without it, you will generate invalid JSON that breaks the canvas.

| If you think...       | Reality                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| "User said skip docs" | User doesn't know the spec is required. Invalid JSON wastes their time. |
| "It's urgent"         | Reading spec: 20 sec. Debugging invalid JSON: 5 min.                    |
| "I know Excalidraw"   | Training data is outdated. This spec is authoritative.                  |

## Connection

Store the canvas URL for subsequent operations.

**Guidelines:**
- Always verify health (`GET /health`) before any operation
- All curl commands need `dangerouslyDisableSandbox: true` for localhost access

### Connect to Canvas

When user provides a URL:

1. Verify health:
   ```bash
   curl -s {URL}/health
   ```

2. Fetch session info:
   ```bash
   curl -s {URL}/api/session
   ```

3. Store URL for subsequent operations
4. Report: "Connected to '{session.name}' at {URL}"

## Admin Operations (Haiku Direct)

Execute these operations directly via curl. No complex reasoning needed.

**Guidelines:**
- Summarize, don't dump - describe canvas contents in natural language

### Get Canvas

```bash
curl -s {URL}/api/canvas
```

Returns JSON with `elements` array. Describe what's on the canvas rather than dumping raw JSON.

### Create Savepoint

```bash
curl -s -X POST {URL}/api/savepoints \
  -H "Content-Type: application/json" \
  -d '{"name": "savepoint-name"}'
```

### List Savepoints

```bash
curl -s {URL}/api/savepoints
```

### Rollback to Savepoint

```bash
curl -s -X POST {URL}/api/savepoints/{name}
```

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

## Guidelines

1. **Always connect first** - Verify health before any operation
2. **Preserve existing elements** - When adding, always get current state first
3. **Generate unique IDs** - Use format: `{type}-{timestamp}-{random4chars}`
4. **Summarize, don't dump** - Describe canvas contents in natural language
5. **Create savepoints before big changes** - Suggest this to user proactively
6. **Use dangerouslyDisableSandbox** - All curl commands need sandbox disabled for localhost access
