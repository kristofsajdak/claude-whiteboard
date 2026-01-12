# Arrow Routing Reference

Principles-based guide for creating arrows between shapes.

---

## Routing Principles

Route arrows based on visual judgment with full diagram awareness.

| Principle | Guidance |
|-----------|----------|
| **Prefer straight lines** | Diagonal lines are fine - simpler and easier to edit |
| **Elbows only when needed** | Use elbows to route around shapes or other arrows |
| **Avoid crossing arrows** | Check existing arrows before routing; go around if possible |
| **Spread from same edge** | Multiple arrows from one edge should be visually distributed |
| **Breathing room** | Don't crowd edges; leave visual comfort space |
| **Consider full diagram** | Route all arrows with awareness of each other, not in isolation |
| **Don't share edge positions** | Different arrows to/from same shape must use different edge positions |

**The "step back and look" test:** After mentally placing an arrow, ask: "If I drew this on a whiteboard, would it look clean?" If not, adjust.

### Loop Arrows (Feedback Paths)

Loop arrows (e.g., "Incomplete" returning to a previous step) require special care:

1. **Never draw straight through boxes** - A loop must route AROUND any shapes in its path
2. **Use elbows liberally** - Go around the outside of the diagram
3. **Enter on a different edge** - If another arrow exits from the left, enter from the right

Use elbowed arrows with enough waypoints to cleanly route around all obstacles.

---

## Arrow Structure

**Straight arrows (most cases):**

```json
{
  "type": "arrow",
  "x": 350,
  "y": 200,
  "points": [[0, 0], [150, 120]],
  "startBinding": {
    "elementId": "source-shape",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "target-shape",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.3, 0]
  },
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

**Elbowed arrows (routing around obstacles):**

When you need to route around shapes or other arrows, add intermediate points:

```json
{
  "type": "arrow",
  "x": 350,
  "y": 200,
  "points": [[0, 0], [100, 0], [100, 150], [200, 150]],
  "roughness": 0,
  "roundness": null,
  "elbowed": true,
  "startBinding": { ... },
  "endBinding": { ... },
  "endArrowhead": "arrow"
}
```

Use as many points as needed to cleanly route around obstacles.

**Required properties for elbowed arrows:**

| Property | Value | Purpose |
|----------|-------|---------|
| `roughness` | `0` | Clean lines |
| `roundness` | `null` | Sharp corners |
| `elbowed` | `true` | Enables 90-degree routing |

These three properties are only required when `points` has more than 2 entries.

---

## Arrow Bindings

### Coordinates and Bindings Must Match

Arrows have two positioning systems that **must be consistent**:

- **Coordinates** (`x`, `y`, `points`) - where the arrow is drawn
- **Bindings** (`startBinding`, `endBinding`) - which shape/edge it connects to

If coordinates and bindings don't match, the arrow will "jump" when edited in Excalidraw.

**CRITICAL: Derive coordinates FROM fixedPoint, not the reverse.**

### Step-by-Step: Creating a Bound Arrow

1. **Decide connection points** - Choose which edge/position on each shape:
   - Source: e.g., bottom center = `[0.5, 1]`
   - Target: e.g., top center = `[0.5, 0]`

2. **Calculate arrow start coordinates** from source shape + fixedPoint:
   ```
   arrow.x = source.x + (startFixedPoint[0] × source.width)
   arrow.y = source.y + (startFixedPoint[1] × source.height)
   ```

3. **Calculate arrow end coordinates** from target shape + fixedPoint:
   ```
   end_x = target.x + (endFixedPoint[0] × target.width)
   end_y = target.y + (endFixedPoint[1] × target.height)
   ```

4. **Set the last point** in the points array:
   ```
   points[last] = [end_x - arrow.x, end_y - arrow.y]
   ```

### Example Calculation

Source box: `{x: 100, y: 200, width: 200, height: 70}`
Target box: `{x: 400, y: 350, width: 200, height: 70}`

Want: bottom-center of source → top-center of target

```
startFixedPoint = [0.5, 1]  // bottom center
endFixedPoint = [0.5, 0]    // top center

arrow.x = 100 + (0.5 × 200) = 200
arrow.y = 200 + (1 × 70) = 270

end_x = 400 + (0.5 × 200) = 500
end_y = 350 + (0 × 70) = 350

points = [[0, 0], [500 - 200, 350 - 270]] = [[0, 0], [300, 80]]
```

### fixedPoint Reference

| Edge | fixedPoint |
|------|------------|
| Top center | `[0.5, 0]` |
| Bottom center | `[0.5, 1]` |
| Left center | `[0, 0.5]` |
| Right center | `[1, 0.5]` |

For non-center positions, calculate the actual fraction (e.g., `[0.3, 1]` = bottom edge at 30% from left).

### Binding Structure

```json
{
  "startBinding": {
    "elementId": "source-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 1]
  },
  "endBinding": {
    "elementId": "target-shape-id",
    "focus": 0,
    "gap": 1,
    "fixedPoint": [0.5, 0]
  }
}
```

### Update Shape boundElements

Shapes must reference connected arrows in their `boundElements`:

```json
{
  "id": "my-shape",
  "boundElements": [
    { "type": "text", "id": "my-shape-text" },
    { "type": "arrow", "id": "arrow-to-next" }
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
  "id": "arrow-label",
  "type": "text",
  "x": 305,
  "y": 245,
  "text": "label text",
  "fontSize": 12,
  "containerId": null
}
```

Position labels at the visual midpoint or near bends for clarity.
