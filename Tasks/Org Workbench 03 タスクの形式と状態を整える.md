---
status: done
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-21T19:29:39.351+09:00
tags:
  - task
completedDate: 2026-09-21
---

# タスクの保存形式と状態を整える

## やること

以降の Capture・一覧・Agenda が同じデータを扱えるよう、Org タスクの最小形式を決めて設定する。

- 主なタスクは 1 ファイルの TODO 見出し、子孫は同じファイル内の見出しとして扱い、階層の深さを制限しない。雑用のような整理用見出しは TODO なしでよい。
- TODO / DOING / WAITING / DONE / DROPPED を定義する。INBOX は作らない。状態をプロパティに重複保存しない。
- ID と CREATED は作成時に自動生成。優先度は Org 標準、所属は Project タグ、任意の BRANCH・SOURCE を使用する。
- SCHEDULED は開始予定、DEADLINE は終了予定・期限。完了・中止時の CLOSED は自動記録する。初回では見積時間や着手履歴を増やさない。
- 親の Project タグを子孫が引き継ぎ、子には別の Project も追加できるようにする。

## 完了条件

- タスクを保存・再読込しても状態、属性、日時、階層が維持される。
- DONE / DROPPED で CLOSED が記録される。状態・Project の二重管理がない。
- 親・子それぞれに安定した ID が付き、ファイルを移動しても ID を再発行しない。

前提: [[Org Workbench 01 保存先と読み込みを整える]]、[[Org Workbench 02 Projectの登録と所属選択を作る]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
