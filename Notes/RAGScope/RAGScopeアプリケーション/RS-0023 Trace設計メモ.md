---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-06
---

# RS-0023 Trace設計メモ

> [!note]
> これはRS-0023を正本へ反映する前にレビューするための**Workbench上の設計ドラフト**であり、RAGScopeの正本ではない。
> Observability全体の共通方針は[[RS-0023 Observability設計メモ]]を参照する。

## このノートでレビューすること

このノートは**上から順に読むレビュー用ドラフト**である。
RAGScopeの1回の実行をどのようなTrace / Spanとして追跡し、成功・失敗・Exceptionをどう表現するかをレビューする。

## このノートで使う用語

このノートでは、OpenTelemetryから使う用語、RAGScopeで定義済みの用語、RS-0023のTrace設計で使う用語を区別する。
同じ短い用語を複数箇所で使う場合は、ここで定義した意味で使用する。

### OpenTelemetryから使う用語

| 用語 | 意味 |
|---|---|
| Trace | 複数のSpanを親子関係などで結び、1つながりの処理として追跡するもの |
| Span | Trace内の1つのoperationを表す。開始・終了、所要時間、attributes、Status、親子関係などを持つ |
| operation | Spanが表す1つの処理 |
| parent / child Span | Span同士の親子関係。あるoperationの内部で別のoperationを追跡する場合、後者をchild Spanとして表現できる |
| Span Link | 親子関係とは別に、あるSpanから別のSpan Contextとの関連を記録する仕組み。この設計では、外部のTraceとRAGScopeが開始するTraceを関連付ける必要がある場合の候補になる |
| Span Status | Spanが表すoperationの最終状態を表すOpenTelemetryのStatus。この設計では主に`Unset` / `Error`を扱う |
| `error.type` | operationがエラーで終了した場合、そのエラーのクラスを表すOpenTelemetry Semantic Conventionsの属性 |
| Trace Context | Traceをコンポーネント間で継続するために引き継ぐTrace / SpanのContext。RAGScopeではApplicationからAI推論サービスへの通信で引き継ぎ、同じTraceを継続する |
| Semantic Conventions（SemConv） | Span名、Span Kind、attributes、`error.type`など、対象領域ごとのTelemetry表現を定めるOpenTelemetryの規約 |

### RAGScope / RS-0023側の用語

| 用語 | 出自 | 意味 |
|---|---|---|
| Invocation | RS-0023 Observability設計 | RAGScopeがCLI / APIなどを通じて外部から1回呼び出され、その処理が完了するまでの実行範囲。RS-0023 Trace設計では**1 Invocation = 1独立Trace**として追跡する |
| entry Span | RS-0023 Trace設計 | 1 Invocationを表すTraceを開始するroot Spanの役割名。Invocation専用Spanは別に作らず、APIではHTTP SERVER Span、CLIではCLI SemConvのExecution (callee) Spanがこの役割を担う |
| UseCase | RAGScope正本 | 利用者がRAGScopeへ依頼するトップレベルな操作。実行境界と成功条件は正本のユースケース設計に従う |
| UseCase Span | RS-0023 Trace設計 | **1 UseCase実行につき1つ作り**、UseCase実行全体を表すRAGScope固有Span。DBアクセス、AI通信などUseCase内部のoperationを表すchild Spanを持ちうる |
| RAGScope固有Span | RS-0023 Trace設計 | 適用可能なSemantic Conventionだけでは表せないRAGScope固有のoperationを追跡するSpan。適用可能なSemConvで同じoperationを表現できる場合は同義のRAGScope固有Spanを重ねない。UseCase SpanはRAGScope固有Spanの1つ |

### failure / Exceptionを区別するための用語

| 用語 | 意味 |
|---|---|
| typed failure | 処理の契約上想定されるfailure。unexpected同期Exceptionと区別して扱う |
| unexpected同期Exception | typed failureとして扱われず、RAGScopeが追跡するoperationの境界から同期的に外へ投げられるException |
| async interruption / cancellation | 実行中の処理を外部・非同期要因から中断するケースの総称 |

## まず結論

