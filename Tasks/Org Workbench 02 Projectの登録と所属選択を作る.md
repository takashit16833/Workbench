---
status: done
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-21T17:35:37.975+09:00
tags:
  - task
completedDate: 2026-09-21
---

# Project の登録と所属選択を作る

## やること

`projects.org` を唯一の Project 定義とし、登録済み Project を機械的に扱えるようにする。

- Project の見出しに一意の ID、表示名、所属用の内部タグを持たせる。表示名を変えてもタグを変える必要がない形にする。
- Project 作成コマンドを用意し、同名・同一タグの重複を防ぐ。空の Project も保持できる。
- `RAGScope` と `Workbench` を登録する。これらは新しい Org 版で扱う Project であり、旧 Obsidian の `org-workbench` Project とは別。
- タスク用に登録済み Project の候補選択を用意する。無所属・複数所属を許可する。所属タグと一般のタグを区別する。
- 名前変更・削除コマンドは初回対象外。内部タグは後続の実装で共通利用できるようにする。

## 完了条件

- Emacs から Project を作成し、`projects.org` に保存できる。再起動後も存在する。
- `RAGScope` と `Workbench` が別の Project として選択でき、空でも一覧に存在する。
- 無所属・複数選択ができ、無効な Project 名を属性として勝手に保存しない。

前提: [[Org Workbench 01 保存先と読み込みを整える]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
