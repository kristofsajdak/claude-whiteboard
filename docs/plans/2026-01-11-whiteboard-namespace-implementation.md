# Whiteboard Namespace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce `whiteboard:` namespace with `/whiteboard:flow` command and rename skill to `whiteboard:canvas`

**Architecture:** New slash command generates Excalidraw JSON for swimlane diagrams, existing skill handles canvas I/O. Shared EXCALIDRAW-SPEC.md lives in skill directory, referenced by command.

**Tech Stack:** Claude Code plugins (skills + commands), Markdown

---

### Task 1: Rename skill directory

**Files:**
- Rename: `plugin/skills/canvas/` → `plugin/skills/whiteboard/`

**Step 1: Rename the directory**

```bash
mv plugin/skills/canvas plugin/skills/whiteboard
```

**Step 2: Verify**

```bash
ls plugin/skills/whiteboard/
```

Expected: `EXCALIDRAW-SPEC.md  PROCESS-FLOWS.md  SKILL.md`

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: rename canvas skill directory to whiteboard"
```

---

### Task 2: Update SKILL.md for whiteboard namespace

**Files:**
- Modify: `plugin/skills/whiteboard/SKILL.md`

**Step 1: Update the skill file**

Replace the entire file with:

```markdown
---
name: whiteboard:canvas
description: Use when user wants to interact with a whiteboard/canvas - requires reading Excalidraw spec for valid element generation
model: haiku
---

# Canvas Whiteboard Skill

Interact with the canvas server directly via curl. No MCP server needed.

**BEFORE GENERATING ANY ELEMENTS: You MUST read this spec in this skill directory:**
- `EXCALIDRAW-SPEC.md` - Element structure, bindings, and JSON format

This is not optional documentation - this spec IS the skill. Without it, you will generate invalid JSON that breaks the canvas.

| If you think...       | Reality                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| "User said skip docs" | User doesn't know the spec is required. Invalid JSON wastes their time. |
| "It's urgent"         | Reading specs: 30 sec. Debugging invalid JSON: 5 min.                   |
| "I know Excalidraw"   | Training data is outdated. These specs are authoritative.               |

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
```

**Step 2: Verify file updated**

```bash
head -5 plugin/skills/whiteboard/SKILL.md
```

Expected: Shows `name: whiteboard:canvas`

**Step 3: Commit**

```bash
git add plugin/skills/whiteboard/SKILL.md && git commit -m "refactor: rename skill to whiteboard:canvas, remove PROCESS-FLOWS reference"
```

---

### Task 3: Delete PROCESS-FLOWS.md from skill

**Files:**
- Delete: `plugin/skills/whiteboard/PROCESS-FLOWS.md`

**Step 1: Delete the file**

```bash
rm plugin/skills/whiteboard/PROCESS-FLOWS.md
```

**Step 2: Verify**

```bash
ls plugin/skills/whiteboard/
```

Expected: `EXCALIDRAW-SPEC.md  SKILL.md` (no PROCESS-FLOWS.md)

**Step 3: Commit**

```bash
git add -A && git commit -m "refactor: remove PROCESS-FLOWS.md from skill (moving to command)"
```

---

### Task 4: Create commands directory structure

**Files:**
- Create: `plugin/commands/whiteboard/` directory

**Step 1: Create the directory**

```bash
mkdir -p plugin/commands/whiteboard
```

**Step 2: Verify**

```bash
ls plugin/commands/
```

Expected: `whiteboard`

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: create whiteboard commands directory"
```

---

### Task 5: Create flow command

**Files:**
- Create: `plugin/commands/whiteboard/flow.md`

**Step 1: Create the command file**

Create `plugin/commands/whiteboard/flow.md` with the following content:

