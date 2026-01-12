---
name: excalidraw
description: Use when user wants to create, read, or convert diagrams to/from Excalidraw format
model: opus
---

# Excalidraw Converter Skill

## Scope

This skill handles **bidirectional conversion** between any notation/format and Excalidraw JSON:

- **Any Source → Excalidraw JSON**: Convert descriptions, PlantUML, or other formats into Excalidraw diagrams
- **Excalidraw JSON → Any Target**: Parse Excalidraw and output as natural language description or PlantUML

This skill does NOT handle file I/O (use whiteboard skill for canvas read/write).

---

## Before You Start

**BEFORE GENERATING/PARSING ANY ELEMENTS: Read the relevant spec:**

| Spec | When to Read |
|------|--------------|
| `excalidraw-spec/json-format.md` | Always — element types, properties, text bindings |
| `excalidraw-spec/arrows.md` | Always — routing, patterns, bindings |
| `excalidraw-spec/validation.md` | Always — checklists, bug fixes |
| `PLANTUML-SPEC.md` | When source/target is PlantUML |

| If you think... | Reality |
|-----------------|---------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec. |
| "It's urgent" | Reading spec: 30 sec. Debugging broken output: 5 min. |
| "I know the format" | Training data is outdated. These specs are authoritative. |
| "I showed the pattern, I can do the rest mentally" | Mental math is THE root cause of broken arrows. Show ALL calculations. |

---

## Quick Reference

Critical rules — violations cause broken diagrams:

| Rule | Summary |
|------|---------|
| No diamonds | Diamond arrow connections broken. Use `rectangle` with `strokeStyle: "dashed"` |
| Labels = 2 elements | Shape needs `boundElements`, text needs `containerId` |
| Elbow arrows = 3 props | `roughness: 0`, `roundness: null`, `elbowed: true` |
| Arrows from edges | Top: `(x+w/2, y)`, Bottom: `(x+w/2, y+h)`, Left: `(x, y+h/2)`, Right: `(x+w, y+h/2)` |
| Arrows: GATHER→COMPUTE→OUTPUT | Fill CONNECTION template first, derive values second. No template = delete JSON |

---

# Generating Excalidraw JSON

## Workflow

### Step 1: Detect Direction

| User Intent | Direction |
|-------------|-----------|
| "create", "generate", "draw", "visualize" | → Excalidraw JSON |
| Provides PlantUML or description | → Excalidraw JSON |
| "describe", "explain", "convert to PlantUML" | Excalidraw JSON → (see Parsing section) |

### Step 2: Identify Diagram Type

| Source Contains... | Diagram Type | Styling |
|--------------------|--------------|---------|
| `@startuml` with `:action;` or "process", "workflow", "flow" | Activity | Activity Diagram |
| `class`/`interface` or "architecture" | Class/Architecture | Generic |
| `participant` or "sequence", "timeline" | Sequence | Generic |

### Step 3: Plan Layout

Decide grid positions before generating elements:
- See **Styling → Activity Diagrams → Layout** for typical coordinates
- Sketch lanes/rows mentally before writing JSON

### Step 4: Generate Shapes

For each component:
1. Create shape with unique `id`
2. Add `boundElements` array referencing text
3. Create text element with `containerId`
4. Apply colors from styling section

### Step 5: Generate Arrows

**THE RULE:** Data first, compute second. No estimating.

For each arrow, follow these phases IN ORDER:

**Every arrow. No exceptions. No "representative samples." 13 arrows = 13 CONNECTION templates.**

**5a. GATHER** — Copy template, fill with actual values from your shapes:

```
CONNECTION: {source-id} → {target-id}
Source: x=__, y=__, w=__, h=__ → {edge}: (__, __)
Target: x=__, y=__, w=__, h=__ → {edge}: (__, __)
```

Use edge formulas from Quick Reference. **Write actual numbers you look up, not approximations.**

**5b. COMPUTE** — Mechanically derive from gathered data:

```
arrow.x = source_edge_x = __
arrow.y = source_edge_y = __
dx = target_edge_x − arrow.x = __
dy = target_edge_y − arrow.y = __
```

Point pattern: see `arrows.md` routing algorithm.

**5c. OUTPUT** — Generate the arrow JSON.

---

| If you skip... | What breaks |
|----------------|-------------|
| GATHER (estimate coords) | Edge points wrong → arrow floats in space |
| COMPUTE (guess dx/dy) | Arrow ends inside target shape |
| Both ("I know roughly where") | Guaranteed broken diagram, wasted debugging |
| Most arrows ("showed a few examples") | Unverified arrows WILL have errors you won't catch |

