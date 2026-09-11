---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-11
---

# OOPのinterfaceとHaskellの関数値によるDIメモ

> [!note]
> RAGScope作業中に、OOPの`interface` / 実装class / DIと、Haskellで関数を`newtype`に包んで値として渡す設計の対応関係を思い出すための学習メモ。RAGScopeの正本ではない。

## OOPでのイメージ

たとえばTrace機能を抽象化する場合、OOPでは次のように考える。

1. `Trace` interfaceを定義する
2. `OpenTelemetryTrace`が`Trace`を実装する
3. 起動時の設定やDIで、具体実装として`OpenTelemetryTrace`を選ぶ
4. UseCaseは`Trace`だけに依存し、具体実装を知らない

```text
Trace interface
      ^
      |
OpenTelemetryTrace
      |
      | DI
      v
   UseCase
```

UseCaseから見ると、`trace.withSpan(...)`を呼ぶだけで、実際には注入された`OpenTelemetryTrace.withSpan(...)`が動く。

## Haskellでの対応

今回のRAGScopeでは、`RAGScope.Telemetry.Trace`がSDK非依存のTrace APIを定義する。

```haskell
newtype TraceBoundary = TraceBoundary
  ( forall result.
    SpanName ->
    (result -> SpanOutcome) ->
    IO result ->
    IO result
  )

mkTraceBoundary
  :: ( forall result.
       SpanName ->
       (result -> SpanOutcome) ->
       IO result ->
       IO result
     )
  -> TraceBoundary

withSpan
  :: TraceBoundary
  -> SpanName
  -> (result -> SpanOutcome)
  -> IO result
  -> IO result
```

`TraceBoundary`は、OOPでいう「`Trace` interfaceを実装したobject」に近い。

- `TraceBoundary`の中には、実際にSpanを実行する関数が入っている
- `mkTraceBoundary`は、その関数を`TraceBoundary`として包む
- `withSpan`は、`TraceBoundary`の中の関数を取り出して実行する

`mkTraceBoundary`や`withSpan`自体がOpenTelemetry実装なのではない。

## OpenTelemetry実装

`RAGScope.Telemetry.OpenTelemetry.Trace`が、OpenTelemetryを使った具体実装を作る。

概念的には次のようになる。

```haskell
mkOpenTelemetryTraceBoundary
  :: TracerProvider
  -> TraceBoundary

mkOpenTelemetryTraceBoundary tracerProvider =
  mkTraceBoundary $ \spanName classify action ->
    -- OpenTelemetryのTracer / inSpan''などを使って実装する
    ...
```

ここで作られた`TraceBoundary`値の中には、OpenTelemetryを使う関数が入っている。

```text
RAGScope.Telemetry.Trace
  TraceBoundary
  mkTraceBoundary
  withSpan
        ^
        | TraceBoundaryを作る
        |
RAGScope.Telemetry.OpenTelemetry.Trace
  mkOpenTelemetryTraceBoundary
        |
        | 起動時に作って渡す
        v
      UseCase
```

## OOPとの対応表

| OOP | 今回のHaskell |
| --- | --- |
| `Trace` interface | `TraceBoundary` |
| `OpenTelemetryTrace implements Trace` | `mkOpenTelemetryTraceBoundary :: TracerProvider -> TraceBoundary` |
| `new OpenTelemetryTrace(...)` | `mkOpenTelemetryTraceBoundary tracerProvider` |
| interfaceを実装したobject | 作成された`TraceBoundary`値 |
| `trace.withSpan(...)` | `withSpan traceBoundary ...` |
| constructor injection / DI | `TraceBoundary`を関数引数としてUseCaseへ渡す |
| DI設定で実装を切り替える | 起動時にどの`TraceBoundary`を作って渡すかを選ぶ |

## 一番大事な理解

Haskellでは、OOPのように「classがinterfaceをimplementsする」必要はない。

代わりに、**必要な機能を関数として表し、その関数を保持した値を作って、依存先へ普通の引数として渡す**。

今回なら、

```text
OpenTelemetry固有の実装関数
        |
        | mkTraceBoundaryで包む
        v
   TraceBoundary値
        |
        | 関数引数としてDI
        v
      UseCase
        |
        | withSpanで中の関数を実行
        v
OpenTelemetry実装が動く
```

UseCaseは`Tracer`、`TracerProvider`、`inSpan''`などを知らず、`TraceBoundary`だけを知る。

## `type`ではなく`newtype`にする意味

`type`は元の関数型の別名なので、同じ型の関数ならそのまま渡せる。

`newtype`なら`TraceBoundary`という独立した型になり、

> 「同じ形の関数」ではなく「Trace境界として作られた値」

を依存として表せる。

このため、UseCaseの型に

```haskell
TraceBoundary
```

と書いたとき、「このUseCaseはTrace境界に依存している」という意味を型として残せる。
