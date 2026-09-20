---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# Agenda で最低限の進捗を確認する

## やること

`org-agenda` を初回リリースの進捗画面にする。Dashboard を新規で作り込む必要はない。

- Workbench 配下のタスクを Agenda 対象に登録し、新しく Capture したファイルも反映されるようにする。
- 今日の予定、期限間近・超過、未完了のタスク、DOING・WAITING を確認できる表示を整える。
- Agenda 上からタスクを開き、状態変更して表示を更新できる。通常の Org 操作を優先する。
- DONE / DROPPED の扱いを整理し、完了したタスクが未完了一覧に残らないようにする。

## 完了条件

- SCHEDULED / DEADLINE を付けたサブタスクまで Agenda に表示される。
- TODO → DOING → DONE、WAITING → TODO の変更が保存・表示に反映される。
- 起動し直しても同じタスク群を確認でき、登録漏れ・重複で進捗を誤認しない。

前提: [[Org Workbench 03 タスクの形式と状態を整える]]、[[Org Workbench 04 親タスクのCaptureを作る]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