**No CONNECTION template above your JSON = delete the JSON and restart from 5a.**

### Step 6: Validate & Output

**Before outputting JSON, verify 2-3 arrows:**
1. Pick arrows that cross lanes or use L-shapes (highest error risk)
2. For each: trace `arrow.x + final_point[0]` and `arrow.y + final_point[1]`
3. Result MUST equal target edge coordinates (within 5px)
4. If mismatch: fix the arrow before proceeding

Output raw JSON directly (no markdown fences).

Run validation algorithm before outputting. See `excalidraw-spec/validation.md`

---

## Styling

### Activity Diagrams

**Structure:** Vertical swimlanes, top-to-bottom flow, colored headers at top.

**Layout:**
- Headers: y=50, height=50
- First row: y=140
- Row spacing: ~120px
- Lane spacing: ~220px
- Element size: 200x70

**Color Palette:**

| Lane | Stroke | Header Fill | Box Fill |
|------|--------|-------------|----------|
| Blue | #1971c2 | #a5d8ff | #e7f5ff |
| Green | #2f9e44 | #b2f2bb | #ebfbee |
| Yellow | #f08c00 | #ffec99 | #fff9db |
| Red | #e03131 | #ffc9c9 | #fff5f5 |
| Purple | #9c36b5 | #eebefa | #f8f0fc |
| Teal | #0c8599 | #99e9f2 | #e3fafc |
| Pink | #d6336c | #fcc2d7 | #fff0f6 |
| Gray | #495057 | #dee2e6 | #f8f9fa |

**Shape Reference:**

| Construct | Shape | Size | Notes |
|-----------|-------|------|-------|
| Decision | Rectangle (dashed) | 100x80 | `strokeStyle: "dashed"` |
| Fork/Join | Thin rectangle | 400x8 | Solid fill |
| Action | Rounded rectangle | 200x70 | `roundness: {type: 3}` |
| Start | Ellipse | 30x30 | Black fill |
| End | Ellipse | 30x30 | White fill, `strokeWidth: 4` |

### Generic Diagrams

For class diagrams, architecture, sequence:

- Strokes: `#1e1e1e`, `#e03131`, `#2f9e44`, `#1971c2`, `#f08c00`
- Fills: `transparent`, `#ffc9c9`, `#b2f2bb`, `#a5d8ff`, `#ffec99`
- Roughness: 0=architect, 1=artist, 2=cartoonist

### PlantUML Mapping

| PlantUML | PlantUML Renders | Excalidraw |
|----------|------------------|------------|
| `if/then/else` | Hexagon | Rectangle (dashed) |
| `endif` | Diamond | Rectangle (dashed) or implicit |
| `fork/end fork` | Bar | Thin rectangle |
| `:action;` | Rounded rect | Rounded rectangle |
| `start` | Filled circle | Small filled ellipse |
| `stop` | Circle with ring | Ellipse, white fill, thick stroke |

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Labels don't appear | Use TWO elements (shape + text), not `label` property |
| Arrows curved | Add `elbowed: true`, `roundness: null`, `roughness: 0` |
| Arrows floating | Calculate x,y from shape edge, not center |
| Arrows overlapping | Stagger start positions across edge |
| Arrow ends inside shape | dx/dy estimated, not calculated — always compute: `target_edge - arrow_start` |

**Detailed fixes:** See `excalidraw-spec/validation.md`

---

# Parsing Excalidraw JSON

## To Natural Language

1. **Identify diagram type** from patterns:
   - Lane headers + colored boxes → Activity
   - Rectangles with inheritance arrows → Class
   - Time-ordered elements → Sequence

2. **Output structured description:**

```
**Diagram Type:** [Activity/Class/Sequence/Generic]
**Summary:** [One-sentence overview]
**Structure:** [Key observations]
**Flow:** [Step-by-step content]
```

## To PlantUML

1. Read `PLANTUML-SPEC.md`
2. Identify diagram type from structure
3. Use PlantUML Mapping table (above)
4. Generate PlantUML syntax:

```plantuml
@startuml
[diagram content]
@enduml
```

**Activity:** Lane text → `|Actor|`, boxes → `:Action;`, branches → `if/else/endif`
**Class:** Rectangles → `class Name {}`, arrows → `<|--` or `*--`
