# Excalidraw JSON Format Reference

Complete reference for Excalidraw JSON structure and element types.

---

## BANNED: Diamond Shapes

**NEVER use `type: "diamond"` in generated diagrams.**

Diamond arrow connections are fundamentally broken in raw Excalidraw JSON:

- Excalidraw applies `roundness` to diamond vertices during rendering
- Visual edges appear offset from mathematical edge points
- No offset formula reliably compensates
- Arrows appear disconnected/floating

**Use styled rectangles instead** for visual distinction:

| Semantic Meaning | Rectangle Style |
|------------------|-----------------|
| Decision Point   | dashed stroke   |

---

## Required Element Properties

Every element requires these properties:

```typescript
{
  id: string,              // Unique ID, e.g., "rect-1704567890-a1b2"
  type: string,            // Element type (see below)
  x: number,               // X position
  y: number,               // Y position
  width: number,           // Width (ignored for lines/arrows)
  height: number,          // Height (ignored for lines/arrows)
  angle: number,           // Rotation in radians (0 = no rotation)
  strokeColor: string,     // Border color, e.g., "#1e1e1e"
  backgroundColor: string, // Fill color or "transparent"
  fillStyle: string,       // "solid" | "hachure" | "cross-hatch"
  strokeWidth: number,     // 1 (thin) | 2 (medium) | 4 (thick)
  strokeStyle: string,     // "solid" | "dashed" | "dotted"
  roughness: number,       // 0 (architect) | 1 (artist) | 2 (cartoonist)
  opacity: number,         // 0-100
  seed: number,            // Random int for roughjs rendering
  version: number,         // Increment on each change (start at 1)
  versionNonce: number,    // Random int, changes with version
  isDeleted: boolean,      // false for visible elements
  groupIds: string[],      // IDs of groups this element belongs to
  boundElements: null | Array<{id: string, type: "arrow" | "text"}>,
  updated: number,         // Timestamp ms
  link: null | string,     // URL link
  locked: boolean,         // Prevent editing
  frameId: null | string,  // Parent frame ID
  roundness: null | {type: number}  // null=sharp, {type:2}=small, {type:3}=large
}
```

---

## Text Inside Shapes (Labels)

**Every labeled shape requires TWO elements:**

### Shape with boundElements

```json
{
  "id": "{component-id}",
  "type": "rectangle",
  "x": 500,
  "y": 200,
  "width": 200,
  "height": 90,
  "strokeColor": "#1971c2",
  "backgroundColor": "#a5d8ff",
  "boundElements": [
    {
      "type": "text",
      "id": "{component-id}-text"
    }
  ]
  // ... other required properties
}
```

### Text with containerId

```json
{
  "id": "{component-id}-text",
  "type": "text",
  "x": 505,
  // shape.x + 5
  "y": 220,
  // shape.y + (shape.height - text.height) / 2
  "width": 190,
  // shape.width - 10
  "height": 50,
  "text": "{Component Name}\n{Subtitle}",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "{component-id}",
  "originalText": "{Component Name}\n{Subtitle}",
  "lineHeight": 1.25
  // ... other required properties
}
```

### DO NOT Use the `label` Property

The `label` property is for the JavaScript API, NOT raw JSON files:

```json
// WRONG - will show empty boxes
{
  "type": "rectangle",
  "label": {
    "text": "My Label"
  }
}

// CORRECT - requires TWO elements
// 1. Shape with boundElements reference
// 2. Separate text element with containerId
```

### Text Positioning

- Text `x` = shape `x` + 5
- Text `y` = shape `y` + (shape.height - text.height) / 2
- Text `width` = shape `width` - 10
- Use `\n` for multi-line labels
- Always use `textAlign: "center"` and `verticalAlign: "middle"`

### ID Naming Convention

Always use pattern: `{shape-id}-text` for text element IDs.

---

## Groups

To group elements:

1. Generate a group ID: `"group-{timestamp}-{random}"`
2. Add the ID to each element's `groupIds` array

Elements can belong to multiple groups (nested groups).
