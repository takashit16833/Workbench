---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-15
---

# Haskellの関数値によるDIとTelemetry境界メモ

> [!note]
> RAGScopeで使っている設計を題材に、OOPのinterface / DIとHaskellの関数値・`newtype`による依存注入の対応を思い出すための学習メモ。ここにある型名やmodule構成を現在仕様として扱わず、現在実装は正本リポジトリを確認する。

## OOPのinterfaceをそのままtype classへ置き換える必要はない

OOPなら、たとえばTrace機能を次のように組み立てることがある。

```text
Trace interface
      ↑ implements
OpenTelemetryTrace
      ↓ DI
    UseCase
```

Haskellでは、DIのためだけにこの構造をtype classで再現する必要はない。

必要な能力を関数として表し、その関数を値として渡せる。

RAGScopeで使っている形を単純化すると次のようになる。

```haskell
type SpanRunner =
  forall result.
  SpanName ->
  (result -> SpanOutcome) ->
  IO result ->
  IO result

newtype TraceBoundary =
  TraceBoundary SpanRunner
```

OpenTelemetry AdapterはOpenTelemetryを使う`SpanRunner`を作って`TraceBoundary`へ包み、UseCase側は構築済みの`TraceBoundary`を普通の関数引数として受け取る。

```text
OpenTelemetry固有の実装関数
        ↓
TraceBoundary値を構築
        ↓
関数引数としてUseCaseへ渡す
        ↓
UseCaseはSDKを知らずに境界を利用する
```

## `type`と`newtype`

`type`は元の型の別名なので、同じ型の関数なら区別されない。

`newtype`なら独立した型になるため、同じ関数形でも、

> 「Trace境界として構築された依存」

という意味を型へ持たせられる。

```haskell
newtype TraceBoundary =
  TraceBoundary SpanRunner
```

とすれば、UseCaseの引数に`TraceBoundary`と書くだけで、そのUseCaseがTrace境界へ依存していることを型として表せる。

## 関数1個なら関数値、複数能力なら小さい関数record

依存が1操作だけなら、関数型そのものが十分な場合がある。

```haskell
type EventRecordEmitter =
  EventRecord -> IO ()
```

複数の操作を1つの依存として渡したいなら、小さいrecordへまとめられる。

```haskell
data LogsBoundary = LogsBoundary
  { emitLogRecord :: LogRecord -> IO ()
  , emitEventRecord :: EventRecord -> IO ()
  }
```

この用途だけのためにtype classを作る必要はない。

型クラスは、複数の型に対して同じ多相操作を要求する具体的な必要があるときに、その能力だけを狭く切り出して検討する。

## scopeを持つ処理は高階関数に閉じ込める

Spanのように開始と終了が対になり、Contextの適用・復元も伴う処理は、利用側へ`start`と`end`を別々に渡すより、対象actionを受け取る高階操作にまとめると不正な使い方を減らせる。

```text
action
  ↓
withSpan / SpanRunner
  ↓
同じresultを返す
```

利用側へ次の責務を持ち出さないことがポイントである。

- Spanの終了漏れ
- 別SpanへのStatus更新
- Context復元漏れ
- 成功経路と例外経路で異なるcleanup

低水準APIを直接組み合わせる方が必要になることはあるが、helperで要求を満たせている間は、低水準ライフサイクルを利用側へ広げる理由にはならない。

## 機能結果と観測用分類を分ける

Telemetryのための分類値は、機能処理のresultそのものではない。

```text
詳細なfailure
    ├─ そのまま呼び出し側の処理制御へ使う
    └─ pureな分類
         ↓
       SpanOutcome / error.typeなど
```

たとえば機能処理が`Left failure`を返しても、それを`SpanFailed`へ置き換えず、元の`Left failure`はそのまま返す。Telemetry側では純粋関数で必要な観測表現へ写す。

分類は多対一になり得るため、分類値から元のfailureを復元しようとしない。

## SDK型を利用側へ漏らさない

feature / UseCaseから必要なのが「Spanの中で実行する」「EventRecordを記録する」といった能力なら、`TracerProvider`、`Tracer`、`LoggerProvider`、SDKのContext型などを利用側の公開型へ含める必要はない。

基本形は次である。

```text
feature / UseCase
    ↓
SDK非依存の利用境界

OpenTelemetry Adapter
    ├─ SDK非依存の利用境界
    └─ OpenTelemetry SDK
```

ただし、HTTP / DB / GenAIなどで標準instrumentationを直接使う方が自然な場合まで、すべて同じAdapterへ押し込めるという意味ではない。実際のAPIとpackage依存を見て決める。

## 「合成できる」と「Monoidである」は別

関数やrecordを組み合わせられるからといって、自動的に`Monoid`を与えない。

```text
Logs操作を2つ結合
  → 同じLogを二重出力する可能性がある

Span操作を2つ結合
  → 同じactionを別Spanで二重に囲む可能性がある
```

数学的な構造を導入するときは、結合演算と単位元がそのdomainで本当に同じ意味を持つかを確認する。

## Trace・Logs・Metricsを万能emitへ揃えない

Signalごとに意味と操作が違う。

```text
Trace   = 処理区間と親子関係
Logs    = 出来事や診断情報の記録
Metrics = 測定値の集約
```

見た目を統一するためだけに、

```text
emit signal name value attributes
```

のような万能APIへ押し込めない。

Metricsも、具体的な手動記録の必要がない段階で`emitMetric name value attributes`のような万能境界を先に作らない。CounterやHistogramでは操作、単位、属性制約が異なるため、実際に必要なMetricから最小の操作を設計する。

## 判断するときの短い基準

Haskellで新しい依存境界を作るときは、次の順で考えると整理しやすい。

1. 利用側が本当に必要とする操作は何か。
2. 1関数で表せるなら関数値で十分か。
3. 複数操作なら小さい関数recordで十分か。
4. scopeを持つなら高階関数として囲めないか。
5. type classが必要な多相性が本当にあるか。
6. 外部library固有型を境界の外へ出す必要が本当にあるか。
7. 元の機能resultを観測用の分類値で潰していないか。
8. 「便利そう」という理由だけでMonoidや万能APIを追加していないか。
