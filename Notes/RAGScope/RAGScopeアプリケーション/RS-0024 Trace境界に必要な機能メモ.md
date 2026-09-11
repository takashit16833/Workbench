---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-09
---

## RAGScopeとして欲しい機能

- TracerProvider / Tracerを用意する
- root / child Spanを作成する
- Spanの実行範囲を開始・終了する
- Span実行中はそのSpanをcurrentにし、終了後は元へ戻す
- Spanを`Unset` / `Error`として扱う
- `error.type`など必要な属性を付ける
- 未処理の同期例外ではSpanへ失敗情報を残し、元の例外を再throwする
- 同じ例外をSpan EventとLogs EventRecordへ重複記録しない
- 現在のTrace Contextを後続処理へ引き継ぐ

## API調査メモ

### TracerProvider

```haskell
createTracerProvider
  :: MonadIO m
  => [SpanProcessor]
  -> TracerProviderOptions
  -> m TracerProvider

getGlobalTracerProvider :: MonadIO m => m TracerProvider
```

Tracerを作る元。processors / sampler / resource / limits / propagatorsなど、Tracer群で共有する設定を持つ。

### Tracer

```haskell
makeTracer :: TracerProvider -> InstrumentationLibrary -> TracerOptions -> Tracer

getTracer
  :: MonadIO m
  => TracerProvider
  -> InstrumentationLibrary
  -> TracerOptions
  -> m Tracer
```

Spanを作る入口。Instrumentation Scopeは、このTracerがどの計装コードに属するかを表す。

### `inSpan`

```haskell
inSpan
  :: (MonadUnliftIO m, HasCallStack)
  => Tracer
  -> Text
  -> SpanArguments
  -> m a
  -> m a
```

Spanの開始・action実行・終了をまとめて行うbracket-styleの関数。未処理例外は記録して再throwする。

#### 例外処理で分かったこと

`ExceptionHandler`は、`inSpan`などが捕捉した例外の扱いを変更する。

```haskell
ExceptionHandler = SomeException -> Maybe ExceptionResponse
```

`ExceptionResponse`の分類は次の3つ。

- `ErrorException`: SpanをErrorにしてexception Span Eventも記録
- `RecordedException`: Eventだけ記録
- `IgnoredException`: どちらも行わない

この分類だけでは、RAGScopeが欲しい **「Errorにはするがexception Span Eventは記録しない」** を直接は表現できない。
一方、`IgnoredException`とcallback側の`setStatus` / `addAttribute`を組み合わせれば、SDKの自動exception Span Eventを抑制しつつ、RAGScopeが必要なStatus / `error.type`を設定できることを確認した。

### `inSpan'`の挙動検証

`hs-opentelemetry`へ依存する前提を固定するため、`OpenTelemetryBehaviorSpec`で次を確認した。

- Span実行中は作成したSpanがcurrentになる
- child Span実行中はchildがcurrentになり、終了後はparentがcurrentへ戻る
- exportされたchild Spanにはcurrentだったparentが記録される
- actionが通常終了した場合、返り値はそのまま返り、Span Statusは`Unset`のままで`error.type`は付かない
- `Either`の`Left`を通常の返り値として返しても、`inSpan'`自身は失敗として解釈せず、Span Statusは`Unset`のままで`error.type`は付かない
- 既定の例外処理では、未処理例外によりSpan Statusが`Error`になり、exception Span Eventが1件記録され、元の例外が再throwされる
- `ignoreExceptionType`で対象例外を`IgnoredException`にすると、SDKはその例外についてStatus変更やexception Span Event追加を行わない
- callback側で先に設定したStatus / `error.type`は、その後`IgnoredException`として処理されても保持される
- `IgnoredException`の場合でも、`inSpan'`はSpanを終了し、元のContextを復元したうえで元の例外を再throwする

### Trace Adapterの現時点の実装方針

Trace Adapterは`inSpan'`をSpan実行の基礎として使用する方向とする。

```text
inSpan'
  ↓
RAGScope側のcallbackでactionを実行
  ↓
通常の返り値
  ├─ 成功: Status Unset / error.typeなし
  └─ 具体的なerror typeによる失敗:
       Adapter側でStatus Error / error.typeを設定

未処理の対象例外
  ↓
callback側でStatus Error / error.typeを設定
  ↓
同じ例外を再throw
  ↓
TracerOptionsのignoreExceptionTypeでSDKの自動exception記録を抑制
  ↓
inSpan'がSpan終了 / Context復元
  ↓
同じ例外を外へ再throw
```

`inSpan'`はactionの返り値を解釈しないため、具体的なerror typeを返す処理をSpanの失敗として扱う変換はRAGScope Adapter側で実装する必要がある。

Spanの開始・終了、current Contextの切り替え・復元、例外時のSpan終了と再throwは`inSpan'`へ任せる。これにより、OpenTelemetry Context管理をRAGScope側で重複実装しない。

### manual Span lifecycle

Haddockにはmanual lifecycle向けに`createSpan` / `endSpan`が案内されているが、現時点ではこれを採用する必要はない。

`inSpan'`について、RAGScopeがTrace Adapterで必要とするSpan lifecycle、Context復元、例外再throw、SDKの自動exception Span Event抑制に必要な挙動を確認できたため、`createSpan` / `endSpan`による自前のlifecycle管理との追加比較は行わない。

今後の実装で`inSpan'`では満たせない具体的な要求または制約が判明した場合にのみ、manual lifecycleを代替案として再検討する。

## 必要な知識

### Telemetry

システムの実行状態を観測するためのデータの総称。RAGScopeでは主にTrace・Logs・Metrics。

### Instrumentation Scope

Telemetryを生成した計装コードを識別する情報。Tracerに紐づく。

- Instrumentation Scope: 誰がTelemetryを生成したか
- Trace Context: どのTrace / Spanの親子関係にいるか

### Span Event

Spanの途中で起きた、ある時点の出来事。RAGScope独自イベントには使わず、名前付きイベントはLogsのEventRecordへ記録する。

### Context / SpanContext

- `Context`: current Spanなど、この実行scopeで引き回す情報の入れ物
- `SpanContext`: Trace ID / Span IDなど、Spanを識別・伝播するための情報

`SpanContext`は`Context`そのものではない。

---

## ChatGPTへ質問するときのプロンプト

次の用語・型・関数について、Haddockを自分で読みながら理解したいです。
質問した範囲だけ、必要最小限で説明してください。

- まず一文で何かを説明する
- RAGScopeでなぜ関係するかを短く説明する
- 正確な理解に必要なら、混同しやすい概念との差を1つだけ補足する
- 私が求めるまで、候補関数名・検索語・実装方法などのネタバレは出さない
- 次に調べるものを先回りして列挙しない
- 私の理解が誤っている場合は、その点だけ明確に指摘する
