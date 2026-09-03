---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-03T20:27:00+09:00
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
    endTime: 2026-09-02T21:12:08.940Z
  - startTime: 2026-09-02T21:58:42.915Z
    description: Work session
    endTime: 2026-09-02T22:23:42.981Z
---

## Squash merge commit body

- RAGScopeアプリケーションから見たlogging・tracing・observabilityの責務、公開API、module境界、依存方向を現在契約から確定する
- `1利用者操作 = 1 trace`、UseCase子span、trace内外ログを扱う全体構造を、後続実装Subtaskが追加設計なしで着手できる粒度まで正本へ反映する
- `Logger m event`・`Contravariant`・`event -> LogSpec`純粋変換と、`LogSpec` / `LogRecord` / attributes中核型、Runtime、Sink、JSON / SQLite外部表現の責務境界を確定する
- UseCaseをfailure・ErrorClassification・event・依存record・Logging変換の所有単位とし、Application全体の`AppEnv`を受け取らず自身に必要な能力だけを受け取る境界を確定する
- OperationもOperation固有の依存recordから必要なruntime能力だけを受け取り、UseCase依存を閉じた実行関数を受け取る境界を確定する。Classifierはruntime依存recordへ入れず、現在は`AppEnv`を導入しない
- `ToErrorType`型クラスを廃止し、具体failure値を保持したまま名前付き`ErrorClassifier failure`で`ErrorType`へ分類する境界を確定する
- `OperationFailure`が具体failure値と対応Classifierを保持し、failureの詳細値を先に`ErrorType`へ変換して失わない構造を確定する
- Observability Runtimeが`Either failure result`を`SpanOutcome`へ変換し、TracingがApplicationの`Either`・具体failure・Classifierを知らない境界を確定する
- logging failureを`OperationResult`から分離し、`record`からOperation / UseCaseへtyped resultとして返さない境界と、Logging内部でのfailure通知・保持境界を確定する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを現在設計の前提として残さない

## 目的

RS-0022の実装へ入る前に、実行追跡・構造化ログをRAGScopeアプリケーションで成立させるための全体設計を正本で確定する。

このSubtaskは**設計Subtaskであり、Haskellコード・Cabal設定・OpenTelemetry Adapter・JSON / SQLite投影を実装しない**。後続の実装Subtaskは、このSubtaskで確定した正本設計を実装へ落とし、実装中に全体構造を決め直さない。

## 正本と作業用ビュー

