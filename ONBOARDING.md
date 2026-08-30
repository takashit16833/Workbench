# Workbench Onboarding

## 1. Plugins

Vaultルートで実行します。

```bash
bash Scripts/install.sh
```

このスクリプトは Config Layer のsubmoduleを初期化・ビルドしてVaultへ配置し、Workbenchで使うcommunity pluginもインストールします。

Obsidianを再起動またはVaultをreloadします。

## 2. Fileclass

Settings -> Fileclass:

- **Class files folder**: `FileClasses`

## 3. TaskNotes

### General

Settings -> TaskNotes -> General:

- **Default Tasks Folder**: `Tasks`

### Title

Settings -> TaskNotes -> Task Properties -> Title:

- **Store title in filename**: ON

### Status

Settings -> TaskNotes -> Task Properties -> Status:

| Value | Label | Completed |
|---|---|---|
| `inbox` | Inbox | OFF |
| `todo` | Todo | OFF |
| `doing` | Doing | OFF |
| `waiting` | Waiting | OFF |
| `done` | Done | ON |
| `dropped` | Dropped | ON |

- Default: `inbox`

### Priority

Settings -> TaskNotes -> Task Properties -> Priority:

| Value | Label |
|---|---|
| `high` | High |
| `medium` | Medium |
| `low` | Low |

- Default: **No default**

### Projects

Settings -> TaskNotes -> Task Properties -> Projects:

```text
Property key: projects
Default projects: empty
```

Autosuggest Filters:

```text
Include folders: Projects/
```

### Source

Settings -> TaskNotes -> Task Properties -> Custom Fields:

```text
Display name: Source
Property key: source
Type: Text
```

外部チケットや外部文書を正本とするTaskだけに設定します。

### Branch

Settings -> TaskNotes -> Task Properties -> Custom Fields:

```text
Display name: Branch
Property key: branch
Type: Text
```

作業ブランチを持つTaskだけに設定します。

### Creation modal

Settings -> TaskNotes -> Modal Fields:

`Show in Creation` を次のようにします。

```text
Basic Information
  すべて       OFF

Metadata
  すべて       OFF

Organization
  Projects     ON
  その他       OFF

Dependencies
  すべて       OFF

Custom Fields
  Source       OFF
  Branch       OFF
```

`Projects` は次の状態にします。

```text
Enabled:          ON
Show in Creation: ON
Show in Edit:     ON
```

`Source` と `Branch` は次の状態にします。

```text
Enabled:          ON
Show in Creation: OFF
Show in Edit:     ON
```

その他の項目は、`Enabled` と `Show in Edit` はONのままで構いません。

### Hotkey

Settings -> Hotkeys:

- **TaskNotes: Create new task** に好みのキーを割り当てる

## 4. Homepage

設定済みです。

- Homepage: `Dashboard`
- 起動時にDashboardを開く
- **⌥D**: Dashboardへ戻る

## 5. First run

1. `Projects/` に `Personal.md` を作る
2. **Create new task** で `牛乳を買う` を作る
3. Projectに `Personal` を選ぶ
4. [[Dashboard]] で確認する
5. `Inbox -> Todo -> Doing -> Done` と動かす

## 使い分け

- Task: やること
- Idea: 後で再検討すること
- Note: 保存しておく情報
- Project: それらのまとまり
