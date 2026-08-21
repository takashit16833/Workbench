---
status: done
priority: medium
dateCreated: 2026-08-21T20:39:00+09:00
dateModified: 2026-08-22T07:16:14.649+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask RAGScope全体の概念と用語を洗い出す]]"
    reltype: FINISHTOSTART
branch: RS-0020/glossary
completedDate: 2026-08-22
---

## Squash merge commit body

- RAGScope全体で共有する概念の名称と意味を定義する用語集を作成する
- RAGScope固有の正式用語の正本を用語集へ移すため、文書管理規約など必要な正本を整合させる
- 「評価データ」「評価データセット」を決定済み用語として定義し、DBや保存形式など未決定の実装詳細を混ぜない

## 目的

複数の要求・設計書で使うRAGScope固有用語を1か所で定義し、各文書が同じ言葉を同じ意味で利用できる状態にする。

## 完了条件

- 用語集の責務が、用語の意味と概念間の基本関係に限定されている
- RAGScope固有用語と、意味が一般に確立している技術用語を必要な範囲で区別している
- 用語集とシステムアーキテクチャの間で正式用語の正本が重複していない
- 文書管理規約などの正本が、新しい用語の正本配置と整合している
- 正確な型、DB構造、API項目などを用語集へ複製していない
