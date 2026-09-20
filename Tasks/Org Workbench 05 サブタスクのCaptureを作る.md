---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# サブタスクを Capture で直接作成する

## やること

タスクを検索して親を選び、その直下に新しい見出しを追加する。子を独立ファイルにする必要はない。

- ID またはファイル位置から既存タスクを補完検索し、任意の深さの見出しを親に選べるようにする。
- Capture の入力はタイトルだけでもよく、状態・ID・CREATED を自動設定する。日時や Project の追加は必要に応じて指定できる。
- 子は親の所属 Project を継承し、子に別 Project を追加できる。親の見出し・本文・兄弟タスク・ID を壊さない。
- 雑用のような TODO なしの整理用見出しも追加先にできる。

## 完了条件

- RAGScope タスクの子と孫を Capture から直接作れる。
- 雑用ファイルの配下に「牛乳を買う」を追加でき、牛乳用の独立ファイルはできない。
- 保存・キャンセル・再起動後も正しい位置と階層を保ち、親子の ID が重複しない。

前提: [[Org Workbench 04 親タスクのCaptureを作る]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
