# Arrow Routing Reference

Complete guide for creating arrows between shapes. **Follow this for every arrow—no exceptions.**

---

## Edge Calculation Formulas

| Shape Type | Edge | Formula |
|------------|------|---------|
| Rectangle | Top | `(x + width/2, y)` |
| Rectangle | Bottom | `(x + width/2, y + height)` |
| Rectangle | Left | `(x, y + height/2)` |
| Rectangle | Right | `(x + width, y + height/2)` |
| Ellipse | Top | `(x + width/2, y)` |
| Ellipse | Bottom | `(x + width/2, y + height)` |

---

## Staggering Multiple Arrows

When multiple arrows leave from the same edge, spread them evenly to avoid overlap:

```
FUNCTION getStaggeredPositions(shape, edge, numArrows):
  positions = []
  FOR i FROM 0 TO numArrows-1:
    percentage = 0.2 + (0.6 * i / (numArrows - 1))

    IF edge == "bottom" OR edge == "top":
      x = shape.x + shape.width * percentage
      y = (edge == "bottom") ? shape.y + shape.height : shape.y
    ELSE:
      x = (edge == "right") ? shape.x + shape.width : shape.x
      y = shape.y + shape.height * percentage

    positions.append({x, y})
  RETURN positions

// Examples:
// 2 arrows: 20%, 80%
// 3 arrows: 20%, 50%, 80%
// 5 arrows: 20%, 35%, 50%, 65%, 80%
```

---

## Universal Arrow Routing Algorithm

```
FUNCTION createArrow(source, target, sourceEdge, targetEdge):
  // Step 1: Get edge points
  sourcePoint = getEdgePoint(source, sourceEdge)
  targetPoint = getEdgePoint(target, targetEdge)

  // Step 2: Calculate offsets
  dx = targetPoint.x - sourcePoint.x
  dy = targetPoint.y - sourcePoint.y

  // Step 3: Apply routeArrow (REQUIRED: follow Routing Logic section exactly)
  points = routeArrow(sourceEdge, targetEdge, dx, dy)

  // Step 4: Calculate bounding box
  width = max(abs(p[0]) for p in points)
  height = max(abs(p[1]) for p in points)

  RETURN {x: sourcePoint.x, y: sourcePoint.y, points, width, height}
```

### Routing Logic (routeArrow Implementation)

**This section defines `routeArrow()`. Follow it exactly—do not estimate or skip.**

| dx | dy | Meaning |
|----|-----|---------|
| positive | — | Target is RIGHT of source |
| negative | — | Target is LEFT of source |
| — | positive | Target is BELOW source |
| — | negative | Target is ABOVE source |

**Straight line** — when source and target edges are opposite and aligned:
```
IF edges are opposite AND offset in perpendicular direction < 10:
  points = [[0, 0], [dx, dy]]
```

**L-shape** — when edges are opposite but not aligned:
```
points = [[0, 0], [dx, 0], [dx, dy]]   // horizontal first
  — OR —
points = [[0, 0], [0, dy], [dx, dy]]   // vertical first
```

Choose direction based on diagram aesthetics. General heuristic: go perpendicular to source edge first.

**U-turn** — when source and target use the same edge (callbacks, returns):
```
clearance = 50  // pixels to extend before turning back
points = [[0, 0], [clearance, 0], [clearance, dy], [dx, dy]]  // right edge
points = [[0, 0], [0, clearance], [dx, clearance], [dx, dy]]  // bottom edge
// Negate clearance for left/top edges
```

---

## Arrow Bindings

### Coordinates and Bindings Must Match

Arrows have two positioning systems that **must be consistent**:

- **Coordinates** (`x`, `y`, `points`) — where the arrow is drawn
- **Bindings** (`startBinding`, `endBinding`) — which shape/edge it's connected to

If coordinates say "starts at Shape A's bottom" but binding says "left edge", the arrow will jump when edited in Excalidraw.

**Rule:** After choosing source/target edges in routing, use the fixedPoint table to set matching bindings.

### fixedPoint Values

| Edge | fixedPoint |
|------|------------|
| Top | `[0.5, 0]` |
| Bottom | `[0.5, 1]` |
| Left | `[0, 0.5]` |
| Right | `[1, 0.5]` |

### Binding Structure

```json
{
  "id": "arrow-workflow-convert",
  "type": "arrow",
  "x": 525,
  "y": 420,
  "width": 325,
  "height": 125,
  "points": [[0, 0], [-325, 0], [-325, 125]],
  "roughness": 0,
  "roundness": null,
  "elbowed": true,
  "startBinding": {
    "elementId": "cloud-workflows",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "convert-pdf-service",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 0]
  },
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

### Update Shape boundElements

Shapes must reference arrows in their `boundElements`:

```json
{
  "id": "cloud-workflows",
  "boundElements": [
    { "type": "text", "id": "cloud-workflows-text" },
    { "type": "arrow", "id": "arrow-workflow-convert" }
  ]
}
```

---

## Bidirectional Arrows

For two-way data flows:

```json
{
  "type": "arrow",
  "startArrowhead": "arrow",
  "endArrowhead": "arrow"
}
```

Arrowhead options: `null`, `"arrow"`, `"bar"`, `"dot"`, `"triangle"`

---

## Arrow Labels

Position standalone text near arrow midpoint:

```json
{
  "id": "arrow-api-db-label",
  "type": "text",
  "x": 305,
  "y": 245,
  "text": "SQL",
  "fontSize": 12,
  "containerId": null,
  "backgroundColor": "#ffffff"
}
```

**Positioning formula:**
- Vertical arrow: `label.y = arrow.y + (total_height / 2)`
- Horizontal arrow: `label.x = arrow.x + (total_width / 2)`
- L-shaped: Position at corner or longest segment midpoint

---

## Required Arrow Properties

For 90-degree elbow arrows, these three properties are required:

```json
{
  "type": "arrow",
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

| Property | Value | Purpose |
|----------|-------|---------|
| `roughness` | `0` | Clean lines (not hand-drawn) |
| `roundness` | `null` | Sharp corners (not curved) |
| `elbowed` | `true` | Enables 90-degree routing |

**Without all three, arrows will be curved instead of 90-degree elbows.**
