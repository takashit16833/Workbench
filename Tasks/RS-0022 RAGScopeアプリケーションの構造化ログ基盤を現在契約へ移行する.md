---
status: doing
priority: medium
dateCreated: 2026-08-26T21:00:57+09:00
dateModified: 2026-09-01T09:48:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
source: obsidian://open?vault=project-docs&file=project-management/milestones/v0.0/error-logging/RS-0022%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E5%9F%BA%E7%9B%A4%E3%82%92%E7%8F%BE%E5%9C%A8%E5%A5%91%E7%B4%84%E3%81%B8%E7%A7%BB%E8%A1%8C%E3%81%99%E3%82%8B
blockedBy:
  - uid: "[[RS-0021 構造化ログJSON Schemaとfixtureを現在契約へ更新する]]"
    reltype: FINISHTOSTART
branch: RS-0022/design-logging-architecture
---

## 実行方針

- 正本Ticketの現在内容を作業範囲の正本とし、Workbench側へTicket本文を複製しない。
- 既存のlogging module構成を前提に局所修正せず、利用側から見たAPI、module責務、依存方向、データの流れを先に設計する。
- 最初のSubtaskでは、`Notes/RAGScope/RAGScopeアプリケーション/RAGScope旧共通実行基盤.canvas`を表現方法の参考にし、新しい`RAGScope実行追跡・構造化ログ基盤.canvas`を基準に全体像を整理してからHaskell実装へ入る。
- 全体設計では、`1利用者操作 = 1 trace`、UseCase子span、trace外のlifecycle log、UseCase結果とOperation全体結果の分離を前提にする。
- loggingの自然な境界を作るために必要であれば、`Observation`、`Result`、`AppError`を含む周辺moduleの変更・統合・削除も許容する。
- OpenTelemetryへRAGScopeの設計を合わせるのではなく、RAGScopeが必要とする実行追跡を実現するためにOpenTelemetryの設計と実装を利用する。`OpenTelemetryがそうしているから`だけをRAGScope固有の設計理由にしない。
