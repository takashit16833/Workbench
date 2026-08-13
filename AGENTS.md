# Workbench Agent Rules

## Noise budget

Workbench optimizes for the **next correct action**, not for completeness.

- Capture must remain possible with only a title.
- Project, priority, dates and other metadata are optional at capture. Organize them later when useful.
- Do not add prompts, fields, helper text, views, properties or plugins without a concrete workflow need.
- Prefer useful defaults over questions.
- Keep user-facing surfaces quiet. If removing text does not make the user's next action more likely to be wrong, remove it.
- The noise budget primarily applies to UI, metadata, prompts, generated helper surfaces and similar operational clutter. It does not require shortening substantive Task bodies or Notes that preserve useful working context.
- Keep internal rules small. If removing a rule does not increase the chance of breaking the architecture, remove it.
- Do not expose architectural rationale in user-facing docs unless it is needed to operate, troubleshoot or make a decision.

## Repository workflow

- Work on a feature branch unless the user explicitly requests direct work on `main`.
- Before every write, refresh the target branch head. Do not assume a previously observed commit is still current.
- Preserve user commits that arrive while work is in progress. If the base branch advances, integrate it without force-pushing or rewriting unrelated history.
- After changing a large or generated runtime file, inspect the resulting diff before considering the change complete. Stop and correct any unrelated line changes.

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
- Task bodies may contain whatever working context is useful for executing or handing off the work, including investigation results, implementation notes, decisions, next steps and relevant references.
- Use TaskNotes' native Subtask relationship when a Task is meaningfully decomposed into child Tasks.
- TaskNotes may use a parent Task as the child Task's Project anchor internally. Treat this as an implementation detail: user-facing workflow should present the relationship as parent Task -> Subtask, not as an ordinary Project assignment.
- `source` is optional. Use it when a Workbench Task is a local execution handle for an external authoritative ticket or document.
- When `source` exists, keep the external system authoritative. Do not mirror its body into Workbench merely for duplication; store only the local execution notes and progress needed to do the work.
- Avoid needless duplication of an external source, but do not shorten or remove useful local working context merely for brevity.
- Holiday Task is a scheduling-only exception: `type: holiday`, `archived: true`, a `scheduled` date, and one or more `projects`. It does not follow the normal Task status workflow.
- Holiday Task title is `休み`. Keep it visible on Calendar while excluding archived Tasks from ordinary Task views and TaskNotes Statistics.

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
- Notes may be as detailed or informal as useful for preserving information, investigation results, technical context or other material worth keeping.
- Notes are retrieved by search, links or direct navigation; do not add a Notes overview to the Dashboard without a concrete need.
- Do not convert it into a Task or Idea without a reason.

## Project

- 1 Project = 1 Markdown file under `Projects/`.
- Use TaskNotes' standard Projects feature for Task association.
- Idea / Note use the same `projects` property and Project notes.
- Do not introduce a parallel grouping concept or property.

## Clear commands

- Both clear commands offer `完了のみ` and `すべて`.
- `完了のみ`: affect only Tasks with `status: done` or `status: dropped`.
- `Workbench: Clear Project` can select a Project or `無所属`.
- `無所属` means Tasks / Ideas with no non-empty `projects` assignment. A Subtask linked to a parent Task through TaskNotes' project anchor is therefore not unassigned.
- When clearing a selected Project, a matching Task / Idea that still has another `projects` assignment keeps the file and removes only the selected Project link. If no other Project assignment remains, Trash the file.
- The same multi-Project unlink rule applies to Holiday Tasks.
- `Workbench: Clear Project` + Project + `完了のみ`: apply the rule above only to completed Tasks; preserve Ideas and the Project file.
- `Workbench: Clear Project` + Project + `すべて`: apply the rule above to matching Tasks / Ideas, then Trash the selected Project after entity updates succeed.
- `Workbench: Clear Project` + `無所属` + `完了のみ`: Trash only completed unassigned Tasks.
- `Workbench: Clear Project` + `無所属` + `すべて`: Trash unassigned Tasks / Ideas; there is no Project file to remove.
- `Workbench: Clear All` + `完了のみ`: Trash completed Tasks across all Projects; preserve Ideas and Project files.
- `Workbench: Clear All` + `すべて`: Trash Markdown under `Tasks/`, `Ideas/` and `Projects/`.
- Never modify or Trash `Notes/` from either clear command.
- Clear commands require exact `RESET` confirmation and use recoverable Trash behavior.

## Schedule commands

- `Workbench: Create Holiday` creates or extends a Project-scoped Holiday Task; normal Task capture remains unchanged.
- `Workbench: Shift Schedule` always operates on one selected Project.
- Shift uses Project-related Holiday Tasks as excluded workdays.
- The selected baseline Task keeps its `scheduled` date; only its `due` moves. Other eligible Tasks are shifted only when their `scheduled` date is on or after the baseline Task's original `due` date.
- Tasks before that boundary are never changed. `done`, `dropped`, archived, and Holiday Tasks are not shifted.
- Show a preview before bulk schedule changes. Warn when a changed Task belongs to multiple Projects.

## Plugin boundaries

- **TaskNotes**: Task UI/workflow/Projects
- **Fileclass**: Idea / Note property editing
- **Obsidian Bases**: queries/views
- **Homepage**: open `Dashboard` at startup and provide quick return to it
- **Obsidian Git**: Git commit / pull / push UI
- **Workbench** (`workbench-commands`): Workbench-specific commands only

## Obsidian plugin implementation

- Prefer Obsidian's public APIs, commands, and native hotkey configuration over DOM selectors or undocumented internals.
- Treat DOM structure and CSS classes inside Obsidian or third-party plugins as unstable implementation details. Use them only when no supported API exists, keep the scope narrow, and document the fragility.
- Before changing plugin loading, packaging, build output, or API usage, verify the current official Obsidian documentation instead of assuming a Node-style runtime layout is supported.
- `.obsidian/plugins/workbench-commands/main.js` is the deployed runtime entrypoint in this repository. Do not split it into sibling runtime modules unless a deliberate build/bundle pipeline is introduced and verified. Source modules are fine only when they are bundled into the production `main.js`.
- For existing third-party commands, prefer assigning `.obsidian/hotkeys.json` to the command ID rather than reimplementing the command or intercepting the keyboard in Workbench.

## Properties

- Use TaskNotes' standard `projects` property for Project membership.
- Workbench-owned properties use lower_snake_case, including `type`, `review_gate`, `created` and `source`.
- Add a property only when it solves a concrete workflow need.

## Safety

Prefer recoverable Trash/Archive over permanent deletion. Preserve Notes unless explicitly requested otherwise.
