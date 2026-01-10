---
name: canvas
description: Use when user wants to interact with a whiteboard/canvas - requires reading Excalidraw spec for valid element generation
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

### MANDATORY: Pre-PUT Binding Verification

**Before ANY `curl -X PUT` command, verify these requirements. This is not optional.**

#### For Sequence Diagrams
- [ ] Actor box + lifeline share same `groupIds`
- [ ] Every arrow has `startBinding` and `endBinding` (bind to lifelines or activation boxes)
- [ ] Message labels share `groupIds` with their arrow OR use `containerId`
- [ ] Lifelines have `boundElements` listing their connected arrows

#### For Flow Diagrams
- [ ] Every arrow has `startBinding.elementId` pointing to source shape
- [ ] Every arrow has `endBinding.elementId` pointing to target shape
- [ ] Source/target shapes have `boundElements` array including the arrow ID
- [ ] Decision labels (Yes/No) share `groupIds` with their arrow

#### For Architecture/Component Diagrams
- [ ] Every connection arrow has both `startBinding` and `endBinding`
- [ ] All connected shapes have `boundElements` listing their arrows
- [ ] Service labels use `containerId` (inside box) not floating text

#### General (All Diagrams)
- [ ] Zero arrows have `startBinding: null` when connecting shapes
- [ ] Zero arrows have `endBinding: null` when connecting shapes
- [ ] Every shape that has arrows touching it lists those arrows in `boundElements`

**If any checkbox fails, fix the JSON before PUT. Do not rationalize.**

| If you think...                          | Reality                                                    |
|------------------------------------------|------------------------------------------------------------|
| "Bindings add complexity"                | Unbound arrows break when user moves shapes. Fix it.       |
| "It looks correct visually"              | Visual correctness ≠ structural correctness. Add bindings. |
| "Lifelines are lines, not shapes"        | Lines support bindings. Bind the arrows.                   |
| "I'll fix it if they complain"           | They shouldn't have to complain. Do it right now.          |
| "The spec doesn't require it"            | This skill requires it. The spec shows HOW.                |

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
