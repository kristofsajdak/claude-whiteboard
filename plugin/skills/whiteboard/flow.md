---
name: whiteboard:flow
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
- [EXCALIDRAW-SPEC.md](EXCALIDRAW-SPEC.md) - Element structure, bindings, JSON format

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
