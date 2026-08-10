# Workbench Agent Rules

Read `ARCHITECTURE.md` before structural changes.

## Noise budget

Workbench optimizes for the **next correct action**, not for completeness.

- Capture must remain possible with only a title.
- Scope, priority, dates and other metadata are optional at capture. Organize them later when useful.
- Do not add prompts, fields, helper text, views, properties or plugins without a concrete workflow need.
- Prefer useful defaults over questions.
- Keep user-facing surfaces quiet. If removing text does not make the user's next action more likely to be wrong, remove it.
- Keep internal rules small. If removing a rule does not increase the chance of breaking the architecture, remove it.
- Do not expose architectural rationale in user-facing docs unless it is needed to operate, troubleshoot or make a decision.

## Storage

- Task: `Tasks/*.md`
- Idea: `Ideas/*.md`
- Note: `Notes/*.md`
- Scope: `Scopes/*.md`
- Scope membership uses wikilinks in `scopes`.
- Generated views and caches must be rebuildable from Markdown.
- Do not create another authoritative registry for Workbench entities or relationships.

## Task

- An action to perform.
- 1 Task = 1 Markdown file.
- TaskNotes provides capture/edit/workflow/views.
- Do not use inline tasks as canonical Workbench Tasks.
- `scopes` may contain zero or more Scope links.

## Idea

- 1 Idea = 1 Markdown file.
- A reviewable decision unit.
- Active Ideas have a meaningful `review_gate`.
- `review_gate` is a reconsideration condition, not necessarily a date.
- After review: accepted -> create/organize Tasks; rejected -> Trash/Archive; deferred -> update `review_gate`.

## Note

- Passive information with no workflow obligation.
- `scopes` is optional.
- Notes are retrieved by search, links or direct navigation; do not add a Notes overview to the Dashboard without a concrete need.
- Do not convert it into a Task or Idea without a reason.

## Scope

- 1 Scope = 1 Markdown file under `Scopes/`.
- Broader than Project; do not rename the concept to Project.
- `kind`: `project` or `area`.
- Task / Idea / Note reference Scope notes with wikilinks.

## Clear commands

- Both clear commands offer `完了のみ` and `すべて`.
- `完了のみ`: Trash only Tasks with `status: done` or `status: dropped`.
- `Workbench: Clear Scope` + `完了のみ`: limit those completed Tasks to the selected Scope; preserve Ideas and the Scope file.
- `Workbench: Clear All` + `完了のみ`: Trash completed Tasks across all Scopes; preserve Ideas and Scope files.
- `すべて` keeps the full-clear behavior: Clear Scope trashes matching Tasks / Ideas plus the selected Scope; Clear All trashes Markdown under `Tasks/`, `Ideas/` and `Scopes/`.
- Never modify or Trash `Notes/` from either clear command.
- Clear commands require exact `RESET` confirmation and use recoverable Trash behavior.

## Plugin boundaries

- **TaskNotes**: Task UI/workflow
- **Fileclass**: Idea / Note / Scope property editing
- **Obsidian Bases**: queries/views
- **Workbench** (`workbench-commands`): Workbench-specific commands only

## Properties

Workbench-owned properties use lower_snake_case:

- `type`
- `kind`
- `scopes`
- `review_gate`
- `created`

Add a property only when it solves a concrete workflow need.

## Safety

Prefer recoverable Trash/Archive over permanent deletion. Preserve Scope definitions and Notes unless explicitly requested otherwise.
