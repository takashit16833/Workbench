---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Application・Feature

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope` package内のmodule間依存を示す。矢印 `A → B` は、AがBをimportし、Bが公開する型・typeclass・APIを必要とすることを表す。右側のnodeは、別packageが公開しているmodule。

色は、シアンが公開module、紫が非公開library / module、グレーのnodeが別packageの公開module、グレーの外枠がCabal packageを表す。

`OperationFailure`はApplicationで共通に使う型として確定しているが、正確なmodule名は未確定。Observability公開APIをFeature / Application / Interfaceごとにどう分けるかも未確定。

```mermaid
flowchart LR
    subgraph pkg_ragscope["ragscope"]
        subgraph app["ragscope-application"]
            app_exec["RAGScope.Application.Execution<br/>Operationを実行<br/>Either OperationFailure result"]
            app_obs["RAGScope.Application.Observability<br/>本番構成でObservability / Logging / Tracingを接続<br/>Operation / Lifecycleを組み立てる境界"]
            app_instances["RAGScope.Application.LoggingInstances"]
            feature_logging["RAGScope.&lt;Feature&gt;.Logging<br/>ToLogSpec &lt;FeatureEvent&gt;"]
            interface_op["利用インターフェースのOperation<br/>例: DenseSearchOperation"]
            operation_failure["Application共通のOperationFailure<br/>ToErrorType failure =&gt; failure を保持"]
        end

        subgraph feature_lib["ragscope-features"]
            feature_usecase["RAGScope.&lt;Feature&gt;.UseCase"]
            feature_event["RAGScope.&lt;Feature&gt;.Event"]
            feature_failure["RAGScope.&lt;Feature&gt;.Failure<br/>&lt;Feature&gt;Failure / ToErrorType instance"]
        end
    end

    obs["RAGScope.Observability"]
    runner["RAGScope.Observability.Runner"]
    logging["RAGScope.Logging"]
    write["RAGScope.Logging.Write"]
    context["RAGScope.Tracing.Context"]
    tracing["RAGScope.Tracing"]
    otel["RAGScope.Tracing.OpenTelemetry"]
    error_type["RAGScope.ErrorType"]

    app_exec -->|本番用の実行を任せる| app_obs
    app_exec -->|Operationを実行| interface_op

    app_obs -->|instance moduleを読み込む| app_instances
    app_instances -- "import ... ()" --> feature_logging
    feature_logging -->|Featureのevent型| feature_event
    feature_logging -->|ToLogSpec / LogSpec| logging

    interface_op -->|UseCaseを呼ぶ| feature_usecase
    interface_op -->|OperationFailure failureを構築| operation_failure
    operation_failure -->|ToErrorType / toErrorType| error_type

    feature_usecase -->|event型| feature_event
    feature_usecase -->|failure型| feature_failure
    feature_usecase -->|emit / withSpan| obs
    feature_failure -->|ErrorType / ToErrorType| error_type

    app_obs -->|Observability API| obs
    app_obs -->|Operation / child spanの実行境界| runner
    app_obs -->|ToLogSpec| logging
    app_obs -->|event + 任意のTraceContext| write
    app_obs -->|trace内のTraceContext| context
    app_obs -->|Tracing Portの値| tracing
    app_obs -->|本番用Adapterを作る| otel

    classDef public fill:#00D9FF,stroke:#00A7C2,color:#111111,stroke-width:2px
    classDef private fill:#9B5DE5,stroke:#713CB0,color:#FFFFFF,stroke-width:2px
    classDef outside fill:#6B7280,stroke:#4B5563,color:#FFFFFF,stroke-width:2px

    class app_exec,interface_op,operation_failure,feature_usecase,feature_event,feature_failure public
    class app_obs,app_instances,feature_logging private
    class obs,runner,logging,write,context,tracing,otel,error_type outside

    style pkg_ragscope fill:transparent,stroke:#6B7280,stroke-width:2px
    style app fill:transparent,stroke:#9B5DE5,stroke-width:3px
    style feature_lib fill:transparent,stroke:#9B5DE5,stroke-width:3px
```
