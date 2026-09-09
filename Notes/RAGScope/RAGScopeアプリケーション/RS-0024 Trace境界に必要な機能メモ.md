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
