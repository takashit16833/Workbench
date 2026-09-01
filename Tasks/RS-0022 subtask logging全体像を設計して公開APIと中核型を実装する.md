---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-02T05:55:11.122+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
branch: RS-0022/design-logging-architecture
timeEntries:
  - startTime: 2026-08-31T22:10:59.506Z
    description: Work session
    endTime: 2026-08-31T22:36:00.494Z
  - startTime: 2026-08-31T22:49:38.178Z
    description: Work session
    endTime: 2026-08-31T23:14:38.333Z
  - startTime: 2026-08-31T23:29:51.643Z
    description: Work session
    endTime: 2026-08-31T23:54:51.711Z
  - startTime: 2026-09-01T00:31:19.161Z
    description: Work session
    endTime: 2026-09-01T00:56:19.215Z
  - startTime: 2026-09-01T01:15:47.148Z
    description: Work session
    endTime: 2026-09-01T01:40:47.208Z
  - startTime: 2026-09-01T02:02:29.733Z
    description: Work session
    endTime: 2026-09-01T02:27:29.797Z
  - startTime: 2026-09-01T03:05:43.442Z
    description: Work session
    endTime: 2026-09-01T03:30:43.504Z
  - startTime: 2026-09-01T05:25:33.985Z
    description: Work session
    endTime: 2026-09-01T05:50:34.071Z
  - startTime: 2026-09-01T20:55:11.122Z
    description: Work session
---

## Squash merge commit body

- RAGScopeアプリケーションから見たlogging・tracing・observabilityの公開API、module責務、依存方向を現在契約から組み直す
- `1利用者操作 = 1 trace`、UseCase子span、trace外ログを扱える全体構造を実装へ落とす
- 現在契約を直接表すlogging中核型と、所有者ごとのeventから共通loggingへ渡す境界を実装する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを、新設計で不要な前提として残さない

## 正本と作業用ビュー

作業範囲・完了条件はRAGScope正本のRS-0022 Ticketを基準にする。Operation / UseCase / ErrorTypeの現在設計は次を参照する。

- `project-docs/design/利用者操作基本設計.md`
- `project-docs/design/利用者操作詳細設計.md`
- `project-docs/design/ユースケース詳細設計.md`
- `project-docs/design/ErrorType変換詳細設計.md`
- `project-docs/design/logging/実行追跡・構造化ログ契約設計.md`

Workbenchでは次を作業用ビューとして使う。

- `Notes/RAGScope/RAGScopeアプリケーション/RAGScope実行追跡・構造化ログ基盤.canvas`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ設計ノート.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存.canvas`

## このSubtaskで行うこと

- logging / tracing / observabilityのCabal package・library・moduleの責務と依存方向を確定する。
- `exposed-modules` / `other-modules`と`build-depends`へ落とせる粒度まで静的依存を具体化する。
- Feature / Interface / Lifecycle eventを共通loggingへ渡す公開APIを決める。
- `ToLogSpec -> LogSpec -> LogRecord`の中核型と変換境界を実装する。
- timestamp / component / optional TraceContextを`LogRecord`へ加えるRuntime境界を決める。
- trace内eventとtrace外eventを同じLogging基盤へ渡せる`RAGScope.Logging.Write`のAPIを決める。
- Sinkを差し替えられる境界を実装し、JSON / SQLiteが同じ`LogRecord`から独立して投影できる構造にする。
- Operation root spanとUseCase子spanを後続Subtaskで実装できるObservability / Tracing公開境界を確定する。
- Feature / UseCaseからLogging backend、Trace Context、OpenTelemetry SDK、外部表現を直接参照させない。

Operation境界のHaskell表現と共通`OperationFailure`の基本契約は正本ですでに決定済みであり、このSubtaskでは再定義しない。`OperationFailure`の正確なmodule名、同期・非同期Exception、logging failureとの最終結果合成は`RS-0022 subtask アプリケーション実行と失敗境界を再設計する`でコードとテストへ落とす。

## 完了条件

- 全体CanvasからLifecycle、Operation、UseCase、共通Loggingの処理境界を追える。
- 静的依存Canvasからpackage / library / moduleの依存方向を追え、各矢印について実際に必要な型・関数・値を説明できる。
- Cabal設定へ反映できるpackage / library構成と`build-depends`が決まっている。
- trace内eventとtrace外eventを同じLogging公開APIから同じRuntimeへ渡せる。
- Trace Contextの有無を1つのまとまりとして表し、TraceId / SpanId片方だけの内部状態を作らない。
- Feature / Interface / Lifecycle eventの所有者と、`ToLogSpec` instanceを置くcomponentが決まっている。
- `LogSpec`から`LogRecord`を構築しSinkへ渡す処理をコードとテストで確認できる。
- JSON / SQLite固有の型・依存・表現を共通logging中核型へ持ち込んでいない。
- 後続のtrace・span SubtaskとApplication実行・失敗Subtaskが、このSubtaskで確定した公開APIを使って実装を進められる。
- 正本設計書を変更した場合は、Subtask終了前に作業時点の`RAGScope文書作業ルール.md`を再確認し、変更した設計書全体と差分を検証する。
