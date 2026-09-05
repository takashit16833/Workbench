---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-06
---

# RS-0023 Metrics設計メモ

> [!note]
> これはRS-0023を考えるための**Workbench上の検討メモ**であり、RAGScopeの正本ではない。
> Observability全体の共通方針と、Metrics後に決めるTelemetry利用境界 / package / 外部構成は[[RS-0023 Observability設計メモ]]を参照する。

## このノートで扱うこと

OpenTelemetry Metricsを前提に、RAGScopeで何をMetricとして計測するかを検討する。

Traceのdurationや既存のSemantic Conventionsで得られる情報をそのまま重複して独自Metricにせず、RAGScopeの要求を満たすためにMetrics signalとして必要な計測だけを定義する。

このノートではMetricの意味と表現を決めるところまでを扱い、その後のTelemetry利用境界、package / module構成、Collector / backend構成は全体像ノートで扱う。

## 正本から確認済みの要求

現時点で、正本の要求定義から少なくとも次の計測要求を確認している。

- 検索、reranking、回答生成などの処理時間を段階別に計測できること
- 回答生成についてTTFTを計測できること
- 回答生成について生成token数を計測できること
- 回答生成時間を計測できること

これらは**計測要求として確認済み**であり、OpenTelemetry Metricとして個別instrumentを作ることまで決定したものではない。
Span durationやGenAI Semantic Conventionsなど、他signal / 既存Conventionで満たせるものを確認してからMetric化の要否を決める。

## ✅ 決めたこと

現時点ではMetrics固有のinstrument、Metric名、unit、attributesはまだ決めていない。

signal横断の共通方針として、適用可能なOpenTelemetry Semantic ConventionsをRAGScope独自Metricより優先し、OpenTelemetry SDK固有型をUseCaseへ直接漏らさないことは[[RS-0023 Observability設計メモ]]で決定済みである。

## 🤔 次に決めること

次の順で検討する。

1. 正本要求にある各計測値について、Trace / Spanまたは既存のOpenTelemetry Semantic Conventionsですでに取得できるか確認する
2. Metrics signalとして追加で保持する必要がある値を特定する
3. 適用可能なSemantic Conventionがある場合は、そのMetric名・instrument・unit・attributesを採用する
4. RAGScope固有Metricが必要な場合だけ、意味、instrument、unit、attributes、記録条件を定義する
5. attributesのcardinalityを確認し、実験IDや文書IDなど高cardinalityな値を安易にMetric属性へ持ち込まない
6. 自動計装 / 手動計装のどちらで取得するかは、Metricの意味を決めた後に実装論点として判断する

特に次を確認する。

- 検索・reranking・回答生成の処理時間をSpan durationで満たせるか、それとは別にHistogram等が必要か
- GenAI Semantic ConventionsにTTFT、token usage、operation durationに対応するMetricが存在するか
- RAGScope Application側とAI推論サービス側のどちらが各計測値を所有するか
- 同じ値をSpanとMetricで持つ場合、その重複に集計上の意味があるか
- success / failure別の集計が必要な場合、既存の`error.type`等のSemConvとどう整合するか

## 参考

- [[RS-0023 Observability設計メモ]]
- [[RS-0023 Trace設計メモ]]
- [[RS-0023 Logs設計メモ]]
