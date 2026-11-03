# Workbench

Task / Idea / Note / Project を扱う、自分 + AI 共用の作業台。

## Start

```bash
bash Scripts/install.sh
```

`install.sh` は `~/obsidian-config-layer` を中央の管理元として利用します。存在しなければ初回だけ取得し、`main.js` がない場合だけビルドします。Workbench では `main.js`・`manifest.json`（存在すれば `styles.css`）をシンボリックリンクで参照し、`data.json` は Vault 固有のまま保持します。既存のコピーはバックアップして移行し、その他の community plugin もインストールします。

Config Layer の更新時は `~/obsidian-config-layer` で `git pull`・`npm run build` を実行して Obsidian を再読み込みします。各 Vault でのコピーや個別ビルドは不要です。中央リポジトリを別の場所に置く場合は `CONFIG_LAYER_DIR` を指定します。

Obsidianを再起動し、[[ONBOARDING]] の初回設定を行います。

## Use

- Dashboard: 起動時 / **⌥D**
- Task: **⌥T** / TaskNotes の **Create new task**
- Maximize pane: **⌥Z** / Pane Relief の **Maximize active tab (Toggle)**
- Idea: `Ideas/`
- Note: `Notes/`
- Project: `Projects/`

DashboardにはToday / Tasksを表示します。Reading viewでは **c** でCalendar、**k** でKanbanを開きます。

## Workbench commands

- **Workbench: Clear Project**: Projectまたは無所属を整理する。`完了のみ` / `すべて`
- **Workbench: Clear All**: Workbench全体を整理する。`完了のみ` / `すべて`
- **Workbench: Create Holiday**: Projectの休みを登録する
- **Workbench: Shift Schedule**: Projectの予定をworkday単位で前後へずらす。Holidayは除外する

Clear系は`Notes/`を変更せず、対象をTrashへ移動します。
HolidayはCalendarに表示し、通常のTask一覧とStatisticsからは除外します。
