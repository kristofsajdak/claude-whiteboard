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

## Mechanical Operations (Haiku Templates)

Single-element modifications using predefined templates. Use when the operation is unambiguous.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`

### Add Single Shape

For simple requests like "add a box", "add a circle":

1. GET current canvas
2. Append new element using template:

```json
{
  "id": "{type}-{Date.now()}-{random4chars}",
  "type": "rectangle",
  "x": 200,
  "y": 200,
  "width": 200,
  "height": 100,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "seed": 12345,           // Use random value
  "version": 1,
  "versionNonce": 67890,   // Use random value
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "updated": 1704567890000, // Use Date.now()
  "link": null,
  "locked": false,
  "frameId": null,
  "roundness": {"type": 3}
}
```

**Note:** For other shapes, change the `type` field:
- Circle: `"type": "ellipse"` (set equal width/height)
- Diamond: `"type": "diamond"`
- Ellipse: `"type": "ellipse"`

3. PUT updated canvas

### Edit Text/Label

For requests like "change label to X", "update the text":

1. GET current canvas
2. Find element where `text` contains search string (case-insensitive)
3. Update the `text` and `originalText` fields
4. PUT updated canvas

### Change Property

For requests like "make it blue", "make it bigger":

1. GET current canvas
2. Find element by text content or description
3. Update single field:
   - Color: `strokeColor` or `backgroundColor`
   - Size: `width`, `height`, `fontSize`
4. PUT updated canvas

### Delete Element

For requests like "remove the box", "delete the arrow":

1. GET current canvas
2. Find element by text or type
3. Filter it from elements array
4. PUT updated canvas

### Clear Canvas

For "clear the canvas", "start fresh":

```bash
curl -s -X PUT {URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": []}'
```

**Note:** Curl commands require `dangerouslyDisableSandbox: true` for localhost access.

### When to Escalate to Opus

If the request contains any of these, use Semantic Operations instead:
- Concepts requiring interpretation ("auth service", "user flow")
- Spatial relationships ("below", "next to", "connected to")
- Multi-element scope ("flowchart", "diagram", "sequence")
- Aesthetic judgments ("professional", "clean", "organized")

**When in doubt, escalate to Opus.**

## Semantic Operations (Opus Subagent)

Complex modifications requiring understanding of intent, relationships, or layout.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`
- Create savepoints before big changes - suggest proactively

### When to Use

Use this section for:
- "Add a box for the auth service" (intent interpretation)
- "Draw a flowchart of the login process" (multi-element layout)
- "Add an arrow from A to B" (spatial relationships)
- "Make it look professional" (aesthetic judgment)

### Process

1. GET current canvas state
2. Spawn Opus subagent using Task tool:

```
Task(
  model: opus,
  subagent_type: general-purpose,
  prompt: """
You are generating Excalidraw JSON for a collaborative whiteboard.

CURRENT CANVAS STATE:
<CANVAS_STATE_JSON>

USER REQUEST:
<USER_REQUEST>

INSTRUCTIONS:
1. Read the Excalidraw spec to understand element structure
2. Analyze current canvas to understand existing elements and layout
3. Generate the minimal changes needed to fulfill the request
4. Return ONLY the complete updated elements array as JSON

CONSTRAINTS:
- Preserve all existing element IDs
- Position new elements to avoid overlap
- Use consistent styling with existing elements
- Generate unique IDs: {type}-{timestamp}-{random4chars}
- Reference EXCALIDRAW-SPEC.md for valid element structure
"""
)
```

3. Take the returned complete elements array (including both existing and new elements)
4. PUT to canvas:

```bash
curl -s -X PUT {URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": [returned elements]}'
```

**Note:** Curl commands require `dangerouslyDisableSandbox: true` for localhost access.

5. Report what was added/changed
