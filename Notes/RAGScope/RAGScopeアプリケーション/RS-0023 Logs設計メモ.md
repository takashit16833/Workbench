---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-06
---

# RS-0023 Logs設計メモ

> [!note]
> これはRS-0023を考えるための**Workbench上の検討メモ**であり、RAGScopeの正本ではない。
> Observability全体の共通方針は[[RS-0023 Observability設計メモ]]、Trace側の設計は[[RS-0023 Trace設計メモ]]を参照する。

## ✅ Logsの共通設計

Logsの表現はOpenTelemetry Logs / Semantic Conventionsを土台とし、RAGScopeは既存仕様で表現できないRAGScope固有の意味だけを追加で所有する。
RAGScope独自のログモデルを作ってOpenTelemetryへ変換する構造にはせず、OpenTelemetryの表現へRAGScope固有Eventを載せる。

### Span・Span属性・Eventを分ける

期間を持つ処理はSpan、operation全体を説明する値はSpan属性、その時点で起きたこと自体を後から確認する意味がある出来事はEventとして表現する。
RAGScopeの構造化Eventは、`EventName`を持つOpenTelemetry `LogRecord`として記録する。

operationの開始・終了、duration、最終成功・失敗だけを表すLogを機械的に追加しない。これらはSpanとSpan Statusで表現する。
typed failureが発生したことだけでもEventを生成しない。failureとは別に、時点として後から確認する意味がある出来事が存在する場合にEventを定義する。

### Eventのownerが意味と記録条件を定義する

RAGScope固有Eventを定義する場合は、その出来事を所有するfeature / UseCase / operationが次を定義する。

- Eventが表す出来事
- 記録条件
- `EventName`
- 発生時刻が指す時点
- 既定severity
- Event固有attributes

全Eventを先に共通型へ列挙したり、共通`LogSpec`のような型へ押し込んだりしない。
複数featureで実際に同じEvent定義を共有する必要が生じた場合にだけ共通化を検討する。

### Semantic ConventionsをEventでも優先する

対象の出来事に適用可能なOpenTelemetry Semantic Conventionが存在する場合は、そのEventName、attributes、severity等の定義を優先する。
同じ意味のRAGScope独自Eventや独自attributeを重複して定義しない。

RAGScope固有Eventが必要な場合は、OpenTelemetryのnamespaceと衝突しない`ragscope.*`をEventNameのnamespaceとして使用する。
ID、attempt番号、対象名など実行ごとに変化する値をEventNameへ埋め込まず、attributesとして持たせる。

Semantic Conventionごとにstabilityが異なるため、Developmentの規約を含む現在仕様の細部をRAGScope独自の恒久契約として固定しない。実装時に採用するOpenTelemetry / instrumentation versionと対象Conventionのstabilityを確認する。

### Trace Contextを独自属性として複製しない

Eventを現在のTrace / Spanへ関連付けるために、RAGScope独自の`trace_id` / `span_id`属性を追加しない。
OpenTelemetry `LogRecord`自身が持つTrace Contextとの関連付けを使用する。

旧RS-0022のように、Logging専用ContextへTrace Contextを手動注入する仕組みも作らない。

### 共通`payload`を設けない

旧ログ契約の`payload`のようなRAGScope共通コンテナは設けない。
Eventを検索・分類・集計するために機械可読であるべき値は、そのEventのattributesとして定義する。

`Body`をRAGScope固有の構造化契約の入れ物にはせず、必要な場合の補助的な表示情報として扱う。
RAGScope固有Eventの機械可読な意味は、EventNameとattributesで表現する。

### severityはOpenTelemetryの体系を使う

RAGScope独自の`debug` / `info` / `warn` / `error` / `fatal`という別のLog Level契約は新設計では維持しない。
Eventの重要度はOpenTelemetry `SeverityNumber`の意味体系に従い、各Eventのownerが既定severityを決める。

これはUseCaseやfeatureへ`hs-opentelemetry`固有型を直接渡すことを意味しない。SDK型を境界の外へ漏らすかどうかと、Telemetry上のseverity体系をOpenTelemetryへ合わせることは別問題として扱う。

severityからSpan Status、Applicationの最終結果、保存状態を導出しない。Span StatusとLog severityは独立した意味を持つ。

### signalごとのSemantic Conventionを使う

同じ論理的な失敗を複数signalへ反映する場合も、各signalへ適用されるSemantic Conventionの属性を使用する。
たとえばunexpected Exceptionでは、Span側は`error.type`、Exception Log側は`exception.type`を使用する。

