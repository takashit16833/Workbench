---
status: todo
priority: medium
dateCreated: 2026-08-21T09:16:00+09:00
dateModified: 2026-08-26T15:15:30+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask JSONとSQLiteへの投影で論理契約を検証する]]"
    reltype: FINISHTOSTART
branch: RS-0020/compare-existing-design
---

## Squash merge commit body

- 新しい論理契約を、削除前の設計、関連ADR、JSON Schema、Haskell・Python実装と比較する
- 既存判断ごとに維持、置換、削除、実装追随の必要性を整理する
- 本Ticketへ含める変更と、独立した後続Ticketへ分ける変更の境界を確定する

## 目的

新しい論理契約を先に確定した状態で旧設計と実装を読み直し、既存構造へ新しい意味を合わせるのではなく、必要な移行差分だけを決める。

## 完了条件

- エラー設計、構造化ログ設計、関連ADR、Schema、Haskell・Python実装との主要差分が整理されている
- 維持する既存判断と置き換える判断が区別されている
- ADRの`superseded`対象と新しいADRの必要性が決まっている
- 大きな実装変更を後続Ticketへ分ける必要があるか判断できている