- **1 Invocation = 1独立Trace**とする。Invocation専用Spanは作らない。APIではHTTP SERVER Span、CLIではExecution (callee) Spanをentry Spanとして使い、そのentry Spanをroot Spanにする。
- APIへのリクエストにTrace Contextが含まれていても、そのContextをentry Spanの親として使用しない。RAGScopeはInvocationごとに自分で新しいTraceを開始する。また、外部のTraceとRAGScopeのTraceを関連付けるSpan Linkも、現在はその関連付けを必要とする要求がないため作成しない。
- RAGScope ApplicationからAI推論サービスを呼び出すときは、Application側のHTTP client SpanのTrace ContextをHTTP通信で引き継ぐ。AI推論サービス側のHTTP SERVER SpanはそのHTTP client Spanの子Spanとなり、両方のSpanは同じTraceに属する。
- 1 UseCase実行につきUseCase Spanを1つ作る。DBアクセスやAI通信など、開始・終了・所要時間・失敗をUseCase実行全体とは別に確認する必要がある内部処理は、そのUseCase Spanの子Spanとして記録する。
- handler全体を表す専用Spanは作らない。handlerの実行はentry Spanの計測範囲に含め、handlerがUseCaseを呼び出した場合はそのUseCase実行だけをUseCase Spanとして記録する。
- DB / HTTP / GenAIなど、その処理へ適用できるSemantic Conventionsがある場合は、そのConventionが定めるSpan名・Span Kind・attributes・Status・`error.type`を優先する。
- 子Spanが表す処理が失敗しても、それだけを理由に親Spanを`Error`にはしない。RAGScope固有の親Spanは親Span自身が表すoperationの最終結果からStatusを決め、SemConv対象の親SpanはそのConventionの規則に従う。
- feature / UseCase固有のtyped failureを失敗理由の元情報とする。RAGScope固有Spanが表すoperationが最終的に失敗した場合は、2026-09-06時点のGeneral Recording Errors guidanceに従い、typed failureからそのoperationに対応する`error.type`へ変換する。RAGScope全体で共有する独立した`error_type` taxonomyは設けない。
- async interruption / cancellationは一律に`Error`やtyped failureへ分類しない。実際の中断源と、どのoperationが中断されたかが確定した時点でStatusを決める。

## Trace境界をどう決めるか

現在の要求とシステム構造では、利用者がCLI / APIを通じてRAGScopeへ行う1回のInvocationをトップレベルの追跡単位とする。現在要求には、外部callerが持つTraceへRAGScope APIを参加させ、さらにAI推論サービスまで1本のdistributed Traceとして継続することは含まれていない。

このため、API / CLIのどちらから開始しても同じ単位で追跡できるように、InvocationごとにRAGScopeが独立したTraceを開始する。

```text
要求・システム構造
    ↓
RAGScopeが追跡するトップレベル単位 = 1 Invocation
    ↓
1 Invocationごとに独立したTraceを開始する
    ↓
API / CLIのentry Spanをroot Spanにする
    ↓
APIが受信した外部Trace Contextをentry Spanのparentには使わない
```

APIへのリクエストにTrace Contextが含まれていても、そのContextをentry Spanの親として使用しない。外部Traceとの因果関係だけを残すSpan Linkについても、現在はその関連付けを必要とする要求を確認できないため作成しない。

一方、RAGScope ApplicationからAI推論サービスへの呼び出しは、RAGScopeが開始したInvocationの内部処理である。Application側のHTTP client SpanのTrace ContextをHTTP通信で引き継ぎ、AI推論サービス側のHTTP SERVER Spanをその子Spanとして記録する。したがって、Application側のHTTP client SpanとAI推論サービス側のHTTP SERVER Spanは同じTraceに属する。

将来、外部callerからRAGScope APIまでを1本のdistributed Traceとして継続する要求が追加された場合は、「1 Invocation = 1独立Trace」とAPIが受信したTrace Contextの扱いを一緒に再評価する。独立Traceを維持しつつ上流Traceとの因果関係だけを残す要求が追加された場合は、その時点でSpan Linkを再評価する。

## RAGScopeの1回の実行はTrace上どう見えるか

`handler`と`entry Span`は同じ種類の概念ではない。

- `handler`は、CLI / APIから受け取った入力をUseCaseへ渡す値へ変換し、UseCaseを呼び出し、その結果をCLI表示やHTTP responseへ変換するApplication上の**1つの境界処理**である。
- `entry Span`は、その1 InvocationをTrace上で観測するためのOpenTelemetryのroot Spanである。APIではHTTP SERVER Span、CLIではExecution (callee) Spanがこの役割を担う。
- `UseCase Span`は、handlerから呼び出されたUseCaseの実行開始からApplicationへ制御が戻るまでを観測するchild Spanである。

