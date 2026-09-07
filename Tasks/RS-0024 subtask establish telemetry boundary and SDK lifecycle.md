---
status: todo
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/telemetry-boundary-sdk-lifecycle
dateCreated: 2026-09-07T21:22:00+09:00
dateModified: 2026-09-07T21:22:00+09:00
tags:
  - task
---

## Start condition

親Taskで進めるHaskell package / library / module依存構造Noteのレビュー完了後に着手する。設計Noteが確定するまではコードやCabal設定を変更しない。

## Scope

- RAGScope側のTelemetry利用境界とOpenTelemetry Adapterを実装する
- OpenTelemetry SDK依存を、設計Noteで決めたpackage / library境界へ閉じ込める
- Trace / Logs / Metricsに必要なSDK初期化とContext管理を実装する
- Processor / Exporterをローカル実行・自動テスト向けに差し替えられるようにする
- flush / shutdownを実装し、この範囲の自動テストを追加する

## Squash merge commit body

- RAGScope側のTelemetry利用境界とOpenTelemetry Adapterを追加した
- OpenTelemetry SDK依存を設計したCabal境界へ閉じ込めた
- SDK初期化、Context、Processor / Exporter、flush / shutdownの基盤と自動テストを追加した
