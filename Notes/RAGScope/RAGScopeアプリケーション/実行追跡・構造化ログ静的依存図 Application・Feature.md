---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Application・Feature

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope` package内のmodule間依存を示す。矢印 `A → B` は、AがBをimportし、Bが公開する型・関数・APIを必要とすることを表す。右側のnodeは、別packageが公開しているmoduleまたは外部package。

色は、青系が公開module、紫系が非公開library / module、低彩度の濃色が別packageの公開moduleまたは外部package、青灰色の外枠がCabal packageを表す。

`RAGScope.<Feature>.Logging`はFeature eventから`LogSpec`への名前付き純粋関数を定義する。`ToLogSpec`型クラスとorphan instanceは使わず、`RAGScope.Application.LoggingInstances`も置かない。Application composition rootはこの関数と`Logger m LogSpec`を`contramap`で合成する。

OpenTelemetryによるTracing Portの具体実装は、`ragscope` package内のprivate `ragscope-tracing-otel` libraryにある`RAGScope.Application.Tracing.OpenTelemetry`へ置く。このmoduleだけがOpenTelemetry SDKへ直接依存する。

```mermaid
flowchart LR
    subgraph pkg_ragscope["ragscope"]
        subgraph app["ragscope-application"]
            app_exec["RAGScope.Application.Execution<br/>Operationを実行<br/>Either OperationFailure result"]
            composition["Application composition root<br/>ObservabilityとFeature別Loggerを組み立てる"]
            interface_op["利用インターフェースのOperation<br/>例: DenseSearchOperation"]
            operation_failure["Application共通のOperationFailure<br/>ToErrorType failure =&gt; failure を保持"]
        end
        subgraph feature_lib["ragscope-features"]
            feature_usecase["RAGScope.&lt;Feature&gt;.UseCase"]
            feature_event["RAGScope.&lt;Feature&gt;.Event"]
            feature_failure["RAGScope.&lt;Feature&gt;.Failure<br/>&lt;Feature&gt;Failure / ToErrorType instance"]
            feature_logging["RAGScope.&lt;Feature&gt;.Logging<br/>event → LogSpec"]
        end
        subgraph otel_adapter_lib["ragscope-tracing-otel"]
            otel_adapter["RAGScope.Application.Tracing.OpenTelemetry<br/>Tracing PortのOpenTelemetry実装"]
        end
    end
    obs["RAGScope.Observability<br/>withTrace / withSpan"]
    obs_runtime["RAGScope.Observability.Runtime<br/>makeObservability"]
    logger["RAGScope.Logging<br/>Logger / record"]
    logspec["Logging core<br/>LogSpec"]
    logging_runtime["Logging Runtime<br/>Logger m LogSpec"]
    context["RAGScope.Tracing.Context"]
    tracing["RAGScope.Tracing"]
    error_type["RAGScope.ErrorType"]
    contravariant["Data.Functor.Contravariant"]
    sdk["OpenTelemetry SDK"]

    app_exec -->|本番用の実行を任せる| composition
    app_exec -->|Operationを実行| interface_op
    composition -->|Feature変換を利用| feature_logging
    composition -->|Logger / record| logger
    composition -->|Logger m LogSpec| logging_runtime
    composition -->|contramap| contravariant
    feature_logging -->|Featureのevent型| feature_event
    feature_logging -->|LogSpec| logspec
    interface_op -->|UseCaseを呼ぶ| feature_usecase
    interface_op -->|Logger m InterfaceEvent| logger
    interface_op -->|OperationFailure failureを構築| operation_failure
    operation_failure -->|ToErrorType / toErrorType| error_type
    feature_usecase -->|event型| feature_event
    feature_usecase -->|failure型| feature_failure
    feature_usecase -->|withSpan| obs
    feature_usecase -->|Logger m FeatureEvent| logger
    feature_failure -->|ErrorType / ToErrorType| error_type
    composition -->|Observability API| obs
    composition -->|makeObservability| obs_runtime
    composition -->|Tracing Portの値| tracing
    composition -->|本番用Tracing実装を構築| otel_adapter
    otel_adapter -->|Portを実装| tracing
    otel_adapter -->|TraceId / SpanId| context
    otel_adapter -->|SDKを利用| sdk

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px
    class app_exec,interface_op,operation_failure,feature_usecase,feature_event,feature_failure,feature_logging public
    class composition,otel_adapter private
    class obs,obs_runtime,logger,logspec,logging_runtime,context,tracing,error_type,contravariant,sdk outside
    style pkg_ragscope fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style app fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style feature_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style otel_adapter_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
```
