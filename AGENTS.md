# Workbench Agent Rules

This vault is a shared working surface for the user and AI agents.

## Prime directive

**Markdown files are the only Source of Truth.**

Do not introduce a second authoritative registry, database, generated index, plugin-owned store, or duplicated relationship model for Workbench entities. Generated views/caches are allowed only when they are fully rebuildable from Markdown.

Read `ARCHITECTURE.md` before making structural changes.

## Entities

### Task
- A Task is an action to perform.
- Canonical storage: one Markdown file under `Tasks/`.
- TaskNotes is the UI/workflow engine; the Markdown file is the data.
- Do not use inline tasks as canonical Workbench Tasks.
- Quick capture should require only a title. Scope, priority and dates are optional.
- A Task may belong to zero or more Scopes through `scopes`, using wikilinks to Scope notes.

### Idea
- One Idea is one Markdown file under `Ideas/`.
- It is a reviewable decision unit distilled from brainstorming, often with AI.
- Every active Idea should have a meaningful `review_gate`.
- `review_gate` is a condition for reconsideration, not necessarily a date.
- Do not create mirror Tasks/events merely so Workbench can detect a Review Gate.
- After review: accepted -> create/organize Tasks as needed; rejected -> trash/archive; deferred -> update `review_gate`.

### Note
- One Note is one Markdown file under `Notes/`.
- A Note is passive information and has no workflow obligation.
- `scopes` is optional.
- Never convert a Note into a Task or Idea without an explicit reason or user request.

### Scope
- A Scope is a first-class Workbench entity under `Scopes/`.
- **The existence of `Scopes/<name>.md` is the canonical registration of that Scope.**
- Scope is deliberately broader than Project; do not rename it to Project.
- `kind` may be `project` (finite outcome) or `area` (ongoing responsibility/domain).
- Task / Idea / Note Scope membership must point to Scope notes with wikilinks.
- Do not maintain a separate hand-edited Scope registry.

## Plugin boundaries

- **TaskNotes**: Task capture/edit/workflow/views only.
- **Fileclass**: guided schema/property editing for Idea / Note / Scope only.
- **Obsidian Bases**: projections/queries/dashboard only.
- Plugins do not own Workbench truth; Markdown does.

## Dashboard

- `Dashboard.md` is the human-facing home surface.
- `Tasks.base` is the TaskNotes-backed Task List / Kanban projection.
- `Dashboard.base` owns Ideas / Scopes / Notes projections.

## Property conventions

Use lower_snake_case for Workbench-owned properties:

- `type`
- `kind`
- `scopes`
- `review_gate`
- `created`

TaskNotes core task properties (`status`, `priority`, `due`, `scheduled`, etc.) keep their configured TaskNotes keys.

Prefer a small model. Add a property only when it solves a concrete workflow need.

## Safety

Prefer recoverable trash/archive behavior over permanent deletion. Preserve Scope definitions and Notes unless the user explicitly requests otherwise.
