# RAGScopeアプリケーション Haskellライブラリ・モジュールマップ

正本は `takashit16833/RAGScope` の `ragscope-app/ragscope.cabal` と実際のHaskellコードとする。このノートはそれらを追従する準正本として保守し、差異がある場合は正本を優先する。

現在の確認基準は `RS-0024/exception-event-once`。`RAGScope.Telemetry.OpenTelemetry.Exception` は今回のリファクタで採用する構成として確定しており、正本コードへの反映対象である。

## Cabal component

```mermaid
flowchart TB
  subgraph package["package: ragscope"]
    mainlib["library ragscope\npublic facade"]
    boundary["library telemetry-boundary\nprivate"]
    adapter["library opentelemetry-adapter\nprivate"]
    executable["executable ragscope"]
    tests["test-suite ragscope-test"]
  end

  adapter -->|build-depends| boundary
  executable -->|build-depends| mainlib
  tests -->|build-depends| mainlib
  tests -->|build-depends| boundary
  tests -->|build-depends| adapter

  boundary --> base["base / bytestring / containers / text / time"]
  adapter --> otel["hs-opentelemetry-api\nhs-opentelemetry-sdk"]
  adapter --> support["containers / text / time / unordered-containers"]
  tests --> testdeps["hspec\nhs-opentelemetry-exporter-in-memory"]

  classDef boundaryStyle fill:#dbeafe,stroke:#2563eb,color:#111827
  classDef adapterStyle fill:#dcfce7,stroke:#16a34a,color:#111827
  classDef applicationStyle fill:#f3e8ff,stroke:#9333ea,color:#111827
  classDef externalStyle fill:#ffedd5,stroke:#ea580c,color:#111827
  classDef testStyle fill:#e5e7eb,stroke:#6b7280,color:#111827

  class boundary boundaryStyle
  class adapter adapterStyle
  class mainlib,executable applicationStyle
  class base,otel,support,testdeps externalStyle
  class tests testStyle
```

`library ragscope` は現在Facade用componentだけがあり、`exposed-modules` はまだ持たない。`executable ragscope` の `Main.hs` も現在は最小stubである。

## Production module

```mermaid
flowchart LR
  subgraph boundary["telemetry-boundary"]
    telemetry["RAGScope.Telemetry\nroot"]
    traceBoundary["RAGScope.Telemetry.Trace\nTraceBoundary / SpanRunner\nSpanName / SpanOutcome"]
    logsBoundary["RAGScope.Telemetry.Logs\nLogsBoundary\nLogRecord / EventRecord\nEventRecordEmitter"]
  end

  subgraph adapter["opentelemetry-adapter"]
    otelRoot["RAGScope.Telemetry.OpenTelemetry\nroot"]
    otelTrace["RAGScope.Telemetry.OpenTelemetry.Trace\nSpan lifecycle\nSpanOutcome -> Status\nmask / rethrow"]
    otelException["RAGScope.Telemetry.OpenTelemetry.Exception\nsynchronous exception policy\nExceptionContext / exactly-once claim\nSpan error + exception EventRecord"]
    otelLogs["RAGScope.Telemetry.OpenTelemetry.Logs\nLogRecord / EventRecord -> OTel Logs\ncurrent Context correlation"]
  end

  otelTrace -->|TraceBoundary types| traceBoundary
  otelTrace -->|EventRecordEmitter type| logsBoundary
  otelTrace -->|Span exception handling| otelException
  otelException -->|EventRecord / EventRecordEmitter| logsBoundary
  otelLogs -->|LogsBoundary types| logsBoundary

  otelTrace --> otelTraceSdk["OpenTelemetry Trace API / SDK"]
  otelException --> otelTraceSdk
  otelLogs --> otelLogsSdk["OpenTelemetry Logs API / SDK"]

  classDef boundaryStyle fill:#dbeafe,stroke:#2563eb,color:#111827
  classDef adapterStyle fill:#dcfce7,stroke:#16a34a,color:#111827
  classDef externalStyle fill:#ffedd5,stroke:#ea580c,color:#111827

  class telemetry,traceBoundary,logsBoundary boundaryStyle
  class otelRoot,otelTrace,otelException,otelLogs adapterStyle
  class otelTraceSdk,otelLogsSdk externalStyle
```

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

  classDef boundaryStyle fill:#dbeafe,stroke:#2563eb,color:#111827
  classDef adapterStyle fill:#dcfce7,stroke:#16a34a,color:#111827
  classDef applicationStyle fill:#f3e8ff,stroke:#9333ea,color:#111827
  classDef externalStyle fill:#ffedd5,stroke:#ea580c,color:#111827

  class emitter,event boundaryStyle
  class mkTrace,mkHandler,handler,logs adapterStyle
  class caller applicationStyle
  class span externalStyle
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

  classDef adapterStyle fill:#dcfce7,stroke:#16a34a,color:#111827
  classDef testStyle fill:#e5e7eb,stroke:#6b7280,color:#111827

  class main,behavior,traceSpec,logsSpec,exceptionSpec,support testStyle
  class otTrace,otLogs adapterStyle
```

- `OpenTelemetryTraceSpec`: TraceBoundary単体のresult、Span Status、Context、同期/非同期exception、action exactly-once。
- `OpenTelemetryLogsSpec`: LogRecord / EventRecord変換、timestamp、current Trace Contextとの相関。
- `OpenTelemetryExceptionEventSpec`: Trace × Logsの統合。nested Spanで全SpanをErrorにしつつexception EventRecordを1件だけ記録し、first-escape Spanへ相関させる。
