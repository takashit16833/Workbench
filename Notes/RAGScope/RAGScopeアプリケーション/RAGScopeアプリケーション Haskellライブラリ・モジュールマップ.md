# RAGScopeアプリケーション Haskellライブラリ・モジュールマップ

正本は `takashit16833/RAGScope` の `ragscope-app/ragscope.cabal` と実際のHaskellコードとする。このノートはそれらを追従する準正本として保守し、差異がある場合は正本を優先する。

現在の確認基準は `RS-0024/exception-event-once`。`RAGScope.Telemetry.OpenTelemetry.Exception` は今回のリファクタで採用する構成として確定しており、正本コードへの反映対象である。

## Cabal component

```mermaid
flowchart TB
  subgraph package["package: ragscope"]
    mainlib["library ragscope"]
    boundary["library telemetry-boundary"]
    adapter["library opentelemetry-adapter"]
    executable["executable ragscope"]
    tests["test-suite ragscope-test"]
  end

  adapter -->|build-depends| boundary
  executable -->|build-depends| mainlib
  tests -->|build-depends| mainlib
  tests -->|build-depends| boundary
  tests -->|build-depends| adapter

  boundary --> base["base / bytestring / containers / text / time"]
  adapter --> otel["hs-opentelemetry-api<br>hs-opentelemetry-sdk"]
  adapter --> support["containers / text / time / unordered-containers"]
  tests --> testdeps["hspec<br>hs-opentelemetry-exporter-in-memory"]

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class mainlib public
  class boundary,adapter private
  class base,otel,support,testdeps external
  style package fill:transparent,stroke:#153A75,color:#4C9EEB
```

凡例: 公開library / module = 青、非公開library / module = 紫、別package / 外部package = 濃青。

`library ragscope` は現在Facade用componentだけがあり、`exposed-modules` はまだ持たない。`executable ragscope` の `Main.hs` も現在は最小stubである。

## Production module

```mermaid
flowchart LR
  subgraph boundary["telemetry-boundary"]
    telemetry["RAGScope.Telemetry<br>root"]
    traceBoundary["RAGScope.Telemetry.Trace<br>TraceBoundary / SpanRunner<br>SpanName / SpanOutcome"]
    logsBoundary["RAGScope.Telemetry.Logs<br>LogsBoundary<br>LogRecord / EventRecord<br>EventRecordEmitter"]
  end

  subgraph adapter["opentelemetry-adapter"]
    otelRoot["RAGScope.Telemetry.OpenTelemetry<br>root"]
    otelTrace["RAGScope.Telemetry.OpenTelemetry.Trace<br>Span lifecycle<br>SpanOutcome -> Status<br>mask / rethrow"]
    otelException["RAGScope.Telemetry.OpenTelemetry.Exception<br>synchronous exception policy<br>ExceptionContext / exactly-once claim<br>Span error + exception EventRecord"]
    otelLogs["RAGScope.Telemetry.OpenTelemetry.Logs<br>LogRecord / EventRecord -> OTel Logs<br>current Context correlation"]
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

凡例: 公開library / module = 青、非公開library / module = 紫、別package / 外部package = 濃青。

`RAGScope.Telemetry.OpenTelemetry.Exception` は `opentelemetry-adapter` 内部moduleとし、公開Adapter APIにはしない。`ragscope.cabal` では `other-modules` に置く。

`Trace` はSpan lifecycleを担当し、exception固有の `ExceptionContext`、exactly-once claim、exception EventRecord schemaは `Exception` が担当する。`Trace` から `Logs` への依存は `mkOpenTelemetryTraceBoundary` が受け取る `EventRecordEmitter` の型に限定する。

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

## test-suite module

```mermaid
flowchart TB
  main["test/Main.hs"]
  behavior["OpenTelemetryBehaviorSpec"]
  traceSpec["OpenTelemetryTraceSpec"]
  logsSpec["OpenTelemetryLogsSpec"]
  exceptionSpec["OpenTelemetryExceptionEventSpec"]
  support["OpenTelemetryTestSupport"]

  main --> behavior
  main --> traceSpec
  main --> logsSpec
  main --> exceptionSpec

  behavior --> support
  traceSpec --> support
  logsSpec --> support
  exceptionSpec --> support

  traceSpec --> otTrace["OpenTelemetry.Trace"]
  logsSpec --> otLogs["OpenTelemetry.Logs"]
  exceptionSpec --> otTrace
  exceptionSpec --> otLogs

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px

  class main,behavior,traceSpec,logsSpec,exceptionSpec,support private
  class otTrace,otLogs public
```

凡例: 公開library / module = 青、非公開library / module = 紫。

- `OpenTelemetryTraceSpec`: TraceBoundary単体のresult、Span Status、Context、同期/非同期exception、action exactly-once。
- `OpenTelemetryLogsSpec`: LogRecord / EventRecord変換、timestamp、current Trace Contextとの相関。
- `OpenTelemetryExceptionEventSpec`: Trace × Logsの統合。nested Spanで全SpanをErrorにしつつexception EventRecordを1件だけ記録し、first-escape Spanへ相関させる。
