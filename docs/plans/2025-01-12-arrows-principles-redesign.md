# Arrow Routing Redesign: Principles Over Formulas

## Problem

The current arrow spec is overly rigid:
- Exact formulas for edge calculations
- Specific routeArrow patterns (L-shape, U-turn)
- Fixed staggering percentages
- Per-arrow isolation without diagram context

Results in:
- Ugly arrows (awkward L-shapes running parallel to edges)
- Crossing arrows on exception paths
- Slow generation (lots of computation)
- Inflexible output

## Solution

Replace formulas with principles. Trust LLM aesthetic judgment with full diagram context.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Approach | Principles over formulas |
| Binding precision | Important - must work for Excalidraw editing |
| Context awareness | Full diagram - consider all shapes and arrows |
| Default routing | Straight diagonal lines |
| Elbows | Only when routing around obstacles |
| Aesthetic | Organic (diagonals okay) vs rigid 90-degree |

## Core Principles

| Principle | Rationale |
|-----------|-----------|
| Prefer straight lines | Simpler, easier to edit, cleaner |
| Use elbows only to route around | Shapes or existing arrows in the way |
| Avoid crossing arrows | Check existing arrows before routing |
| Spread from same edge | Multiple arrows visually distributed |
| Breathing room | Don't crowd edges |
| Diagram-aware | Consider full context, not per-arrow isolation |

## Arrow Properties

**Straight arrows (most cases):**
```json
{
  "type": "arrow",
  "x": "<source edge point>",
  "y": "<source edge point>",
  "points": [[0, 0], [dx, dy]],
  "startBinding": { "..." },
  "endBinding": { "..." },
  "endArrowhead": "arrow"
}
```

**Elbowed arrows (routing around obstacles):**
```json
{
  "type": "arrow",
  "points": [[0, 0], ["...mid points..."], [dx, dy]],
  "roughness": 0,
  "roundness": null,
  "elbowed": true,
  "startBinding": { "..." },
  "endBinding": { "..." }
}
```

Use as many elbow points as needed to cleanly route around.

## Binding Integrity Rule

Arrow coordinates (x, y, points) must match where bindings claim the arrow connects. If they don't match, the arrow "jumps" when edited in Excalidraw.

- Arrow start: `arrow.x`, `arrow.y` at source shape edge
- Arrow end: final point in `points` + arrow.x/y lands at target edge
- fixedPoint: normalized position (0-1) matching actual connection

## File Changes

### arrows.md - Major rewrite

**Remove:**
- Edge Calculation Formulas table
- Staggering percentages function
- Universal Arrow Routing Algorithm
- routeArrow / Routing Logic section
- L-shape / U-turn patterns

**Keep (simplified):**
- Binding structure and fixedPoint concept
- "Coordinates must match bindings" rule
- Required properties for multi-point arrows
- Bidirectional arrows section
- Arrow labels section

**Add:**
- Routing principles table
- Diagram-aware guidance
- When to use elbows

### validation.md - Simplify

**Remove:**
- Exact tolerance checks (5px from edge)
- findShapeNear algorithm
- Arrow-specific checklist items about calculations

**Keep:**
- Shape-text binding validation
- Unique ID validation
- Bounding box check
- General JSON validity

### SKILL.md - Simplify Step 5

Replace detailed arrow checklist with:

```markdown
### Step 5: Generate Arrows

Read `arrows.md` before generating any arrows. Then route all arrows
considering the full diagram context.

**Key principles:**
- Prefer straight diagonal lines
- Use elbows only to route around shapes/arrows
- Ensure bindings match coordinates
- Spread arrows from same edge visually

**Not per-arrow isolation** - consider how all arrows work together.
```

### json-format.md - No changes needed

## Workflow Change

**New workflow:**
1. LLM reads arrows.md (once, at start)
2. LLM places all shapes
3. LLM routes ALL arrows with awareness of each other
4. Bindings set correctly for editability

**vs. old workflow:**
1. Read arrows.md
2. For each arrow in isolation: apply exact formulas
3. Hope they don't conflict
