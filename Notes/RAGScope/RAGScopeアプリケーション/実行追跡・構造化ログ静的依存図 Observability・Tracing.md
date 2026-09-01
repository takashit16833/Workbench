---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Observability・Tracing

全体: [[実行追跡・構造化ログ静的依存図]]

Observability / Tracing系moduleからOpenTelemetry SDKまでの依存関係を示す。矢印はすべて依存方向。`RAGScope.Observability.Internal.*`から`RAGScope.Tracing.OpenTelemetry`へは直接依存させない。

色は、青系が公開library / module、紫系が非公開library / module、低彩度の濃色が別packageまたは外部package、青灰色の外枠がCabal packageを表す。

Operationのroot spanとUseCase / Featureの子spanを表せることを前提とする。公開APIをFeature / Application / Interfaceごとにどう分けるかは未確定。

```mermaid
flowchart LR
    subgraph pkg_obs["ragscope-observability"]
        subgraph obs_main_lib["main"]
            obs["RAGScope.Observability<br/>Observability公開API<br/>Feature / Application / Interfaceごとの分割は未確定"]
        end
        subgraph obs_runtime_lib["runtime"]
            runner["RAGScope.Observability.Runner<br/>Operation / child spanの実行境界"]
        end
        subgraph obs_internal_lib["internal"]
            internal["RAGScope.Observability.Internal.*<br/>現在のspan / lifecycle"]
        end
    end

    subgraph pkg_tracing["ragscope-tracing"]
        subgraph tracing_main_lib["main"]
            tracing["RAGScope.Tracing<br/>Tracing Port"]
        end
        subgraph tracing_otel_lib["otel"]
            otel["RAGScope.Tracing.OpenTelemetry"]
        end
        subgraph tracing_core_lib["core"]
            context["RAGScope.Tracing.Context<br/>TraceId / SpanId / TraceContext"]
        end
    end

    error_type["RAGScope.ErrorType<br/>ErrorType / ToErrorType"]
    sdk["OpenTelemetry SDK"]

    runner -->|span lifecycle / contextの操作| internal
    runner -->|公開型| obs
    runner -->|ToErrorType / ErrorType| error_type
    runner -->|TraceContext| context

    internal -->|SpanNameなど| obs
    internal -->|ErrorType| error_type
    internal -->|span操作を要求| tracing
    internal -->|現在のTraceContext| context

    tracing -->|ErrorType| error_type
    tracing -->|TraceContext / SpanId| context

    otel -->|Portを実装| tracing
    otel -->|TraceId / SpanId| context
    otel -->|SDKを利用| sdk

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

    class obs,runner,tracing,otel,context public
    class internal private
    class error_type,sdk outside

    style pkg_obs fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style pkg_tracing fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style obs_main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style obs_runtime_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style obs_internal_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style tracing_main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style tracing_otel_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style tracing_core_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
```
