# Workbench Agent Rules

Read `ARCHITECTURE.md` before structural changes.

## Noise budget

Workbench optimizes for the **next correct action**, not for completeness.

- Capture must remain possible with only a title.
- Project, priority, dates and other metadata are optional at capture. Organize them later when useful.
- Do not add prompts, fields, helper text, views, properties or plugins without a concrete workflow need.
- Prefer useful defaults over questions.
- Keep user-facing surfaces quiet. If removing text does not make the user's next action more likely to be wrong, remove it.
- Keep internal rules small. If removing a rule does not increase the chance of breaking the architecture, remove it.
- Do not expose architectural rationale in user-facing docs unless it is needed to operate, troubleshoot or make a decision.

## Storage

- Task: `Tasks/*.md`
- Idea: `Ideas/*.md`
- Note: `Notes/*.md`
- Project: `Projects/*.md`
- Project membership uses wikilinks in TaskNotes' standard `projects` property.
- Generated views and caches must be rebuildable from Markdown.
- Do not create another authoritative registry for Workbench entities or relationships.

## Task

- An action to perform.
- 1 Task = 1 Markdown file.
- TaskNotes provides capture/edit/workflow/Project association/views.
- Do not use inline tasks as canonical Workbench Tasks.
- `projects` may contain zero or more Project links.
- Use TaskNotes' native Subtask relationship when a Task is meaningfully decomposed into child Tasks.
- TaskNotes may use a parent Task as the child Task's Project anchor internally. Treat this as an implementation detail: user-facing workflow should present the relationship as parent Task -> Subtask, not as an ordinary Project assignment.

## Idea

- 1 Idea = 1 Markdown file.
- A reviewable decision unit.
- `projects` may contain zero or more Project links.
- Active Ideas have a meaningful `review_gate`.
- `review_gate` is a reconsideration condition, not necessarily a date.
- After review: accepted -> create/organize Tasks; rejected -> Trash/Archive; deferred -> update `review_gate`.

## Note

- Passive information with no workflow obligation.
- `projects` is optional.
- Notes are retrieved by search, links or direct navigation; do not add a Notes overview to the Dashboard without a concrete need.
- Do not convert it into a Task or Idea without a reason.

## Project

- 1 Project = 1 Markdown file under `Projects/`.
- Use TaskNotes' standard Projects feature for Task association.
- Idea / Note use the same `projects` property and Project notes.
- Do not introduce a parallel grouping concept or property.

## Clear commands

- Both clear commands offer `完了のみ` and `すべて`.
- `完了のみ`: Trash only Tasks with `status: done` or `status: dropped`.
- `Workbench: Clear Project` + `完了のみ`: limit those completed Tasks to the selected Project; preserve Ideas and the Project file.
- `Workbench: Clear All` + `完了のみ`: Trash completed Tasks across all Projects; preserve Ideas and Project files.
- `すべて` keeps the full-clear behavior: Clear Project trashes matching Tasks / Ideas plus the selected Project; Clear All trashes Markdown under `Tasks/`, `Ideas/` and `Projects/`.
- Never modify or Trash `Notes/` from either clear command.
- Clear commands require exact `RESET` confirmation and use recoverable Trash behavior.

## Plugin boundaries

- **TaskNotes**: Task UI/workflow/Projects
- **Fileclass**: Idea / Note property editing
- **Obsidian Bases**: queries/views
- **Homepage**: open `Dashboard` at startup and provide quick return to it
- **Workbench** (`workbench-commands`): Workbench-specific commands only

## Properties

- Use TaskNotes' standard `projects` property for Project membership.
- Workbench-owned properties use lower_snake_case, including `type`, `review_gate` and `created`.
- Add a property only when it solves a concrete workflow need.

## Safety

Prefer recoverable Trash/Archive over permanent deletion. Preserve Notes unless explicitly requested otherwise.
