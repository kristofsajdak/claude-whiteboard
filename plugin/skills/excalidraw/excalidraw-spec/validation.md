# Validation Reference

## Before Output

Validate your diagram against:
- `json-format.md` — element structure, text bindings, no diamonds
- `arrows.md` — routing principles, bindings, elbow properties

Ensure all IDs are unique and the output is valid JSON.

## Activity Diagram Checklist

Before finalizing an activity diagram, verify:

- [ ] **Row-based layout**: Each process step is on its own row (cross-lane arrows go diagonally DOWN, not horizontally)
- [ ] **No arrow-box crossings**: Every arrow path is clear of shapes (loops route AROUND boxes)
- [ ] **No shared edge positions**: Different arrows to/from same shape use different edges or positions
- [ ] **Loop arrows use elbows**: Feedback paths use elbowed arrows to route around obstacles
- [ ] **Coordinates derived from fixedPoint**: For each arrow, verify coordinates match the binding (see arrows.md Step-by-Step)

---

## Common Bugs and Fixes

### Bug: Labels don't appear inside shapes

**Cause**: Using `label` property instead of separate text element.

**Fix**: Create TWO elements:
1. Shape with `boundElements` referencing text
2. Text with `containerId` referencing shape

### Bug: Arrows curved instead of 90-degree

**Cause**: Missing elbow properties on multi-point arrow.

**Fix**: Add all three:
```json
{
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

### Bug: Arrow "jumps" when edited in Excalidraw

**Cause**: Arrow coordinates don't match binding's claimed attachment point.

**Fix**: Ensure `arrow.x`, `arrow.y` and final point in `points` land at the edges specified in `startBinding` and `endBinding` fixedPoints.

### Bug: Multiple arrows from same edge overlap

**Cause**: All arrows start from identical position.

**Fix**: Spread arrows visually across the edge; use different fixedPoint values.

### Bug: Arrow crosses through a process box

**Cause**: Diagonal or loop arrow path intersects with shapes.

**Fix**: Use elbowed arrow to route around:
```json
{
  "points": [[0, 0], [100, 0], [100, -150], [200, -150], [200, 0]],
  "roughness": 0,
  "roundness": null,
  "elbowed": true
}
```

Add enough intermediate points to route cleanly around all obstacles.

### Bug: Cross-lane arrows are horizontal, creating complex routing

**Cause**: Process boxes across lanes placed on same row.

**Fix**: Each step gets its own row. Cross-lane arrows should be simple diagonals going DOWN:
- Step in Lane A at y=200
- Next step in Lane B at y=310 (not y=200)
- Arrow is a simple diagonal, no elbows needed
