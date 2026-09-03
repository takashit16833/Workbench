---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Logging

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope-logging` package内のmodule間依存を示す。矢印 `A → B` は、AがBを必要とすることを表す。JSONやSQLiteなど外部形式に依存する処理はcoreへ入れない。

色は、青系が公開library / module、紫系が非公開library / module、低彩度の濃色が別packageまたは外部package、青灰色の外枠がCabal packageを表す。

traceに属するログと、traceに属さないログは同じ`record`を使う。Logging Runtimeは記録時にcurrent Trace Contextを取得し、`TraceContext`を`LogRecord`へ全体として付けるか、付けないかのどちらかにする。

```mermaid
flowchart LR
    subgraph pkg_logging["ragscope-logging"]
        subgraph main_lib["main"]
            logger["RAGScope.Logging<br/>Logger m event / record<br/>Contravariant instance"]
        end
        subgraph internal_lib["internal"]
            runtime["RAGScope.Logging.Runtime<br/>Logger m LogSpecを生成<br/>LogSpec + 実行時情報 → LogRecord"]
            sink["RAGScope.Logging.Sink"]
            json["RAGScope.Logging.JSON"]
            sqlite["RAGScope.Logging.SQLite"]
        end
        subgraph core_lib["core"]
            contract["Logging core<br/>LogSpec / LogRecord / LogValue<br/>LogRecord: TraceContextは任意"]
        end
    end
    context["RAGScope.Tracing.Context<br/>TraceContext（任意）"]
    contravariant["contravariant"]
    aeson["aeson"]
    sqlite_lib["SQLite library（未選定）"]

    logger -->|Contravariant instance| contravariant
    runtime -->|Logger / record| logger
    runtime -->|LogSpec / LogRecord| contract
    runtime -->|current TraceContext| context
    runtime -->|LogRecord| sink
    sink -->|LogRecord| contract
    json -->|LogRecord| contract
    json -->|JSONへ変換| aeson
    sqlite -->|LogRecord| contract
    sqlite -->|SQLite入出力| sqlite_lib
    contract -->|LogRecordのTraceContext（任意）| context

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px
    class logger,contract public
    class runtime,sink,json,sqlite private
    class context,contravariant,aeson,sqlite_lib outside
    style pkg_logging fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style internal_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style core_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
```
