---
name: whiteboard:excalidraw
description: Use when user wants to convert to or from Excalidraw format
model: opus
---

# Excalidraw Converter Skill

## Scope

This skill handles **bidirectional conversion** between natural language descriptions and Excalidraw JSON format:
- **Natural Language → Excalidraw JSON**: Convert descriptions into valid Excalidraw diagrams
- **Excalidraw JSON → Natural Language**: Parse and describe existing Excalidraw diagrams

This skill does NOT handle:
- File I/O operations (reading/writing .excalidraw files)
- PlantUML conversion (handled by separate skill)

## Before You Generate

**BEFORE GENERATING ANY ELEMENTS: Read the Excalidraw spec:**
- [EXCALIDRAW-SPEC.md](EXCALIDRAW-SPEC.md) - Element structure, bindings, JSON format

| If you think...       | Reality                                                    |
|-----------------------|------------------------------------------------------------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec.             |
| "It's urgent"         | Reading spec: 30 sec. Debugging broken JSON: 5 min.        |
| "I know Excalidraw"   | Training data is outdated. This spec is authoritative.     |

## Direction Detection

Determine conversion direction from user input:

**Natural Language → Excalidraw JSON** if user:
- Asks to "create", "generate", "draw", "visualize", "diagram"
- Provides a description of a process, system, or concept
- Requests a specific diagram type (flowchart, activity, class, sequence, etc.)

**Excalidraw JSON → Natural Language** if user:
- Provides Excalidraw JSON content
- Asks to "describe", "explain", "summarize" an existing diagram
- Shares a .excalidraw file content for analysis

---

# Natural Language → Excalidraw JSON

## Diagram Type Detection

Analyze the user's description to determine diagram type:

| User Description Contains... | Diagram Type | Use Styling |
|------------------------------|--------------|-------------|
| "process", "workflow", "activity", "swimlane", "steps", "flow" | Activity/Process | Swimlane Styling |
| "class", "object", "inheritance", "UML", "architecture" | Class Diagram | Generic Styling |
| "sequence", "interaction", "message", "timeline" | Sequence Diagram | Generic Styling |
| Generic description without clear type indicators | Generic Diagram | Generic Styling |

## Swimlane Styling (Activity/Process Diagrams)

Use this styling for process flows, workflows, and activity diagrams.

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

## Generic Styling (Non-Activity Diagrams)

For class diagrams, sequence diagrams, and other non-process visualizations:

- Use standard Excalidraw colors from the default palette
- Stroke colors: `#1e1e1e` (black), `#e03131` (red), `#2f9e44` (green), `#1971c2` (blue), `#f08c00` (orange)
- Background colors: `transparent`, `#ffc9c9` (light red), `#b2f2bb` (light green), `#a5d8ff` (light blue), `#ffec99` (light yellow)
- Choose colors based on semantic meaning (e.g., classes=blue, interfaces=green, abstract=orange)
- Use consistent spacing and alignment
- Apply appropriate roughness (0=architect, 1=artist, 2=cartoonist) based on context

## Output Format

Output the **raw Excalidraw JSON** directly to chat:
- NO markdown code fences
- NO explanation before or after
- Just the JSON object with `elements` array

Example structure:
```
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {...element objects...}
  ],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

---

# Excalidraw JSON → Natural Language

## Parsing Strategy

When analyzing Excalidraw JSON:

1. **Identify diagram type** by examining element patterns:
   - Swimlane headers at y=50 → Activity/Process diagram
   - Rectangles with inheritance arrows → Class diagram
   - Time-ordered elements → Sequence diagram
   - Mixed elements → Generic diagram

2. **Extract structural information:**
   - Count elements by type (rectangles, arrows, text, etc.)
   - Identify groups and frames
   - Map bindings (which elements connect to which)

3. **Understand relationships:**
   - Follow arrow bindings to determine flow/connections
   - Read text elements to understand labels and content
   - Identify containers (text inside shapes, labels on arrows)

4. **Generate description** with structured output (see below)

## Output Format

Provide a clear, structured description:

```
**Diagram Type:** [Activity/Class/Sequence/Generic]

**Summary:** [One-sentence overview of what the diagram shows]

**Structure:**
- [Key structural observations, e.g., "3 swimlanes representing User, API, Database"]
- [Element counts if relevant, e.g., "8 process boxes, 12 connecting arrows"]

**Flow/Content:**
[Describe the main flow, relationships, or content in natural language]
- [Step 1 or Component 1]
- [Step 2 or Component 2]
- [etc.]

**Key Elements:**
- [Notable elements, labels, or annotations]

**Colors/Styling:**
- [Color scheme observations if semantically meaningful]
```

Example:
```
**Diagram Type:** Activity Diagram

**Summary:** A user authentication workflow showing the interaction between User, Frontend, Auth Service, and Database.

**Structure:**
- 4 vertical swimlanes (User, Frontend, Auth Service, Database)
- 6 process boxes
- 7 connecting arrows with labels

**Flow/Content:**
1. User enters credentials
2. Frontend validates input
3. Frontend sends login request to Auth Service
4. Auth Service queries Database
5. Database returns user record
6. Auth Service generates token
7. Frontend receives and stores token

**Key Elements:**
- Error path: "Invalid credentials" arrow from Auth Service back to Frontend
- Success path: Token generation and storage
- Color coding: Blue (User), Green (Frontend), Yellow (Auth Service), Red (Database)

**Colors/Styling:**
- Blue lane: User interactions
- Green lane: Frontend logic
- Yellow lane: Backend authentication
- Red lane: Data persistence
```
