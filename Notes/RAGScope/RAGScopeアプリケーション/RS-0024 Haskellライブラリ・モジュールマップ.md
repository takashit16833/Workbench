---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-08
---

# RS-0024 Haskellライブラリ・モジュールマップ

> [!note]
> これはRS-0024の実装前にレビューするためのWorkbench上の設計ドラフトであり、RAGScopeの正本ではない。
> library名とmodule名はこのNoteでレビューする提案である。

Mermaidの色分けは[[Mermaid図の色分けルール]]に従う。

## library / module map

```mermaid
flowchart LR
    subgraph PKG["ragscope"]
        subgraph APPLICATION["library: application<br/>役割: UseCase / 内部処理を置き、Telemetry利用境界を使う"]
            USECASE["RAGScope.UseCase.*<br/>exposed-modules<br/>各UseCase"]:::private
            EVENTS["RAGScope.UseCase.*.Events<br/>other-modules<br/>機能固有EventRecordの定義"]:::private

            USECASE --> EVENTS
        end

        subgraph TELEMETRY["library: telemetry<br/>役割: OpenTelemetry SDKを隠すTelemetry利用境界"]
            TEL["RAGScope.Telemetry<br/>exposed-modules<br/>UseCase / 内部処理から使う入口"]:::private
            TELTRACE["RAGScope.Telemetry.Trace<br/>other-modules<br/>Span操作"]:::private
            TELLOGS["RAGScope.Telemetry.Logs<br/>other-modules<br/>LogRecord / EventRecord操作"]:::private
            TELMETRICS["RAGScope.Telemetry.Metrics<br/>other-modules<br/>Metric操作"]:::private
            TELCONTEXT["RAGScope.Telemetry.Context<br/>other-modules<br/>Contextの受け渡し"]:::private

            TEL --> TELTRACE
            TEL --> TELLOGS
            TEL --> TELMETRICS
            TEL --> TELCONTEXT
        end

        subgraph OTEL["library: opentelemetry<br/>役割: Telemetry利用境界をOpenTelemetry SDKへ接続し、SDK lifecycleを扱う"]
            OTELAPI["RAGScope.Telemetry.OpenTelemetry<br/>exposed-modules<br/>Adapter生成 / 初期化入口"]:::private
            OTELLIFECYCLE["RAGScope.Telemetry.OpenTelemetry.Lifecycle<br/>other-modules<br/>SDK初期化 / flush / shutdown"]:::private
            OTELTRACE["RAGScope.Telemetry.OpenTelemetry.Trace<br/>other-modules<br/>Span操作をSDKへ接続"]:::private
            OTELLOGS["RAGScope.Telemetry.OpenTelemetry.Logs<br/>other-modules<br/>Logs操作をSDKへ接続"]:::private
            OTELMETRICS["RAGScope.Telemetry.OpenTelemetry.Metrics<br/>other-modules<br/>MetricsをSDKへ接続"]:::private
            OTELCONTEXT["RAGScope.Telemetry.OpenTelemetry.Context<br/>other-modules<br/>OpenTelemetry Contextを扱う"]:::private

            OTELAPI --> OTELLIFECYCLE
            OTELAPI --> OTELTRACE
            OTELAPI --> OTELLOGS
            OTELAPI --> OTELMETRICS
            OTELAPI --> OTELCONTEXT
        end

        subgraph EXECUTABLE["executable: ragscope<br/>役割: 起動時の初期化と組み立て、終了時のflush / shutdown"]
            MAIN["Main<br/>Composition Root"]
        end

        MAIN --> USECASE
        MAIN --> TEL
        MAIN --> OTELAPI

        USECASE --> TEL
        EVENTS --> TEL

        OTELAPI --> TEL
    end

    SDK["OpenTelemetry Haskell packages"]:::external
    OTELLIFECYCLE --> SDK
    OTELTRACE --> SDK
    OTELLOGS --> SDK
    OTELMETRICS --> SDK
    OTELCONTEXT --> SDK

    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

    style PKG fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style APPLICATION fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    style TELEMETRY fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    style OTEL fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
```

凡例: **紫** = 非公開library / module、**濃青** = 外部package、**実線** = 本体の依存

`RAGScope.UseCase.*`と`RAGScope.UseCase.*.Events`の`*`は図上の省略表記であり、実際のHaskell module名ではない。各UseCaseでは`RAGScope.UseCase.IndexDocument`、`RAGScope.UseCase.IndexDocument.Events`のような具体名になる想定である。

テスト用componentは今回のlibrary / module構成レビューから一旦省略する。テストを作成しないという意味ではない。

## library / moduleの役割

### `application`

RAGScopeアプリケーションのUseCaseと、そのUseCaseを構成する内部処理を置く。Telemetryが必要な場合は`telemetry`を使い、OpenTelemetry SDKや`opentelemetry`には直接依存しない。

