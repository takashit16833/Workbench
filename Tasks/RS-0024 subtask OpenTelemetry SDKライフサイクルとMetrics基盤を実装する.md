---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - "[[RS-0024 subtask OpenTelemetry依存とCabal境界を実装する]]"
branch: RS-0024/sdk-lifecycle-metrics
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-17T08:07:41.466+09:00
tags:
  - task
timeEntries:
  - startTime: 2026-09-16T21:32:00.735Z
    description: Work session
    endTime: 2026-09-16T21:43:44.755Z
  - startTime: 2026-09-16T21:48:30.657Z
    description: Work session
    endTime: 2026-09-16T22:01:46.714Z
  - startTime: 2026-09-16T22:09:14.994Z
    description: Work session
    endTime: 2026-09-16T22:34:15.050Z
  - startTime: 2026-09-16T22:40:37.347Z
    description: Work session
    endTime: 2026-09-16T22:55:43.026Z
  - startTime: 2026-09-16T22:57:46.407Z
    description: Work session
    endTime: 2026-09-16T23:07:41.466Z
---

## Squash merge commit body

- Trace / Logs / MetricsのSDK初期化と差し替え可能なProcessor / Exporter / Reader構成を追加した
- 部分初期化時のcleanupとflush / shutdownを実装した
- Metrics SDK接続とライフサイクルの失敗経路を自動テストで確認した

## 目的

Trace / Logs / MetricsのOpenTelemetry SDKを安全に初期化・終了でき、Processor / Exporter / Readerをローカル実行や自動テスト向けに差し替えられるライフサイクル基盤を実装する。

## 作業範囲

- Trace / Logs / MetricsのProviderを構成し、Processor / Exporter / Readerをローカル実行・自動テスト向けに差し替えられるSDK初期化入口を実装する
- callback等の安全な利用範囲で初期化済みTelemetry操作を提供し、終了時のflush / shutdownを実装する
- 第2・第3Provider取得失敗時に先に取得済みの資源をcleanupできる構成にする
- 一部のflush / shutdown失敗後も残りのProviderを終了できるようにする
- MeterProvider / Reader / Exporterを後続の標準Metric利用へ接続できる状態にし、RS-0023で定義していないRAGScope独自Metricは追加しない

## 完了条件

- Trace / Logs / MetricsのProviderを制御可能な構成で初期化・終了できる
- 部分初期化失敗時に取得済み資源がcleanupされる
- flush / shutdownの一部失敗後も残りの終了処理が実行される
- MeterProvider / Reader / Exporterの接続をテスト限定の測定で確認できる

## 実装時に再確認する調査メモ

- 以前確認した`hs-opentelemetry`の`initializeOpenTelemetry`では、複数Providerの取得途中で後段が例外になった場合の明示的なrollbackをhelper内部から確認できなかった。ただし、これは当時のpackage versionに対する調査結果であり、現在採用APIの仕様として扱わない。実装時に採用versionのソースを再確認する。
- SDKの統合helperを使う案と、各Providerを段階的に取得して取得直後からcleanupを登録する案を、部分初期化失敗と終了失敗の扱いまで含めて比較する。
- production向けの高水準入口では、必要性がなければ`SpanProcessor`、`LogRecordExporter`、ReaderなどのSDK型を呼び出し側へ要求しない。一方、Adapterの自動テストではproductionと同じAdapter実装へin-memoryのProcessor / Exporter / Readerを差し込める、狭い低水準構築入口を必要に応じて設ける。production用とtest用でAdapter本体を別実装にしない。
- このSubtaskでMetrics SDKを利用可能にすることと、application向けの万能`emitMetric name value attributes`を作ることは別である。手動Metric操作は、具体的なCounter / Histogram等が必要になった時点で最小限の境界を設計する。
