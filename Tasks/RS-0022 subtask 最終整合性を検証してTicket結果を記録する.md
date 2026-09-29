---
status: dropped
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-05T06:23:37.311+09:00
tags:
  - task
projects:
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask アプリケーション実行と失敗境界を実装する]]"
    reltype: FINISHTOSTART
  - uid: "[[RS-0022 subtask JSON出力・Sink・Schema適合を現在契約へ移行する]]"
    reltype: FINISHTOSTART
branch: RS-0022/finalize-logging-redesign
completedDate: 2026-09-05
---

## Squash merge commit body

- Haskell実装・利用者操作単位の実行追跡・共有JSON Contract・SQLite表現・現在設計の最終整合性を検証する
- UseCase結果、OperationResult、lifecycle、trace内外ログの境界が実装と正本で一致していることを確認する
- 関係するHaskellテスト、Schema適合テスト、SQLite投影・復元テスト、品質検査の結果を確認する
- RS-0022の完了条件と結果を実装事実へ合わせて確定する

## 目的

各実装Subtaskを統合した親branchで、RS-0022全体の完了条件を実測し、正本Ticketへ結果を記録する。

## 完了条件

- 全体設計Subtaskで確定したLifecycle、1 User Operation = 1 trace、UseCase子span、共通Loggingの全体像と最終Haskell実装に未解消な差異がない
- UseCaseの`Either failure result`と利用者操作境界の`Either OperationFailure result`が別の境界として実装され、UseCase前後の通常失敗をUseCase固有failureへ混在させていない
- Application / process lifecycleの結果をOperationResultへ混在させていない
- trace内ログが`TraceId`・`SpanId`を組で持ち、trace外ログが両方を持たないという現在契約がHaskell中核型・JSON Schema・fixture・serializationで一致している
- 同じ`LogRecord`をJSONとSQLiteの双方へ投影でき、SQLiteのmigration・transaction・復元・往復検証が正本Ticketの完了条件を満たしている
- 現在の実行追跡・構造化ログ設計、共有JSON Contract、SQLite表現、Haskell実装が整合している
- 関係するHaskellテスト、Schema適合テスト、SQLite投影・復元テスト、品質検査が成功する
- 旧logging / execution構造の残存を確認し、残すものは現在の責務から説明できる
- 正本Ticketの完了条件と`結果`を実測結果に基づいて更新できる

## 着手前確認

SQLite実装が独立Subtaskへ分解された場合、このTaskの`blockedBy`へそのSubtaskを追加してから着手する。SQLite実装を既存Subtaskへ含める場合は、対応するbranch差分にSQLite投影・migration・復元・往復テストが含まれることを確認する。
