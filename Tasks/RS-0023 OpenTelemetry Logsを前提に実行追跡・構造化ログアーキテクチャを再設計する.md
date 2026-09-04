---
note_type: task
status: todo
projects: ["[[RAGScope]]"]
source: "https://github.com/takashit16833/RAGScope/blob/docs/RS-0023-redesign-observability-with-otel-logs/project-docs/project-management/milestones/v0.0/error-logging/RS-0023%20OpenTelemetry%20Logs%E3%82%92%E5%89%8D%E6%8F%90%E3%81%AB%E5%AE%9F%E8%A1%8C%E8%BF%BD%E8%B7%A1%E3%83%BB%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3%E3%82%92%E5%86%8D%E8%A8%AD%E8%A8%88%E3%81%99%E3%82%8B.md"
branch: docs/RS-0023-redesign-observability-with-otel-logs
---
# RS-0023 OpenTelemetry Logsを前提に実行追跡・構造化ログアーキテクチャを再設計する

## 現在地

RS-0022を置き換えるTicketとしてRS-0023を開始する。OpenTelemetry Logsを採用方針の出発点とし、RAGScopeが所有する意味・契約とOpenTelemetryへ委ねる仕組みの境界から実行追跡・構造化ログアーキテクチャを再設計する。

## 次の行動

- RAGScope要求定義と現在のシステム構造を確認する
- Observabilityによって後から何を識別・確認できる必要があるかを要求から整理する
- OpenTelemetry Trace / LogsとHaskell / Python実装の能力・制約を照合する

当面は親Taskのみで進め、独立してSquash mergeできる変更単位が実際に生じた場合だけSubtaskを作成する。