entry Spanがhandlerの代わりに処理を行うわけではない。1つのhandler実行がentry Spanの計測範囲に含まれ、その途中でUseCaseが呼び出された場合にUseCase Spanが開始し、UseCaseから制御が戻ったときに終了する。

```mermaid
flowchart TB
    INPUT["CLI / API入力"]

    subgraph TRACE["1 Invocation = 1独立Trace"]
        direction TB

        subgraph APP["RAGScope Application"]
            direction TB

            subgraph ENTRY["entry Span（root） API: HTTP SERVER Span CLI: Execution (callee) Span"]
                direction TB

                subgraph HANDLER["handler（1つの境界処理 / 専用Spanは作らない）"]
                    direction TB
                    HIN["入力をUseCaseへ渡す値へ変換"]

                    subgraph UCSPAN["UseCase Span"]
                        direction TB
                        UC["UseCase実行"]
                        UC --> DB["DB client Span"]
                        UC --> GENAI["GenAI client Span<br>（適用可能で計装する場合）"]
                        GENAI --> AI_REQ["HTTP client Span<br>（HTTPも計装する場合）"]
                    end

                    HIN -->|"UseCaseを呼び出す"| UC
                    UC --> HOUT["結果をCLI表示 / HTTP responseへ変換"]
                end
            end
        end

        subgraph AISVC["AI推論サービス"]
            AI_SERVER["HTTP SERVER Span"]
        end

        AI_REQ -->|"Trace Contextを引き継ぐ<br>HTTP client Spanを親にする"| AI_SERVER
    end

    INPUT --> HIN
    HOUT --> OUTPUT["CLI表示 / HTTP response"]
```

図の`handler`は1つであり、その実行の中に「入力変換 → UseCase呼び出し → 結果変換」がある。`UseCase Span`をhandlerの内側に描いているのは、handlerがUseCaseを呼び出して制御が戻るまで待つ実行上の包含関係を示すためであり、UseCaseそのものをhandlerの責務に含めるという意味ではない。

図のAI通信は、Embedding生成やgenerationなど、Application側でGenAI Semantic Conventionsを適用できる処理の例を示している。GenAI client Spanは、ApplicationからモデルまたはGenAIサービスへ行う論理的な依頼全体を表す。HTTP client Spanは、その依頼の中で行われるHTTP requestだけを表す。したがって、両方を計装する場合は別のSpanとして記録し、GenAI client Spanの子SpanとしてHTTP client Spanを置く。適用可能なGenAI Spanがない場合、またはGenAI Spanを計装しない場合は、HTTP client SpanをUseCase Spanの子Spanとして記録できる。

AI推論サービス側のHTTP SERVER Spanは別コンポーネントで実行されるため、RAGScope Applicationのboxとは分けて描いている。ただしTrace ContextはApplication側のHTTP client SpanからAI推論サービス側へ引き継ぐ。AI推論サービス側のHTTP SERVER SpanはApplication側HTTP client Spanの子Spanになり、entry Spanから続く同じTraceに属する。図でコンポーネントのboxを分けていることは、Trace上の親子関係が切れることを意味しない。

現行のGenAI Semantic Conventionsではclient側のinference / embeddings Spanは定義されているが、AI推論サービス側の汎用`gen_ai.inference.server` Spanは確認できない。そのため、AI推論サービス側へRAGScope独自のGenAI server Spanを補って描かない。将来、適用可能なserver側Conventionが成立した場合は、その時点のConventionを優先する。

