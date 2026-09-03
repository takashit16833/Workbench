---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Logging

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope-logging` package内のmodule間依存候補を示す。矢印 `A → B` は、AがBを必要とすることを表す。JSONやSQLiteなど外部形式に依存する処理はcoreへ入れない。

正本で確定済みなのは、`RAGScope.Logging`が`Logger m event` / `record` / `Contravariant` instanceを公開すること、Logging coreが`EventName`、5値の`LogLevel`、`AttributeName`、再帰的`AttributeValue`、`Attributes`、`Timestamp`、`Component`、`LogSpec`、`LogRecord`を持つこと、Logging Runtimeが`Logger m LogSpec`を組み立ててcurrent Trace Contextを記録時に取得することである。Runtime / Sink / JSON / SQLiteの正確なmodule名とlibrary内配置はまだ固定していないため、図中では実装候補として示す。

色は、青系が公開library / module、紫系が非公開library / module、低彩度の濃色が別packageまたは外部package、青灰色の外枠がCabal packageを表す。

traceに属するログと、traceに属さないログは同じ`record`を使う。Logging Runtimeは記録時にcurrent Trace Contextを取得し、`TraceContext`を`LogRecord`へ全体として付けるか、付けないかのどちらかにする。

```mermaid
flowchart LR
    subgraph pkg_logging["ragscope-logging"]
        subgraph main_lib["main"]
            logger["RAGScope.Logging<br/>Logger m event / record<br/>Contravariant instance"]
        end
        subgraph internal_lib["Runtime / Sink / 外部表現境界（候補）"]
            runtime["Logging Runtime境界<br/>Logger m LogSpecを生成<br/>LogSpec + 実行時情報 → LogRecord<br/>module名未確定"]
            sink["Sink境界<br/>module名未確定"]
            json["JSON投影<br/>module配置未確定"]
            sqlite["SQLite投影<br/>module配置未確定"]
        end
        subgraph core_lib["core"]
            contract["Logging core<br/>EventName / LogLevel<br/>AttributeName / AttributeValue / Attributes<br/>Timestamp / Component<br/>LogSpec / LogRecord<br/>LogRecord: Maybe TraceContext"]
        end
    end
    context["RAGScope.Tracing.Context<br/>TraceContext（任意）"]
    contravariant["contravariant"]
    aeson["aeson"]
    sqlite_lib["SQLite library（未選定）"]
    text_pkg["text"]
    containers_pkg["containers"]
    scientific_pkg["scientific"]
    time_pkg["time"]

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
    contract -->|Maybe TraceContext| context
    contract -->|Text| text_pkg
    contract -->|Map| containers_pkg
    contract -->|Scientific| scientific_pkg
    contract -->|UTCTime| time_pkg

    classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
    classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
    classDef outside fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px
    class logger,contract public
    class runtime,sink,json,sqlite private
    class context,contravariant,aeson,sqlite_lib,text_pkg,containers_pkg,scientific_pkg,time_pkg outside
    style pkg_logging fill:transparent,stroke:#153A75,color:#4C9EEB,stroke-width:2px
    style main_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
    style internal_lib fill:transparent,stroke:#8A5EC0,color:#B07CFF,stroke-width:2px
    style core_lib fill:transparent,stroke:#2759AA,color:#7CBEFF,stroke-width:2px
```
