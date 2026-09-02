---
status: waiting
priority: medium
dateCreated: 2026-09-03T07:37:11+09:00
dateModified: 2026-09-03T07:37:11+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask 実行追跡・構造化ログの全体設計を確定する]]"
    reltype: FINISHTOSTART
branch: RS-0022/implement-logging-core
---

## Squash merge commit body

- 全体設計で確定した構造化ログ公開APIと中核型をHaskell / Cabalへ実装する
- `ErrorType` / `ToErrorType`、event→`LogSpec`、`LogSpec`→`LogRecord`の責務境界をコードと型で表現する
- trace内外を同じLogging公開APIで扱えるRuntime境界を実装し、Trace Contextの有無を組として保持する
- Feature / ApplicationからLogging backendや外部表現へ直接依存できないCabal依存を実装する
- 後続のtrace・span実装とJSON / Sink実装が利用できるLogging中核境界をテストで固定する

## 目的

`RS-0022 subtask 実行追跡・構造化ログの全体設計を確定する`で正本化した構造化ログ設計を、Haskellコード・Cabal設定・自動テストへ落とす。

このSubtaskでは全体構造を再設計しない。実装上、正本だけでは一意に決められない事項が見つかった場合は推測で補わず、設計Subtaskの正本へ戻して判断する。

## このSubtaskで実装すること

- 全体設計で確定した`ragscope-error` / `ragscope-logging`のpackage・library・module境界と`build-depends`。
- `ErrorType` / `ToErrorType`の共通境界のうち、このSubtaskのLogging中核実装に必要な部分。
- Logging公開API、`ToLogSpec`、`LogSpec`、`LogRecord`と、eventから共通logging表現へ変換する境界。
- timestamp / component / optional Trace Contextなどの実行時情報を`LogRecord`へ付加するRuntime境界。
- trace内eventとtrace外eventを同じLogging公開APIから受け付ける境界。
- Sinkへ`LogRecord`を渡す抽象境界。JSON / SQLite固有のserialization・永続化はこのSubtaskでは実装しない。
- Feature / Interface / Lifecycle eventの所有側から共通loggingへ渡すために必要な最小のinstance / 接続境界。
- 上記の型、変換、Runtime、依存方向を確認する自動テスト。

## このSubtaskでは実装しない

- OpenTelemetry Adapter、Tracingのscope管理、Operation root span / UseCase子span。
- `RAGScope.Observability.Runtime`によるTracingとの接続。
- JSON serialization、stderr / memory Sinkの具体出力、Schema適合テスト。
- SQLite migration、投影、復元、往復テスト。
- Applicationの`OperationFailure`、Exception境界、logging failureとの最終結果合成。

## 完了条件

- 全体設計で確定したLogging公開APIと中核型がコード上の正本として存在する。
- `ToLogSpec -> LogSpec -> LogRecord`の変換責務が型・module・テストから追える。
- Trace Contextを持つログと持たないログを同じLogging基盤で扱え、`TraceId` / `SpanId`片方だけの内部状態を作らない。
- Feature / ApplicationからJSON / SQLite backendやTracing具体実装へ不要に依存できないCabal構造になっている。
- 後続の`trace・span`実装Subtaskがcurrent Trace Context取得能力をLogging Runtimeへ接続できる。
- 後続のJSON / Sink Subtaskが同じ`LogRecord`を外部表現へ投影できる。
- JSON / SQLite固有の型・依存・表現をLogging中核型へ持ち込んでいない。
- 関係するHaskellテストと品質検査が成功する。
