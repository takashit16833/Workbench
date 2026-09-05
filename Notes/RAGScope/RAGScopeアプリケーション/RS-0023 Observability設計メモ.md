---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-05
---

# RS-0023 Observability設計メモ

> [!note]
> これはRS-0023を考えるための**Workbench上の検討メモ**であり、RAGScopeの正本ではない。
> 現在の正本にあるUseCase境界とRAGScope Application / AI推論サービス / DBの責務を前提に、RS-0023で新しく決めるObservability設計だけを扱う。

## ✅ 今回決めたこと

### Composition Rootで依存を組み立てる

Composition Rootが、UseCaseや利用インターフェースに必要な依存をまとめて組み立てる。
OpenTelemetry SDKの初期化やExporterなどの実行時構成も、UseCaseの中ではなくこの外側で扱う。

```mermaid
flowchart LR
    CR["Composition Root"] --> H["CLI / API handler"]
    CR --> UC["UseCase"]
    CR --> TEL["Telemetry実装"]

    H --> UC
```

Composition Rootは1回の利用者処理を構成する実行ステップではなく、実行に必要な部品を構築・接続する責務である。
APIサーバーのような長時間動作するプロセスでは、Composition Rootで一度構築したhandlerやUseCaseを複数のInvocationから利用できる。

実装上のmodule/function名として`Bootstrap`を使うかは、package / module設計時に決める。

### handlerはインターフェース固有の仕事をする

CLI / APIのhandlerは、入力をUseCaseへ渡せる形へ変換し、UseCaseを呼び、戻ってきた結果を表示やHTTPレスポンスへ変換する。
UseCase内部の依存構造までは知らず、Composition Rootから依存を閉じたUseCase実行能力を受け取る。

handlerはUseCaseの外側にあり、UseCase呼び出し前の入力受付・変換と、UseCase終了後の出力変換を担当する。
CLI parserやHTTP routingのどこまでをhandlerに含めるかという実装上の詳細境界は、必要になった時点で決める。

### Invocationを1 Traceの単位とする

RAGScopeがCLI / APIなどの利用インターフェースを通じて外部から1回呼び出され、その呼び出しに対する処理が完了するまでを**Invocation**と呼ぶ。

Invocationはmoduleやlayerではなく、1回の実行範囲を表す概念である。
1 Invocationに伴って発生する一連の処理を、1つのOpenTelemetry Traceとして追跡する。

```mermaid
flowchart TB
    USER["利用者"] --> H1["CLI / API handler\n入力受付・変換"]
    H1 --> UC["UseCase"]
    UC --> H2["CLI / API handler\n表示・HTTP response変換"]

    subgraph INV["1 Invocation = 1 Trace"]
        H1
        UC
        H2
    end
```

UseCaseが呼び出される前にhandlerで処理が終了した場合でもInvocationは発生しているためTraceには残る。
一方、UseCaseは呼び出されていないためUseCase実行は発生しない。

RAGScope ApplicationからAI推論サービスなど別プロセスへ処理が続く場合は、Trace Contextを伝播し、同じInvocationに対応するTraceを継続する。

### Composition Root・handler・Invocation・UseCaseは同じ階層ではない

4つを`Composition Root -> handler -> Invocation -> UseCase`という処理順として扱わない。

| 概念 | 境界 |
|---|---|
| Composition Root | 実行に必要な依存を構築・接続する |
| handler | CLI / API固有表現とUseCaseの入力・結果の間を仲介する |
| Invocation | RAGScopeが外部から1回呼び出され、その処理が完了するまでの実行範囲 |
| UseCase | RAGScope ApplicationがUseCaseを呼び出してから、Applicationへ制御が戻るまで |

構築時と実行時は次のように分けて考える。

```mermaid
flowchart TB
    subgraph BUILD["構築時"]
        MAIN["Main"] --> CR["Composition Root"]
        CR --> HDEF["CLI / API handler"]
        CR --> UCDEF["UseCase"]
        CR --> TEL["Telemetry実装"]
    end

    subgraph RUN["1 Invocation"]
        INPUT["CLI / API入力"] --> H1["handler"]
        H1 --> UC["UseCase実行"]
        UC --> H2["handler"]
        H2 --> OUTPUT["CLI出力 / HTTP response"]
    end
```

UseCaseから呼び出されるEmbedding生成、DB検索などは、そのUseCaseを構成する内部処理である。
AI推論サービス側の処理は同じTraceへ参加できるが、RAGScope Application側のUseCaseそのものではない。

すべてのRAGScope内部処理がhandlerやUseCaseを通るわけではない。
たとえばプロセス起動時のComposition Rootによる構築や、OpenTelemetry SDK / ExporterによるTelemetry送信はInvocationやUseCaseとは別の処理である。

### Telemetryは処理を制御しない

処理を続けるか、retryするか、timeoutで打ち切るかはRAGScope Applicationが決める。
Telemetryは、その処理を観測する。

```mermaid
flowchart TB
    APP["RAGScope Application"] --> FLOW["処理を実行・制御"]

    FLOW -. "観測" .-> TRACE["Traces"]
    FLOW -. "観測" .-> LOGS["Logs"]
    FLOW -. "観測" .-> METRICS["Metrics"]
```

Telemetryの都合でUseCaseの意味や処理順序を変えない。

