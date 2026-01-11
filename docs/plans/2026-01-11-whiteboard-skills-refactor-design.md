# Whiteboard Skills Refactor Design

Refactor skills to use natural language as intermediate format, with clear separation of concerns.

## Overview

Three skills with distinct responsibilities:

| Skill | Responsibility | Trigger |
|-------|---------------|---------|
| `whiteboard:whiteboard` | I/O operations (connect, read, write) | "interact with whiteboard" |
| `whiteboard:excalidraw` | Natural language ↔ Excalidraw JSON (bidirectional) | "convert to/from excalidraw" |
| `whiteboard:plantuml` | PlantUML ↔ Natural language (bidirectional) | "convert to/from plantuml" |

## Architecture

Natural language as universal intermediate:

```
PlantUML ↔ Natural Language ↔ Excalidraw JSON ↔ Whiteboard
              ↑
        User can inspect/edit
```

User controls the pipeline via sequential prompts. Skills don't auto-chain.

## Skill Definitions

### `whiteboard:whiteboard`

**File:** `plugin/skills/whiteboard/whiteboard.md`

**Description:** `Use when user wants to interact with a whiteboard`

**Responsibility:** Connect, read, write, savepoints. Pure I/O.

**References:** None (no format conversion)

### `whiteboard:excalidraw`

**File:** `plugin/skills/whiteboard/excalidraw.md`

**Description:** `Use when user wants to convert to or from Excalidraw format`

**Responsibility:**
- Natural language → Excalidraw JSON
- Excalidraw JSON → Natural language

**Conditional styling inside skill:**
- If process/workflow/activity diagram → apply swimlane styling (colors, lanes, bindings)
- If other diagram types → apply generic styling

**References:** `EXCALIDRAW-SPEC.md`

**Key sections to preserve:**
```markdown
**BEFORE GENERATING ANY ELEMENTS: Read the Excalidraw spec:**
- [EXCALIDRAW-SPEC.md](EXCALIDRAW-SPEC.md) - Element structure, bindings, JSON format

| If you think...       | Reality                                                    |
|-----------------------|------------------------------------------------------------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec.             |
| "It's urgent"         | Reading spec: 30 sec. Debugging broken JSON: 5 min.        |
| "I know Excalidraw"   | Training data is outdated. This spec is authoritative.     |
```

### `whiteboard:plantuml`

**File:** `plugin/skills/whiteboard/plantuml.md`

**Description:** `Use when user wants to convert to or from PlantUML format`

**Responsibility:**
- PlantUML → Natural language description
- Natural language description → PlantUML

**References:** `PLANTUML-SPEC.md` (to be created)

## Example User Flows

### Flow 1: PlantUML activity → Whiteboard

```
User: "Convert this PlantUML to natural language"
→ whiteboard:plantuml (outputs description)

User: "Convert to excalidraw as a swimlane activity diagram"
→ whiteboard:excalidraw (outputs JSON, applies swimlane styling)

User: "Push this to the whiteboard"
→ whiteboard:whiteboard (pushes JSON)
```

### Flow 2: Natural language → Whiteboard

```
User: "Convert this process description to excalidraw swimlane"
→ whiteboard:excalidraw (outputs JSON)

User: "Add to whiteboard"
→ whiteboard:whiteboard (pushes JSON)
```

### Flow 3: Whiteboard → PlantUML

```
User: "Get the current whiteboard content"
→ whiteboard:whiteboard (returns JSON)

User: "Convert to natural language"
→ whiteboard:excalidraw (outputs description)

User: "Convert to PlantUML"
→ whiteboard:plantuml (outputs PlantUML)
```

### Flow 4: Class diagram (non-activity)

```
User: "Convert this PlantUML class diagram to excalidraw"
→ whiteboard:plantuml (outputs description)
→ whiteboard:excalidraw (outputs JSON, generic styling - no swimlanes)
```

## File Structure

```
plugin/skills/whiteboard/
├── whiteboard.md        → whiteboard:whiteboard (I/O)
├── excalidraw.md        → whiteboard:excalidraw (NL ↔ Excalidraw)
├── plantuml.md          → whiteboard:plantuml (PlantUML ↔ NL)
├── EXCALIDRAW-SPEC.md   → Element spec (referenced by excalidraw.md)
└── PLANTUML-SPEC.md     → PlantUML syntax (referenced by plantuml.md)
```

## Files to Delete

- `plugin/skills/whiteboard/activity.md` (merged into excalidraw.md)
- `plugin/skills/whiteboard/canvas.md` (renamed to whiteboard.md)

## Changes Summary

| Current | New | Action |
|---------|-----|--------|
| `canvas.md` | `whiteboard.md` | Rename, update name/description |
| `activity.md` | `excalidraw.md` | Replace with bidirectional converter, keep swimlane styling as conditional |
| - | `plantuml.md` | Create new |
| - | `PLANTUML-SPEC.md` | Create new |

## Plugin Metadata

Update `plugin.json` and `marketplace.json`:
- Version: 0.11.0
- Keywords: add "plantuml", "natural language"
