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
| `excalidraw-spec/arrows.md` | Always — routing principles, bindings |
| `excalidraw-spec/validation.md` | Always — checklists, bug fixes |
| `PLANTUML-SPEC.md` | When source/target is PlantUML |

| If you think... | Reality |
|-----------------|---------|
| "User said skip docs" | Invalid JSON wastes their time. Read the spec. |
| "It's urgent" | Reading spec: 30 sec. Debugging broken output: 5 min. |
| "I know the format" | Training data is outdated. These specs are authoritative. |

---

## Quick Reference

Critical rules — violations cause broken diagrams:

| Rule | Details in |
|------|------------|
| No diamond shapes | `json-format.md` |
| Labels require shape + text elements | `json-format.md` |
| Multi-point arrows need elbow props | `arrows.md` |
| Arrow bindings must match coordinates | `arrows.md` |

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

Read `arrows.md` before generating any arrows. Then route all arrows considering the full diagram context.

**Key principles:**
- Prefer straight diagonal lines (simpler, easier to edit)
- Use elbows only to route around shapes or other arrows
- Ensure bindings match coordinates for editability
- Spread arrows from same edge visually

**Not per-arrow isolation** — consider how all arrows work together.

#### Loop Arrows (MANDATORY SEQUENCE)

Loop arrows (feedback paths returning to earlier steps) require explicit obstacle analysis. You CANNOT generate a loop arrow until you complete these steps:

**1. List obstacles** — Write out every shape between source and target:
```
Shapes in path: box-provide-info (x=490-690, y=690-760)
```

**2. Choose route side** — Pick which side routes AROUND all obstacles:
```
Route: right side (x > 690)
```

**3. Set clearance** — Waypoints must be at least 30px outside obstacle bounds:
```
Clear path at x=720 (690 + 30)
```

**4. THEN generate points** — Only after steps 1-3 are complete.

Skipping steps 1-3 = arrow will cross through boxes = broken diagram.

This is not a post-hoc checklist. It is a prerequisite that blocks point generation.

### Step 6: Validate & Output

Run validation from `excalidraw-spec/validation.md` before outputting.

Output raw JSON directly (no markdown fences).

---

## Styling

### Activity Diagrams

**Structure:** Vertical swimlanes, top-to-bottom flow, colored headers at top.

**Layout:**
- Headers: y=50, height=50
- First row: y=140
- Row spacing: ~110px (each step gets its own row)
- Lane spacing: ~220px
- Element size: 200x70

**CRITICAL: Row-based cross-lane flow**

Each process step goes on its OWN ROW, regardless of lane. Cross-lane arrows go DIAGONALLY DOWN, not horizontally:

```
WRONG (same row):                    CORRECT (row per step):
Lane A    Lane B    Lane C           Lane A    Lane B    Lane C
[Box1] -> [Box2] -> [Box3]           [Box1]
                                         ↘
                                             [Box2]
                                                 ↘
                                                     [Box3]
```

This approach:
- Creates clear top-to-bottom flow
- Simplifies arrows to simple diagonals
- Eliminates horizontal routing complexity
- Prevents arrow-box crossings

**Coloring Principles:**

Color encodes ONE thing: **actor/swimlane identity**. Nothing else.

| Visual Element | Color Rule |
|----------------|------------|
| Process boxes | Use swimlane color — ALL boxes in a lane share the same color regardless of action type (Exit, Error, Complete, etc.) |
| Arrows | Neutral gray (`#495057`) — never use color to encode Yes/No/success/failure |
| Decision boxes | Use swimlane color (dashed stroke distinguishes them, not color) |
| Labels on arrows | Text conveys semantics ("Yes", "No", "Incomplete") — no color needed |

**Why?** Color-by-actor keeps visual language simple:
- One meaning per dimension (color = who, text = what)
- "Exit" by Candidate is still a Candidate action → same color
- Easier to scan and understand at a glance

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
