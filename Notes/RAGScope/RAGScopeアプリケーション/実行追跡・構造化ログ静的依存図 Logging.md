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

traceに属するログと、traceに属さないログは同じLogging基盤を使う。`TraceContext`は`LogRecord`に全体として付くか付かないかのどちらかとし、TraceId / SpanIdの片方だけを持つ状態は作らない。

```mermaid
flowchart LR
    subgraph pkg_logging["ragscope-logging"]
        subgraph main_lib["public: main"]
            write["RAGScope.Logging.Write<br/>traceの有無にかかわらず受け付ける<br/>API分割は未確定"]
        end

        subgraph internal_lib["private: internal"]
            runtime["RAGScope.Logging.Runtime<br/>LogSpec + 実行時情報 → LogRecord"]
            sink["RAGScope.Logging.Sink"]
            json["RAGScope.Logging.JSON"]
            sqlite["RAGScope.Logging.SQLite"]
        end

        subgraph core_lib["public: core"]
            contract["RAGScope.Logging<br/>ToLogSpec / LogSpec / LogRecord / LogValue<br/>LogRecord: TraceContextは任意"]
        end
    end

    context["RAGScope.Tracing.Context<br/>TraceContext（任意）"]
    aeson["aeson"]
    sqlite_lib["SQLite library（未選定）"]

    write -->|event / LogSpec + 任意のTraceContext| runtime
    write -->|ToLogSpec / LogSpec| contract
    write -->|任意のTraceContext| context

    runtime -->|LogRecord| sink
    runtime -->|LogSpec / LogRecord| contract
    runtime -->|任意のTraceContext| context

    sink -->|LogRecord| contract
    json -->|LogRecord| contract
    json -->|JSONへ変換| aeson
    sqlite -->|LogRecord| contract
    sqlite -->|SQLite入出力| sqlite_lib
    contract -->|LogRecordのTraceContext（任意）| context
```
