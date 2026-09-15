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
dateModified: 2026-09-15T12:02:59.444+09:00
tags:
  - task
priority: normal
timeEntries:
  - startTime: 2026-09-15T01:10:44.242Z
    description: Work session
    endTime: 2026-09-15T01:35:44.311Z
  - startTime: 2026-09-15T01:51:59.940Z
    description: Work session
    endTime: 2026-09-15T02:16:59.983Z
  - startTime: 2026-09-15T02:37:59.385Z
    description: Work session
    endTime: 2026-09-15T03:02:59.444Z
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

## 調査結果と現在の実装判断

この節は作業再開時のためのローカルな実装メモである。現在状態を判断するときは、`RS-0024/exception-event-once`の実コードとテストを優先する。

commit `e40a998a0352214e4989a0aec5ec6ea1d65d6e8b`で確認した実装では、同期例外をSDK内部の短い区間だけ値として運ぶ方式を採用している。

### 守る振る舞い

nested Spanの最内側から同期例外が未処理のまま外へ伝播する場合は、次を別々の条件として扱う。

```text
Span Error設定
  = その例外が各Span自身の境界を外へ抜けたか

EventRecord記録
  = 同じexception propagationですでに記録済みか
```

したがって、`root -> use-case -> internal`をすべて抜ける場合は、3 Spanすべてを`Error + error.type`にしつつ、例外EventRecordは最初の1件だけ記録する。EventRecordは例外が最初に抜けた`internal` Spanがcurrentな間にemitし、そのTraceId / SpanIdへ関連付ける。SDKが同じ例外をSpan Eventとして自動記録する経路は抑制し、最終的には元の例外を再throwする。

一方、`internal`を抜けた例外を`use-case` action内部のapplication codeがcatchして復旧した場合は、`internal`だけが`Error`となり、`use-case`と`root`は`Unset`のままにする。例外EventRecordは1件である。

### 重複が3件になった原因

以前は、最内側で例外EventRecordを記録して`ExceptionContext`へ記録済みmarkerを付けた後、そのまま`inSpan''` callback内から`rethrowIO`していた。

その経路では、`hs-opentelemetry`の`inSpan''`が例外を`SomeException`としてcatchし、Span終了とContext復元後に`throwIO`していた。GHC 9.12.4で確認した挙動では、このSDK内の`SomeException` catch / `throwIO`経路を通ると、外側のSpan境界から記録済みmarkerを含む元の`ExceptionContext`を確認できなくなった。

その結果、`internal`、`use-case`、`root`の各境界が同じ例外を「未記録」と判定し、EventRecordが3件になった。

### 採用した経路

現在は概ね次の流れである。

```text
同期例外
  ↓
handleSynchronousException
  ↓
markSynchronousException
  ├─ 対象SpanをErrorにする
  ├─ error.typeを付ける
  └─ claimExceptionEventが初回ならEventRecordをemitする
  ↓
marker付きCapturedExceptionを値として返す
  ↓
SpanExit = Left CapturedException
  ↓
inSpan''から見るとcallbackは正常return
  ↓
Span終了 / Context復元
  ↓
inSpan''の外でrethrowIO
```

Adapter内部では、

```haskell
type CapturedException = ExceptionWithContext SomeException
type SpanExit result = Either CapturedException result
```

という形を使う。

重要なのは、**EventRecordのemitはowner Spanがcurrentなcallback内、例外のrethrowはSDKがSpan終了とContext復元を終えたcallback外**に分けることである。

- emitまでcallback外へ出すと、current Contextが親Spanへ戻り、EventRecordのownerがずれる可能性がある。
- rethrowまでcallback内で行うと、問題になったSDKの`SomeException` catch / `throwIO`経路へ戻る。

非同期例外はこの`SpanExit`経路へ入れず、同期例外として記録・変換せずに再throwする。

### テストを見る場所

現在の役割分担は次である。

```text
OpenTelemetryBehaviorSpec
  = hs-opentelemetry自体のSpan callback / 例外挙動

OpenTelemetryTraceSpec
  = TraceBoundaryとTrace Adapterの単体挙動

OpenTelemetryLogsSpec
  = LogsBoundaryとLogs Adapterの変換・相関

OpenTelemetryExceptionEventSpec
  = nested exception、exactly-once、owner、recoveryの統合挙動
```

commit `e40a998a...`では、`SpanExit`方式へ変更後に既存テストが成功している。以前の「EventRecordが3件になる」結果は修正前の観測結果であり、現在の期待値ではない。
