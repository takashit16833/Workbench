---
status: doing
priority: medium
dateCreated: 2026-08-21T09:16:00+09:00
dateModified: 2026-08-21T20:39:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask システムアーキテクチャを概念モデルと整合させる]]"
    reltype: FINISHTOSTART
branch: RS-0020/logical-contract
timeEntries:
  - startTime: 2026-08-21T01:18:52.866Z
    description: Work session
    endTime: 2026-08-21T01:43:52.993Z
  - startTime: 2026-08-21T01:50:03.156Z
    description: Work session
    endTime: 2026-08-21T02:15:03.214Z
  - startTime: 2026-08-21T02:30:15.366Z
    description: Work session
    endTime: 2026-08-21T02:55:15.434Z
  - startTime: 2026-08-21T04:08:51.167Z
    description: Work session
    endTime: 2026-08-21T04:33:51.233Z
  - startTime: 2026-08-21T05:52:55.163Z
    description: Work session
    endTime: 2026-08-21T06:17:55.288Z
  - startTime: 2026-08-21T06:24:42.447Z
    description: Work session
    endTime: 2026-08-21T06:49:42.510Z
  - startTime: 2026-08-21T06:54:54.392Z
    description: Work session
    endTime: 2026-08-21T07:19:54.444Z
---

## Squash merge commit body

- RAGScopeの要求とシステム境界から、ログ・エラー・処理の関連付けで確認する必要がある事実を整理する
- 構造化ログ、相関、HTTPエラー表現に関する外部標準を比較し、RAGScope固有の論理契約を定義する
- CLI・APIなどの入口、処理実行、HTTP request、ライフサイクル、重要度、出来事、失敗、エラー情報の責務を決定する

## 目的

既存のHaskell型、Python型、JSON Schema、旧ログ・エラー設計を設計制約にせず、RAGScopeが必要とする意味から共通の論理契約を作る。

## 完了条件

- 要求から必要な観測事実と公開するエラー情報が整理されている
- 外部表現や実装言語に依存しない論理契約が設計書として成立している
- 入口・相関単位・通信単位・ライフサイクルの関係が明示されている
- 重要度、出来事、失敗、エラー情報の関係が決定されている
- 文書の分割と名称は確定した責務に基づいて決められている
