---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# 親タスクを Capture で作成する

## やること

新しい作業の入口を `org-capture` にする。親のない主なタスクは 1 ファイル作成し、作成後すぐ編集できるようにする。

- タイトルだけで保存できるクイック作成を用意する。TODO・ID・CREATED などの初期値は自動付与する。
- 詳細作成では登録済み Project（複数・無所属可）、開始予定 SCHEDULED、期限 DEADLINE、優先度、BRANCH、SOURCE を任意入力できる。省略した値の入力を強制しない。
- ファイル名衝突による上書きを避け、本文やメモを書き足せる。
- 既存の Capture 設定やショートカットを調べ、競合を起こさない。Emacs のキー操作は Emacs 側で管理する。

## 完了条件

- タイトルだけで作成でき、生成ファイルが Agenda の検索対象になる。
- RAGScope・Workbench・無所属・複数所属で作成でき、日時や BRANCH を付けても再編集できる。
- 同名タスクを続けて作成しても別のファイルになり、失敗・キャンセル時に不完全なファイルを残さない。

前提: [[Org Workbench 02 Projectの登録と所属選択を作る]]、[[Org Workbench 03 タスクの形式と状態を整える]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
