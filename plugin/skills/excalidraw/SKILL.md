---
name: excalidraw
description: Use when user wants to create, read, or convert diagrams to/from Excalidraw format
model: opus
---

# Excalidraw Converter Skill

## Scope

This skill handles **bidirectional conversion** between any notation/format and Excalidraw JSON:

- **Any Source → Excalidraw JSON**: Convert descriptions, PlantUML, or other formats into Excalidraw diagrams
- **Excalidraw JSON → Any Target**: Parse Excalidraw and output as natural language description or PlantUML

Supported formats:
- Natural language descriptions
- PlantUML syntax
- Excalidraw JSON

This skill does NOT handle:
- File I/O operations (use whiteboard skill for canvas read/write)

## Before You Generate

**BEFORE GENERATING ANY ELEMENTS: Read the relevant spec:**

- [EXCALIDRAW-SPEC.md](EXCALIDRAW-SPEC.md) - Element structure, bindings, JSON format
- [PLANTUML-SPEC.md](PLANTUML-SPEC.md) - PlantUML syntax (when source/target is PlantUML)

| If you think...       | Reality                                                |
|-----------------------|--------------------------------------------------------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec.         |
| "It's urgent"         | Reading spec: 30 sec. Debugging broken output: 5 min.  |
| "I know the format"   | Training data is outdated. These specs are authoritative. |

## Direction Detection

Determine conversion direction from user input:

**→ Excalidraw JSON** (generating) if user:
- Asks to "create", "generate", "draw", "visualize", "diagram"
- Provides PlantUML code (`@startuml`/`@enduml`)
- Provides a natural language description

**Excalidraw JSON →** (parsing) if user:
- Provides Excalidraw JSON content
- Asks to "describe", "explain", "summarize", "convert to PlantUML"
- Shares canvas content for analysis

---

# Generating Excalidraw JSON

## Source Detection

| Source Contains... | Source Type | Action |
|--------------------|-------------|--------|
| `@startuml`/`@enduml` | PlantUML | Parse PlantUML structure, generate Excalidraw |
| Natural language description | Text | Analyze description, generate Excalidraw |
| Excalidraw JSON | Already Excalidraw | No conversion needed |

## From PlantUML

When source is PlantUML:

1. **Read [PLANTUML-SPEC.md](PLANTUML-SPEC.md)** for syntax reference
2. **Identify diagram type** from content:
   - `start`/`stop` with `:action;` → Activity diagram → Use swimlane styling
   - `class`/`interface` → Class diagram → Use generic styling
   - `participant` → Sequence diagram → Use generic styling
   - `[*]` transitions → State diagram → Use generic styling
3. **Extract structure**: actors, steps, relationships, conditions
4. **Generate Excalidraw** using appropriate styling below

## From Natural Language

When source is a description:

1. **Detect diagram type** from keywords:

| Description Contains... | Diagram Type | Use Styling |
|------------------------|--------------|-------------|
| "process", "workflow", "activity", "swimlane", "steps", "flow" | Activity/Process | Swimlane Styling |
| "class", "object", "inheritance", "UML", "architecture" | Class Diagram | Generic Styling |
| "sequence", "interaction", "message", "timeline" | Sequence Diagram | Generic Styling |
| Generic without clear type | Generic | Generic Styling |

2. **Extract structure** from the description
3. **Generate Excalidraw** using appropriate styling

---

## Swimlane Styling (Activity/Process Diagrams)

Use for process flows, workflows, and activity diagrams.

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
|--------|---------|-------------|---------------------|
| Blue   | #1971c2 | #a5d8ff     | #e7f5ff             |
| Green  | #2f9e44 | #b2f2bb     | #ebfbee             |
| Yellow | #f08c00 | #ffec99     | #fff9db             |
| Red    | #e03131 | #ffc9c9     | #fff5f5             |
| Purple | #9c36b5 | #eebefa     | #f8f0fc             |
| Teal   | #0c8599 | #99e9f2     | #e3fafc             |
| Pink   | #d6336c | #fcc2d7     | #fff0f6             |
| Gray   | #495057 | #dee2e6     | #f8f9fa             |

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

Labels bound to arrows move with them:

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

---

## Generic Styling (Non-Activity Diagrams)

For class diagrams, sequence diagrams, and other non-process visualizations:

- Stroke colors: `#1e1e1e` (black), `#e03131` (red), `#2f9e44` (green), `#1971c2` (blue), `#f08c00` (orange)
- Background colors: `transparent`, `#ffc9c9` (light red), `#b2f2bb` (light green), `#a5d8ff` (light blue), `#ffec99` (light yellow)
- Choose colors based on semantic meaning (e.g., classes=blue, interfaces=green, abstract=orange)
- Use consistent spacing and alignment
- Apply appropriate roughness (0=architect, 1=artist, 2=cartoonist) based on context

---

## Output Format

Output the **raw Excalidraw JSON** directly to chat:
- NO markdown code fences
- NO explanation before or after
- Just the JSON object with `elements` array

```
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {"gridSize": null, "viewBackgroundColor": "#ffffff"},
  "files": {}
}
```

---

# Parsing Excalidraw JSON

## To Natural Language

When user wants a description of Excalidraw content:

1. **Identify diagram type** by examining element patterns:
   - Swimlane headers at y=50 → Activity/Process diagram
   - Rectangles with inheritance arrows → Class diagram
   - Time-ordered elements → Sequence diagram

2. **Extract structural information:**
   - Count elements by type
   - Identify groups and frames
   - Map bindings (which elements connect to which)

3. **Output structured description:**

```
**Diagram Type:** [Activity/Class/Sequence/Generic]

**Summary:** [One-sentence overview]

**Structure:**
- [Key structural observations]

**Flow/Content:**
- [Step 1 or Component 1]
- [Step 2 or Component 2]

**Key Elements:**
- [Notable elements, labels, annotations]
```

## To PlantUML

When user wants PlantUML output from Excalidraw:

1. **Read [PLANTUML-SPEC.md](PLANTUML-SPEC.md)** for syntax reference
2. **Identify diagram type** from Excalidraw structure
3. **Map elements to PlantUML syntax:**

| Excalidraw Pattern | PlantUML Output |
|--------------------|-----------------|
| Swimlane headers + flow boxes | Activity diagram with `\|Lane\|` markers |
| Rectangles with class-like text | Class diagram with `class Name {}` |
| Vertical timeline with messages | Sequence diagram with `participant` |
| State boxes with transitions | State diagram with `[*]` and arrows |

4. **Generate PlantUML** with proper syntax:

```plantuml
@startuml
[diagram content based on Excalidraw structure]
@enduml
```

### Mapping Examples

**Activity diagram (from swimlanes):**
- Swimlane header text → `|Actor Name|`
- Process box text → `:Action text;`
- Conditional branches → `if (condition?) then (yes) ... else (no) ... endif`
- Arrow labels → transition annotations

**Class diagram:**
- Rectangle with sections → `class Name { fields -- methods }`
- Arrow with hollow head → `<|--` (inheritance)
- Arrow with filled diamond → `*--` (composition)

---

## Guidelines

1. **Always read the relevant spec first** - Don't rely on training data
2. **Detect source/target format** from content and user intent
3. **Use appropriate styling** - Swimlane for processes, generic for others
4. **Preserve semantics** - Arrow types and relationships matter
5. **Validate bindings** - Both sides must reference each other
6. **Output clean JSON** - No markdown fences, proper formatting
