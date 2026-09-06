---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-06
---

# RS-0023 Logs設計メモ

> [!note]
> これはRS-0023を正本へ反映する前にレビューするための**Workbench上の設計ドラフト**であり、RAGScopeの正本ではない。
> Observability全体は[[RS-0023 Observability設計メモ]]、Trace側の用語と失敗時のSpan表現は[[RS-0023 Trace設計メモ]]を参照する。

## このノートでレビューすること

このノートは**上から順に読むレビュー用ドラフト**である。
RAGScopeがいつLog Eventを出し、どのような`LogRecord`として表現し、failure / Exception時にどう扱うかをレビューする。

## このノートで使う用語

Trace、Span、operation、Span Status、Trace Context、typed failure、unexpected同期Exceptionは[[RS-0023 Trace設計メモ]]の定義に従う。

| 用語 | 意味 |
|---|---|
| `LogRecord` | OpenTelemetry Logsで1件のログを表すデータ |
| Event | ある時点で発生した出来事または状態変化を表すLog Event |
| `EventName` | Eventの種類を識別する名前。実行ごとに変わる値は含めない |
| attributes | Eventに付随する機械可読な値 |
| `Body` | `LogRecord`のbody。具体的な利用方法は個別Eventまたは適用SemConvで決める |
| `SeverityNumber` | OpenTelemetryが定義するseverityの数値体系 |
| Exception Log | Exception Logs Semantic Conventionに従ってExceptionを記録する`LogRecord` |

## まず結論

- Logsの基盤にはOpenTelemetry Logs / Semantic Conventionsを使う。
- RAGScope固有Eventは、適用SemConvとSpanの開始・終了・attributes・Statusだけでは、後から必要な出来事または状態変化を識別できない場合に定義する。
- typed failureが発生したことだけではLogを自動生成しない。unexpected同期Exceptionがoperation境界からescapeする場合はException Logを1件記録し、同じExceptionを重複記録しない。
- RAGScope独自の`LogRecord`、Logging Runtime、Sink、Logging専用Context、OTelと並行するログ転送基盤は設けない。
- Trace / Spanとの関連付けにはOpenTelemetry `LogRecord`自身のTrace Contextを使い、RAGScope独自の`trace_id` / `span_id`属性を追加しない。
- severityはOpenTelemetry `SeverityNumber`の意味体系を使い、共通`payload`は設けない。

## いつLog Eventを出すか

```mermaid
flowchart TD
    A["記録候補の出来事・状態変化"] --> B{"適用SemConvですでに表現できる?"}
    B -->|Yes| C["既存表現を使う"]
    B -->|No| D{"Spanの開始・終了・attributes・Statusから識別できる?"}
    D -->|Yes| E["Eventを追加しない"]
    D -->|No| F["RAGScope Eventを定義"]
```

retryやtimeoutという**種類だけ**を理由に共通Eventを作らない。
attempt、duration、最終失敗などをSpanや既存SemConvから確認できる場合はEventを重複させない。

一方、retryを選択した、fallbackへ切り替えた、これ以上retryしないと決定した、などの状態変化をSpanの開始・終了・attributes・Statusから後で識別できない場合はEventとして記録する候補になる。

## Log Eventをどう表現するか

| 項目 | 方針 |
|---|---|
| 期間を持つ処理 | Span |
| operation全体を説明する値 | Span attributes |
| ある時点の出来事・状態変化 | Event |
| Event表現 | `EventName`を持つOTel `LogRecord` |
| Event定義 | その出来事が属するUseCaseまたは対象処理を定義する設計で決める |
| EventName namespace | RAGScope固有Eventは`ragscope.*` |
| dynamic値 | EventNameへ埋め込まずattributesへ置く |
| Trace / Span correlation | OTel `LogRecord`自身のTrace Contextを使う |
| TraceId / SpanId | RAGScope独自属性として追加しない |
| severity | OTel `SeverityNumber`の意味体系を使う |
| Span Statusとの関係 | severityからSpan Statusを導出しない |
| 共通`payload` | 設けない |
| `Body` | 具体Event / 適用SemConvを決める時点で判断 |
| Semantic Conventions | Eventでも適用可能なConventionを優先 |

RAGScope固有Eventを定義する設計では、次を決める。

- Eventが表す出来事または状態変化
- 記録条件
- `EventName`
- 発生時刻が指す時点
- 既定severity
- Event固有attributes

全Eventを先に共通型へ列挙しない。
複数の対象機能でEventが表す出来事、記録条件、`EventName`、attributesを同じ定義として共有する必要が生じた場合だけ共通化を検討する。

## failure / Exception時にどうLogを出すか

| ケース | Logs側の扱い |
|---|---|
| typed failure | failure発生だけではLogRecordを生成しない |
| retry / fallback後に回復 | failure発生だけではEventを生成しない |
| Spanから識別できない出来事・状態変化 | その出来事が属するUseCaseまたは対象処理の設計でEventを定義する |
| unexpected同期Exceptionがescape | Exception Logs SemConvでException Logを1件記録 |
| 同じExceptionが下位の計装で記録済み | RAGScope上位層では重複記録しない |

Exception Logでは`exception.type`、`exception.message`、取得できる場合は`exception.stacktrace`を記録する。
Span側のStatus / `error.type` / rethrowは[[RS-0023 Trace設計メモ]]を参照する。

## RAGScopeで独自に設けないLogging機構

