# Workbench Onboarding

## 1. Plugins

Vaultルートで実行します。

macOS:

```bash
bash Scripts/install.sh
```

Windows（PowerShell）:

```powershell
.\Scripts\install.ps1
```

このスクリプトは、中央の `~/workspace/obsidian-config-layer` を参照します。存在しない場合は初回だけ取得・ビルドし、Workbench から `main.js`・`manifest.json` へシンボリックリンクを作成します。既存のプラグイン本体ファイルはバックアップし、Vault 固有の `data.json` は変更しません。その他の community plugin もインストールします。

Obsidianを再起動またはVaultをreloadします。

### Config Layer（各 OS の初回のみ）

共通設定のリポジトリ `dotfiles` を `~/workspace/dotfiles` に置きます。
Obsidian の **Settings → Config Layer** で以下を設定します。

| 項目 | 値 |
| --- | --- |
| CSS folder | `~/workspace/dotfiles/obsidian/css` |
| Hotkeys folder | `~/workspace/dotfiles/obsidian` |
| Plugins folder | 空欄 |
| Watch external files | ON |

**Shared CSS** で必要な CSS を有効にし、**Apply shared hotkeys** と **Apply required plugins** を実行します。
Mac と Windows で同じ `hotkeys.json` を使用します。`Mod` は Mac では Cmd、Windows では Ctrl です。左サイドバーは `Alt+B`、太字は `Mod+B`、タブの並べ替えは `Ctrl+Shift+PageUp/PageDown` です。

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

Workbench 固有の割り当て（両 OS 共通）:

- **Alt+T**: Task 作成
- **Alt+D**: Dashboard
- **Alt+Z**: 表示領域の最大化

Mac の **Alt** は **Option（⌥）** に対応します。これらは Vault の `.obsidian/hotkeys.json` に初期設定済みです。

## 4. Homepage

設定済みです。

- Homepage: `Dashboard`
- 起動時にDashboardを開く
- **Alt+D（Mac は ⌥D）**: Dashboardへ戻る

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
