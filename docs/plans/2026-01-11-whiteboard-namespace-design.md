# Whiteboard Namespace Design

Introduce `whiteboard:` namespace with a new `/whiteboard:flow` command and rename existing skill to `whiteboard:canvas`.

## Overview

- **New command:** `/whiteboard:flow` - generates swimlane activity diagrams as Excalidraw JSON
- **Renamed skill:** `canvas:canvas` → `whiteboard:canvas` - handles canvas I/O operations
- **Separation of concerns:** Command generates JSON, skill handles canvas operations

## `/whiteboard:flow` Command

### Behavior

1. Accepts inline argument: `/whiteboard:flow OAuth login flow`
2. Or prompts interactively: "What process do you want to visualize?"
3. Analyzes codebase/context to infer actors and steps
4. Outputs raw Excalidraw JSON directly to chat

### Model

`opus` - complex reasoning to infer actors/steps from codebase context

### File Structure

```markdown
---
description: Generate swimlane activity diagram as Excalidraw JSON
model: opus
---

## Output Requirements

[Excalidraw JSON, swimlane activity diagram, raw output]

## Before You Generate

[Rationalization table, link to EXCALIDRAW-SPEC.md]

## Swimlane Specification

[Colors, dimensions, bindings - content from PROCESS-FLOWS.md]

## Input Handling

[If $ARGUMENTS provided use it, otherwise prompt]
```

### Output Requirements Section

```markdown
## Output Requirements

You are generating **Excalidraw JSON** for a **swimlane activity diagram**.

**Format:** Valid Excalidraw JSON with an `elements` array
**Structure:** Vertical swimlanes with:
- Header row identifying actors/systems
- Process boxes flowing top-to-bottom
- Arrows with bound labels connecting steps

Output the raw JSON directly to chat - no markdown code fences, no explanation, just the JSON.
```

### Guard Rails Section

```markdown
## Before You Generate

**BEFORE GENERATING ANY ELEMENTS: Read the Excalidraw spec:**
- `../skills/whiteboard/EXCALIDRAW-SPEC.md` - Element structure, bindings, JSON format

| If you think...       | Reality                                                    |
|-----------------------|------------------------------------------------------------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec.             |
| "It's urgent"         | Reading spec: 30 sec. Debugging broken JSON: 5 min.        |
| "I know Excalidraw"   | Training data is outdated. This spec is authoritative.     |
```

## `/whiteboard:canvas` Skill

### Changes

- Rename from `canvas:canvas` to `whiteboard:canvas`
- Remove reference to PROCESS-FLOWS.md
- Keep model as `haiku` (simple I/O operations)

## Shared Resources

EXCALIDRAW-SPEC.md stays in `plugin/skills/whiteboard/` - the command references it via relative path `../skills/whiteboard/EXCALIDRAW-SPEC.md`.

## File Changes

### Create

- `plugin/commands/whiteboard/flow.md` - new command

### Rename

- `plugin/skills/canvas/` → `plugin/skills/whiteboard/`

### Delete

- `plugin/skills/whiteboard/PROCESS-FLOWS.md` (content moves to command)

### Update

- `plugin/skills/whiteboard/SKILL.md` - name to `whiteboard:canvas`, remove PROCESS-FLOWS.md reference
- `plugin/.claude-plugin/plugin.json` - bump version