| 機構 | 方針 | 理由 |
|---|---|---|
| RAGScope独自`LogRecord` | 設けない | Logの記録単位にはOpenTelemetry `LogRecord`を使う |
| Logging Runtime | 設けない | Processor / Exporter、batching、flush / shutdownなどはOpenTelemetry SDKへ委ねる |
| 独自Sink | 設けない | Log転送はOpenTelemetryのProcessor / Exporter経路へ委ねる |
| Logging専用ContextへのTrace Context手動注入 | 設けない | OpenTelemetry `LogRecord`自身のTrace Context関連付けを使う |
| OTelと並行する独自ログ転送基盤 | 設けない | 同じLogを別経路で運ぶ基盤をRAGScopeで重複して保守しない |

RAGScope側で定義するのは、RAGScope固有Eventの意味、記録条件、`EventName`、attributes、severity、failureとの関係である。

## このLogs共通設計で設けないもの

| 項目 | 方針 | 理由 |
|---|---|---|
| typed failure → Logの共通自動変換 | 設けない | Span StatusとEvent Logは別の規則で決める |
| Exception Span EventをExceptionの主表現にする規則 | 設けない | このドラフトではException Logs Semantic Conventionを主表現として使う |
| 全RAGScope Eventを列挙する共通`LogSpec` | 設けない | Eventは対象のUseCaseまたは処理を定義する設計で必要なものだけ定義する |
| 共通`payload` | 設けない | Event固有の機械可読情報はattributesで表現する |

## このLogs共通設計では決めないこと

| 項目 | 具体化する時点 |
|---|---|
| `Body`の具体内容 | 個別Event / 適用SemConvを決める時 |
| 対象機能固有EventName / attributes / severity | 対象機能の設計時 |
| ExperimentとTelemetryの関連付け | 実験実行境界が具体化した時 |
| AdapterのException処理実装 | Adapter実装時 |

## Spanの`error.type`とException Logの`exception.type`

SpanとException Logでは、適用するOpenTelemetry Semantic Conventionに従って別の属性名を使う。

| signal | 属性 |
|---|---|
| Span | `error.type` |
| Exception Log | `exception.type` |

同じ失敗クラスを表す場合は値の意味を一致させるが、同じ属性名を両signalへ重複して置くことは要求しない。

> [!warning]
> 現在の正本ADR-0005には、同じ失敗をSpanと構造化ログの両方へ記録する場合に同じ`error_type`値を使うという定義がある。
> このドラフトの`error.type` / `exception.type`の整理はまだ正本へ反映されていないため、正本更新時に両者を整合させる必要がある。

## 判断理由・実装上の注意

> [!info]- Semantic Conventions / EventName
> 対象の出来事に適用可能なOpenTelemetry Semantic Conventionが存在する場合は、そのEventName、attributes、severity等の定義を優先する。
> 同じ意味のRAGScope独自Eventや独自attributeを重複して定義しない。
>
> RAGScope固有Eventが必要な場合は、OpenTelemetryのnamespaceと衝突しない`ragscope.*`をEventNameのnamespaceとして使用する。
> ID、attempt番号、対象名など実行ごとに変化する値をEventNameへ埋め込まず、attributesとして持たせる。
>
> Semantic Conventionごとにstabilityが異なるため、Developmentの規約を含む現在仕様の細部をRAGScope独自の恒久契約として固定しない。
> 実装時に採用するOpenTelemetry / instrumentation versionと対象Conventionのstabilityを確認する。

> [!info]- Trace Contextを独自属性として複製しない
> Eventを現在のTrace / Spanへ関連付けるために、RAGScope独自の`trace_id` / `span_id`属性を追加しない。
> OpenTelemetry `LogRecord`自身が持つTrace Contextとの関連付けを使用する。

> [!info]- severity
> RAGScope独自のLog Level契約は設けず、Eventの重要度はOpenTelemetry `SeverityNumber`の意味体系に従う。
> 各Eventの既定severityは、そのEventを定義する設計で決める。
>
> これはUseCaseや対象機能へ`hs-opentelemetry`固有型を直接渡すことを意味しない。
> SDK型を境界の外へ漏らすかどうかと、Telemetry上のseverity体系をOpenTelemetryへ合わせることは別問題である。
>
> severityからSpan Status、Applicationの最終結果、保存状態を導出しない。

> [!info]- unexpected同期Exceptionと`hs-opentelemetry`
> RAGScopeが追跡するoperation境界からunexpectedな同期Exceptionがescapeする場合は、Logs側ではOpenTelemetryのException Logs Semantic Conventionを使用し、Exception Logを1件記録する。
>
> 同じExceptionをUseCase / handler / entry Spanなど伝播経路の各層で重複記録しない。
> 下位のHTTP / DB / GenAI計装などが同じExceptionをすでに記録している場合は、RAGScope上位層が同じException Logを追加しない。
>
> `hs-opentelemetry`の`inSpan`は、既定ではescapeしたExceptionをSpanのException Eventとして記録する。
> このドラフトではException Logを主表現とするため、RAGScopeが作成するmanual SpanでSDK既定のException EventとException Logが重複する場合は、OpenTelemetry Adapterで既定のException記録を抑える。
>
> 具体的に`ExceptionHandler`を使うか、Span lifecycleを別の方法で扱うかはAdapter実装時に決める。
> Adapterでの補正は、採用するSDKの既定挙動とこのLogs設計が一致しない場合だけ行う。

## 参考

- [OpenTelemetry — Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [OpenTelemetry — Events](https://opentelemetry.io/docs/specs/semconv/general/events/)
- [OpenTelemetry — Naming](https://opentelemetry.io/docs/specs/semconv/general/naming/)
- [OpenTelemetry — Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry — Exceptions in Logs](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/)
- [hs-opentelemetry](https://github.com/iand675/hs-opentelemetry)
