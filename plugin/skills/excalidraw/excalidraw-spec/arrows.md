# Arrow Routing Reference

Principles-based guide for creating arrows between shapes.

---

## Arrow Coloring

**All arrows use neutral gray (`#495057`)** — never encode semantics with color.

Labels convey meaning ("Yes", "No", "Incomplete"), not arrow color. This keeps the visual language simple: color = actor identity, text = semantics.

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

### Loop Arrows (Feedback Paths) — MANDATORY SEQUENCE

Loop arrows (e.g., "Incomplete" returning to a previous step) require explicit obstacle analysis BEFORE generating points.

**You CANNOT generate loop arrow points until you complete:**

1. **List obstacles** — Write out every shape between source and target with coordinates:
   ```
   Shapes in path: box-provide-info (x=490-690, y=690-760)
   ```

2. **Choose route side** — Decide which side goes AROUND all obstacles:
   ```
   Route: right side (x > 690)
   ```

3. **Set clearance** — Waypoints must be 30px+ outside obstacle bounds:
   ```
   Clear path at x=720 (690 + 30)
   ```

4. **THEN generate points** — Only after steps 1-3.

**Additional rules:**
- Never draw straight through boxes — route AROUND
- Use elbows liberally — go around the outside of the diagram
- Enter on a different edge — if another arrow exits from the left, enter from the right

Skipping the obstacle analysis = arrow will cross through boxes = broken diagram.

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

**Practical guidance:**

1. `arrow.x` and `arrow.y` should be at the source shape's edge where the arrow visually departs
2. The final point in `points`, added to arrow.x/y, should land at the target shape's edge
3. `fixedPoint` values must reflect the actual connection position

### fixedPoint Values

fixedPoint is a normalized [x, y] position on the shape (0 to 1):

```
fixedPoint[0] = (arrow.x - shape.x) / shape.width   // 0=left, 0.5=center, 1=right
fixedPoint[1] = (arrow.y - shape.y) / shape.height  // 0=top, 0.5=middle, 1=bottom
```

**Common edge positions:**

| Edge | fixedPoint |
|------|------------|
| Top center | `[0.5, 0]` |
| Bottom center | `[0.5, 1]` |
| Left center | `[0, 0.5]` |
| Right center | `[1, 0.5]` |

For arrows spread across an edge, use the actual position (e.g., `[0.3, 1]` for bottom edge at 30%).

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

Bind labels to arrows so they move together when edited:

**Arrow element:**
- Add `boundElements: [{ "type": "text", "id": "{arrow-id}-text" }]`

**Text element:**
- Set `containerId: "{arrow-id}"`
- Use ID pattern: `{arrow-id}-text`
- Position at visually appropriate location (midpoint, near bends, near source for decision labels)

**Example:**

```json
{
  "id": "arrow-decision-yes",
  "type": "arrow",
  "boundElements": [
    { "type": "text", "id": "arrow-decision-yes-text" }
  ]
}
```

```json
{
  "id": "arrow-decision-yes-text",
  "type": "text",
  "text": "Yes",
  "fontSize": 12,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": "arrow-decision-yes",
  "originalText": "Yes"
}
```

Labels use LLM judgment for positioning — no fixed rule.
