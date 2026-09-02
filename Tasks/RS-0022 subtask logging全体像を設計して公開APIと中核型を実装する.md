---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-03T06:53:12+09:00
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
    endTime: 2026-09-01T21:20:11.204Z
  - startTime: 2026-09-01T21:31:05.984Z
    description: Work session
    endTime: 2026-09-01T21:56:06.958Z
  - startTime: 2026-09-01T22:02:40.570Z
    description: Work session
    endTime: 2026-09-01T22:27:40.577Z
  - startTime: 2026-09-01T22:33:41.385Z
    description: Work session
    endTime: 2026-09-01T22:58:41.568Z
  - startTime: 2026-09-01T23:41:27.316Z
    description: Work session
    endTime: 2026-09-02T00:06:27.355Z
  - startTime: 2026-09-02T00:16:32.832Z
    description: Work session
    endTime: 2026-09-02T00:41:32.876Z
  - startTime: 2026-09-02T00:48:19.124Z
    description: Work session
    endTime: 2026-09-02T00:53:28.251Z
  - startTime: 2026-09-02T02:18:58.179Z
    description: Work session
    endTime: 2026-09-02T02:38:49.205Z
  - startTime: 2026-09-02T02:49:01.691Z
    description: Work session
    endTime: 2026-09-02T03:14:01.751Z
  - startTime: 2026-09-02T07:43:20.222Z
    description: Work session
    endTime: 2026-09-02T08:08:20.259Z
  - startTime: 2026-09-02T08:53:01.871Z
    description: Work session
    endTime: 2026-09-02T09:18:02.797Z
  - startTime: 2026-09-02T20:47:08.859Z
    description: Work session
---

## Squash merge commit body

- RAGScopeアプリケーションから見たlogging・tracing・observabilityの公開API、module責務、依存方向を現在契約から組み直す
- `1利用者操作 = 1 trace`、UseCase子span、trace外ログを扱える全体構造を実装へ落とす
- 現在契約を直接表すlogging中核型と、所有者ごとのeventから共通loggingへ渡す境界を実装する
- OpenTelemetry具体実装を`ragscope` package内のprivate `ragscope-tracing-otel`へ閉じ、`ragscope-tracing`はTracing PortとTrace Context契約だけを公開する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを、新設計で不要な前提として残さない

## 正本と作業用ビュー

作業範囲・完了条件はRAGScope正本のRS-0022 Ticketを基準にする。Operation / UseCase / ErrorTypeと、実行追跡・構造化ログの現在設計は次を参照する。

- `project-docs/design/利用者操作基本設計.md`
- `project-docs/design/利用者操作詳細設計.md`
- `project-docs/design/ユースケース詳細設計.md`
- `project-docs/design/ErrorType変換詳細設計.md`
- `project-docs/design/実行追跡・構造化ログ契約設計.md`
- `project-docs/design/tracing/RAGScopeアプリケーション実行追跡詳細設計.md`
- `project-docs/design/logging/RAGScopeアプリケーション構造化ログイベント変換詳細設計.md`

Workbenchでは次を作業用ビューとして使う。

- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ概要図.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ設計ノート.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Application・Feature.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Observability・Tracing.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Logging.md`

## 現在地

- 実行追跡・構造化ログの文書構成を整理し、システム共通契約を`project-docs/design/実行追跡・構造化ログ契約設計.md`、RAGScopeアプリケーション固有の実行追跡詳細を`design/tracing/`、構造化ログ固有の詳細を`design/logging/`へ分離した。旧配置の重複設計書は削除済み。
- AI推論サービス側のplanned RS-0018を現在契約へ更新し、文書・質問Embeddingに関係するplanned Ticketも旧`execution_id`前提からTrace Contextによる同一trace継続へ同期した。
- Tracing Portの公開Haskell APIを確定し、正本へ反映済み。`RAGScope.Tracing`は`SpanName`と`Tracing m`を公開し、`Tracing m`は`withTrace :: forall a. SpanName -> m a -> m a`、`withSpan :: forall a. SpanName -> m a -> m a`、`observeResult :: forall failure result. ToErrorType failure => Either failure result -> m ()`、`currentTraceContext :: m (Maybe TraceContext)`の4能力を持つ。
- `withTrace`と`withSpan`は同じ`SpanName`を使う。`withTrace`へ渡す名称もroot spanの名称なので、別の`TraceName`型は導入しない。
- trace外で`withSpan spanName action`が呼ばれた場合はspanを作らず`action`だけを実行して結果をそのまま返す。trace外の`observeResult`も反映対象がないため何も行わない。Tracing側の都合でApplication / Feature本来の結果型を変更しない。
- Application / Featureは`Tracing`を直接利用せず、`Observability`と`Logging`を利用する。Observability RuntimeはTracingを内部依存として持ち、Logging Runtimeには`currentTraceContext`取得能力だけを渡す構成を正本へ反映済み。
- current Trace Contextは`AppEnv`の固定値ではなく、Tracing具体実装が`withTrace` / `withSpan`の実行scopeごとに管理する。並行するトップレベル操作間でcurrent Trace Contextを混在させない。
- `makeOpenTelemetryTracing`はTracing実装の初期化だけを行い、実際のtraceは各トップレベル操作の境界で`withTrace`によって開始する。
- 次は、確定したTracing Portを前提に`RAGScope.Observability`の正確な公開Haskell APIと、Tracingの`withTrace` / `withSpan` / `observeResult`をObservability Runtimeがどの境界で組み合わせるかを決める。

## このSubtaskで行うこと

- logging / tracing / observabilityのCabal package・library・moduleの責務と依存方向を確定する。
- `exposed-modules` / `other-modules`と`build-depends`へ落とせる粒度まで静的依存を具体化する。
- Feature / Interface / Lifecycle eventを共通loggingへ渡す公開APIを決める。
- `ToLogSpec -> LogSpec -> LogRecord`の中核型と変換境界を実装する。
- timestamp / component / optional TraceContextを`LogRecord`へ加えるRuntime境界を決める。
- trace内eventとtrace外eventを同じLogging基盤へ渡せる`RAGScope.Logging.Write`のAPIを決める。
- Sinkを差し替えられる境界を実装し、JSON / SQLiteが同じ`LogRecord`から独立して投影できる構造にする。
- Operation root spanとUseCase子spanを後続Subtaskで実装できるObservability / Tracing公開境界を確定する。
- `ragscope-tracing`は`RAGScope.Tracing`と`RAGScope.Tracing.Context`だけをpackage外へ公開し、OpenTelemetry具体実装とSDK依存を持たせない。
- `ragscope` package内にprivate `ragscope-tracing-otel`を置き、`RAGScope.Application.Tracing.OpenTelemetry`だけがOpenTelemetry SDKへ直接依存してTracing Portを実装する。
- Feature / UseCaseからLogging backend、Trace Context、OpenTelemetry SDK、外部表現を直接参照させない。

Operation境界のHaskell表現と共通`OperationFailure`の基本契約は正本ですでに決定済みであり、このSubtaskでは再定義しない。`OperationFailure`の正確なmodule名、同期・非同期Exception、logging failureとの最終結果合成は`RS-0022 subtask アプリケーション実行と失敗境界を再設計する`でコードとテストへ落とす。

## 完了条件

- 概要図からLifecycle、Operation、UseCase、共通Loggingの処理境界を追える。
- 静的依存図からpackage / library / moduleの依存方向を追え、各矢印について実際に必要な型・関数・値を説明できる。
- Cabal設定へ反映できるpackage / library構成と`build-depends`が決まっている。
- `ragscope-tracing`のpublic main / `core` libraryからOpenTelemetry SDK依存と具体Adapterを排除し、private `ragscope-tracing-otel`だけがSDKへ依存する構成をCabalで表現できる。
- trace内eventとtrace外eventを同じLogging公開APIから同じRuntimeへ渡せる。
- Trace Contextの有無を1つのまとまりとして表し、TraceId / SpanId片方だけの内部状態を作らない。
- Feature / Interface / Lifecycle eventの所有者と、`ToLogSpec` instanceを置くcomponentが決まっている。
- `LogSpec`から`LogRecord`を構築しSinkへ渡す処理をコードとテストで確認できる。
- JSON / SQLite固有の型・依存・表現を共通logging中核型へ持ち込んでいない。
- 後続のtrace・span SubtaskとApplication実行・失敗Subtaskが、このSubtaskで確定した公開APIを使って実装を進められる。
- 正本設計書を変更した場合は、Subtask終了前に作業時点の`RAGScope文書作業ルール.md`を再確認し、変更した設計書全体と差分を検証する。
