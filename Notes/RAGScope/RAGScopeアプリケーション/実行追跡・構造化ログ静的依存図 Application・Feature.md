---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Application・Feature

> [!note] Mermaid移行レビュー中
> このMarkdownを現在の参照先・更新先とする。同内容の [[実行追跡・構造化ログ静的依存 Application・Feature.canvas]] は比較レビュー用として一時保持しており、設計の更新先にはしない。レビュー完了後にCanvasを削除する予定。

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope` package内のmodule依存を示す。矢印 `A → B` は、AがBをimportまたは型制約として必要とする方向。右側は別packageの公開module。

`OperationFailure`はApplication共通型として確定しているが、正確なmodule名は未確定。Observability公開APIの利用主体別分割も未確定。

```mermaid
flowchart LR
    subgraph pkg_ragscope["ragscope"]
        subgraph app["private library: ragscope-application"]
            app_exec["RAGScope.Application.Execution<br/>Operation実行<br/>Either OperationFailure result"]
            app_obs["RAGScope.Application.Observability<br/>本番でObservability / Logging / Tracingを接続<br/>Operation / Lifecycle双方のcomposition境界"]
            app_instances["RAGScope.Application.LoggingInstances"]
            feature_logging["RAGScope.&lt;Feature&gt;.Logging<br/>ToLogSpec &lt;FeatureEvent&gt;"]
            interface_op["利用インターフェース Operation<br/>例: DenseSearchOperation"]
            operation_failure["Application共通 OperationFailure<br/>ToErrorType failure =&gt; failure を保持"]
        end

        subgraph feature_lib["private library: ragscope-features"]
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

    app_obs -->|instanceを読み込む| app_instances
    app_instances -->|import ... ()| feature_logging
    feature_logging -->|Feature event型| feature_event
    feature_logging -->|ToLogSpec / LogSpec| logging

    interface_op -->|UseCaseを呼ぶ| feature_usecase
    interface_op -->|OperationFailureを構築| operation_failure
    operation_failure -->|ToErrorType / toErrorType| error_type

    feature_usecase -->|event型| feature_event
    feature_usecase -->|failure型| feature_failure
    feature_usecase -->|emit / withSpan| obs
    feature_failure -->|ErrorType / ToErrorType| error_type

    app_obs -->|Observability API| obs
    app_obs -->|Operation / child span境界| runner
    app_obs -->|ToLogSpec| logging
    app_obs -->|event + optional TraceContext| write
    app_obs -->|trace内でTraceContext| context
    app_obs -->|Tracing Port値| tracing
    app_obs -->|本番Adapterを作る| otel
```
