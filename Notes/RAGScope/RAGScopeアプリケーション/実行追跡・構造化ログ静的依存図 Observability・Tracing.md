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

Operationのroot spanとUseCase / Featureの子spanを表せることを前提とする。公開APIをFeature / Application / Interfaceごとにどう分けるかは未確定。

```mermaid
flowchart LR
    subgraph pkg_obs["ragscope-observability"]
        subgraph obs_main_lib["public: main"]
            obs["RAGScope.Observability<br/>Observability公開API<br/>Feature / Application / Interfaceごとの分割は未確定"]
        end
        subgraph obs_runtime_lib["public: runtime"]
            runner["RAGScope.Observability.Runner<br/>Operation / child spanの実行境界"]
        end
        subgraph obs_internal_lib["private: internal"]
            internal["RAGScope.Observability.Internal.*<br/>現在のspan / lifecycle"]
        end
    end

    subgraph pkg_tracing["ragscope-tracing"]
        subgraph tracing_main_lib["public: main"]
            tracing["RAGScope.Tracing<br/>Tracing Port"]
        end
        subgraph tracing_otel_lib["public: otel"]
            otel["RAGScope.Tracing.OpenTelemetry"]
        end
        subgraph tracing_core_lib["public: core"]
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
```
