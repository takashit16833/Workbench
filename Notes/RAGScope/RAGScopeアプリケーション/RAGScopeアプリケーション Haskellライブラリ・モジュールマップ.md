# RAGScopeアプリケーション Haskellライブラリ・モジュールマップ

対象: **RS-0024 subtask「OpenTelemetry SDKライフサイクルとMetrics基盤を実装する」完了時の構成**。図はlibrary境界・module責務・呼び出し経路を俯瞰するためのもの。仕様と実際の依存の正本は`takashit16833/RAGScope`の対象branchにある`ragscope-app/ragscope.cabal`、コード、テストであり、食い違う場合はそちらを優先する。実装判断と検証手順は[[RS-0024 SDKライフサイクルとMetrics基盤 実装計画]]に記載する。

図中の矢印は、特記がなければ**矢印元が矢印先へ依存する方向**。配色は[[Mermaid図の色分けルール]]に従う。

## Cabal componentとpackage依存

```mermaid
flowchart TB
  subgraph package["package: ragscope"]
    mainlib["library ragscope"]
    boundary["library telemetry-boundary"]
    adapter["library opentelemetry-adapter"]
    executable["executable ragscope"]
    tests["test-suite ragscope-test"]
    boundaryTests["test-suite telemetry-boundary-test"]
  end

  adapter -->|build-depends| boundary
  executable -->|build-depends| mainlib
  tests -->|build-depends| adapter
  tests -->|build-depends| boundary
  tests -->|build-depends| mainlib
  boundaryTests -->|build-depends| boundary

  boundary --> basic["base / bytestring / containers / text / time"]
  adapter --> sdk["hs-opentelemetry-api<br/>hs-opentelemetry-sdk"]
  adapter --> otlp["hs-opentelemetry-exporter-otlp"]
  adapter --> tools["async / containers / text / time<br/>unordered-containers / base"]
  tests --> testDeps["hspec / in-memory Exporter<br/>async / vector など直接使用分"]
  boundaryTests --> pureTest["base / containers / hspec / text"]

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class mainlib public
  class boundary,adapter,executable,tests,boundaryTests private
  class basic,sdk,otlp,tools,testDeps,pureTest external
  style package fill:transparent,stroke:#153A75,color:#4C9EEB
```

凡例: 青＝公開library、紫＝package内の非公開libraryおよびcomponent、濃青＝外部package。`visibility: private`でも`exposed-modules`は別componentからimport可能な範囲を定める。`other-modules`はそのcomponentの内部実装。

`telemetry-boundary`にOpenTelemetry API/SDK依存を追加しない。`opentelemetry-adapter`は`async`と、通常OTLP factoryを直接importするための`hs-opentelemetry-exporter-otlp`を直接依存に持つ。テストが直接importする`async`/`vector`等もテストcomponentに宣言する。`telemetry-boundary-test`はSDK非依存のまま。

## Production moduleと静的なimport方向

```mermaid
flowchart LR
  subgraph boundary["telemetry-boundary"]
    telemetry["RAGScope.Telemetry<br/>Telemetry"]
    traceBoundary["RAGScope.Telemetry.Trace<br/>TraceBoundary / SpanRunner"]
    logsBoundary["RAGScope.Telemetry.Logs<br/>LogsBoundary / EventRecordEmitter"]
  end

  subgraph adapter["opentelemetry-adapter"]
    otelRoot["RAGScope.Telemetry.OpenTelemetry<br/>withTelemetry"]
    construction["OpenTelemetry.Construction<br/>SdkPlan / SdkTelemetry<br/>withTelemetryUsing"]
    configuration["OpenTelemetry.Configuration<br/>Resource / factory / 環境設定"]
    lifecycle["OpenTelemetry.Lifecycle<br/>取得範囲 / cleanup報告 / 例外優先"]
    metrics["OpenTelemetry.Metrics<br/>Provider / Reader / Exporter所有"]
    otelTrace["OpenTelemetry.Trace<br/>mkOpenTelemetryTraceBoundary"]
    otelLogs["OpenTelemetry.Logs<br/>mkOpenTelemetryLogsBoundary"]
    otelException["OpenTelemetry.Exception<br/>Span例外とexactly-once"]
  end

  telemetry --> traceBoundary
  telemetry --> logsBoundary
  otelRoot --> configuration
  otelRoot --> construction
  otelRoot --> telemetry
  configuration --> construction
  construction --> lifecycle
  construction --> metrics
  construction --> otelTrace
  construction --> otelLogs
  construction --> telemetry
  metrics --> lifecycle
  otelTrace --> traceBoundary
  otelTrace --> logsBoundary
  otelTrace --> otelException
  otelException --> logsBoundary
  otelLogs --> logsBoundary

  otelTrace --> sdkTrace["OpenTelemetry Trace API / SDK"]
  otelLogs --> sdkLogs["OpenTelemetry Logs API / SDK"]
  metrics --> sdkMetric["OpenTelemetry Metrics API / SDK<br/>Periodic MetricReader / async"]
  configuration --> sdkConfig["SDK resource / OTLP Exporter / batch factory"]
  lifecycle --> sdkResult["SDK Flush / Shutdown / Export結果"]

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class telemetry,traceBoundary,logsBoundary,otelRoot,construction,otelTrace,otelLogs public
  class configuration,lifecycle,metrics,otelException private
  class sdkTrace,sdkLogs,sdkMetric,sdkConfig,sdkResult external
  style boundary fill:transparent,stroke:#153A75,color:#4C9EEB
  style adapter fill:transparent,stroke:#153A75,color:#4C9EEB
```

