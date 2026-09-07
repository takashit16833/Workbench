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

## library / component map

```mermaid
flowchart TB
    subgraph PKG["ragscope"]
        PUBLIB["public library: ragscope"]:::public
        PUBEX["exposed-modules<br/>RAGScope.*<br/>具体名は未決定"]:::public
        PUBOTHER["other-modules<br/>公開library内部実装<br/>具体名は未決定"]:::private
        PUBLIB --> PUBEX
        PUBLIB --> PUBOTHER

        APPLIB["private library: application"]:::private
        APPAPI["exposed-modules<br/>RAGScope.Application"]:::private
        APPOTHER["other-modules<br/>RAGScope.Application.*"]:::private
        APPLIB --> APPAPI
        APPAPI --> APPOTHER

        TELLIB["private library: telemetry"]:::private
        TELAPI["exposed-modules<br/>RAGScope.Telemetry<br/>Telemetry利用境界"]:::private
        TELOTHER["other-modules<br/>RAGScope.Telemetry.*"]:::private
        TELLIB --> TELAPI
        TELAPI --> TELOTHER

        OTELLIB["private library: opentelemetry"]:::private
        OTELAPI["exposed-modules<br/>RAGScope.Telemetry.OpenTelemetry<br/>Adapter入口"]:::private
        OTELOTHER["other-modules<br/>Lifecycle / Trace / Logs / Metrics<br/>具体module名は未決定"]:::private
        OTELLIB --> OTELAPI
        OTELAPI --> OTELOTHER

        MAIN["executable: ragscope<br/>Main / Composition Root"]:::runtime
        TEST["test-suite(s)"]:::runtime

        MAIN --> APPAPI
        MAIN --> TELAPI
        MAIN --> OTELAPI

        APPAPI --> TELAPI
        OTELAPI --> TELAPI

        TEST -.-> APPAPI
        TEST -.-> TELAPI
        TEST -.-> OTELAPI
    end

    OTELPKG["OpenTelemetry Haskell packages"]:::external
    OTELOTHER --> OTELPKG

    classDef public fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef private fill:#f3e8ff,stroke:#9333ea,color:#581c87,stroke-width:2px;
    classDef external fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1px;
    classDef runtime fill:#e2e8f0,stroke:#475569,color:#0f172a,stroke-width:1px;
```

- `application`は`telemetry`へ依存する。
- `application`は`opentelemetry`とOpenTelemetry packageへ依存しない。
- `telemetry`はOpenTelemetry packageへ依存しない。
- `opentelemetry`だけがOpenTelemetry packageへ依存する。
- private libraryをまたいで利用するmoduleは`exposed-modules`、そのlibrary内だけで使うmoduleは`other-modules`に置く。

## module dependency map

```mermaid
flowchart LR
    MAIN["Main<br/>Composition Root"]:::runtime

    APP["RAGScope.Application"]:::private
    APPIMPL["RAGScope.Application.*<br/>other-modules"]:::private

    TEL["RAGScope.Telemetry"]:::private
    TELIMPL["RAGScope.Telemetry.*<br/>other-modules"]:::private

    OTEL["RAGScope.Telemetry.OpenTelemetry"]:::private
    OTELIMPL["OpenTelemetry Adapter実装<br/>other-modules"]:::private

    SDK["OpenTelemetry Haskell packages"]:::external

    MAIN --> APP
    MAIN --> TEL
    MAIN --> OTEL

    APP --> APPIMPL
    APP --> TEL
    TEL --> TELIMPL

    OTEL --> OTELIMPL
    OTEL --> TEL
    OTELIMPL --> SDK

    classDef private fill:#f3e8ff,stroke:#9333ea,color:#581c87,stroke-width:2px;
    classDef external fill:#f8fafc,stroke:#64748b,color:#334155,stroke-width:1px;
    classDef runtime fill:#e2e8f0,stroke:#475569,color:#0f172a,stroke-width:1px;
```

禁止する依存は次のとおり。

```text
application -X-> opentelemetry
application -X-> OpenTelemetry packages
telemetry -X-> opentelemetry
telemetry -X-> OpenTelemetry packages
opentelemetry -X-> application
```