同じ失敗を表す値の意味は矛盾させないが、同じ属性名をSpanとLogの両方へ置くことは共通契約として要求しない。

## ✅ failure / ExceptionのLogs側の扱い

### typed failureからLogを自動生成しない

operationのSpanがErrorになったことだけを理由にLogRecordを自動生成しない。
途中のfailureがretryやfallbackで回復した場合も、failureが発生したことだけではEventを生成しない。

Spanだけでは失われる、後から独立して確認する意味がある時点の出来事が存在する場合だけ、そのownerがEventを定義する。

### unexpected同期ExceptionはException Logとして1回記録する

RAGScopeが所有するoperation境界からunexpectedな同期Exceptionがescapeする場合は、Logs側ではOpenTelemetryのException Logs Semantic Conventionを使用し、Exception Logを1件記録する。

`exception.type`、`exception.message`、取得できる場合は`exception.stacktrace`を記録する。
`exception.stacktrace`は取得できる情報の品質を超えて作らない。

同じExceptionをUseCase / handler / rootなど伝播経路の各層で重複記録しない。
下位のHTTP / DB / GenAI instrumentationなどが同じExceptionをすでに所有・記録している場合は、RAGScope上位層が同じException Logを追加しない。

Span側のStatus / `error.type`とrethrowの規則は[[RS-0023 Trace設計メモ]]を参照する。

### `hs-opentelemetry`の既定Exception EventをRAGScope契約にしない

`hs-opentelemetry`の`inSpan`は、既定ではescapeしたExceptionをSpanのException Eventとして記録する。
一方、現在のOpenTelemetry Semantic ConventionsではExceptionをLogsとして記録する方向へ移行しているため、RAGScopeが所有するmanual SpanではSDKの既定挙動をそのままRAGScope契約にしない。

必要な場合はOpenTelemetry Adapterで既定のException記録を抑え、RAGScopeが採用するException Log + Span Status / `error.type`へ写像する。
具体的に`ExceptionHandler`を使うか、Span lifecycleを別の方法で扱うかはAdapter実装時に決める。

**見直し条件**: 採用する`hs-opentelemetry`の将来versionが現在のException Logs Semantic Conventionを直接扱い、RAGScope固有Adapterでの補正が不要になった場合はAdapter内部の実装を簡略化する。

## 現時点で採用しない・保留するもの

- **typed failureを自動的にLogへ変換する共通処理** は採用しない。Span StatusとEvent Logは別責務として扱う。
- **Exception Span EventをRAGScopeの新しい主表現にすること** は採用しない。現在のOpenTelemetry Exception Logs Semantic Conventionを優先する。
- **全RAGScope Eventを列挙する共通`LogSpec`相当の型** は現時点では採用しない。実際に複数featureで共有する必要が判明した場合にだけ共通化を検討する。
- **旧ログ契約の共通`payload`** は採用しない。Event固有の機械可読情報はattributesとして表現する。

> [!important]
> 「採用しない」「保留」とした内容は、現在要求から導入根拠を確認できないためであり、将来も不要な恒久ルールを意味しない。必要な要求が正本で追加された場合は再評価する。

## 正本へ反映するときに確認する点

現在のADR-0005は、同じ失敗をSpanと構造化ログの両方へ記録する場合に同じ`error_type`値を使うとしている。
OpenTelemetryのException Logは`exception.type`を標準属性として使用するため、unexpected Exceptionについては「Spanの`error.type`とException Logの`exception.type`が同じ失敗クラスを表す」という意味を維持しつつ、同じ属性名をLogへ重複して持たせない形へ整理する必要がある。

これはWorkbench上の判断だけで現在のADRを変更したことにはしない。

## feature側で具体化すること

Logs共通設計として次までは固定しない。

- feature固有Eventが本当に必要か
- 必要な場合のEventName
- Event固有attributes
- 既定severity
- 記録条件
- 実験実行が具体化された時点でのExperimentとTelemetryの関連付け

Eventを追加するときは、まずSpanまたは適用可能なSemantic Conventionですでに同じ意味を表現できないか確認する。

## 参考にした外部仕様・実装

- [OpenTelemetry — Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry — Events](https://opentelemetry.io/docs/specs/semconv/general/events/)
- [OpenTelemetry — Naming](https://opentelemetry.io/docs/specs/semconv/general/naming/)
- [OpenTelemetry — Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry — Exceptions in Logs](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/)
- [hs-opentelemetry](https://github.com/iand675/hs-opentelemetry)
