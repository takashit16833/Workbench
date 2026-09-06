---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-06
---

# RS-0023 Observability用語メモ

## OpenTelemetryから使う用語

### Observability / Trace共通

| 用語 | この設計メモでの意味 |
|---|---|
| Telemetry | 実行時に観測・記録するTrace / Logs / Metricsなどのデータ |
| signal | OpenTelemetryで扱うTraces / Metrics / Logsの各signal。この設計メモではこれらをまとめてsignalと呼ぶ |
| Trace | 複数のSpanを親子関係などで結び、1つながりの処理として追跡するもの |
| Span | Trace内の1つのoperationを表す。開始・終了、所要時間、attributes、Status、親子関係などを持つ |
| operation | Spanが表す1つの処理 |
| root Span | Trace内でparentを持たないSpan。この設計ではRAGScopeの1回の実行を観測する`entry Span`がrootになる |
| parent / child Span | Span同士の親子関係。あるoperationの内部で別のoperationを追跡する場合、後者をchild Spanとして表現できる |
| Span Kind | Spanが表すoperationの役割を示すOpenTelemetryの区分。SERVER / CLIENTなどがある |
| Trace Context | Traceをコンポーネント間で継続するために引き継ぐTrace / SpanのContext |
| Span Link | 親子関係とは別に、あるSpanから別のSpan Contextとの関連を記録する仕組み |
| Span Status | Spanが表すoperationの最終状態。この設計では主に`Unset` / `Error`を扱う |
| attributes | Span、LogRecord、Metricなどへ付与する機械可読なkey-valueの情報 |
| `error.type` | operationまたはEventがどの種類のerrorで失敗・終了したかを表すOpenTelemetry Semantic Conventionsの属性 |
| Semantic Conventions（SemConv） | Span名、Span Kind、attributes、Event、Metric名、instrument、unitなど、対象領域ごとのTelemetry表現を定めるOpenTelemetryの規約 |
| instrumentation | ApplicationやライブラリのoperationをOpenTelemetryで観測できるようにする計装 |
| automatic instrumentation / manual instrumentation | 計装をライブラリ / フレームワーク等により自動で行うか、Application側で明示的に行うかの区分 |
| Propagator | Trace Contextなどをプロセス・通信境界を越えて注入・抽出するOpenTelemetryの仕組み |

### この設計で利用する主なSpan

| 用語 | この設計メモでの意味 |
|---|---|
| HTTP SERVER Span | HTTP serverが1 HTTP requestを処理するoperationを表すSpan。RAGScope APIでは`entry Span`の役割を担う |
| HTTP client Span | HTTP clientが1 HTTP requestを送信するoperationを表すSpan |
| Execution (callee) Span | CLI programの1実行を表すCLI Semantic ConventionsのSpan。RAGScope CLIでは`entry Span`の役割を担う |
| Database client Span / DB client Span | Database client operationを表すSpan。RAGScopeではPostgreSQL operationへ適用する |
| GenAI operation | OpenTelemetry GenAI Semantic Conventionsが定義する、ApplicationからmodelまたはGenAI serviceへ行う論理的な依頼 |
| GenAI client Span | GenAI client operationを表すSpan。この設計ではEmbedding / generationなどへ適用可能な場合に使う |

### Logs

| 用語 | この設計メモでの意味 |
|---|---|
| `LogRecord` | OpenTelemetry Logsで1件のログを表すデータ |
| Event / `EventRecord` | ある時点で発生した意味のある出来事または状態変化を表すもの。Semantic conventions for eventsでは、event nameを持つ`LogRecord`を`EventRecord`として扱う |
| `EventName` | Eventの種類を識別する名前。実行ごとに変わる値は含めない |
| `Body` | `LogRecord`のbody。具体的な利用方法は個別Eventまたは適用するSemantic Conventionで決める |
| `SeverityNumber` | OpenTelemetryが定義するseverityの数値体系 |
| Exception Event | Semantic conventions for exceptions in logsに従ってExceptionを記録するEvent |
| `exception.type` | Exception Eventへ記録するExceptionの型 |
| `exception.message` | Exception Eventへ記録するExceptionのメッセージ。機密情報を含み得るため、記録可否はSemConvとは別にRAGScope側のデータ取扱規則に従う |
| `exception.stacktrace` | Exception Eventへ記録するスタックトレース |
| Span Event | Spanの中で、ある時点に起きた出来事を記録するTrace側のEvent。LogsのEventとは別の表現である |
| requirement level | Semantic Conventionが属性を`Required`、`Conditionally Required`、`Recommended`などで示す区分 |

### Metrics

| 用語 | この設計メモでの意味 |
|---|---|
| Metric | OpenTelemetry Metricsで複数の観測値を集約して扱うための計測データ |
| instrument | Metricを記録するOpenTelemetry Metricsの計測器。RS-0023で参照する標準MetricではHistogramなどが使われる |
| unit | Metric値の単位。秒を表す`s`やtoken数を表す`{token}`など、Semantic Conventionが定める値に従う |
| high-cardinality属性 | 実行や対象ごとに値の種類が増えやすく、Metricの集約系列を増加させるattribute |

### SDK / export

| 用語 | この設計メモでの意味 |
|---|---|
| OpenTelemetry SDK | Trace / Logs / Metricsの生成、処理、exportなどを実装するOpenTelemetryのSDK |
| Processor | 生成されたSpan / LogRecordなどをExporterへ渡す前に処理するSDKの仕組み |
| Exporter | Telemetryを外部エンドポイントやコンソール等へ送るSDKの仕組み |
| Collector | 複数コンポーネントなどからTelemetryを受信し、処理・転送できるOpenTelemetryの外部コンポーネント |
| OTLP | OpenTelemetry Protocol。TelemetryをOpenTelemetry対応コンポーネント間で送るためのプロトコル |

