---
projects:
  - "[[Workbench]]"
created: 2026-08-11
---
# TaskNotesかんたん使い方

## 普段見るもの

- **Task List**: 次に何をやるか
- **Calendar**: いつやるか
- **Statistics**: 見積と実績
- **Pomodoro**: 集中作業＋実績記録

## Calendar

`TaskNotes/Views/calendar-default.base` を開く。

- 月表示にすると全体予定を見やすい
- `scheduled` = 着手予定日
- `due` = 完了予定日
- `scheduled` から `due` までがガント風の帯で表示される
- Drag & Dropで個別Taskの日付を変更できる

> [!note]
> 現在のTaskが延びたときに、後続Taskをまとめて自動でずらす機能はTaskNotes標準にはない。

## Pomodoro

コマンドパレットから **TaskNotes: モドーロタイマーを開く** を開く。

1. 作業するTaskを選ぶ
2. Pomodoroを開始する
3. セッションを完了する

Taskに紐づけたPomodoroは、完了すると作業時間がTaskの実績へ自動記録される。

実績は **TaskNotes: Open Statistics**、Pomodoro履歴は **TaskNotes: Open Pomodoro Stats** で確認できる。
