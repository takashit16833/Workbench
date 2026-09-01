---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# 実行追跡・構造化ログ静的依存図 Logging

> [!note] Mermaid移行レビュー中
> このMarkdownを現在の参照先・更新先とする。同内容の [[実行追跡・構造化ログ静的依存 Logging.canvas]] は比較レビュー用として一時保持しており、設計の更新先にはしない。レビュー完了後にCanvasを削除する予定。

全体: [[実行追跡・構造化ログ静的依存図]]

`ragscope-logging` package内のmodule依存を示す。矢印 `A → B` はAがBを必要とする方向。外部形式の依存をcoreへ入れない。

trace内ログとtrace外ログは同じLogging基盤を使う。`TraceContext`は`LogRecord`で任意のまとまりとして扱い、TraceId / SpanId片方だけの状態は作らない。

```mermaid
flowchart LR
    subgraph pkg_logging["ragscope-logging"]
        subgraph main_lib["public: main"]
            write["RAGScope.Logging.Write<br/>trace内外を受付<br/>API分割は未確定"]
        end

        subgraph internal_lib["private: internal"]
            runtime["RAGScope.Logging.Runtime<br/>LogSpec + runtime情報 → LogRecord"]
            sink["RAGScope.Logging.Sink"]
            json["RAGScope.Logging.JSON"]
            sqlite["RAGScope.Logging.SQLite"]
        end

        subgraph core_lib["public: core"]
            contract["RAGScope.Logging<br/>ToLogSpec / LogSpec / LogRecord / LogValue<br/>LogRecord: optional TraceContext"]
        end
    end

    context["RAGScope.Tracing.Context<br/>optional TraceContext"]
    aeson["aeson"]
    sqlite_lib["SQLite library（未選定）"]

    write -->|event / LogSpec + optional TraceContext| runtime
    write -->|ToLogSpec / LogSpec| contract
    write -->|optional TraceContext| context

    runtime -->|LogRecord| sink
    runtime -->|LogSpec / LogRecord| contract
    runtime -->|optional TraceContext| context

    sink -->|LogRecord| contract
    json -->|LogRecord| contract
    json -->|JSON化| aeson
    sqlite -->|LogRecord| contract
    sqlite -->|SQLite I/O| sqlite_lib
    contract -->|LogRecordのoptional TraceContext| context
```
