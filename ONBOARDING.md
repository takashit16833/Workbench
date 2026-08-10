# Workbench v2 Onboarding

最初のセットアップと、5分で一周するためのガイドです。

> [!important] v2の原則
> **Markdownが唯一のSource of Truthです。**
> `Scopes/Personal.md` を作ったら、`Personal` というScopeが本当にWorkbenchに存在します。別のScope台帳はありません。

## 0. Plugins

Vaultルートで実行します。

```bash
bash Scripts/install-plugins.sh
```

インストール後、Obsidianを再起動またはVaultをreloadしてください。

Workbench v2で使うCommunity Pluginは次の2つだけです。

- TaskNotes: Taskのcapture / edit / workflow / views
- Fileclass: Idea / Note / Scopeのtyped properties

Obsidian BasesはCore Pluginを使います。

## 1. Fileclass one-time setup

Settings -> Fileclass で **Class files folder** を `FileClasses` に設定します。

## 2. TaskNotes one-time setup

### General

Settings -> TaskNotes -> General:

- **Default Tasks Folder**: `Tasks`

### Title

Settings -> TaskNotes -> Task Properties -> Title:

- **Store title in filename**: ON

これにより `牛乳を買う.md` のように、人間にも読める普通のMarkdownファイルがTaskになります。

### Status

Settings -> TaskNotes -> Task Properties -> Status で、次の順番にします。

| Value | Label | Completed |
|---|---|---|
| `inbox` | Inbox | OFF |
| `todo` | Todo | OFF |
| `doing` | Doing | OFF |
| `waiting` | Waiting | OFF |
| `done` | Done | ON |
| `dropped` | Dropped | ON |

- Default: `inbox`
- `dropped` は通常のcycleから外してもOKです。

### Priority

Settings -> TaskNotes -> Task Properties -> Priority:

| Value | Label |
|---|---|
| `high` | High |
| `medium` | Medium |
| `low` | Low |

- Default: **No default**

Priorityは必要なTaskだけに付けます。

### Scopes custom field

Settings -> TaskNotes -> Task Properties -> Custom User Fields で追加します。

```text
Display Name: Scopes
Property Name: scopes
Type: List
Default: empty
```

**Autosuggestion filters (Advanced)**:

```text
Include folders: Scopes/
Required property key: type
Required property value: scope
```

これがv2の重要な接続です。TaskNotesは別のScope一覧を持たず、`Scopes/` に実在する `type: scope` のMarkdownだけを候補にします。

Task作成時、Scopes欄で `[[` と入力すると登録済みScopeが候補に出ます。

### Creation modal

Settings -> TaskNotes -> Modal Fields で、最初は必要なものだけ見せるのがおすすめです。

- Title: visible
- Scopes: visible
- Priority: visible（任意）
- Status: 非表示でもOK。新規Taskは自動でInboxになります。
- Due / Scheduled /その他: 必要になるまで非表示でOK

### Hotkey

Settings -> Hotkeys で **TaskNotes: Create new task** に好みのワンストロークキーを割り当てます。

Capture時はタイトルだけで保存できる状態を維持します。Scopeが最初から分かっている場合だけ、その場で選んで構いません。

---

# 最初の5分

## 1. Personal Scopeを作る

1. `Scopes/` で `Personal` という新規ノートを作る
2. `Templates/Scope.md` を適用
3. `kind: area` にする

結果:

```yaml
---
fileClass: Scope
type: scope
kind: area
---
```

**これだけでPersonalはWorkbenchに登録済みのScopeです。**

## 2. Taskを作る

TaskNotesの **Create new task** を開きます。

```text
牛乳を買う
```

Scopeも付けるならScopes欄で `[[` と入力し、候補の `Personal` を選択します。

保存後は `Tasks/` に普通のMarkdown Taskが作られます。

## 3. Dashboardで確認する

[[Dashboard]] を開きます。

Taskは [[Tasks.base]] のTaskNotes viewに出ます。

```text
Inbox -> Todo -> Doing -> Waiting / Done
```

まず1つのTaskを `Inbox -> Todo -> Doing -> Done` と動かしてみます。

## 4. Ideaを作る

AIとのブレストなどで「後で採否を判断したい」単位ができたら、`Ideas/` にノートを作り `Templates/Idea.md` を適用します。

最低限:

```yaml
scopes:
  - "[[Personal]]"
review_gate: 次にこのテーマを設計するとき
```

- 採用 -> 必要なTaskを作る
- 不採用 -> Trash / Archive
- 保留 -> `review_gate` を更新

## 5. Note

行動も再レビューも要求しない情報は `Notes/` に保存します。Scopeは任意です。

---

## 迷ったら

**やる必要がある？** -> Task  
**後で採否を判断したい？** -> Idea  
**情報として残したいだけ？** -> Note  
**それらが何に関係するかを表したい？** -> Scope

> Taskは脊髄反射、Ideaは熟考、Noteは無責任に保存。

設計原則は [[ARCHITECTURE]]、詳細な環境構築は [[README]] を参照してください。
