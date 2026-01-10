# Canvas Skill Model Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the canvas skill to run on Haiku by default, escalating to Opus only for complex semantic operations.

**Architecture:** The skill uses model routing via frontmatter (`model: haiku`). Admin and mechanical operations execute directly on Haiku using curl and templates. Semantic operations spawn an Opus subagent via the Task tool.

**Tech Stack:** Claude Code skills (markdown), Task tool with `model: opus` parameter

---

## Task 1: Add Model Routing to Frontmatter

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md:1-4`

**Step 1: Update frontmatter**

Replace the current frontmatter:
```yaml
---
name: canvas
description: Use when user wants to interact with a whiteboard/canvas - requires reading Excalidraw spec for valid element generation
---
```

With:
```yaml
---
name: canvas
description: Use when user wants to interact with a whiteboard/canvas - connect, draw, update, or manage savepoints via direct HTTP calls
model: haiku
---
```

**Step 2: Verify file syntax**

Read the file to confirm frontmatter is valid YAML.

**Step 3: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "feat(canvas): add model: haiku routing to skill frontmatter"
```

---

## Task 2: Restructure Connection Section

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md`

**Step 1: Replace the Connection section**

Find the current "## Connecting" section and replace with:

```markdown
## Connection

Store the canvas URL for subsequent operations.

**Guidelines:**
- Always verify health (`GET /health`) before any operation
- All curl commands need `dangerouslyDisableSandbox: true` for localhost access

### Connect to Canvas

When user provides a URL:

1. Verify health:
   ```bash
   curl -s {URL}/health
   ```

2. Fetch session info:
   ```bash
   curl -s {URL}/api/session
   ```

3. Store URL for subsequent operations
4. Report: "Connected to '{session.name}' at {URL}"
```

**Step 2: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "refactor(canvas): restructure connection section with guidelines"
```

---

## Task 3: Create Admin Operations Section

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md`

**Step 1: Replace Reading Canvas and Savepoints sections**

Remove the current "## Reading Canvas" and "## Savepoints" sections. Replace with:

```markdown
## Admin Operations (Haiku Direct)

Execute these operations directly via curl. No complex reasoning needed.

**Guidelines:**
- Summarize, don't dump - describe canvas contents in natural language

### Get Canvas

```bash
curl -s {URL}/api/canvas
```

Returns JSON with `elements` array. Describe what's on the canvas rather than dumping raw JSON.

### Create Savepoint

```bash
curl -s -X POST {URL}/api/savepoints \
  -H "Content-Type: application/json" \
  -d '{"name": "savepoint-name"}'
```

### List Savepoints

```bash
curl -s {URL}/api/savepoints
```

### Rollback to Savepoint

```bash
curl -s -X POST {URL}/api/savepoints/{name}
```
```

**Step 2: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "refactor(canvas): create admin operations section"
```

---

## Task 4: Create Mechanical Operations Section

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md`

**Step 1: Add mechanical operations section**

After the Admin Operations section, add:

```markdown
## Mechanical Operations (Haiku Templates)

