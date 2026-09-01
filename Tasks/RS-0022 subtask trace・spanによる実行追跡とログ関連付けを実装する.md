---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-02T08:20:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask logging全体像を設計して公開APIと中核型を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0022/implement-tracing
---

## Squash merge commit body

- 利用インターフェースが受け付けた1回のトップレベルな操作を1つの`trace`として扱う実行追跡境界を実装する
- Operation root spanの配下でUseCase実行を子spanとして追跡し、UseCaseを呼ばない操作も追跡できるようにする
- trace内ログへ対応する`TraceId`・`SpanId`を組で渡し、trace外ログへTrace Contextを要求しない境界へ接続する
- `span`と構造化ログの両方で同じ失敗を記録する場合に同じ`error_type`を使用できる境界を実装する
- OpenTelemetry Adapterをprivate `ragscope-tracing-otel`へ実装し、`ragscope-tracing`の公開契約からOpenTelemetry SDK依存を分離する

## 目的

RAGScope正本とWorkbenchの現在の静的依存図で確定したRAGScope側の責務を基準に、OpenTelemetryの`trace`・`span`実装を利用して、利用者操作単位の実行追跡とログ関連付けを実現する。

Tracing Portは`ragscope-tracing` packageの`RAGScope.Tracing`、Trace Context契約は`RAGScope.Tracing.Context`として公開する。OpenTelemetryによる具体実装は`ragscope` package内のprivate `ragscope-tracing-otel`にある`RAGScope.Application.Tracing.OpenTelemetry`へ置き、このlibraryだけがOpenTelemetry SDKへ直接依存する。Observability RuntimeはTracing Portだけを要求し、OpenTelemetry AdapterやSDKをimportしない。

このSubtaskは`OperationResult`の正確なHaskell failure ADTを決定しない。概念上の`OperationResult = OperationSuccess | OperationFailure`が、必要な場合だけ内側の`UseCaseResult = UseCaseSuccess | UseCaseFailure`を含むことを前提に、root spanとUseCase spanをそれぞれが表す処理の結果から更新できるTracing / Observability境界を実装する。UseCaseのHaskell境界は`Either failure result`であり、`Right result = UseCaseSuccess`、`Left failure = UseCaseFailure`として扱う。具体的なfailure型はそのUseCaseを所有するFeatureが持つ。

## 完了条件

- 利用インターフェースが1回の操作について操作固有処理を開始する境界から、その操作の処理を終了して外側へ制御を戻す境界までを1つの`trace`として追跡できる
- routing・command判定・入力変換・検証より前からOperation root spanを開始でき、これらの処理でUseCaseを呼ばずに`OperationFailure`となった操作もroot spanで追跡できる
- RAGScope ApplicationがUseCaseを呼び出した場合、その実行をOperation root span配下の子spanとして開始・終了できる
- UseCaseの`Left failure`を`UseCaseFailure`としてUseCase spanへ`ErrorType`とともに反映できる。`failure`は`UseCaseFailure`という結果区分そのものではなく、`DenseSearchFailure`などの具体的なUseCase固有failure値である
- UseCaseが`UseCaseSuccess`となった後にOperation全体が`OperationFailure`となってもUseCase span自身の結果を変更しない
- Operation root spanは`UseCaseResult`だけでなく、操作全体の`OperationResult`を受けてStatus・`error_type`を設定できる公開境界を持つ
- trace内loggingが発生時の`TraceId`・`SpanId`を組で現在契約へ渡せる
- lifecycle eventなどtrace外loggingがTracingやcurrent Trace Contextを必須とせず同じLogging基盤へ渡せる
- 子spanの失敗が親へ伝播しただけでは同じ失敗ログを階層ごとに重複記録しない構造になっている
- 同期・非同期Exceptionで処理が途中終了しても、決定済みのException方針に従って開始済みspanを破棄せず終了処理を行える構造になっている。ExceptionをUseCase固有failureへ変換する判断はこのSubtaskで行わない
- `ragscope-tracing`のpublic main / `core` libraryがOpenTelemetry SDKへ依存せず、`RAGScope.Tracing`と`RAGScope.Tracing.Context`だけをRAGScope側の契約として提供している
- private `ragscope-tracing-otel`の`RAGScope.Application.Tracing.OpenTelemetry`が`RAGScope.Tracing`を実装し、OpenTelemetry SDKへの直接依存がこのlibraryだけに閉じている
- Observability RuntimeとFeatureからOpenTelemetry Adapter / SDKをimportできないCabal依存になっている
- OpenTelemetry固有の型・制約をRAGScopeの公開APIへ不要に漏らしていない
- Operation root span、UseCase子span、UseCase未呼び出し、`UseCaseSuccess`後の`OperationFailure`、Trace Context関連付けを自動テストで確認できる
