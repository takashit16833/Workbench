---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-15
---

# OpenTelemetry SDK構造メモ

> [!note]
> OpenTelemetry SDKの構造をRAGScopeの実装時に思い出すための学習メモ。RAGScopeの現在仕様や現在実装の正本ではない。具体的なAPI、package version、module構成は、その時点の正本リポジトリと利用するSDKのソースを確認する。

## TraceとLogsの基本構造

Trace側は大きく次の役割に分かれる。

```text
Span Exporter
    ↑
SpanProcessor
    ↑
TracerProvider
    ↓
Tracer
    ↓
Span
```

- **TracerProvider**: Tracerを作る大元。Processor、Resource、sampler、ID generator、Span limitsなど、Trace SDK側の共通設定を持つ。
- **Tracer**: Spanを作るための操作用ハンドル。
- **Span**: 1回の処理区間。開始・終了、親子関係、attributes、Statusなどを持つ。
- **SpanProcessor**: Spanの開始・終了などを受け、Exporterへ渡す前後の処理を担当する。
- **Span Exporter**: 完了したSpanを外部backendやテスト用保存先へ出す。

Logs側も対応する構造を持つ。

```text
LogRecord Exporter
    ↑
LogRecordProcessor
    ↑
LoggerProvider
    ↓
Logger
    ↓
LogRecord
```

- **LoggerProvider**: Loggerを作る大元。Logs SDK側の共通設定とProcessorを持つ。
- **Logger**: LogRecordをemitするための操作用ハンドル。
- **LogRecord**: 実際に記録するログ1件。
- **LogRecordProcessor / Exporter**: LogRecordを処理し、外部backendやテスト用保存先へ渡す。

Providerは1件のSpanやLogRecordを表すものではない。通常はアプリケーション初期化時に構築し、複数の処理で使い回す。

## TraceとLogsをつなぐContext

TraceとLogsは別のProvider、別の処理経路を持つ。両者を直接つなぐ必要はなく、相関の中心になるのはOpenTelemetryの`Context`である。

```text
Spanをcurrentにする
    ↓
current ContextにそのSpanが入る
    ↓
同じscope内でLogRecordをemitする
    ↓
SDKがcurrent Contextを参照できれば
TraceId / SpanId / TraceFlagsをLogRecordへ関連付けられる
```

そのため、LogRecordやEventRecordを**どのscopeでemitするか**は、どのSpanへ関連付くかに影響する。

Contextは、DB接続やTelemetry操作そのものを渡すReader環境とは別物である。

```text
Reader環境
  = DB / HTTP / Telemetry操作 / 設定などの依存

OpenTelemetry Context
  = current Spanなど、現在の実行scopeに属する情報
```

RAGScope側で独自TraceId / SpanIdや独自Context stackを作ってOpenTelemetryと二重管理しない。

## Span scope

Spanを作るAPIは、Spanの生成だけでなく、一般に次のscope管理も関係する。

```text
親Context
  ↓
child Spanを開始
  ↓
child Spanをcurrentにする
  ↓
actionを実行
  ↓
Spanを終了
  ↓
親Contextへ復元
```

例外やキャンセルがあってもSpan終了とContext復元が崩れないことが重要である。高水準helperを使うか低水準APIを組み合わせるかは、利用するSDKの実際の挙動を確認して決める。

## instrumentation scopeとservice.name

TracerやLoggerを作るときに渡すinstrumentation scope名と、Telemetryを発生させているサービスを識別する`service.name`は別物である。

```text
instrumentation scope
  = どのlibrary / instrumentationが計装したか

service.name
  = Telemetryを発生させているサービス自体の識別
```

同じ文字列を使う場合があっても、意味は同一ではない。

## 初期化と終了

一般的なライフサイクルは次の形になる。

```text
アプリ起動
  ↓
Provider / Processor / Exporter / Readerを構築
  ↓
Tracer / Logger / Meterなどを利用
  ↓
機能処理を繰り返す
  ↓
必要なTelemetryをflush
  ↓
Provider等をshutdown
  ↓
アプリ終了
```

`emit`やSpan終了が返った時点と、外部Exporterから観測可能になる時点が同じとは限らない。テストや終了処理では、必要に応じて`forceFlush`相当の操作を挟んでから確認する。

複数Providerを構築する場合は、途中の初期化失敗と終了時の一部失敗も考える。

```text
Provider A取得
Provider B取得
Provider C取得で失敗
    ↓
取得済みA / Bをどうcleanupするか
```

```text
shutdown Aで失敗
    ↓
B / Cのshutdownも続ける必要があるか
```

この挙動はSDKのhelper名から推測せず、採用するversionのソースと実測で確認する。

## 実装時に再確認すること

OpenTelemetryまわりを設計・実装するときは、古いメモを仕様として使わず、少なくとも次をその時点で確認する。

- 採用するpackageとversion
- Provider / Processor / Exporter / Readerの構築・解放API
- current Contextの取得・適用・復元方法
- LogRecord emit時にContextをどう決定するか
- 高水準Span helperの例外処理とcleanup
- 利用するSemantic Conventionの現在の定義とstability
- 統合初期化helperの部分初期化失敗時のcleanup
- flush / shutdownの失敗時の挙動
