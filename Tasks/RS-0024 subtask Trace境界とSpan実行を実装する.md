---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0024 subtask OpenTelemetry依存とCabal境界を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0024/trace-span
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-11T12:50:51.690+09:00
tags:
  - task
priority: normal
timeEntries:
  - startTime: 2026-09-09T04:54:39.553Z
    description: Work session
    endTime: 2026-09-09T05:19:39.643Z
  - startTime: 2026-09-09T05:24:47.540Z
    description: Work session
    endTime: 2026-09-09T05:49:47.606Z
  - startTime: 2026-09-09T05:54:53.516Z
    description: Work session
    endTime: 2026-09-09T06:19:53.573Z
  - startTime: 2026-09-09T06:46:07.241Z
    description: Work session
    endTime: 2026-09-09T07:11:07.301Z
  - startTime: 2026-09-09T07:18:56.202Z
    description: Work session
    endTime: 2026-09-09T07:43:56.264Z
  - startTime: 2026-09-09T07:52:45.335Z
    description: Work session
    endTime: 2026-09-09T08:17:45.398Z
  - startTime: 2026-09-09T08:33:03.559Z
    description: Work session
    endTime: 2026-09-09T08:58:03.582Z
  - startTime: 2026-09-09T21:26:26.656Z
    description: Work session
    endTime: 2026-09-09T21:51:26.747Z
  - startTime: 2026-09-09T22:19:44.454Z
    description: Work session
    endTime: 2026-09-09T22:44:44.513Z
  - startTime: 2026-09-09T22:50:35.970Z
    description: Work session
    endTime: 2026-09-09T23:15:36.014Z
  - startTime: 2026-09-10T00:28:58.421Z
    description: Work session
    endTime: 2026-09-10T00:53:59.201Z
  - startTime: 2026-09-10T01:02:05.946Z
    description: Work session
    endTime: 2026-09-10T01:27:06.177Z
  - startTime: 2026-09-10T01:32:33.438Z
    description: Work session
    endTime: 2026-09-10T01:57:33.518Z
  - startTime: 2026-09-10T02:33:12.888Z
    description: Work session
    endTime: 2026-09-10T02:58:12.951Z
  - startTime: 2026-09-10T07:20:05.556Z
    description: Work session
    endTime: 2026-09-10T07:45:05.620Z
  - startTime: 2026-09-10T08:00:37.689Z
    description: Work session
    endTime: 2026-09-10T08:25:38.633Z
  - startTime: 2026-09-10T08:31:26.051Z
    description: Work session
    endTime: 2026-09-10T08:56:26.216Z
  - startTime: 2026-09-10T09:08:51.242Z
    description: Work session
    endTime: 2026-09-10T09:33:51.319Z
  - startTime: 2026-09-10T23:49:11.581Z
    description: Work session
    endTime: 2026-09-11T00:14:11.703Z
  - startTime: 2026-09-11T00:22:53.526Z
    description: Work session
    endTime: 2026-09-11T00:47:53.616Z
  - startTime: 2026-09-11T01:05:01.138Z
    description: Work session
    endTime: 2026-09-11T01:30:01.202Z
  - startTime: 2026-09-11T02:05:00.417Z
    description: Work session
    endTime: 2026-09-11T02:30:00.447Z
  - startTime: 2026-09-11T02:49:03.485Z
    description: Work session
    endTime: 2026-09-11T03:14:03.479Z
  - startTime: 2026-09-11T03:25:51.552Z
    description: Work session
    endTime: 2026-09-11T03:50:51.690Z
---

## Squash merge commit body

- SDK非依存のTrace利用境界とOpenTelemetry Trace Adapterを追加した
- Spanの最終結果からStatusと`error.type`を設定する処理を追加した
- 未処理例外時のSpan Error、Span Event抑制、元例外rethrowを自動テストで確認した

## 目的

SDK非依存のTrace利用境界とOpenTelemetry Trace Adapterを実装し、処理の最終結果と未処理例外をOpenTelemetry Spanへ正しく反映できる状態にする。

## 作業範囲

- SDK非依存のTrace利用境界とOpenTelemetry Trace Adapterを実装する
- `inSpan'`等のhelperで自動例外記録を抑制する案と、`createSpan`等の低水準APIをAdapter内で合成する案を最小実測で比較し、Span scopeの基本形を決める
- 処理自身の最終結果からSpan Statusと`error.type`を設定し、具体的なerror値から観測値への純粋変換を利用側へ置ける形にする
- 未処理の同期例外ではSpanをErrorにし、不要な例外Span Eventを生成せず、元例外を再throwする

## 完了条件

- 親子Span、Span内current Context、終了後のContext復元を確認できる
- 成功は`Unset`かつ`error.type`なし、通常失敗は`Error + error.type`になる
- 同期例外では`Error + canonical exception class name`になり、例外Span Eventが0件で、元例外がそのまま外へ出る
- 囲まれた本体が1回だけ実行される
