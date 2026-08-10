# Workbench Onboarding

## 1. Plugins

Vaultルートで実行します。

```bash
bash Scripts/install-plugins.sh
```

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

### Scopes

Settings -> TaskNotes -> Task Properties -> Custom User Fields:

```text
Display Name: Scopes
Property Name: scopes
Type: List
Default: empty
```

Autosuggestion filters:

```text
Include folders: Scopes/
```

### Creation modal

Settings -> TaskNotes -> Modal Fields:

1. **Sync user fields** を1回押す
2. `Show in Creation` を次のようにする

```text
Basic Information
  Title        ON
  Details      OFF

Metadata
  すべて       OFF

Organization
  すべて       OFF

Dependencies
  すべて       OFF

Custom Fields
  Scopes       ON
  その他       OFF
```

`Scopes` は次の状態にします。

```text
Enabled:          ON
Show in Creation: ON
Show in Edit:     ON
```

その他の項目は、`Enabled` と `Show in Edit` はONのままで構いません。

### Hotkey

Settings -> Hotkeys:

- **TaskNotes: Create new task** に好みのキーを割り当てる

## 4. First run

1. `Scopes/` に `Personal` を作る
2. `Templates/Scope.md` を適用する
3. `kind: area` にする
4. **Create new task** で `牛乳を買う` を作る
5. Scopeを付ける場合は `[[` と入力して `Personal` を選ぶ
6. [[Dashboard]] で確認する
7. `Inbox -> Todo -> Doing -> Done` と動かす

## 使い分け

- Task: やること
- Idea: 後で再検討すること
- Note: 保存しておく情報
- Scope: それらのまとまり