Single-element modifications using predefined templates. Use when the operation is unambiguous.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`

### Add Single Shape

For simple requests like "add a box", "add a circle":

1. GET current canvas
2. Append new element using template:

```json
{
  "id": "{type}-{Date.now()}-{random4chars}",
  "type": "rectangle",
  "x": 200,
  "y": 200,
  "width": 200,
  "height": 100,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "seed": 12345,
  "version": 1,
  "versionNonce": 67890,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "updated": 1704567890000,
  "link": null,
  "locked": false,
  "frameId": null,
  "roundness": {"type": 3}
}
```

3. PUT updated canvas

### Edit Text/Label

For requests like "change label to X", "update the text":

1. GET current canvas
2. Find element where `text` contains search string (case-insensitive)
3. Update the `text` and `originalText` fields
4. PUT updated canvas

### Change Property

For requests like "make it blue", "make it bigger":

1. GET current canvas
2. Find element by text content or description
3. Update single field:
   - Color: `strokeColor` or `backgroundColor`
   - Size: `width`, `height`, `fontSize`
4. PUT updated canvas

### Delete Element

For requests like "remove the box", "delete the arrow":

1. GET current canvas
2. Find element by text or type
3. Filter it from elements array
4. PUT updated canvas

### Clear Canvas

For "clear the canvas", "start fresh":

```bash
curl -s -X PUT {URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": []}'
```

### When to Escalate to Opus

If the request contains any of these, use Semantic Operations instead:
- Concepts requiring interpretation ("auth service", "user flow")
- Spatial relationships ("below", "next to", "connected to")
- Multi-element scope ("flowchart", "diagram", "sequence")
- Aesthetic judgments ("professional", "clean", "organized")

**When in doubt, escalate to Opus.**
```

**Step 2: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "feat(canvas): add mechanical operations section with templates"
```

---

## Task 5: Create Semantic Operations Section

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md`

**Step 1: Add semantic operations section**

After the Mechanical Operations section, add:

```markdown
## Semantic Operations (Opus Subagent)

Complex modifications requiring understanding of intent, relationships, or layout.

**Guidelines:**
- Always GET current state first - preserve existing elements
- Generate unique IDs: `{type}-{timestamp}-{random4chars}`
- Create savepoints before big changes - suggest proactively

### When to Use

Use this section for:
- "Add a box for the auth service" (intent interpretation)
- "Draw a flowchart of the login process" (multi-element layout)
- "Add an arrow from A to B" (spatial relationships)
- "Make it look professional" (aesthetic judgment)

### Process

1. GET current canvas state
2. Spawn Opus subagent using Task tool:

```
Task(
  model: opus,
  subagent_type: general-purpose,
  prompt: """
You are generating Excalidraw JSON for a collaborative whiteboard.

CURRENT CANVAS STATE:
{paste canvas JSON here}

USER REQUEST:
{paste user request here}

INSTRUCTIONS:
1. Read the Excalidraw spec to understand element structure
2. Analyze current canvas to understand existing elements and layout
3. Generate the minimal changes needed to fulfill the request
4. Return ONLY the complete updated elements array as JSON

CONSTRAINTS:
- Preserve all existing element IDs
- Position new elements to avoid overlap
- Use consistent styling with existing elements
- Generate unique IDs: {type}-{timestamp}-{random4chars}
- Reference EXCALIDRAW-SPEC.md for valid element structure
"""
)
```

3. Take the returned elements array
4. PUT to canvas:

```bash
curl -s -X PUT {URL}/api/canvas \
  -H "Content-Type: application/json" \
  -d '{"elements": [returned elements]}'
```

5. Report what was added/changed
```

**Step 2: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "feat(canvas): add semantic operations section with Opus subagent"
```

---

## Task 6: Remove Old Sections and Guidelines

**Files:**
- Modify: `plugin/skills/canvas/SKILL.md`

**Step 1: Remove deprecated content**

Remove the following sections that are now superseded:
- "## Updating Canvas" (replaced by Mechanical + Semantic operations)
- "## Guidelines" (distributed to relevant sections)

**Step 2: Verify structure**

Read the complete file and verify this structure:
1. Frontmatter with `model: haiku`
2. Spec requirement section (unchanged)
3. Connection section
4. Admin Operations section
5. Mechanical Operations section
6. Semantic Operations section

**Step 3: Commit**

```bash
git add plugin/skills/canvas/SKILL.md
git commit -m "refactor(canvas): remove deprecated sections, complete restructure"
```

---

## Task 7: Bump Plugin Version

**Files:**
- Modify: `plugin/.claude-plugin/plugin.json`

**Step 1: Bump version**

Update version from `"0.4.2"` to `"0.5.0"` (minor bump for new feature).

**Step 2: Commit**

```bash
git add plugin/.claude-plugin/plugin.json
git commit -m "chore: bump plugin version to 0.5.0"
```

---

## Task 8: Final Verification

**Step 1: Read complete skill file**

Read `plugin/skills/canvas/SKILL.md` and verify:
- [ ] Frontmatter has `model: haiku`
- [ ] Spec requirement section is preserved
- [ ] Connection section has guidelines
- [ ] Admin Operations section exists
- [ ] Mechanical Operations section has templates
- [ ] Semantic Operations section has Opus subagent instructions
- [ ] No old "## Updating Canvas" or standalone "## Guidelines" sections

**Step 2: Verify no duplicate content**

Ensure guidelines aren't duplicated across sections unnecessarily.

**Step 3: Run tests**

```bash
cd packages/server && npx vitest run
```

Expected: All tests pass (skill changes don't affect server code).

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "fix(canvas): cleanup and final polish"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add model routing frontmatter | SKILL.md |
| 2 | Restructure connection section | SKILL.md |
| 3 | Create admin operations section | SKILL.md |
| 4 | Create mechanical operations section | SKILL.md |
| 5 | Create semantic operations section | SKILL.md |
| 6 | Remove old sections | SKILL.md |
| 7 | Bump plugin version | plugin.json |
| 8 | Final verification | - |

Total: 8 tasks, ~7 commits
