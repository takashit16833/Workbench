---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# Org Workbench の保存先と読み込みを整える

## やること

Org 版 Workbench のデータを置く場所と、Emacs 設定から読み込む方法を決めて実装する。作業対象は `.emacs.d-cli` の `feat/org-workbench`。ローカルの設定ディレクトリは `~/.emacs.d` なので混同しない。

- `workbench/design.org` を確認し、Project 定義・タスクファイルの保存先を決める。実データと実装コードの場所を区別する。
- Workbench 専用の設定・関数を `init.el` の長いベタ書きにせず、必要に応じて別ファイルに分けて読み込む。
- Agenda が複数のタスクファイルを見落とさないよう、対象ファイルの登録・更新方法を用意する。設定読み込み時の不要な処理は避ける。
- 既存の Org 表示設定・補完・キーバインドを壊さない。

## 完了条件

- CLI Emacs を再起動しても Workbench の設定を読み込める。
- 新たな Org タスクファイルを追加した後、再起動または明示的な更新で検索・Agenda の対象にできる。
- 保存先とモジュールの役割が、次の AI に分かる短い記述として残っている。

参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
