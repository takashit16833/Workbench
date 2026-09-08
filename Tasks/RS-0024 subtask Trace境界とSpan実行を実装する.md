---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0024 subtask OpenTelemetry依存とCabal境界を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0024/trace-span
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-09T07:31:26.860+09:00
tags:
  - task
priority: normal
---

## Scope

- SDK非依存のTrace利用境界とOpenTelemetry Trace Adapterを実装する
- `inSpan'`等のhelperで自動例外記録を抑制する案と、`createSpan`等の低水準APIをAdapter内で合成する案を最小実測で比較し、Span scopeの基本形を決める
- 処理自身の最終結果からSpan Statusと`error.type`を設定し、具体的なerror値から観測値への純粋変換を利用側へ置ける形にする
- 未処理の同期例外ではSpanをErrorにし、不要な例外Span Eventを生成せず、元例外を再throwする

## Verification

- 親子Span、Span内current Context、終了後のContext復元を確認できる
- 成功は`Unset`かつ`error.type`なし、通常失敗は`Error + error.type`になる
- 同期例外では`Error + canonical exception class name`になり、例外Span Eventが0件で、元例外がそのまま外へ出る
- 囲まれた本体が1回だけ実行される

## Squash merge commit body

- SDK非依存のTrace利用境界とOpenTelemetry Trace Adapterを追加した
- Spanの最終結果からStatusと`error.type`を設定する処理を追加した
- 未処理例外時のSpan Error、Span Event抑制、元例外rethrowを自動テストで確認した
