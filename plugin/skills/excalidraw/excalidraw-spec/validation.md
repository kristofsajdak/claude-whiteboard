# Validation Reference

Checklists and common bug fixes.

---

## Pre-Flight Validation

Run before writing the file:

```
FUNCTION validateDiagram(elements):
  errors = []

  // 1. Validate shape-text bindings
  FOR each shape IN elements WHERE shape.boundElements != null:
    FOR each binding IN shape.boundElements:
      IF binding.type == "text":
        textElement = findById(elements, binding.id)
        IF textElement == null:
          errors.append("Shape {shape.id} references missing text {binding.id}")
        ELSE IF textElement.containerId != shape.id:
          errors.append("Text containerId doesn't match shape")

  // 2. Validate arrow bindings exist
  FOR each arrow IN elements WHERE arrow.type == "arrow":
    IF arrow.startBinding != null:
      sourceShape = findById(elements, arrow.startBinding.elementId)
      IF sourceShape == null:
        errors.append("Arrow {arrow.id} startBinding references missing shape")
    IF arrow.endBinding != null:
      targetShape = findById(elements, arrow.endBinding.elementId)
      IF targetShape == null:
        errors.append("Arrow {arrow.id} endBinding references missing shape")

  // 3. Validate unique IDs
  ids = [el.id for el in elements]
  duplicates = findDuplicates(ids)
  IF duplicates.length > 0:
    errors.append("Duplicate IDs: {duplicates}")

  // 4. Validate elbowed arrow properties
  FOR each arrow IN elements WHERE arrow.type == "arrow":
    IF arrow.points.length > 2:
      IF arrow.elbowed != true:
        errors.append("Arrow {arrow.id} has multiple points but missing elbowed:true")

  RETURN errors
```

---

## Checklists

### Before Generating

- [ ] Identified all components from input
- [ ] Mapped all connections/data flows
- [ ] Planned layout positions
- [ ] Created ID naming scheme

### During Generation

- [ ] Every labeled shape has BOTH shape AND text elements
- [ ] Shape has `boundElements: [{ "type": "text", "id": "{id}-text" }]`
- [ ] Text has `containerId: "{shape-id}"`
- [ ] Multi-point arrows have `elbowed: true`, `roundness: null`, `roughness: 0`
- [ ] Arrows have `startBinding` and `endBinding`
- [ ] No diamond shapes used

### After Generation

- [ ] All `boundElements` IDs reference valid text elements
- [ ] All `containerId` values reference valid shapes
- [ ] All arrow bindings reference valid shapes
- [ ] No duplicate IDs
- [ ] File is valid JSON

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
