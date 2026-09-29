---
status: dropped
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - "[[RS-0024 subtask Trace境界とSpan実行を実装する]]"
branch: RS-0024/context-propagation
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-29T08:55:02.453+09:00
tags:
  - task
completedDate: 2026-09-29
---

## Squash merge commit body

- SDK Context型を漏らさないTrace Context伝播境界を追加した
- child thread / workerへのContext適用と終了後の復元を実装した
- outbound carrierへのTrace Context injectとContext復元を自動テストで確認した

## 目的

SDK Context値をUseCaseへ公開せず、現在のTrace Contextをchild thread / workerへ安全に引き継ぎ、後続のHTTP通信境界からcarrierへinjectできる伝播境界を実装する。

## 作業範囲

- SDK Context値をUseCaseへ公開せず、現在のTrace Contextを捕捉・適用・復元できる境界を実装する
- fresh child threadと既存worker相当へContextを引き継ぐ処理を実装する
- 後続のHTTP通信境界からcurrent Trace Contextをcarrierへinjectできる入口を用意する
- Reader環境へ独自TraceId / SpanIdや独自Context stackを持たせず、Contextの保持はSDKへ委ねる

## 完了条件

- 親Contextを捕捉してchild / worker内のcurrent Spanへ反映できる
- 成功・同期例外・キャンセル後に適用前のContextへ復元される
- nestedなContext適用でも復元順序が崩れない
- outbound propagatorでcurrent Trace Contextをcarrierへinjectできる
