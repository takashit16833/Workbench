---
status: doing
priority: medium
dateCreated: 2026-08-26T21:00:57+09:00
dateModified: 2026-09-03T09:31:23+09:00
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

- 正本Ticketを作業範囲・完了条件の正本とし、WorkbenchへTicket本文や設計全文を複製しない。
- Workbenchでは現在地、次の行動、Subtask依存、実装候補、判断の経緯だけを管理する。
- 全体構造は`Notes/RAGScope/RAGScopeアプリケーション/実行追跡・構造化ログ概要図.md`、実装検討は`実行追跡・構造化ログ設計ノート.md`、静的依存は`実行追跡・構造化ログ静的依存図.md`以下のMermaid図、判断履歴は`実行追跡・構造化ログ設計日誌.md`を使う。
- Operation / UseCase / ErrorType / logging契約の決定済み内容はRAGScope正本の設計書を参照し、Workbench側へ別の現在仕様を作らない。
- 現在実行中のSubtaskは`RS-0022 subtask 実行追跡・構造化ログの全体設計を確定する`。
- logging / tracing / observabilityの責務、公開API、Cabal依存、データの流れを先に確定し、その構造を基準に既存実装を置き換える。
- `ragscope-tracing`はTracing PortとTrace Context契約だけを公開し、OpenTelemetry具体実装は`ragscope` package内のprivate `ragscope-tracing-otel`へ置く。OpenTelemetry SDKへ直接依存するのはこのprivate libraryだけとする。
- `Observation`、`Result`、`AppError`など既存moduleは維持を前提にせず、後続のApplication実行・失敗境界Subtaskで必要性を判断する。
- OpenTelemetryはRAGScopeが決めたtrace / span境界を実装するために使い、OpenTelemetry側の構造をRAGScopeの要求へそのまま持ち込まない。

## 未割当の完了条件

正本TicketはSQLite投影・migration・transaction・復元・往復テストを完了条件へ含めている。一方、現在のWorkbenchにはSQLite実装を担当する独立Subtaskがない。

SQLite実装へ着手する前に、既存Subtaskへ含めるか独立Subtaskへ分けるかを決める。独立Subtaskへ分ける場合は、RAGScope正本リポジトリに対応する実branchを作成してから`branch`と`blockedBy`を設定する。
