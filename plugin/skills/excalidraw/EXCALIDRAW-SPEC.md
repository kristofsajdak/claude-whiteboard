# Excalidraw Element Specification

Reference for generating valid Excalidraw elements (v0.17.x).

## Base Properties (All Elements)

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

## Element Types

### Rectangle, Diamond, Ellipse

```typescript
{
  type: "rectangle" | "diamond" | "ellipse",
  // Base properties only
}
```

### Text

```typescript
{
  type: "text",
  text: string,                    // The text content
  fontSize: number,                // e.g., 20
  fontFamily: number,              // 1=Virgil (hand), 2=Helvetica, 3=Cascadia (mono)
  textAlign: "left" | "center" | "right",
  verticalAlign: "top" | "middle", // For text in containers
  lineHeight: number,              // Multiplier, e.g., 1.25
  containerId: null | string,      // Parent shape ID if text is inside a shape
  originalText: string,            // Same as text (used for word wrap)
  autoResize: boolean,             // true = auto-size to fit text
}
```

### Arrow, Line

```typescript
{
  type: "arrow" | "line",
  points: number[][],              // [[0,0], [dx1,dy1], [dx2,dy2], ...]
  startBinding: null | {
    elementId: string,             // ID of shape at start
    focus: number,                 // -1 to 1, position along edge
    gap: number                    // Distance from shape edge
  },
  endBinding: null | {
    elementId: string,
    focus: number,
    gap: number
  },
  startArrowhead: null | "arrow" | "bar" | "dot" | "triangle",
  endArrowhead: null | "arrow" | "bar" | "dot" | "triangle",
  lastCommittedPoint: null | number[]
}
```

**Points are relative to (x, y)**. First point is always `[0, 0]`.

### Freedraw

```typescript
{
  type: "freedraw",
  points: number[][],              // [[0,0], [dx1,dy1], ...]
  pressures: number[],             // Pressure at each point (0-1)
  simulatePressure: boolean        // true = generate pressure from speed
}
```

### Image

```typescript
{
  type: "image",
  fileId: string,                  // Reference to files object
  status: "pending" | "saved" | "error",
  scale: [number, number]          // [scaleX, scaleY]
}
```

Images require a separate `files` object in the canvas data.

### Frame

```typescript
{
  type: "frame",
  name: null | string              // Frame label
}
```

Elements inside a frame have `frameId` set to the frame's ID.

## Bindings (Connecting Arrows to Shapes)

To connect an arrow to shapes:

1. Create the shapes with `boundElements` listing the arrow:

```json
{
  "id": "shape-1",
  "type": "rectangle",
  "boundElements": [
    {
      "id": "arrow-1",
      "type": "arrow"
    }
  ]
}
```

2. Create the arrow with bindings:

```json
{
  "id": "arrow-1",
  "type": "arrow",
  "startBinding": {
    "elementId": "shape-1",
    "focus": 0,
    "gap": 1
  },
  "endBinding": {
    "elementId": "shape-2",
    "focus": 0,
    "gap": 1
  }
}
```

**Focus**: -1 = left/top edge, 0 = center, 1 = right/bottom edge

## Text Inside Shapes

To put text inside a shape:

1. Shape references the text:

```json
{
  "id": "rect-1",
  "type": "rectangle",
  "boundElements": [
    {
      "id": "text-1",
      "type": "text"
    }
  ]
}
```

2. Text references the container:

```json
{
  "id": "text-1",
  "type": "text",
  "containerId": "rect-1",
  "verticalAlign": "middle",
  "textAlign": "center"
}
```

Text position (x, y) should be inside the container bounds.

## Groups

To group elements:

1. Generate a group ID: `"group-{timestamp}-{random}"`
2. Add the ID to each element's `groupIds` array

Elements can belong to multiple groups (nested groups).

## Common Patterns

### Flowchart Box with Label

```json
[
  {
    "id": "box-1",
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 150,
    "height": 60,
    "strokeColor": "#1e1e1e",
    "backgroundColor": "#a5d8ff",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "angle": 0,
    "seed": 12345,
    "version": 1,
    "versionNonce": 67890,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": [
      {
        "id": "text-1",
        "type": "text"
      }
    ],
    "updated": 1704567890000,
    "link": null,
    "locked": false,
    "frameId": null,
    "roundness": {
      "type": 3
    }
  },
  {
    "id": "text-1",
    "type": "text",
    "x": 130,
    "y": 120,
    "width": 90,
    "height": 25,
    "text": "User Service",
    "fontSize": 20,
    "fontFamily": 1,
    "textAlign": "center",
    "verticalAlign": "middle",
    "lineHeight": 1.25,
    "containerId": "box-1",
    "originalText": "User Service",
    "autoResize": true,
    "strokeColor": "#1e1e1e",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 1,
    "opacity": 100,
    "angle": 0,
    "seed": 11111,
    "version": 1,
    "versionNonce": 22222,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "updated": 1704567890000,
    "link": null,
    "locked": false,
    "frameId": null,
    "roundness": null
  }
]
```

### Connected Arrow

```json
{
  "id": "arrow-1",
  "type": "arrow",
  "x": 250,
  "y": 130,
  "width": 100,
  "height": 0,
  "points": [
    [
      0,
      0
    ],
    [
      100,
      0
    ]
  ],
  "startBinding": {
    "elementId": "box-1",
    "focus": 0,
    "gap": 1
  },
  "endBinding": {
    "elementId": "box-2",
    "focus": 0,
    "gap": 1
  },
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "lastCommittedPoint": null,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "seed": 33333,
  "version": 1,
  "versionNonce": 44444,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "updated": 1704567890000,
  "link": null,
  "locked": false,
  "frameId": null,
  "roundness": {
    "type": 2
  }
}
```

## Color Palette (Excalidraw Defaults)

**Stroke colors**: `#1e1e1e` (black), `#e03131` (red), `#2f9e44` (green), `#1971c2` (blue), `#f08c00` (orange)

**Background colors**: `transparent`, `#ffc9c9` (light red), `#b2f2bb` (light green), `#a5d8ff` (light blue), `#ffec99` (light yellow)

## ID Generation

Use format: `{type}-{timestamp}-{random4chars}`

Example: `"rectangle-1704567890123-x7k2"`