- `RAGScope.UseCase.*`: 各UseCase本体を表す。処理順序と最終結果を決め、必要なSpan / Logs / Metrics操作を`telemetry`経由で行う。
- `RAGScope.UseCase.*.Events`: そのUseCase固有のEventRecordを定義する。何が起きたイベントか、記録条件、EventName、timestamp、Severity、attributes、必要な`error.type`変換を機能側の責務として持つ。

### `telemetry`

UseCaseや内部処理から使うTelemetry利用境界を提供する。OpenTelemetry SDKの型やAPIをApplication側へ出さず、Span、Logs、Metrics、Contextに必要な操作をRAGScope側の入口としてまとめる。

- `RAGScope.Telemetry`: `application`や他の利用側へ公開するTelemetryの入口。下位のTrace / Logs / Metrics / Context操作を利用側から扱える形で提供する。
- `RAGScope.Telemetry.Trace`: Spanの開始・終了、Status、`error.type`など、Trace / Spanに関する操作を担当する。
- `RAGScope.Telemetry.Logs`: 通常LogRecordとEventRecordの記録に関する操作を担当する。機能固有EventRecordの意味や記録条件は定義しない。
- `RAGScope.Telemetry.Metrics`: OpenTelemetry Metricsを利用するための操作を担当する。RS-0024では新しいRAGScope独自Metricを定義しない。
- `RAGScope.Telemetry.Context`: 現在のContextを子処理や通信境界へ引き継ぐための受け渡しを担当する。

### `opentelemetry`

`telemetry`で定義した利用境界をOpenTelemetry Haskell SDKへ接続するAdapterを置く。OpenTelemetry packageへ直接依存するのはこのlibraryだけとする。

- `RAGScope.Telemetry.OpenTelemetry`: executableから使うAdapterの入口。SDKを使ったTelemetry実装の生成と初期化へつなぐ。
- `RAGScope.Telemetry.OpenTelemetry.Lifecycle`: Trace / Logs / Metricsに必要なSDK初期化、Processor / Exporter構成、flush / shutdownを担当する。
- `RAGScope.Telemetry.OpenTelemetry.Trace`: `telemetry`のSpan操作をOpenTelemetry SDKのTrace APIへ接続する。
- `RAGScope.Telemetry.OpenTelemetry.Logs`: `telemetry`のLogRecord / EventRecord操作をOpenTelemetry SDKのLogs APIへ接続する。
- `RAGScope.Telemetry.OpenTelemetry.Metrics`: `telemetry`のMetric操作をOpenTelemetry SDKのMetrics APIへ接続する。
- `RAGScope.Telemetry.OpenTelemetry.Context`: OpenTelemetry ContextをSDK上で保持・取得し、`telemetry`側のContext受け渡しへ接続する。

### `executable: ragscope`

- `Main`: ApplicationとTelemetry Adapterを組み立てるComposition Root。起動時にSDKを初期化し、終了時にflush / shutdownする。

## module分割の考え方

- Application側の個別UseCaseは`RAGScope.UseCase.*`で代表している。各UseCaseの具体名は機能実装時に決める。
- 機能固有EventRecordは`RAGScope.UseCase.*.Events`に置く案とし、EventNameや記録条件などの意味をTelemetry共通libraryへ移さない。
- `RAGScope.Telemetry`をUseCase / 内部処理から使う入口とし、Trace / Logs / Metrics / Contextごとの実装詳細を`other-modules`へ分ける。
- `RAGScope.Telemetry.OpenTelemetry`をAdapterの入口とし、SDK初期化・終了、Trace、Logs、Metrics、ContextのSDK接続を`other-modules`へ分ける。
- Processor / Exporterの設定は現時点では`Lifecycle`の責務に含め、実装時に独立した責務が必要になった場合だけmoduleを追加する。
- exactな型、関数、export listは実装時に決める。このNoteではmoduleの責務と依存方向を先にレビューする。

## 依存方向

- 現在のCabalにある無名の`library` componentは、このターゲット設計には含めない。
- `application`は`telemetry`へ依存する。
- `application`は`opentelemetry`とOpenTelemetry packageへ依存しない。
- `telemetry`はOpenTelemetry packageへ依存しない。
- `opentelemetry`だけがOpenTelemetry packageへ依存する。
- private libraryをまたいで利用するmoduleは`exposed-modules`、そのlibrary内だけで使うmoduleは`other-modules`に置く。

禁止する依存は次のとおり。

```text
application -X-> opentelemetry
application -X-> OpenTelemetry packages
telemetry -X-> opentelemetry
telemetry -X-> OpenTelemetry packages
opentelemetry -X-> application
```
