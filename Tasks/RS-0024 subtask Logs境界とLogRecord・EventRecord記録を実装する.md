---
status: done
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0024 subtask OpenTelemetry依存とCabal境界を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0024/logs-records
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-15T10:06:21.083+09:00
tags:
  - task
priority: normal
completedDate: 2026-09-15
---

## Squash merge commit body

- SDK非依存のLogs利用境界とOpenTelemetry Logs Adapterを追加した
- 通常LogRecordとEventRecordを用途別に記録できるようにした
- current Trace ContextとのTraceId / SpanId相関を自動テストで確認した

## 目的

SDK非依存のLogs利用境界とOpenTelemetry Logs Adapterを実装し、通常LogRecordと名前付きEventRecordを意味を保ったままcurrent Trace Contextへ関連付けて記録できる状態にする。

## 作業範囲

- SDK非依存のLogs利用境界とOpenTelemetry Logs Adapterを実装する
- 通常LogRecordと名前付きEventRecordを利用側で区別できる入力・操作にする
- EventName、Severity、Body、属性、必要なtimestampをSDK型へ漏らさず表現し、現在のTrace Contextに関連付けて記録する

## 完了条件

- 通常LogRecordとEventRecordをそれぞれ記録できる
- current Trace Context内で記録したLogRecord / EventRecordに正しいTraceId / SpanIdが設定される
- 名前付きイベントの意味を通常ログへ潰さず、SDKのLogRecord全体を利用側の型として再公開していない