## RAGScope / RS-0023側の用語

| 用語 | 意味 |
|---|---|
| `entry Span` | RAGScopeがCLI / APIなどを通じて外部から1回呼び出され、その処理が完了するまでの実行全体をTrace上で観測するroot Spanの**役割名**。OpenTelemetryのSpan種別ではない。APIではHTTP SERVER Span、CLIではExecution (callee) Spanがこの役割を担い、実行全体を表す専用Spanは別に作らない |
| UseCase Span | 1 UseCase実行全体を観測するRAGScope固有Span |
| RAGScope固有Span | 適用可能なSemantic Conventionだけでは表せないRAGScope固有operationを追跡するSpan |
| RAGScope固有Event | 適用できるSemantic Conventionや既存Spanだけでは後から識別できない、RAGScope固有の出来事または状態変化を表すEvent |
| Telemetry利用境界 | UseCaseや内部処理がOpenTelemetry SDKを直接importせずにTelemetryを記録するため、RAGScope側に置く利用境界。具体的な名前と公開APIはRS-0023の共通設計では未決定 |
| OpenTelemetry Adapter | Telemetry利用境界の外側でOpenTelemetry SDKへ接続するAdapter。具体的なmodule / package配置や公開APIはRS-0023の共通設計では未決定 |
| handler | CLI / API入力をUseCaseへ渡す値へ変換し、UseCaseを呼び出し、その結果をCLI表示またはHTTP応答へ変換するApplication上の境界処理 |
| UseCase | RAGScope正本で定義されるUseCase。この用語メモではObservability固有の別定義を作らない |
| 内部処理 | Embedding生成、Database検索、文書チャンク化など、UseCaseから呼び出され、そのUseCaseを構成する処理 |
| エラー型 | RAGScope Applicationで、UseCaseまたは内部処理の契約上想定される失敗を表すHaskellの型。具体的な型名・データコンストラクタや、`Either` / `ExceptT`などをどこで使うかは各設計・実装で定める。OpenTelemetryの`error.type`や、実行時に発生したExceptionそのものを指す語ではない |
| 想定外の同期Exception | エラー型で表す契約上の失敗として扱われず、RAGScopeが追跡するoperationの境界から同期的に外へ投げられるException |
| 非同期中断 / キャンセル | 実行中の処理を外部・非同期要因から中断するケースの総称。特定のExceptionのデータコンストラクタや一律のSpan Statusを意味する語ではない |
| TTFT | Time To First Token。RS-0023では、AI推論サービスが生成を開始してから最初のtokenを生成するまでの時間を指す。clientが最初のresponse chunkを受信するまでの時間とは区別する |

## `entry Span` / UseCase Spanの関係

RAGScopeがCLI / APIなどを通じて外部から1回呼び出され、その処理が完了するまでの実行全体は、Spanそのものではない。
`entry Span`は、その実行全体をTrace上で観測する**root Spanの役割名**である。
`UseCase Span`は、その実行の途中でUseCaseが実行された場合に、そのUseCase実行だけを観測するchild Spanである。

```text
RAGScopeの1回の実行                        ← CLI / APIから処理完了までの実行範囲
└─ entry Span                              ← Trace上のroot Spanの役割
   ├─ handlerの入力変換                   ← entry Spanの計測範囲内
   ├─ UseCase Span                         ← UseCaseを呼んだ場合だけ作る
   │  ├─ DB client Span
   │  └─ GenAI client Span / HTTP client Span
   └─ handlerの出力変換                   ← entry Spanの計測範囲内
```

UseCaseを呼ぶ前にhandlerで処理が終了した場合でもRAGScopeの1回の実行は始まっているため`entry Span`は残るが、UseCaseを実行していないのでUseCase Spanは作らない。詳細なTrace境界は[[RS-0023 Trace設計メモ]]で扱う。

## `error.type` / エラー型 / `exception.type`の関係

この3つは同じものではない。

| 用語 | 属する側 | 表すもの |
|---|---|---|
| エラー型 | RAGScope Application / UseCase・内部処理 | 契約上想定される失敗を表すHaskellの型 |
| `error.type` | OpenTelemetry | operationまたはEventがどの種類のerrorで失敗・終了したか |
| `exception.type` | OpenTelemetry Semantic conventions for exceptions in logs | 実際に記録したExceptionの型 |

RAGScope固有Span / Eventで必要な`error.type`は、対応するエラー型の値から変換するが、エラー型自体を`error.type`へ置き換えない。想定外の同期ExceptionをException Eventへ記録する場合は、実際に発生したExceptionの型を`exception.type`へ記録する。具体的な変換規則は[[RS-0023 Trace設計メモ]]と[[RS-0023 Logs設計メモ]]で扱う。

## 正本へ反映するとき

この用語メモ自体を正本の用語集として扱わない。
RS-0023の判断を正本へ反映するときは、採用するRAGScope固有用語だけを正本の責務に応じた設計書・用語集へ移す。OpenTelemetry用語はOpenTelemetry Specification / Semantic Conventionsの意味を変えず、RAGScope独自の同義語として再定義しない。

## 参考

- [[RS-0023 Observability設計メモ]]
- [[RS-0023 Trace設計メモ]]
- [[RS-0023 Logs設計メモ]]
- [[RS-0023 Metrics設計メモ]]
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)