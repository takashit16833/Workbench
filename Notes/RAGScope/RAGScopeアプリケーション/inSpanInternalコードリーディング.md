---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-09
---

```mermaid
flowchart TD
    A{SpanProcessorがある?}

    subgraph FAST[1. processorがない場合]
      direction TB
      F1[getContext<br/>current Context取得]
      F2[createSpanHelper<br/>Span作成]
      F3[f s<br/>body実行]
      F1 --> F2 --> F3
    end

    subgraph NORMAL[2〜9. 通常経路]
      direction TB
      N1[2. 通常経路の入口<br/>withRunInIO + mask]
      N2[3. 元のcurrent Contextを保存<br/>ctxRef / entry / ctx]
      N3[4. Spanを作る<br/>createSpanHelper]
      N4[5. 作ったSpanをcurrentにする<br/>insertSpan + writeIORef]
      N5[6. bodyを実行<br/>restore + catch]

      subgraph EXCEPTION[7〜8. 例外経路]
        direction TB
        E1[7. 例外を分類する<br/>resolveException]
        E2[8. 例外時のcleanup<br/>endSpan]
        E3[元Contextを復元]
        E4[元の例外を再throw]
        E1 --> E2 --> E3 --> E4
      end

      subgraph SUCCESS[9. 成功経路]
        direction TB
        S1[9. 成功時のcleanup<br/>endSpan]
        S2[元Contextを復元]
        S3[結果を返す]
        S1 --> S2 --> S3
      end

      N1 --> N2 --> N3 --> N4 --> N5
      N5 -->|例外| E1
      N5 -->|成功| S1
    end

    A -->|なし| F1
    A -->|あり| N1
```

## 型

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

## 1. processorがない場合

```haskell
| not (tracerProviderHasProcessor (tracerProvider t)) =
    liftIO (getContext >>= \ctx -> createSpanHelper t ctx n args extraAttrs (-1)) >>= f
```

SpanProcessorがない場合は通常のContext差し替えや例外記録を省略するfast path。

1. `getContext`で現在のContextを取得
2. そのContextを使ってSpanを作る
3. 作ったSpanを`f`へ渡す

## 2. 通常経路の入口

```haskell
| otherwise = withRunInIO $ \run -> EUnsafe.mask $ \restore -> do
```

`withRunInIO`は`m a`をIOとして実行する`run`を得る。

`mask`はSpan作成やContext差し替えの途中で非同期例外が割り込むのを防ぐ。bodyは後で`restore`して通常の例外受付状態で実行する。

## 3. 元のcurrent Contextを保存

```haskell
(!tidInt, ctxRef) <- ensureContextRefFast
entry <- readIORef ctxRef
let ctx = ceContext entry
```

- `ctxRef`: current Contextを保持する`IORef`
- `entry`: `ctxRef`に入っていた元の値
- `ctx`: `entry`から取り出した現在の`Context`
- `tidInt`: 現在の実行スレッドを識別する値

`entry`を残しておくことで、body終了後に元のContextへ戻せる。

## 4. Spanを作る

```haskell
s <- createSpanHelper t ctx n args extraAttrs tidInt
```

現在の`ctx`を使ってSpan `s`を作る。この時点ではcurrent Contextはまだ元のまま。

## 5. 作ったSpanをcurrentにする

```haskell
writeIORef ctxRef $! entry {ceContext = insertSpan s ctx}
```

`insertSpan s ctx`で元のContextへSpan `s`を入れ、そのContextを`ctxRef`へ書き戻す。

ここからbody終了まで、`getContext` / `getActiveSpan`から見えるcurrent Spanは`s`になる。

## 6. bodyを実行

```haskell
a <- restore (run $ f s) `EUnsafe.catch` \someEx@(SomeException inner) -> do
```

- `f s`: Spanをbodyへ渡す
- `run`: `m a`をIOとして実行
- `restore`: bodyでは通常通り例外を受けられるようにする
- `catch`: bodyから外へ出た例外を捕捉する

## 7. 例外を分類する

```haskell
let ExceptionResponse classification exAttrs = resolveException t someEx
```

`resolveException`で例外をTracing上どう扱うか分類する。

```text
ErrorException    -> Error + exception Span Event
RecordedException -> exception Span Eventのみ
IgnoredException  -> 何もしない
```

RAGScopeが欲しい`Error + exception Span Eventなし`という組み合わせは、この3分類にはない。

## 8. 例外時のcleanup

```haskell
endSpan s Nothing
writeIORef ctxRef entry
EUnsafe.throwIO someEx
```

1. Spanを終了
2. `entry`を書き戻して元のContextを復元
3. 元の例外を再throw

`catch`は例外を握りつぶすためではなく、Telemetryの後始末をしてから同じ例外を外へ返すために使っている。

## 9. 成功時のcleanup

```haskell
endSpan s Nothing
writeIORef ctxRef entry
pure a
```

1. Span終了
2. 元のContextを復元
3. bodyの結果`a`を返す