handlerの責務とUseCaseとの関係は[[RS-0023 Observability設計メモ#handler]]も参照する。
UseCaseが呼ばれる前にhandlerで処理が終了した場合でもInvocationは発生しているため、entry Spanを持つTraceは記録される。一方、UseCaseは実行されていないためUseCase Spanは作らない。

## Spanをどこに切るか

Spanは、開始・終了、所要時間、失敗、親子関係を他の処理と分けて確認する必要があるoperationに作る。

| 対象 | Span境界 | 表現方針 |
|---|---|---|
| Invocation | 専用Spanは作らない | API / CLIのentry Spanをroot Spanとして使い、そのSpanでInvocation全体を観測する |
| API | 1 HTTP request = SERVER Span | HTTP Semantic Conventionsに従う。RAGScopeのentry Spanとして新しいTraceを開始する |
| CLI | 1 CLI program execution = Execution (callee) Span | CLI Semantic Conventionsに従う。RAGScopeのentry Spanとして新しいTraceを開始する |
| handler | handler全体を表す専用Spanは作らない | handlerの実行はentry Spanの計測範囲に含める。handler内部でUseCaseを呼び出した場合はUseCase Spanを作る |
| UseCase | 1 UseCase実行 = 1 UseCase Span | RAGScope固有Span。UseCase内部で別に観測する必要があるoperationはchild Spanとして追跡する |
| PostgreSQL | database client operation = DB client Span | Database / PostgreSQL Semantic Conventionsに従う |
| Embedding / generation | ApplicationからモデルまたはGenAIサービスへの1 logical client operation = GenAI client Span | 適用可能なGenAI Semantic Conventionsを優先する。HTTPも計装する場合、論理的な依頼全体を表すGenAI client SpanとHTTP requestだけを表すHTTP client Spanを分ける |
| AI推論サービスへのHTTP通信 | HTTP request = Application側HTTP client Span + AI推論サービス側HTTP SERVER Span | HTTP Semantic Conventionsに従う。Application側HTTP client SpanのTrace ContextをAI推論サービスへ引き継ぎ、AI推論サービス側HTTP SERVER Spanをその子Spanとして同じTraceに記録する |
| RAGScope内部処理 | 開始・終了、所要時間、失敗をUseCase Span等とは別に確認する必要がある処理 | その必要がある場合だけRAGScope固有Spanを作る |
| retry attempt | 既存計装 / SemConvで各attemptを追跡できる場合は追加しない | 既存計装ではattemptを区別できず、その区別を必要とする要求がある場合に対象retry設計で判断する |

自動計装 / 手動計装のどちらでSpanを生成するかは別の実装論点であり、このノートでは決めない。
Semantic Conventionで決まらない具体Span名・attributesは対象機能の設計で具体化する。

RAGScopeの実行追跡にはOpenTelemetryのSpanを使用し、Spanと同じ処理を別に識別するRAGScope独自の実行追跡概念は設けない。同じ処理を2つの識別体系で追跡しないためである。

## 成功・失敗をどう表すか

Span Statusと`error.type`は、そのSpanが表すoperation自身の最終結果と、そのoperationに適用する規則から決める。
HTTP、CLI、Database、GenAIなど、適用するSemantic ConventionがStatusや`error.type`を定義しているSpanでは、その規則を優先する。RAGScope固有Spanの規則でSemConv対象SpanのStatusや`error.type`を上書きしない。

たとえばAPIのentry SpanはHTTP SERVER SpanなのでHTTP Semantic Conventionsに従う。HTTP 4xx responseはSERVER Spanでは通常`Unset`のままであり、5xx responseなどHTTP operation自身がエラーとなる場合に`Error`となる。CLIのentry SpanであるExecution (callee) Spanは、`process.exit.code`が0以外なら`Error`となる。このため、UseCase Spanが`Error`でも、それだけを理由にAPI / CLIのentry Spanを`Error`にはしない。

RAGScope固有Spanは、そのSpanが表すoperationの最終結果を次のように記録する。2026-09-06時点のGeneral Recording ErrorsはDevelopmentだが、failed operationではSpan Statusを`Error`にし、`error.type`を設定することをSHOULDとしているため、このguidanceに従う。実装時には対象versionを再確認し、現在のDevelopment規則の細部をRAGScope独自の恒久契約として固定しない。

| operationの最終結果 | Span Status | `error.type` | その他 |
|---|---|---|---|
| 成功 | `Unset` | なし | — |
| typed failureとして最終的に失敗 | `Error` | typed failureから、そのoperationに対応する予測可能で低カーディナリティな値へ変換する | typed failureが持つ詳細値や原因は失わない |
| 内部処理が失敗したがretry / fallbackで回復して最終成功 | `Unset` | なし | 内部の失敗だけを理由に、このSpanを`Error`にはしない |
| unexpected同期Exceptionがoperation境界から外へ投げられる | `Error` | exception class相当 | original Exceptionをrethrowする |
| async interruption / cancellation | 対象operationでの中断の意味に従う | 一律規則なし | cleanup / Telemetry後もoriginal exceptionをrethrowする |

子Spanが表す処理が失敗しても、それだけを理由に親Spanを`Error`にはしない。親SpanがRAGScope固有Spanなら、親Span自身が表すoperationの最終結果からStatus / `error.type`を決める。親SpanがSemConv対象Spanなら、そのSemantic Conventionの規則に従う。

Logを生成するかどうかはSpan Statusとは別に判断する。[[RS-0023 Logs設計メモ]]を参照する。

## typed failureをSpanの`error.type`へどう変換するか

RAGScope全体のfailure modelは[[RS-0023 Observability設計メモ#失敗情報をAPI・保存データ・Telemetryへどう変換するか]]に従う。各feature / UseCaseが定義するtyped failureを失敗理由の元情報とし、RAGScope全体で共有する独立した`ErrorType` / `error_type` taxonomyや、すべてのfailureを中央で分類する`ErrorClassifier`は設けない。

このTrace設計が決めるのは、RAGScope固有Spanが表すoperationが最終的に失敗したときに、そのtyped failureをSpanの`error.type`へどう変換するかである。API / CLIで利用者へ返す失敗情報や、実験・評価データモデルへ保存するerrorは別の出力先であり、このTrace設計の`error.type`から決めない。

| 項目 | 方針 | 理由 |
|---|---|---|
| feature / UseCase固有typed failure | 失敗理由の元情報とする | failureの意味・詳細値・原因を、その処理を所有する設計と型で保持する |
| RAGScope共通`ErrorCategory` / `ErrorType` / `error_type` taxonomy | 設けない | typed failureと別の共通分類を置かなければ成立しない現在要求を確認できず、対応規則の二重管理とfeature間の不要な結合を作る |
| `ErrorClassifier failure` / 専用error package | 共通前提として設けない | 全operationを横断するtaxonomyを中央packageへ集約する要求がない |
| RAGScope固有Spanの`error.type` | そのSpanが表すoperationが最終的に失敗した場合、2026-09-06時点のGeneral Recording Errors guidanceに従い、対象operationのtyped failureから`error.type`へ変換する | `error.type`はTelemetryへ記録する表現であり、RAGScopeのfailure modelそのものではない |
| SemConv対象Spanの`error.type` | 適用するSemantic Conventionに従う | HTTP / Database / GenAI等のoperation固有規則をRAGScope分類で上書きしない |
| `OperationFailure`で分類を上位Spanまで伝播する仕組み | 設けない | 各Spanは、自身が表すoperationの最終結果と適用規則からStatus / `error.type`を決める |
| `AsyncException`を一律にcancellation / Errorへ分類する規則 | 設けない | constructorだけでは中断の意味を特定できない |

Application / AI推論サービス間で共有するfailure codeが通信契約として必要になった場合は、その通信Contractで定義する。RAGScope全体の共通`error_type`として先に定義しない。

## Semantic Conventionsのstability

このTrace設計で参照する規約はstabilityが同一ではない。2026-09-06時点では次のように扱う。

| 対象 | stability | 扱い |
|---|---|---|
| `error.type`属性 | Stable | operationがどの種類のerrorで失敗したかを表す標準属性として利用する |
| HTTP client / server Span | Stable | API entry / HTTP通信へ適用する |
| SQL / PostgreSQL database client Span | Stable | PostgreSQL operationへ適用する |
| CLI Execution (callee) Span | Development | CLI entry Spanへ適用するが、現在の細部をRAGScope独自の恒久契約へコピーしない |
| General Recording Errors | Development | RAGScope固有Spanが表すoperationが失敗したときのStatus / `error.type`を決めるguidanceとして利用し、実装時に対象versionを再確認する |
| GenAI Semantic Conventions | Development | 適用可能なGenAIへの論理的な依頼に利用するが、現在のSpan名・attributes等をRAGScope独自契約へ固定しない |

## このTrace共通設計では決めないこと

| 論点 | 具体化する時点 |
|---|---|
| RAGScope固有Spanの具体名 / attributes | 対象機能の設計時 |
| 対象機能固有failureの`error.type`値 | 対象operationの設計時 |
| API / CLIで利用者へ返すfailure表現 | 各interface設計 / Contract |
| 実験・評価データモデルへ保存するerror | 実験・評価機能設計 / データモデル |
| Application / AI推論サービス間のfailure response / code | AI通信方式・Contract設計時 |
| cancellation / interruptのStatus | 実際の中断源と対象operationが確定した時 |
| retry attemptのRAGScope固有Span要否 | 対象retry設計時 |
| ExperimentとTraceの関係 | 実験実行境界が具体化した時 |
| `hs-opentelemetry` AdapterのException処理 | Adapter実装時 |

## 判断理由・実装上の注意

> [!info]- typed failureの考え方
> 具体failureの意味は、そのfailureを定義するUseCase・対象機能・operationの設計が定める。
> RAGScope固有Spanが表すoperationが最終的に失敗した場合は、2026-09-06時点のGeneral Recording Errors guidanceに従い、そのoperationを定義する設計でtyped failureから予測可能で低カーディナリティな`error.type`への変換を定める。
>
> typed failureが持つ詳細値・原因と、Telemetryへ記録する`error.type`は分けて扱う。`error.type`を得るためにtyped failureそのものを共通エラー型へ置換せず、failureが保持する原因・詳細値を失わない。failure型自身をOpenTelemetryやObservability固有型へ依存させない。変換規則が必要なら、実行状態やTrace Contextへ依存しない純粋な変換を第一候補とする。
>
> HTTP、Database、GenAIなど、適用するSemantic Conventionや計装が`error.type`を定めるSpanでは、同じ意味のRAGScope独自分類を重複して作らない。すべてのtyped failureへ共通`error_type`や共通taxonomyを持たせず、RAGScope固有Spanが表すoperationが最終的に失敗したときだけ、そのoperationに対応する`error.type`への変換を定める。
>
> `typed failure`という用語だけでは、Haskellで`Either`、Exception、その他のどの型・機構を使って表現するかを決めない。

> [!info]- RAGScope固有SpanのStatusを最終結果で決める理由
> OpenTelemetryのRecording Errorsでは、retryや内部処理でerrorが起きても、最終的にoperationが成功した場合は、囲っているoperationをerrorとして記録しない。
> RAGScopeのUseCase設計でも、内部処理が失敗しても最終結果を成立させればUseCase成功である。そのため、UseCase SpanなどのRAGScope固有Spanは、内部処理で一度失敗したかではなく、そのSpanが表すoperationの最終結果からStatusを決める。
>
> 対象機能固有のfailureだけでは複数operationを横断して必要な集計・契約を成立させられない要求が追加された場合は、その具体的要求を基準に共通分類の必要性を再評価する。

> [!info]- unexpected同期Exception
> RAGScope固有Spanが表すoperationの境界からunexpectedな同期Exceptionが外へ投げられる場合は、そのSpanのStatusを`Error`とし、`error.type`へexception class相当を設定してoriginal Exceptionをrethrowする。
>
> Exception Logの記録と重複防止は[[RS-0023 Logs設計メモ]]で扱う。
> 子SpanでExceptionが発生していても、親Spanを`Error`にするかは親Span自身が表すoperationの最終結果から判断する。これはException Logを重複記録しないこととは別の判断である。

> [!info]- async interruption / cancellation
> async interruption / cancellationをtyped failureやunexpected同期Exceptionへ一括して統合しない。
> Haskellでは`AsyncCancelled`、`ThreadKilled`、`UserInterrupt`、`StackOverflow`、`HeapOverflow`などが同じ意味ではなく、`AsyncException`であることだけから「意図的cancellation」と判断できない。
>
> async interruptionを捕捉する必要がある境界でもoriginal exceptionを飲み込まない。必要なcleanupとTelemetry処理を行った後はrethrowする。
>
> structured cancellation、CLI interrupt、timeout打ち切りなどについて、実際に発生・捕捉するExceptionと中断されたoperationが特定できた時点で、そのSpan Statusを具体化する。

## 参考

- [OpenTelemetry — Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry — Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry — `error.type`](https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/)
- [OpenTelemetry — Recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry — Semantic conventions for HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
- [OpenTelemetry — Semantic conventions for CLI programs](https://opentelemetry.io/docs/specs/semconv/cli/cli-spans/)
- [OpenTelemetry — SQL database semantic conventions](https://opentelemetry.io/docs/specs/semconv/db/sql/)
- [OpenTelemetry GenAI Semantic Conventions](https://github.com/open-telemetry/semantic-conventions-genai)
- [hs-opentelemetry](https://github.com/iand675/hs-opentelemetry)
