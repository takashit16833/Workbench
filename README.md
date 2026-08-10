# Workbench v2

Obsidian上で Task / Idea / Note / Scope を扱う、自分 + AI 共用のWork OSです。

**まず [[ONBOARDING]] から始めてください。**

## Core idea

Workbench v2では、**MarkdownファイルだけがSource of Truth**です。

```text
Tasks/*.md    = Task
Ideas/*.md    = Idea
Notes/*.md    = Note
Scopes/*.md   = Scope
```

Scope membershipは `scopes` のwikilinkで表現します。

```yaml
scopes:
  - "[[Personal]]"
```

`Scopes/Personal.md` の存在そのものが、`Personal` Scopeの登録です。手動同期する別台帳はありません。

## Structure

```text
Dashboard.md
Dashboard.base
Tasks.base
ARCHITECTURE.md
ONBOARDING.md
AGENTS.md

Tasks/
Ideas/
Notes/
Scopes/

Templates/
FileClasses/
Scripts/
Plugins.lock
```

## Components

- **TaskNotes**: Task capture / edit / workflow / Task List / Kanban
- **Fileclass**: Idea / Note / Scope のtyped property editor
- **Obsidian Bases**: Dashboardとquery/view

Pluginsはデータの所有者ではなく、Markdownを操作・表示するUIです。

## Install

Workbench v2はplugin versionを `Plugins.lock` に固定しています。

```bash
bash Scripts/install-plugins.sh
```

現在のlock:

- TaskNotes 4.12.3
- Fileclass 0.2.10

Plugin upgradeはrelease notesを確認して `Plugins.lock` を明示的に更新します。

## One-time setup

インストール後のTaskNotes / Fileclass設定は [[ONBOARDING]] にまとめています。

特に重要なのはTaskNotesのCustom User Field `scopes` です。

```text
Property: scopes
Type: List
Autosuggestion:
  Include folders: Scopes/
```

これによりTaskも、Idea / Noteと同じ `Scopes/*.md` を直接参照します。

## Daily use

ホームは [[Dashboard]] です。

- Task: TaskNotesのhotkeyで即Capture
- Idea: `Ideas/` に1 reviewable unit = 1 file
- Note: `Notes/` に受動的な情報を保存
- Scope: `Scopes/` に作成。存在そのものが登録

設計原則やプラグイン境界は [[ARCHITECTURE]] を参照してください。
