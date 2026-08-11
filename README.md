# Workbench

Task / Idea / Note / Project を扱う、自分 + AI 共用の作業台。

## Start

```bash
bash Scripts/install-plugins.sh
```

Obsidianを再起動し、[[ONBOARDING]] の初回設定を行います。

## Use

- Dashboard: 起動時 / **⌥D**
- Task: **⌥T** / TaskNotes の **Create new task**
- Idea: `Ideas/`
- Note: `Notes/`
- Project: `Projects/`

## Workbench commands

- **Workbench: Clear Project**: Projectまたは無所属を整理する。`完了のみ` / `すべて`
- **Workbench: Clear All**: Workbench全体を整理する。`完了のみ` / `すべて`
- **Workbench: Create Holiday**: Projectの休みを登録する
- **Workbench: Shift Schedule**: Projectの予定をworkday単位で前後へずらす。Holidayは除外する

Clear系は`Notes/`を変更せず、対象をTrashへ移動します。
HolidayはCalendarに表示し、通常のTask一覧とStatisticsからは除外します。
