# Validation Reference

## Before Output

Validate your diagram against:
- `json-format.md` — element structure, text bindings, no diamonds
- `arrows.md` — routing principles, bindings, elbow properties

Ensure all IDs are unique and the output is valid JSON.

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