作業範囲・完了条件はRAGScope正本のRS-0022 Ticketを基準にする。現在設計は主に次を参照する。

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
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Application・UseCase.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Observability・Tracing.md`
- `Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ静的依存図 Logging.md`

## このSubtaskで確定すること

- logging / tracing / observabilityの責務と相互関係。
- 公開Haskell APIとして必要な型・関数シグネチャと、それぞれの所有module。
- Cabal package・library・moduleの境界、`exposed-modules` / `other-modules`へ落とせる公開範囲、許可する直接`build-depends`の方向。
- UseCase / Interface / Lifecycle eventの所有者と、各eventから共通logging表現へ変換する境界。
- failure型、名前付き`ErrorClassifier failure`、失敗event、`event -> LogSpec`の責務分離と、具体failureの詳細値を失わない受け渡し。
- UseCaseへ渡す依存能力をUseCase所有の依存recordへ閉じ、Application全体の環境をUseCaseへ漏らさない境界。
- Operationへ渡す実行時能力をOperation所有の依存recordへ閉じ、UseCase依存recordではなく依存を閉じたUseCase実行関数を渡す境界。Classifierはruntime依存recordへ入れず、Application全体の`AppEnv`は導入しない。
- `Logger m event`、`event -> LogSpec`、`Logger m LogSpec`、`LogRecord`の責務と、timestamp / component / optional Trace Contextを付加するRuntime境界。
- trace内eventとtrace外eventを同じLogging基盤へ渡す公開APIと、Sink差し替え境界。
- logging failureと`OperationResult`の関係、およびSink / Logging RuntimeのfailureをLogging内部で通知・保持する境界。
- JSON / SQLiteを同じ`LogRecord`から独立して投影する責務境界。
- Operation root span、UseCase子span、`SpanOutcome`、Tracing / Observability公開境界、current Trace Contextの管理責務。
- 後続実装Subtaskごとの担当範囲と依存順序。

## このSubtaskでは実装しない

- `ragscope-error`、`ragscope-logging`、`ragscope-tracing`、`ragscope-observability`などのHaskellソースとCabal stanzaの実装。
- `ErrorClassifier`、`OperationFailure`、`SpanOutcome`、`Observability m failure`、`Logger m event`、`Contravariant` instance、event変換関数、UseCase所有の依存record、`LogSpec`、`LogRecord`のコード実装とテスト。
- Logging Runtime / Sink、`RAGScope.Tracing`、`RAGScope.Observability.Runtime`、OpenTelemetry Adapter、root span / UseCase spanのコード実装とテスト。
- JSON serialization、stderr / memory Sink、Schema適合、SQLite migration・投影・復元の実装とテスト。
- 同期・非同期Exception、logging failureの内部通知・保持処理のコード実装とテスト。

## 現在地

- 実行追跡はRAGScope全体の共通概念とし、RAGScopeアプリケーション固有の実現方法を`design/tracing/RAGScopeアプリケーション実行追跡詳細設計.md`へ分離済み。
- `ToErrorType`型クラスは現在設計から廃止した。`RAGScope.ErrorType`が`ErrorType`と`ErrorClassifier failure`型を所有し、具体failure所有側が名前付きClassifier値を提供する設計を正本へ反映済み。
- UseCase固有failureは`RAGScope.<UseCase>.Failure`、対応Classifierは`RAGScope.<UseCase>.ErrorClassification`へ分離する。failure型自身は`ErrorType`へ依存しない。
- `OperationFailure`は具体failure値と対応`ErrorClassifier failure`を保持する。failureのconstructor引数などの詳細値は先に`ErrorType`へ変換して失わない。root span用には`operationFailureErrorClassifier :: ErrorClassifier OperationFailure`をApplication側が提供する。
- Tracing Portは`SpanOutcome = SpanSucceeded | SpanFailed ErrorType`を観測し、`Either`・具体failure・Classifierを扱わない。`observeResult`は廃止し、`observeOutcome`へ置き換える設計を正本へ反映済み。
- `RAGScope.Observability`は`Observability m failure`とし、UseCase / Operationのfailure型へ特殊化する。`makeObservability :: Monad m => Tracing m -> ErrorClassifier failure -> Observability m failure`がObservability Runtimeで`Either`を解釈し`SpanOutcome`へ変換する。
- `ragscope-observability`はmain + `runtime`の2 libraryとする。mainは`ragscope-tracing` main、runtimeはObservability main + Tracing main + `ragscope-error` mainへ直接依存する。
- Operation / UseCaseはObservabilityを利用しTracingへ直接依存しない。Application composition rootだけがTracing実装と名前付きClassifierを直接扱い、failure型ごとのObservabilityを組み立てる。
- Logging公開APIは`RAGScope.Logging`の`Logger m event`と`record`とし、`Contravariant`で`event -> LogSpec`と`Logger m LogSpec`からUseCase別Loggerを組み立てる設計を正本へ反映済み。`ToLogSpec`、orphan instance、`LoggingInstances`、Logging用`RankNTypes`、`RAGScope.Logging.Write`は採用しない。
- 失敗eventの`error_type`は同じ名前付きClassifierを利用し、failureの詳細値を他のattributesへ反映する処理とは分離する。Classifierは詳細値を消去・代替しない。
- UseCaseが必要とする能力はUseCase所有の依存recordへまとめ、Application全体の`AppEnv`をUseCaseへ渡さない。UseCase別`Observability m failure`とLoggerもこの依存recordを通して渡す。
- OperationもOperation固有の依存recordから必要なruntime能力だけを受け取る。Application composition rootがUseCase依存recordをUseCase実行関数へ適用して依存を閉じ、その実行関数をOperation依存recordへ渡す。Classifierは所有moduleから静的に利用しruntime依存recordへ入れない。現在はApplication全体の`AppEnv`を導入しない。
- Logging中核型は`LogSpec = EventName + LogLevel + Maybe Text + Attributes`、`LogRecord = Timestamp + Component + Maybe TraceContext + LogSpec`とする。`LogLevel`は`debug` / `info` / `warn` / `error` / `fatal`の5値、`Attributes`は`Map AttributeName AttributeValue`、`AttributeValue`は`Text` / `Scientific` / `Bool` / array / objectの再帰型とし、`null`相当を持たない設計を正本へ反映済み。
- logging failureは`OperationResult`から分離し、`record`からOperation / UseCaseへtyped resultとして返さない設計を正本へ反映済み。
- 次はLogging Runtime / Sink境界を具体化する。logging failureの内部通知・保持先はこのSubtaskの完了前に確定する。

## 後続Subtask

1. `RS-0022 subtask 構造化ログ公開APIと中核型を実装する`
2. `RS-0022 subtask trace・spanによる実行追跡とログ関連付けを実装する`
3. `RS-0022 subtask JSON出力・Sink・Schema適合を現在契約へ移行する`
4. `RS-0022 subtask アプリケーション実行と失敗境界を実装する`
5. `RS-0022 subtask 最終整合性を検証してTicket結果を記録する`

`trace・span`実装とJSON / Sink実装は、構造化ログ公開API・中核型の実装完了後に並行して進められる。Application実行・失敗境界はtrace・span実装後、最終検証はApplication実行・失敗境界とJSON / Sink実装の双方が完了してから行う。

## 完了条件

- 正本からLifecycle、Operation、UseCase、実行追跡、共通Loggingの処理境界を一意に追える。
- package / library / moduleの責務と直接依存方向を、実際に必要な型・関数・値まで説明できる。
- `ErrorClassifier`、`OperationFailure`、`SpanOutcome`、failure型へ特殊化したObservabilityの責務と値の流れを正本から一意に追える。
- 具体failureの詳細値を`ErrorType`分類前に失わず、必要なログ属性へ使えることと、Classifierが`error_type`の分類だけを担当することを正本から一意に追える。
- 後続Subtaskが新しい全体設計判断を行わず、確定済み設計をコード・Cabal設定・テストへ落とせる。
- Logging公開API、中核型、Runtime、Sink、JSON / SQLite外部表現の責務境界が決まっている。
- UseCaseがApplication全体の`AppEnv`を直接受けず、UseCase所有の依存recordから自身に必要な能力だけを受け取る依存境界が正本から一意に追える。
- OperationがOperation所有の依存recordから必要なruntime能力だけを受け取り、UseCase依存を閉じた実行関数を利用し、Classifierや`AppEnv`をruntime依存として受け取らない境界が正本から一意に追える。
- logging failureが`OperationResult`を変更しないことと、Sink / Logging RuntimeのfailureをどのLogging内部境界へ通知・保持するかが正本から一意に追える。
- Tracing / Observabilityの公開API、current Trace Context管理、OpenTelemetry Adapterの配置、UseCase / Application composition rootの依存境界が決まっている。
- Workbenchの概要図・静的依存図が正本の現在設計と矛盾していない。
- このSubtaskの差分にHaskellソース、Cabal設定、migrationなどの実装変更を含めていない。
- 正本設計書を変更した場合は、Subtask終了前に作業時点の`RAGScope文書作業ルール.md`を再確認し、変更した設計書全体と差分を検証する。
