# Workbench Architecture

## Entities

```text
Tasks/*.md     -> Task
Ideas/*.md     -> Idea
Notes/*.md     -> Note
Projects/*.md  -> Project
```

`projects` は `Projects/` のノートへのwikilinkを保持します。

```yaml
projects:
  - "[[Personal]]"
```

## Plugin boundaries

- **TaskNotes**: Task capture / edit / workflow / Project association / views
- **Fileclass**: Idea / Note のproperty編集
- **Obsidian Bases**: query / dashboard
- **Homepage**: `Dashboard` の起動時表示 / quick access
- **Obsidian Git**: Git commit / pull / push の操作

永続データはMarkdownに置き、生成ビューやcacheは再構築可能にします。

## Task

- 1 Task = 1 file under `Tasks/`
- Status: `Inbox -> Todo -> Doing -> Waiting -> Done`, または `Dropped`
- Priority: `High / Medium / Low`、任意
- `projects` は0個以上

## Idea

- 1 Idea = 1 file under `Ideas/`
- `projects` は0個以上
- `review_gate` は再検討する条件
- 採用: 必要なTaskを作る
- 不採用: Trash / Archive
- 保留: `review_gate` を更新

## Note

- 1 Note = 1 file under `Notes/`
- workflowを持たない
- `projects` は任意

## Project

- 1 Project = 1 Markdown file under `Projects/`
- TaskNotesのProjects機能をTaskのProject関連付けに使う
- Task / Idea / Note から `projects` のwikilinkで参照する
