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
        subgraph PUBLIC["library: ragscope<br/>役割: 未確定"]
            PUBEX["RAGScope.*<br/>exposed-modules<br/>具体名は未決定"]:::public
            PUBOTHER["other-modules<br/>公開library内部実装<br/>具体名は未決定"]:::private
            PUBEX --> PUBOTHER
        end

        subgraph APPLICATION["library: application<br/>役割: UseCase / 内部処理を置き、Telemetry利用境界を使う"]
            APP["RAGScope.Application<br/>exposed-modules"]:::private
            APPOTHER["RAGScope.Application.*<br/>other-modules"]:::private
            APP --> APPOTHER
        end

        subgraph TELEMETRY["library: telemetry<br/>役割: OpenTelemetry SDKを隠すTelemetry利用境界"]
            TEL["RAGScope.Telemetry<br/>exposed-modules<br/>Telemetry利用境界"]:::private
            TELOTHER["RAGScope.Telemetry.*<br/>other-modules"]:::private
            TEL --> TELOTHER
        end

        subgraph OTEL["library: opentelemetry<br/>役割: Telemetry利用境界をOpenTelemetry SDKへ接続し、SDK lifecycleを扱う"]
            OTELAPI["RAGScope.Telemetry.OpenTelemetry<br/>exposed-modules<br/>Adapter入口"]:::private
            OTELOTHER["Lifecycle / Trace / Logs / Metrics<br/>other-modules<br/>具体module名は未決定"]:::private
            OTELAPI --> OTELOTHER
        end

        subgraph EXECUTABLE["executable: ragscope<br/>役割: 起動時の初期化と組み立て、終了時のflush / shutdown"]
            MAIN["Main<br/>Composition Root"]
        end

        TEST["test-suite(s)"]

        MAIN --> APP
        MAIN --> TEL
        MAIN --> OTELAPI

        APP --> TEL
        OTELAPI --> TEL

        TEST -.-> APP
        TEST -.-> TEL
        TEST -.-> OTELAPI
    end

    SDK["OpenTelemetry Haskell packages"]:::external
    OTELOTHER --> SDK

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

    style PKG fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style PUBLIC fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    style APPLICATION fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    style TELEMETRY fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    style OTEL fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
```

凡例: **青** = 公開library / module、**紫** = 非公開library / module、**濃青** = 外部package

- `library: ragscope`は現在のCabalに存在するが、公開するmoduleと役割はまだ決まっていない。
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
