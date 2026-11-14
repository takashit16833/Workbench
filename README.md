# Workbench

Task / Idea / Note / Project を扱う、自分 + AI 共用の作業台。

## Start

### macOS

```bash
bash Scripts/install.sh
```

### Windows 11

Obsidian（Windows 版）、Git、Node.js を用意します。シンボリックリンクのため、Windows の開発者モードを有効にするか、PowerShell を管理者として実行してください。

```powershell
New-Item -ItemType Directory -Path "$HOME\workspace" -Force | Out-Null
git clone https://github.com/takashit16833/Workbench.git "$HOME\workspace\Workbench"
git clone https://github.com/takashit16833/dotfiles.git "$HOME\workspace\dotfiles"
cd "$HOME\workspace\Workbench"
.\Scripts\install.ps1
```

既にリポジトリがあれば `git clone` は不要です。PowerShell でスクリプト実行が禁止されている環境では、管理者の許可なく実行ポリシーを変更しないでください。

`install.sh` は `~/workspace/obsidian-config-layer` を中央の管理元として利用します。存在しなければ初回だけ取得し、`main.js` がない場合だけビルドします。Workbench では `main.js`・`manifest.json`（存在すれば `styles.css`）をシンボリックリンクで参照し、`data.json` は Vault 固有のまま保持します。既存のコピーはバックアップして移行し、その他の community plugin もインストールします。

Config Layer の更新時は `~/workspace/obsidian-config-layer` で `git pull` と `npm run build` を実行して Obsidian を再読み込みします。Windows では `npm.cmd run build` を使えます。各 Vault でのコピーや個別ビルドは不要です。中央リポジトリを別の場所に置く場合は `CONFIG_LAYER_DIR` を指定します。

Obsidianを再起動し、[[ONBOARDING]] の初回設定を行います。

## Use

- Dashboard: 起動時 / **Alt+D**
- Task: **Alt+T** / TaskNotes の **Create new task**
- Maximize pane: **Alt+Z** / Pane Relief の **Maximize active tab (Toggle)**
- Idea: `Ideas/`
- Note: `Notes/`
- Project: `Projects/`（Dashboardでは親子階層で表示）

Mac の **Alt** は **Option（⌥）** です。これらのショートカットは Windows と共通です。共通の Obsidian ホットキーは `dotfiles/obsidian/hotkeys.json` で管理し、`Mod` は Mac では Cmd、Windows では Ctrl に対応します。

DashboardにはToday / Tasksを表示します。Reading viewでは **c** でCalendar、**k** でKanbanを開きます。

## Workbench commands

- **Workbench: Clear Project**: Projectまたは無所属を整理する。`完了のみ` / `すべて`
- **Workbench: Clear All**: Workbench全体を整理する。`完了のみ` / `すべて`
- **Workbench: Create Holiday**: Projectの休みを登録する
- **Workbench: Shift Schedule**: Projectの予定をworkday単位で前後へずらす。Holidayは除外する
- **Workbench: Set Parent Project**: 子Projectと親Projectを選ぶ。親なしも選択可能

Clear系は`Notes/`を変更せず、対象をTrashへ移動します。
HolidayはCalendarに表示し、通常のTask一覧とStatisticsからは除外します。

Project は TaskNotes の Task 作成ではなく、`Projects/` に通常の Markdown として作ります。親子関係は **Workbench: Set Parent Project** で設定します（`projects` ではなく `parent` を使用）。Dashboard の Projects 欄では矢印で開閉し、名前を押すと Project を開きます。Task の所属先は従来どおり TaskNotes で設定します。
