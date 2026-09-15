# RAGScopeアプリケーション Haskellライブラリ・モジュールマップ

正本は `takashit16833/RAGScope` の `ragscope-app/ragscope.cabal` と実際のHaskellコードとする。このノートはそれらを追従する準正本として保守し、差異がある場合は正本を優先する。

## Cabal component

```mermaid
flowchart TB
  subgraph package["package: ragscope"]
    mainlib["library ragscope"]
    boundary["library telemetry-boundary"]
    adapter["library opentelemetry-adapter"]
    executable["executable ragscope"]
  end

  adapter -->|build-depends| boundary
  executable -->|build-depends| mainlib

  boundary --> base["base / bytestring / containers / text / time"]
  adapter --> otel["hs-opentelemetry-api<br>hs-opentelemetry-sdk"]
  adapter --> support["containers / text / time / unordered-containers"]

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class mainlib public
  class boundary,adapter private
  class base,otel,support external
  style package fill:transparent,stroke:#153A75,color:#4C9EEB
```

## Production module

```mermaid
flowchart LR
  subgraph boundary["telemetry-boundary"]
    telemetry["RAGScope.Telemetry"]
    traceBoundary["RAGScope.Telemetry.Trace"]
    logsBoundary["RAGScope.Telemetry.Logs"]
  end

  subgraph adapter["opentelemetry-adapter"]
    otelRoot["RAGScope.Telemetry.OpenTelemetry"]
    otelTrace["RAGScope.Telemetry.OpenTelemetry.Trace"]
    otelException["RAGScope.Telemetry.OpenTelemetry.Exception"]
    otelLogs["RAGScope.Telemetry.OpenTelemetry.Logs"]
  end

  otelTrace -->|TraceBoundary types| traceBoundary
  otelTrace -->|EventRecordEmitter type| logsBoundary
  otelTrace -->|Span exception handling| otelException
  otelException -->|EventRecord / EventRecordEmitter| logsBoundary
  otelLogs -->|LogsBoundary types| logsBoundary

  otelTrace --> otelTraceSdk["OpenTelemetry Trace API / SDK"]
  otelException --> otelTraceSdk
  otelLogs --> otelLogsSdk["OpenTelemetry Logs API / SDK"]

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class telemetry,traceBoundary,logsBoundary,otelRoot,otelTrace,otelLogs public
  class otelException private
  class otelTraceSdk,otelLogsSdk external
```

## exception処理の依存

```mermaid
flowchart LR
  caller["composition root / test setup"]
  emitter["EventRecordEmitter"]
  mkTrace["mkOpenTelemetryTraceBoundary"]
  mkHandler["mkSpanExceptionHandler"]
  handler["SpanExceptionHandler"]
  span["OpenTelemetry Span"]
  event["exception EventRecord"]
  logs["OpenTelemetry Logs Adapter"]

  caller --> emitter
  emitter --> mkTrace
  mkTrace --> mkHandler
  mkHandler --> handler
  handler --> span
  handler --> event
  event --> emitter
  emitter --> logs
```

`EventRecordEmitter` は `mkOpenTelemetryTraceBoundary` で受け取り、`mkSpanExceptionHandler` へ一度渡してcaptureする。`runOpenTelemetrySpan`、exception捕捉、claim、EventRecord生成の各段へEmitterをparameter threadingしない。
