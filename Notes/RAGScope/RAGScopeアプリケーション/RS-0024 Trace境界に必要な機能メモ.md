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

RAGScopeが欲しい **「Errorにはするがexception Span Eventは記録しない」** を、この分類だけでは表現できなさそう。

#### `inSpanInternal`を読む

`inSpan` / `inSpan'` / `inSpan''`の実処理をしている関数。

大きな流れはこれだけ。

```text
元のcurrent Contextを取得
  ↓
そのContextを使ってSpanを作成
  ↓
作ったSpanをcurrent Contextへ入れる
  ↓
bodyを実行
  ↓
成功: Span終了 → 元のContextへ戻す
例外: 例外を記録 → Span終了 → 元のContextへ戻す → 再throw
```

##### 引数

```haskell
inSpanInternal
  :: MonadUnliftIO m
  => Tracer
  -> Text
  -> SpanArguments
  -> AttributeMap
  -> (Span -> m a)
  -> m a
```

- `Tracer`: Spanを作る元
- `Text`: Span名
- `SpanArguments`: Span作成時の設定
- `AttributeMap`: caller情報など追加属性
- `(Span -> m a)`: 作成したSpanを受け取って実行するbody

##### processorがない場合

```haskell
| not (tracerProviderHasProcessor (tracerProvider t)) =
    liftIO (getContext >>= \ctx -> createSpanHelper t ctx n args extraAttrs (-1)) >>= f
```

SpanProcessorがない場合はSpanが記録されないため、通常のContext差し替えや例外記録を省略するfast path。

`getContext`で現在のContextを取得し、それを使ってSpanを作り、そのSpanを`f`へ渡す。

##### 通常経路の入口

```haskell
| otherwise = withRunInIO $ \run -> EUnsafe.mask $ \restore -> do
```

`withRunInIO`は`m`の処理をIOとして実行できる`run`を受け取るために使っている。

`mask`は、Span作成中やContext差し替え中などの中途半端な瞬間に非同期例外が割り込むのを防ぐ。

一方、ユーザーのbody自体は後で`restore`して通常通り例外を受けられる状態で実行する。

##### 元のcurrent Contextを取得

```haskell
(!tidInt, ctxRef) <- ensureContextRefFast
entry <- readIORef ctxRef
let ctx = ceContext entry
```

ここで重要なのは3つ。

- `ctxRef`: この実行スレッドのcurrent Contextを保持する`IORef`
- `entry`: `ctxRef`に入っていた元の値。後で丸ごと復元するため保存する
- `ctx`: `entry`から取り出した現在の`Context`

`entry`を残しているので、body終了後に元のContextへ戻せる。

##### Spanを作る

```haskell
s <- createSpanHelper t ctx n args extraAttrs tidInt
```

現在の`ctx`を使ってSpan `s`を作る。

この時点ではSpanを作っただけで、current Contextはまだ元のまま。

##### 作ったSpanをcurrentにする

```haskell
writeIORef ctxRef $! entry {ceContext = insertSpan s ctx}
```

`insertSpan s ctx`で元のContextへ新しいSpanを入れ、そのContextを`ctxRef`へ書き戻す。

ここからbody終了まで、`getContext` / `getActiveSpan`から見えるcurrent Spanは`s`になる。

##### bodyを実行

```haskell
a <- restore (run $ f s) `EUnsafe.catch` \someEx@(SomeException inner) -> do
```

- `f s`: 作ったSpanをbodyへ渡す
- `run`: `m a`をIOとして実行する
- `restore`: `mask`を一時的に解除し、bodyは通常通り例外を受けられるようにする
- `catch`: bodyから外へ出た例外を捕捉する

##### 例外時

```haskell
let ExceptionResponse classification exAttrs = resolveException t someEx
```

TracerProviderに設定されたExceptionHandlerを使って、例外をどう扱うか分類する。

```haskell
case classification of
  ErrorException -> do
    setStatus s ...
    recordException s ...
  RecordedException ->
    recordException s ...
  IgnoredException ->
    pure ()
```

- `ErrorException`: SpanをErrorにし、exception Span Eventも記録
- `RecordedException`: exception Span Eventだけ記録
- `IgnoredException`: 何もしない

RAGScopeで問題になっているのは、ここに **「ErrorにするがSpan Eventは記録しない」** 分岐がないこと。

その後は必ず、

```haskell
endSpan s Nothing
writeIORef ctxRef entry
EUnsafe.throwIO someEx
```

の順で処理する。

1. Spanを終了
2. 保存していた`entry`を書き戻して元のContextを復元
3. 捕捉した元の例外を再throw

つまり`catch`は例外を握りつぶすためではなく、**Telemetryの後始末をしてから同じ例外を外へ返すため**に使っている。

##### 成功時

```haskell
endSpan s Nothing
writeIORef ctxRef entry
pure a
```

bodyが成功した場合も、

1. Span終了
2. 元のContextを復元
3. bodyの結果`a`を返す

となる。

##### `inSpanInternal`から分かること

`inSpan`の便利さは、単に`createSpan` / `endSpan`をまとめているだけではない。

```text
Span lifecycle
+ current Contextの差し替え・復元
+ 例外時のTelemetry記録
+ 元例外の再throw
+ 非同期例外がcleanup途中へ割り込まないための制御
```

までまとめて管理している。

manual lifecycleを採用する場合、RAGScope側でも少なくともこのうち必要な性質を失わないようにする必要がある。

### manual Span lifecycle

Haddockには次の案内がある。

> For manual span lifecycle management, use createSpan and endSpan.

`createSpan`で開始し、`endSpan`で終了する。`createSpan`へ渡すContextにSpanがあれば、そのSpanをparentとして扱える。

現時点の実装候補イメージ:

```text
createSpan
  ↓
bodyを実行
  ↓ 例外なら
setStatus Error + error.typeを設定
  ↓
endSpan
  ↓
元の例外を再throw
```

Spanをリソースとしてbracket-styleに管理し、例外時の処理だけRAGScope要件に合わせて自前で制御する方向を検討中。

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
