# Workbench Architecture

## Prime directive

**Markdown files are the only Source of Truth.**

Plugins are editors, indexers and views. They must not introduce another authoritative store for Workbench entities or relationships.

## Entities

```text
Tasks/*.md    -> Task
Ideas/*.md    -> Idea
Notes/*.md    -> Note
Scopes/*.md   -> Scope
```

Every durable Workbench entity is an ordinary Markdown file.

## Relationships

Scope membership is represented by Obsidian wikilinks in a `scopes` list.

```yaml
scopes:
  - "[[Personal]]"
  - "[[RAGScope]]"
```

`Scopes/*.md` is the complete registry of Scopes.

```text
Scopes/Personal.md
        ^
        | wikilink
   +----+---------+------+
   |              |      |
 Task           Idea    Note
```

## Plugin boundaries

### TaskNotes

Owns the **Task UI and task workflow**, not the Task data.

- quick capture
- task creation/editing
- status and priority
- Task List / Kanban / Calendar views
- custom `scopes` field

Task files remain Markdown under `Tasks/`.

### Fileclass

Owns **guided property editing and validation** for Idea / Note / Scope, not their data.

- Idea schema
- Note schema
- Scope schema
- file picker for `scopes`

### Obsidian Bases

Owns **queries and overview views**, not data.

- Dashboard views
- Scope list
- Idea list
- Note list
- TaskNotes custom Base views

## Scope as a first-class entity

`Scopes/*.md` is the canonical Scope registry by existence.

Creating `Scopes/Personal.md` means `Personal` exists as a Scope. TaskNotes and Fileclass suggest files from `Scopes/`, so Task / Idea / Note all point to the same file.

A Scope note may be almost empty. Its minimum purpose is identity; its body can later hold context that is useful to humans or AI.

## Task model

Workbench uses **one Markdown note per Task**.

Recommended workflow states:

```text
Inbox -> Todo -> Doing -> Waiting -> Done
                    \-> Dropped
```

- Inbox: captured, not yet organized
- Todo: committed work
- Doing: active work
- Waiting: blocked / externally waiting / intentionally paused
- Done: completed
- Dropped: intentionally abandoned

Priority is optional:

```text
High / Medium / Low
```

## Idea model

An Idea is one Markdown file and represents one reviewable decision unit.

`review_gate` is the condition that makes the Idea worth reconsidering. It is not necessarily a date and Workbench does not invent mirror Tasks merely to detect it.

After review:

- accepted -> create/organize Tasks as needed, then retire the Idea
- rejected -> trash/archive
- deferred -> update `review_gate`

## Note model

A Note is passive information. It has no completion state and no review obligation. Scope membership is optional.

## Derived data rule

Generated indexes, plugin caches and Base views may exist, but they are **rebuildable projections**. If deleting a generated artifact would destroy unique user meaning, that artifact has accidentally become authoritative data and the design must be reconsidered.
