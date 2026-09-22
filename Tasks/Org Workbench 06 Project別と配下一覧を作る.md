---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# Project 別とタスク配下の一覧を作る

## やること

Kanban の再現はせず、Org 標準の検索・Agenda と見出し構造を使って必要な作業を探せるようにする。

- 登録済み Project を選ぶと、所属するタスクを状態付きで一覧表示し、対象の Org 見出しへ移動できる。
- 親から継承した所属や複数 Project への所属も検索結果に含める。無所属を扱えるようにする。
- タスクを選ぶと直属の子タスク、または子孫すべてを確認でき、目的の見出しへ移動できる。
- 親タスクと子タスクが一覧に出る場合の表示重複・並びは、使いやすく最小限の実装にする。既存の Consult 等を活用し、独自 UI は増やしすぎない。

## 完了条件

- RAGScope と Workbench を切り替えてタスク一覧を表示できる。
- 親を選んで直下と子孫を確認できる。サブタスクを直接開ける。
- Project に所属する親の子も表示され、複数所属のタスクを失わない。

前提: [[Org Workbench 02 Projectの登録と所属選択を作る]]、[[Org Workbench 05 サブタスクのCaptureを作る]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
