---
status: dropped
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-05T06:23:23.451+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask 構造化ログ公開APIと中核型を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0022/implement-tracing
completedDate: 2026-09-05
---

## Squash merge commit body

- 全体設計で確定した`RAGScope.Tracing`、`RAGScope.Tracing.Context`、`RAGScope.Observability.Runtime`をHaskell / Cabalへ実装する
- 利用インターフェースが受け付けた1回のトップレベルな操作を1つの`trace`として扱う実行追跡境界を実装する
- Operation root spanの配下でUseCase実行を子spanとして追跡し、UseCaseを呼ばない操作も追跡できるようにする
- trace内ログへ対応する`TraceId`・`SpanId`を組で渡し、trace外ログへTrace Contextを要求しないLogging境界へ接続する
- OpenTelemetry Adapterをprivate `ragscope-tracing-otel`へ実装し、`ragscope-tracing`の公開契約からOpenTelemetry SDK依存を分離する

## 目的

RAGScope正本で確定した実行追跡詳細設計と、先行Subtaskで実装したLogging中核境界を基準に、OpenTelemetryの`trace`・`span`を利用した利用者操作単位の実行追跡とログ関連付けを実装する。

Tracing Portは`ragscope-tracing` packageの`RAGScope.Tracing`、Trace Context契約は`RAGScope.Tracing.Context`として実装する。Observability Runtimeは`RAGScope.Observability.Runtime`の`makeObservability`としてTracing Portを組み合わせる。OpenTelemetryによる具体実装は`ragscope` package内のprivate `ragscope-tracing-otel`にある`RAGScope.Application.Tracing.OpenTelemetry`へ置き、このlibraryだけがOpenTelemetry SDKへ直接依存する。

このSubtaskでは全体構造を再設計しない。正本だけでは実装を一意に決められない事項が見つかった場合は推測で補わず、設計正本へ戻して判断する。

`OperationResult`の正確なApplication実装、Exception境界、logging failureとの最終結果合成は後続のApplication実行・失敗境界Subtaskが担当する。

## 完了条件

- `ragscope-tracing`のpublic main / `core` libraryが正本どおり構成され、`RAGScope.Tracing`と`RAGScope.Tracing.Context`を実装している
- `RAGScope.Observability.Runtime.makeObservability`がTracingの`withTrace` / `withSpan` scope内でactionを実行し、scope終了前に`observeResult`へ結果を渡して同じ`Either`を返す
- 利用インターフェースが1回の操作について操作固有処理を開始する境界から、その操作の処理を終了して外側へ制御を戻す境界までを1つの`trace`として追跡できる
- routing・command判定・入力変換・検証より前からOperation root spanを開始でき、UseCaseを呼ばずに終了する操作もroot spanで追跡できる
- RAGScope ApplicationがUseCaseを呼び出した場合、その実行をOperation root span配下の子spanとして開始・終了できる
- UseCaseの`Left failure`をUseCase spanへ`ErrorType`とともに反映でき、UseCaseが成功した後にOperation全体が失敗してもUseCase span自身の結果を変更しない
- Operation root spanを操作全体の結果から更新できるTracing / Observability境界が存在する
- trace内loggingが発生時の`TraceId`・`SpanId`を組でLogging Runtimeへ渡せる
- lifecycle eventなどtrace外loggingがTracingやcurrent Trace Contextを必須とせず、先行Subtaskで実装した同じLogging基盤へ渡せる
- 子spanの失敗が親へ伝播しただけでは同じ失敗ログを階層ごとに重複記録しない構造になっている
- current Trace Contextを実行scopeごとに管理し、並行するトップレベル操作間で混在させない
- private `ragscope-tracing-otel`の`RAGScope.Application.Tracing.OpenTelemetry`が`RAGScope.Tracing`を実装し、OpenTelemetry SDKへの直接依存がこのlibraryだけに閉じている
- Observability RuntimeとUseCaseからOpenTelemetry Adapter / SDKをimportできないCabal依存になっている
- OpenTelemetry固有の型・制約をRAGScopeの公開APIへ不要に漏らしていない
- Operation root span、UseCase子span、UseCase未呼び出し、Trace Context関連付け、`makeObservability`の結果観測順序を自動テストで確認できる
- 関係するHaskellテストと品質検査が成功する
