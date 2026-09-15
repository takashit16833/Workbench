---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0024 subtask Trace境界とSpan実行を実装する]]"
    reltype: FINISHTOSTART
  - uid: "[[RS-0024 subtask Logs境界とLogRecord・EventRecord記録を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0024/exception-event-once
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-15T10:10:44.242+09:00
tags:
  - task
priority: normal
timeEntries:
  - startTime: 2026-09-15T01:10:44.242Z
    description: Work session
---

## Squash merge commit body

- 未処理例外のSpan Status更新とLogs EventRecordのexactly-once記録を接続した
- SDKによる同じ例外のSpan Event自動記録を抑制した
- nested exceptionでEventRecord 1件・Span Event 0件・元例外rethrowを自動テストで確認した

## 目的

未処理例外が複数Spanを外へ伝播する場合でも、各SpanのStatus更新とLogs EventRecordのexactly-once記録を両立し、同じ例外事実を重複記録しない接続を実装する。

## 作業範囲

- 未処理例外が複数Spanを外へ伝播するとき、各SpanのStatus更新とLogs EventRecordのexactly-once記録を両立するAdapter内の接続を実装する
- 例外EventRecordを記録するowner scopeを、nested exceptionの最小実測結果から決める
- SDKが同じ例外事実のSpan Eventを自動生成する経路を抑制し、UseCase側へ重複管理を持ち出さない

## 完了条件

- `root -> UseCase -> internal`のnested exceptionで、例外が外へ逃げた各Spanが`Error + error.type`になる
- 同じ例外のLogs EventRecordが全体で1件だけ記録される
- 同じ例外のSpan Eventが0件である
- EventRecordのTraceId / SpanIdとowner scopeの相関を確認できる
- 最終的に同じ元例外が外へ伝播する
