---
status: todo
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - "[[RS-0024 subtask OpenTelemetry依存とCabal境界を実装する]]"
branch: RS-0024/sdk-lifecycle-metrics
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T15:43:45+09:00
tags:
  - task
---

## Scope

- Trace / Logs / MetricsのProviderを構成し、Processor / Exporter / Readerをローカル実行・自動テスト向けに差し替えられるSDK初期化入口を実装する
- callback等の安全な利用範囲で初期化済みTelemetry操作を提供し、終了時のflush / shutdownを実装する
- 第2・第3Provider取得失敗時に先に取得済みの資源をcleanupできる構成にする
- 一部のflush / shutdown失敗後も残りのProviderを終了できるようにする
- MeterProvider / Reader / Exporterを後続の標準Metric利用へ接続できる状態にし、RS-0023で定義していないRAGScope独自Metricは追加しない

## Verification

- Trace / Logs / MetricsのProviderを制御可能な構成で初期化・終了できる
- 部分初期化失敗時に取得済み資源がcleanupされる
- flush / shutdownの一部失敗後も残りの終了処理が実行される
- MeterProvider / Reader / Exporterの接続をテスト限定の測定で確認できる

## Squash merge commit body

- Trace / Logs / MetricsのSDK初期化と差し替え可能なProcessor / Exporter / Reader構成を追加した
- 部分初期化時のcleanupとflush / shutdownを実装した
- Metrics SDK接続とライフサイクルの失敗経路を自動テストで確認した
