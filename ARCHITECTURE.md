# Workbench Architecture

## Entities

```text
Tasks/*.md    -> Task
Ideas/*.md    -> Idea
Notes/*.md    -> Note
Scopes/*.md   -> Scope
```

`scopes` は `Scopes/` のノートへのwikilinkを保持します。

```yaml
scopes:
  - "[[Personal]]"
```

## Plugin boundaries

- **TaskNotes**: Task capture / edit / workflow / views
- **Fileclass**: Idea / Note / Scope のproperty編集
- **Obsidian Bases**: query / dashboard

永続データはMarkdownに置き、生成ビューやcacheは再構築可能にします。

## Task

- 1 Task = 1 file under `Tasks/`
- Status: `Inbox -> Todo -> Doing -> Waiting -> Done`, または `Dropped`
- Priority: `High / Medium / Low`、任意
- `scopes` は0個以上

## Idea

- 1 Idea = 1 file under `Ideas/`
- `review_gate` は再検討する条件
- 採用: 必要なTaskを作る
- 不採用: Trash / Archive
- 保留: `review_gate` を更新

## Note

- 1 Note = 1 file under `Notes/`
- workflowを持たない
- `scopes` は任意

## Scope

- 1 Scope = 1 file under `Scopes/`
- `kind`: `project` または `area`
- Task / Idea / Note からwikilinkで参照する