凡例: 青＝`exposed-modules`、紫＝`other-modules`、濃青＝外部library/API。図内の`OpenTelemetry.*`は`RAGScope.Telemetry.OpenTelemetry.*`の略記。ただし外部SDK nodeはOpenTelemetry packageの実moduleを指す。

### 公開APIと利用者

```haskell
-- telemetry-boundary / RAGScope.Telemetry
-- 機能処理に渡せるSDK非依存の束。実際のUseCaseには必要な操作のみを渡す。
data Telemetry = Telemetry
  { telemetryTrace :: TraceBoundary
  , telemetryLogs  :: LogsBoundary
  }

-- opentelemetry-adapter / RAGScope.Telemetry.OpenTelemetry
withTelemetry :: (Telemetry -> IO a) -> IO a

-- opentelemetry-adapter / OpenTelemetry.Construction
-- 構築と標準計装の接続だけがMeterProviderを参照する。
data SdkTelemetry = SdkTelemetry
  { sdkTelemetry     :: Telemetry
  , sdkMeterProvider :: MeterProvider
  }
withTelemetryUsing :: SdkPlan -> (SdkTelemetry -> IO a) -> IO a
```

`Telemetry`にはSDK型を入れず、`SdkTelemetry`をUseCaseへ配らない。Trace/Logsは既存`mkOpenTelemetryTraceBoundary`、`mkOpenTelemetryLogsBoundary`を使う。`Construction`はProviderから境界への組み立てと3 Providerの取得範囲を担当し、`Lifecycle`はReaderなどの具象型を知らない。`Metrics`はReader停止確認とExporterへの依存順序を担当する。通常構成とテスト構成は共通の`withTelemetryUsing`を通す。

## 取得・利用・解放の流れ

```mermaid
flowchart TB
  root["withTelemetry / withTelemetryUsing"]
  trace["Trace取得範囲<br/>TracerProvider"]
  logs["Logs取得範囲<br/>LoggerProvider"]
  meter["Metrics取得範囲<br/>MeterProvider + SdkMeterEnv"]
  exporter["Metric Exporter取得<br/>外側Metrics範囲が単独所有"]
  reader["SDK Periodic Reader取得<br/>公開Async handle"]
  use["mkOpenTelemetryLogsBoundary<br/>mkOpenTelemetryTraceBoundary<br/>callbackを一回実行"]
  stop["Reader停止・終了結果確認"]
  export["exportMetricsOnce"]
  flush["Exporter force flush"]
  close["Exporter shutdown"]
  meterClose["MeterProvider shutdown"]
  logsClose["Logs flush / shutdown"]
  traceClose["Trace flush / shutdown"]
  sdk["OpenTelemetry SDK / Exporter"]

  root --> trace --> logs --> meter --> exporter --> reader --> use
  use --> stop --> export --> flush --> close --> meterClose --> logsClose --> traceClose
  reader --> sdk
  export --> sdk
  flush --> sdk
  close --> sdk

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class root,use public
  class trace,logs,meter,exporter,reader,stop,export,flush,close,meterClose,logsClose,traceClose private
  class sdk external
```

凡例: 青＝公開入口/利用操作、紫＝Adapter内の資源管理、濃青＝外部SDK。この図だけは矢印が呼び出し・実行順を示す。

取得順はTrace→Logs→Metrics、解放順はMetrics→Logs→Trace。Logs取得失敗ならTraceをcleanupし、Metrics取得失敗ならLogs→Traceをcleanupする。Metrics内のExporter/Reader取得失敗も、取得済みのExporter/Providerを保護する。flush/export/shutdown失敗は結果または例外として収集して後続終了を続行し、機能の成功値を変更しない。元例外と非同期中断の優先関係は実装計画の定義に従う。

MeterProviderの`metricExporter`は`Nothing`とし、ExporterをProvider/Readerで二重所有しない。Readerの`stopPeriodicMetricReader`は使わず公開Async handleを停止し、外側が最終export・flush・shutdownを別々に呼ぶ。SDKのdelta集約では収集が値をリセットし得るため、最終export前に素の`forceFlushMeterProvider`を呼ばない。通常はcumulative集約を使う。

## exception処理の依存

```mermaid
flowchart LR
  caller["Construction / test setup"]
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

  classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
  classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
  classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px

  class caller,emitter,mkTrace,logs public
  class mkHandler,handler,event private
  class span external
```

凡例: 青＝公開された構築点/境界/Adapter、紫＝Adapter内部の例外処理、濃青＝SDK Span。`EventRecordEmitter`は`mkOpenTelemetryTraceBoundary`で受け取り、`mkSpanExceptionHandler`へ一度渡してcaptureする。`runOpenTelemetrySpan`、exception捕捉、claim、EventRecord生成の各段へEmitterをparameter threadingしない。lifecycleの終了例外はこの機能例外の記録経路へ再帰させない。
