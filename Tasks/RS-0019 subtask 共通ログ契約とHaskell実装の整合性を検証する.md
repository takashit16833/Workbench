---
status: todo
priority: medium
dateCreated: 2026-08-19T18:48:00+09:00
dateModified: 2026-08-19T18:48:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0019 構造化ログのイベントモデルを直和へ再設計する]]"
blockedBy:
  - uid: "[[RS-0019 subtask JSON Schemaで通常・失敗イベントの不変条件を保証する]]"
    reltype: FINISHTOSTART
  - uid: "[[RS-0019 subtask HaskellのEventSpecを直和モデルへ変更する]]"
    reltype: FINISHTOSTART
branch: RS-0019/final-validation
---

## Squash merge commit body

- ADR、構造化ログ設計、JSON Schema、fixture、Haskell実装の未解消差異がないことを最終確認する
- `make check-app`を実行し、整形、ビルド、テスト、Haddockを含むRAGScopeアプリケーションの品質検査を通す
- RS-0019 Ticketへ採用したモデル、検証結果、RS-0018へ引き渡す共通契約を記録し、完了条件を満たした状態へ更新する

## 目的

Schema側とHaskell側の変更を統合した状態でRS-0019全体の完了条件を確認し、RS-0018が新しい共通契約へ追随できる確定状態にする。

## 関連Subtask

- 先行:
  - [[RS-0019 subtask JSON Schemaで通常・失敗イベントの不変条件を保証する|JSON Schemaで通常・失敗イベントの不変条件を保証する]]
  - [[RS-0019 subtask HaskellのEventSpecを直和モデルへ変更する|HaskellのEventSpecを直和モデルへ変更する]]

## 完了条件

- ADR、基本設計、詳細設計、Schema、fixture、Haskell実装が同じ不変条件を表している
- 構造化ログの関連テストが成功する
- `make check-app`が成功する
- RS-0019 Ticketの全完了条件を実ファイルと検証結果で確認できる
- Ticketの結果にRS-0018へ引き渡す確定済み共通契約が記録されている
