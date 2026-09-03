---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Observability・Tracing

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope-observability`と`ragscope-tracing`に属するmoduleを依存元とする静的依存を示す。矢印はすべて依存方向。OpenTelemetry Adapterは`ragscope` package側へ置くため、この図では依存元として扱わない。Adapter側の依存は [[実行追跡・構造化ログ静的依存図 Application・UseCase]] を参照する。

色は、青系がpackage外から利用する公開library / module、低彩度の濃色が別package、青灰色の外枠がCabal packageを表す。

`ragscope-observability` packageは、利用APIを持つmain libraryと、composition rootが利用する`runtime` libraryの2つだけを持つ。現在のObservability責務では`internal` libraryや`RAGScope.Observability.Runner`を設けない。

`ragscope-tracing` packageは、`RAGScope.Tracing`のTracing Portと`RAGScope.Tracing.Context`のTrace Context契約だけを公開する。OpenTelemetry SDKへ直接依存するmoduleはこのpackageに置かない。

```mermaid
flowchart LR
    subgraph pkg_obs["ragscope-observability"]
        subgraph obs_main_lib["main"]
            obs["RAGScope.Observability<br/>Observability / SpanName"]
        end
        subgraph obs_runtime_lib["runtime"]
            runtime["RAGScope.Observability.Runtime<br/>makeObservability"]
        end
    end

    subgraph pkg_tracing["ragscope-tracing"]
        subgraph tracing_main_lib["main"]
            tracing["RAGScope.Tracing<br/>Tracing Port"]
        end
        subgraph tracing_core_lib["core"]
            context["RAGScope.Tracing.Context<br/>TraceId / SpanId / TraceContext"]
        end
    end

    error_type["RAGScope.ErrorType<br/>ErrorType / ToErrorType"]

    obs -->|ToErrorType| error_type
    obs -->|SpanNameを再export| tracing

    runtime -->|Observability| obs
    runtime -->|Tracing / withTrace / withSpan / observeResult| tracing

    tracing -->|ToErrorType / ErrorType| error_type
    tracing -->|TraceContext| context

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

    class obs,runtime,tracing,context public
    class error_type outside

    style pkg_obs fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style pkg_tracing fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style obs_main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style obs_runtime_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style tracing_main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style tracing_core_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
```
