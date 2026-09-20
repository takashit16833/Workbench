---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# RAGScope と Workbench の実タスクを登録して初回リリースを確認する

## やること

このタスクの完了が初回マイルストーンの達成条件。設計書の「リリースまでに最低限作る機能」を実際に使って確認する。

- 旧 Workbench の RAGScope / Workbench タスクを参照し、今から使うものだけ Org に登録する。全履歴の移行や双方向同期は行わない。
- 新しい Org 版の `RAGScope` と `Workbench` Project にタスクを振り分け、主なタスクとサブタスクを作る。Workbench 自身の今後の改善項目も新しい環境で管理を始める。
- 新規 Capture → Project 選択 → サブタスク追加 → 状態更新 → Project 別・親別一覧 → Agenda 確認を、両 Project で通して試す。
- 無所属・複数所属、日時の省略・指定、再起動、ID・CREATED、完了時 CLOSED、リンク移動を確認する。不具合があれば担当タスクで修正する。
- 操作方法と残した課題を短く記録する。従来の Workbench を参照用に残し、以後のタスク更新先を Org とする。

## 完了条件

- RAGScope と Workbench で実際に必要なタスクを Org に登録できている。
- 両 Project でタスクを作成・更新・検索・Agenda 表示でき、通常の進捗管理に移れる。
- Project 削除、Clear、休日・予定の一括変更、Pomodoro、アイデア・ノートは未実装でもよい。追加機能は新しい Workbench のタスクで管理する。

前提: [[Org Workbench 04 親タスクのCaptureを作る]]、[[Org Workbench 05 サブタスクのCaptureを作る]]、[[Org Workbench 06 Project別と配下一覧を作る]]、[[Org Workbench 07 Agendaで進捗を確認する]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
