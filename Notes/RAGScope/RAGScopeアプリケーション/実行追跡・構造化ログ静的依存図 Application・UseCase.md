---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Application・UseCase

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope` package内のmodule間依存を示す。矢印 `A → B` は、AがBをimportし、Bが公開する型・関数・APIを必要とすることを表す。右側のnodeは、別packageが公開しているmoduleまたは外部package。

色は、青系が公開module、紫系が非公開library / module、低彩度の濃色が別packageの公開moduleまたは外部package、青灰色の外枠がCabal packageを表す。

UseCase固有failure型は`RAGScope.<UseCase>.Failure`が所有する。`RAGScope.<UseCase>.ErrorClassification`はfailure型と`RAGScope.ErrorType`を参照して名前付き`ErrorClassifier <UseCase>Failure`を定義する。`RAGScope.<UseCase>.Logging`はUseCase eventから`LogSpec`への名前付き純粋関数を定義し、失敗eventで`error_type`が必要な場合は同じClassifierを利用する。

UseCaseが実行時に必要とする能力はUseCase所有の依存recordへまとめる。Application composition rootが`Tracing m`とUseCase固有Classifierから`Observability m <UseCase>Failure`を作り、UseCase別Loggerとともに依存recordへ格納する。UseCase本体はClassifierやTracingを直接扱わない。

OperationもOperation固有の依存recordから実行時に必要な能力だけを受け取る。composition rootはUseCase依存recordをUseCase実行関数へ適用して依存を閉じ、その実行関数、Operation用Observability、Interface LoggerをOperation依存recordへ格納する。OperationはUseCase依存recordやApplication全体の`AppEnv`を受け取らず、failure所有側のClassifierはruntime依存recordへ入れず静的にimportする。

```mermaid
flowchart LR
    subgraph pkg_ragscope["ragscope"]
        subgraph app["ragscope-application"]
            app_exec["RAGScope.Application.Execution<br/>Operationを実行<br/>Either OperationFailure result"]
            composition["Application composition root<br/>Observability / Logger / UseCase・Operation依存recordを組み立てる"]
            interface_op["利用インターフェースのOperation<br/>例: DenseSearchOperation"]
            operation_deps["Operation所有の依存record<br/>Observability m OperationFailure<br/>Logger m InterfaceEvent<br/>依存を閉じたUseCase実行関数"]
            operation_failure["Application共通のOperationFailure<br/>failure + ErrorClassifier failure"]
            operation_classifier["operationFailureErrorClassifier<br/>ErrorClassifier OperationFailure"]
        end
        subgraph usecase_lib["ragscope-use-cases"]
            usecase_body["RAGScope.&lt;UseCase&gt;.UseCase"]
            usecase_deps["UseCase所有の依存record<br/>Observability m UseCaseFailure<br/>Logger m UseCaseEvent"]
            usecase_event["RAGScope.&lt;UseCase&gt;.Event"]
            usecase_failure["RAGScope.&lt;UseCase&gt;.Failure<br/>&lt;UseCase&gt;Failure"]
            usecase_classifier["RAGScope.&lt;UseCase&gt;.ErrorClassification<br/>ErrorClassifier &lt;UseCase&gt;Failure"]
            usecase_logging["RAGScope.&lt;UseCase&gt;.Logging<br/>event → LogSpec"]
        end
        subgraph otel_adapter_lib["ragscope-tracing-otel"]
            otel_adapter["RAGScope.Application.Tracing.OpenTelemetry<br/>Tracing PortのOpenTelemetry実装"]
        end
    end
    obs["RAGScope.Observability<br/>Observability m failure"]
    obs_runtime["RAGScope.Observability.Runtime<br/>makeObservability"]
    logger["RAGScope.Logging<br/>Logger / record"]
    logspec["Logging core<br/>LogSpec"]
    logging_runtime["Logging Runtime<br/>Logger m LogSpec"]
    context["RAGScope.Tracing.Context"]
    tracing["RAGScope.Tracing<br/>SpanOutcome"]
    error_type["RAGScope.ErrorType<br/>ErrorType / ErrorClassifier"]
    contravariant["Data.Functor.Contravariant"]
    sdk["OpenTelemetry SDK"]

    app_exec -->|本番用の実行を任せる| composition
    app_exec -->|Operationを実行| interface_op
    composition -->|UseCaseのClassifier| usecase_classifier
    composition -->|UseCase変換を利用| usecase_logging
    composition -->|UseCase依存recordを構築| usecase_deps
    composition -->|UseCase依存を閉じる| usecase_body
    composition -->|Operation依存recordを構築| operation_deps
    composition -->|makeObservability| obs_runtime
    composition -->|Tracing Portの値| tracing
    composition -->|Logger m LogSpec| logging_runtime
    composition -->|contramap| contravariant
    composition -->|本番用Tracing実装を構築| otel_adapter

    interface_op -->|Operation依存recordを受け取る| operation_deps
    interface_op -->|failureとClassifierで構築| operation_failure
    interface_op -->|UseCase failure用Classifierを静的利用| usecase_classifier

    operation_deps -->|Observability m OperationFailure| obs
    operation_deps -->|Logger m InterfaceEvent| logger

    operation_failure -->|ErrorClassifier型| error_type
    operation_classifier -->|OperationFailureを分類| operation_failure
    operation_classifier -->|ErrorClassifier / classifyError| error_type
    composition -->|Operation用Classifierを利用| operation_classifier

    usecase_body -->|依存recordを受け取る| usecase_deps
    usecase_deps -->|UseCaseEvent型を参照| usecase_event
    usecase_deps -->|Observability m UseCaseFailure| obs
    usecase_deps -->|Logger m UseCaseEvent| logger
    usecase_body -->|event型| usecase_event
    usecase_body -->|failure型| usecase_failure
    usecase_body -->|withSpanを呼ぶ| obs
    usecase_body -->|recordを呼ぶ| logger

    usecase_classifier -->|failure型| usecase_failure
    usecase_classifier -->|ErrorClassifier / ErrorType| error_type
    usecase_logging -->|UseCase event型| usecase_event
    usecase_logging -->|失敗eventのClassifier| usecase_classifier
    usecase_logging -->|LogSpec| logspec

    otel_adapter -->|Portを実装| tracing
    otel_adapter -->|TraceId / SpanId| context
    otel_adapter -->|SDKを利用| sdk

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px
    class app_exec,interface_op,operation_deps,operation_failure,operation_classifier,usecase_body,usecase_deps,usecase_event,usecase_failure,usecase_classifier,usecase_logging public
    class composition,otel_adapter private
    class obs,obs_runtime,logger,logspec,logging_runtime,context,tracing,error_type,contravariant,sdk outside
    style pkg_ragscope fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style app fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style usecase_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style otel_adapter_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
```