### UseCaseへOpenTelemetry SDKを直接漏らさない

UseCaseがOpenTelemetry SDKそのものを直接扱う構造にはしない。
UseCaseから見えるのは、RAGScope側のTelemetry利用境界までとする。

```mermaid
flowchart LR
    UC["UseCase"] --> TAPI["RAGScope側の\nTelemetry利用境界"]

    OTEL["OpenTelemetry Adapter / SDK"] --> TAPI
    CR["Composition Root"] --> OTEL
```

Trace / Logs / Metricsの利用境界を1つにまとめるか分けるか、名前をどうするかは後で決める。

### OpenTelemetryが持っているTelemetry基盤は作り直さない

RAGScope固有の意味はRAGScope側で持つ。一方、Telemetryの共通機構はOpenTelemetryへ任せる。

| 旧RS-0022で自前にしていたもの | 今回 |
|---|---|
| RAGScope独自LogRecord | 作らない |
| Logging Runtime | 作らない |
| 独自Sink | 作らない |
| Trace ContextをLoggingへ手動注入する仕組み | 作らない |
| OTelと並行する独自ログ転送基盤 | 作らない |

event名、属性、failureの意味など、RAGScope固有のTelemetry表現はRAGScope側で決める。

### OpenTelemetry Semantic Conventionsを優先する

Telemetry表現をRAGScope独自に定義する前に、対象へ適用可能なOpenTelemetry Semantic Conventionsが存在するか確認する。

適用可能なSemantic Conventionが存在する場合は、Span名、Span Kind、属性、event、Metric名・instrument・unitなど、そのConventionで定義されている表現を優先して使用する。
HTTP、Database、CLI、Exceptionなどについて、既存Conventionと同じ意味を持つRAGScope独自表現を重複して作らない。

RAGScope独自のTelemetry表現は、UseCase、Invocation、実験、評価データなど、既存のSemantic Conventionsだけでは表現できないRAGScope固有の意味に限定する。
独自属性が必要な場合も、まず既存属性を再利用できないか確認し、OpenTelemetryが使用するnamespaceと衝突する属性は作らない。

Semantic Conventionごとにstabilityが異なるため、実装時には使用するOpenTelemetry / instrumentationのバージョンと対象Conventionのstabilityを確認する。

## 今の一枚絵

ここまで決めた時点では、ざっくりこの形で考える。

```mermaid
flowchart TB
    CR["Composition Root"] --> H["CLI / API handler"]
    CR --> UC["UseCase"]
    CR --> TEL["RAGScope Telemetry利用境界"]

    USER["利用者"] --> H

    subgraph INV["1 Invocation = 1 Trace"]
        H --> UC
        UC --> DB[("PostgreSQL")]
        UC --> AIREQ["AI推論サービスへの依頼"]
        AIREQ --> AI["AI推論サービス"]
    end

    AIREQ -. "Trace Contextを伝播" .-> AI

    UC -. "観測" .-> TEL
    OTEL["OpenTelemetry Adapter / SDK"] --> TEL
    OTEL --> TR["Traces"]
    OTEL --> LG["Logs"]
    OTEL --> MT["Metrics"]

    OTEL --> COL["Collector候補"]
    COL --> TEMPO["Tempo候補"]
    COL --> LOKI["Loki候補"]
```

Collector / Tempo / Lokiはまだ候補である。

## 🤔 次に決めること

Trace境界は、**1 Invocation = 1 Trace**として決めた。
次は、そのTraceの中で何を独立したSpanとして追跡するかを決める。

```mermaid
flowchart TD
    subgraph FIRST["次"]
        B["Span境界"]
    end

    subgraph NEXT["その次"]
        C["Logs"]
        D["Metrics"]
        E["failure / Exception"]
    end

    subgraph LAST["最後に形へ落とす"]
        F["Telemetry利用境界"] --> G["package / module"] --> H["Collector / Tempo / Loki"]
    end

    B --> C
    B --> D
    C --> E
    D --> E
    E --> F
```

### 次: Span境界

1 InvocationのTraceの中で、handler、UseCase、AI推論サービス、DB、内部処理のどこを独立したSpanとして見るかを決める。
既存のOpenTelemetry instrumentation / Semantic Conventionsで表現されるSpanと、RAGScope固有の意味を表すSpanを重複させないことも同時に確認する。

ここがLogsを考えるときの基準にもなる。

### その次: Logs / Metrics / failure

Trace / Spanで表せるものが見えたら、残る情報を整理する。

- Logs: 「その時点で何が起きたか」として残したいもの
- Metrics: 処理時間、TTFT、token数などの計測
- failure / Exception: Applicationの失敗をSpan StatusやLogsへどう反映するか

LogsとMetricsはある程度独立しているので、必要なら順番を入れ替えてよい。

### 最後: 実装境界と外部構成

実際に何を観測するかが決まってから、RAGScope側のTelemetry利用境界を決める。
そのAPIと依存方向を見てpackage / moduleを分け、最後にCollector / Tempo / Lokiを含む外部構成へ落とす。

packageを先に切って、あとから責務を当てはめる順番にはしない。

---

今後は、ここで「今回決めたこと」に入ったものを毎回再検討しない。
新しい制約や具体的な問題が見つかった場合だけ戻る。
