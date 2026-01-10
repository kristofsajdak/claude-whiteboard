# Canvas Skill Model Routing Design

Performance optimization for the canvas skill through intelligent model routing.

## Problem

The canvas skill runs on Opus for all operations, including simple curl commands. This causes:
- Unnecessary latency (extended thinking for trivial operations)
- Higher cost (Opus pricing for `GET /api/canvas`)
- No benefit for mechanical operations

Previous attempts to use Haiku subagents failed because:
1. Subagents inherit parent's thinking mode - can't disable per-subagent
2. Task tool overhead may negate savings for simple curl commands
3. Known bug: MAX_THINKING_TOKENS forces all requests to use thinking

## Solution: Model Routing via Skill Frontmatter

Skills can specify `model: haiku` in frontmatter to override the conversation's model. The canvas skill runs on Haiku by default, escalating to Opus only for complex work.

### Architecture

```
┌────────────────────────────────────────────────────────┐
│  Canvas Skill (model: haiku)                           │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Admin Ops          Mechanical Ops      Semantic Ops   │
│  ───────────        ──────────────      ────────────   │
│  • get              • add shape         • "draw X"     │
│  • savepoint        • edit label        • flowcharts   │
│  • rollback         • change prop       • positioning  │
│  • history          • delete            • connections  │
│                     • clear                            │
│       │                   │                  │         │
│       ▼                   ▼                  ▼         │
│   curl direct      Haiku templates    Task(model:opus) │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Operation Classification

### Admin Operations (Haiku direct curl)

| Operation | Implementation |
|-----------|----------------|
| canvas_get | `curl GET /api/canvas` |
| canvas_savepoint | `curl POST /api/savepoints` |
| canvas_rollback | `curl POST /api/savepoints/:name` |
| canvas_history | `curl GET /api/savepoints` |

### Mechanical Operations (Haiku templates)

Single-element modifications using predefined templates:

| Operation | Implementation |
|-----------|----------------|
| Add single shape | Template with random position |
| Edit label/text | Find element, update `text` field |
| Change property | Find element, update single field |
| Delete element | Find element, remove from array |
| Clear canvas | Set elements to `[]` |

**Element finding strategy:**
- Search by `text` field (for text/labels)
- Search by `type` + approximate position if described
- If ambiguous → defer to Opus

### Semantic Operations (Opus subagent)

Complex modifications requiring understanding:

| Operation | Why Opus needed |
|-----------|-----------------|
| "Add a box for the auth service" | Intent → meaningful label |
| "Draw a flowchart" | Multi-element + layout + connections |
| Position-aware placement | "Add a box below the header" |
| Create connections/arrows | Understanding relationships |
| Complex styling | "Make it look professional" |

**Opus subagent prompt template:**
```
You are generating Excalidraw JSON for a collaborative whiteboard.

CURRENT CANVAS STATE:
{canvas_json}

USER REQUEST:
{user_request}

INSTRUCTIONS:
1. Read the Excalidraw spec at plugin://canvas/EXCALIDRAW-SPEC.md
2. Analyze the current canvas to understand existing elements and layout
3. Generate the minimal JSON changes needed to fulfill the request
4. Return ONLY the complete updated elements array - no explanation

CONSTRAINTS:
- Preserve all existing element IDs
- Position new elements to avoid overlap with existing ones
- Use consistent styling with existing elements when appropriate
- Generate valid UUIDs for new element IDs
```

## Decision Flow

```
┌─────────────────────────────────────────┐
│         User Request Received           │
└───────────────────┬─────────────────────┘
                    ▼
┌─────────────────────────────────────────┐
│     Classify operation type             │
└───────────────────┬─────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌───────────┐   ┌───────────┐
│ Admin   │   │ Mechanical│   │ Semantic  │
└────┬────┘   └─────┬─────┘   └─────┬─────┘
     │              │               │
     ▼              ▼               ▼
┌─────────┐   ┌───────────┐   ┌───────────┐
│ Haiku   │   │ Haiku     │   │ Opus      │
│ curl    │   │ template  │   │ subagent  │
│ direct  │   │ + modify  │   │           │
└─────────┘   └───────────┘   └───────────┘
```

**Classification heuristic (Haiku applies):**

Defer to Opus if the request contains:
- Concepts requiring interpretation ("auth service", "user flow")
- Spatial relationships ("below", "next to", "connected to")
- Multi-element scope ("flowchart", "diagram", "sequence")
- Aesthetic judgments ("professional", "clean", "organized")

**When in doubt, defer to Opus.**

## Haiku Mechanical Templates

### Add Single Shape

```json
{
  "id": "{type}-{timestamp}-{random4chars}",
  "type": "rectangle",
  "x": {random 100-500},
  "y": {random 100-400},
  "width": 200,
  "height": 100,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roundness": { "type": 3 }
}
```

### Edit Label/Text

1. Find element where `text` contains search string (case-insensitive)
2. Replace `text` field with new value
3. Keep all other properties unchanged

### Change Property

1. Find element by text content or description
2. Update single field: `strokeColor`, `backgroundColor`, `width`, `height`, `fontSize`
3. Keep all other properties unchanged

### Delete Element

1. Find element by text content
2. Remove from elements array

### Clear Canvas

1. Set elements to `[]`

## Skill File Structure

```markdown
---
name: canvas
description: Interact with shared Excalidraw whiteboard...
model: haiku
---

[Spec requirement section]

## Connection

Store the canvas URL for subsequent operations.

**Guidelines:**
- Always verify health (`GET /health`) before any operation
- All curl commands need `dangerouslyDisableSandbox` for localhost access

## Admin Operations (direct curl)

GET, savepoint, rollback, history operations.

**Guidelines:**
- Summarize, don't dump - describe canvas contents in natural language

## Mechanical Operations (Haiku templates)

Single-element add/edit/delete using templates.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`

## Semantic Operations (Opus subagent)

Complex modifications requiring understanding.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`
- Create savepoints before big changes - suggest proactively
```

## Expected Benefits

| Metric | Improvement |
|--------|-------------|
| Latency | Admin/mechanical ops ~3x faster (no extended thinking) |
| Cost | Most operations avoid Opus pricing |
| Quality | Complex work still gets Opus reasoning |

## Implementation Notes

- The `model: haiku` frontmatter is supported per Claude Code documentation
- Task tool accepts `model: opus` parameter for subagent spawning
- EXCALIDRAW-SPEC.md requirement remains mandatory for both tiers