```markdown
---
description: Generate swimlane activity diagram as Excalidraw JSON
model: opus
---

## Output Requirements

You are generating **Excalidraw JSON** for a **swimlane activity diagram**.

**Format:** Valid Excalidraw JSON with an `elements` array
**Structure:** Vertical swimlanes with:
- Header row identifying actors/systems
- Process boxes flowing top-to-bottom
- Arrows with bound labels connecting steps

Output the raw JSON directly to chat - no markdown code fences, no explanation, just the JSON.

## Before You Generate

**BEFORE GENERATING ANY ELEMENTS: Read the Excalidraw spec:**
- `../skills/whiteboard/EXCALIDRAW-SPEC.md` - Element structure, bindings, JSON format

| If you think...       | Reality                                                    |
|-----------------------|------------------------------------------------------------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec.             |
| "It's urgent"         | Reading spec: 30 sec. Debugging broken JSON: 5 min.        |
| "I know Excalidraw"   | Training data is outdated. This spec is authoritative.     |

## Swimlane Specification

### Structure

**Vertical swimlane format:**
- Top-to-bottom flow direction
- Swimlane headers at top identifying actors/systems/stages
- Process boxes in lanes with matching colors
- Straight arrows connecting steps with bound labels

### Headers

Colored rectangles at top identifying each lane:
- Position: y=50, height=50
- Lane spacing: ~220px horizontal
- Style: strokeWidth=2, roughness=0, roundness={type:3}
- Must have bound text element for the label

### Color Palette

Use consistently per lane:

| Lane   | Stroke  | Header Fill | Box Fill (lighter) |
|--------|---------|-------------|-------------------|
| Blue   | #1971c2 | #a5d8ff     | #e7f5ff           |
| Green  | #2f9e44 | #b2f2bb     | #ebfbee           |
| Yellow | #f08c00 | #ffec99     | #fff9db           |
| Red    | #e03131 | #ffc9c9     | #fff5f5           |
| Purple | #9c36b5 | #eebefa     | #f8f0fc           |
| Teal   | #0c8599 | #99e9f2     | #e3fafc           |
| Pink   | #d6336c | #fcc2d7     | #fff0f6           |
| Gray   | #495057 | #dee2e6     | #f8f9fa           |

Assign colors to lanes in order of appearance. Use semantic grouping when obvious (e.g., user-facing=blue, backend=green, external services=yellow).

### Process Boxes

Boxes use the same lane color but with lighter fill:
- Size: 200x70 typical
- First row: y=140
- Row spacing: ~120px vertical
- Style: same strokeColor as lane header, lighter backgroundColor

**Critical: Boxes must declare ALL bound elements:**

```json
{
  "type": "rectangle",
  "strokeColor": "#1971c2",
  "backgroundColor": "#e7f5ff",
  "boundElements": [
    {"id": "box-text-id", "type": "text"},
    {"id": "incoming-arrow-id", "type": "arrow"},
    {"id": "outgoing-arrow-id", "type": "arrow"}
  ]
}
```

### Arrow Binding (Bidirectional - REQUIRED)

For arrows to stay connected when dragging, binding must be declared on BOTH sides:

1. **Box declares arrow** in its `boundElements` array
2. **Arrow declares box** in `startBinding` and `endBinding`

```json
{
  "type": "arrow",
  "roundness": null,
  "points": [[0, 0], [dx, dy]],
  "startBinding": {"elementId": "source-box-id", "focus": 0, "gap": 1},
  "endBinding": {"elementId": "target-box-id", "focus": 0, "gap": 1},
  "boundElements": [{"id": "label-id", "type": "text"}],
  "endArrowhead": "arrow"
}
```

**For straight arrows:** Use `roundness: null` and exactly 2 points.

### Arrow Labels

Labels bound to arrows move with them. The arrow must declare the label in `boundElements`, and the label must reference the arrow as its container:

```json
{
  "type": "text",
  "containerId": "arrow-id",
  "text": "webhook",
  "fontSize": 14,
  "textAlign": "center",
  "verticalAlign": "middle"
}
```

Use labels to describe what flows between steps (e.g., "HTTP request", "event", "callback").

## Input Handling

Process to visualize: $ARGUMENTS

If no arguments provided, ask the user: "What process do you want to visualize?"

Once you understand the process:
1. Analyze the codebase/conversation context to infer actors and steps
2. Generate the swimlane diagram following the spec above
3. Output raw JSON only
```

**Step 2: Verify file created**

```bash
head -5 plugin/commands/whiteboard/flow.md
```

Expected: Shows front matter with description and model: opus

**Step 3: Commit**

```bash
git add plugin/commands/whiteboard/flow.md && git commit -m "feat: add /whiteboard:flow command for swimlane diagrams"
```

---

### Task 6: Update plugin.json

**Files:**
- Modify: `plugin/.claude-plugin/plugin.json`

**Step 1: Update plugin.json**

Update `plugin/.claude-plugin/plugin.json` with new name, description, keywords, and bumped version:

```json
{
  "name": "whiteboard",
  "description": "Whiteboard plugin for Claude Code - canvas operations and diagram generation",
  "version": "0.8.0",
  "author": {
    "name": "Kristof Sajdak"
  },
  "repository": "https://github.com/kristofsajdak/claude-whiteboard",
  "license": "MIT",
  "keywords": ["canvas", "whiteboard", "excalidraw", "collaboration", "drawing", "diagrams", "swimlane"]
}
```

**Step 2: Verify**

```bash
cat plugin/.claude-plugin/plugin.json
```

Expected: Shows version 0.8.0 and name "whiteboard"

**Step 3: Commit**

```bash
git add plugin/.claude-plugin/plugin.json && git commit -m "chore: bump plugin version to 0.8.0, rename to whiteboard"
```

---

### Task 7: Verify final structure

**Step 1: Check directory structure**

```bash
find plugin -type f | grep -v node_modules | sort
```

Expected:
```
plugin/.claude-plugin/plugin.json
plugin/commands/whiteboard/flow.md
plugin/skills/whiteboard/EXCALIDRAW-SPEC.md
plugin/skills/whiteboard/SKILL.md
```

**Step 2: Verify skill name**

```bash
grep "^name:" plugin/skills/whiteboard/SKILL.md
```

Expected: `name: whiteboard:canvas`

**Step 3: Verify command model**

```bash
grep "^model:" plugin/commands/whiteboard/flow.md
```

Expected: `model: opus`

---

## Summary

After completing all tasks:
- `/whiteboard:flow` command generates swimlane activity diagrams (opus model)
- `/whiteboard:canvas` skill handles canvas I/O operations (haiku model)
- EXCALIDRAW-SPEC.md shared between both via relative path
- PROCESS-FLOWS.md content embedded in flow command
- Plugin version bumped to 0.8.0
