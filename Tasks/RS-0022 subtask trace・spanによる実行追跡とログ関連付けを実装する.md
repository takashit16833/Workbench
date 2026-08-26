---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-08-27T08:33:40+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask logging全体像を設計して公開APIと中核型を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0022/implement-tracing
---

## Squash merge commit body

- 1回のユースケース実行を`trace`・root `span`として扱うRAGScopeアプリケーション側の実行追跡境界を実装する
- 構造化ログへ対応する`TraceId`・`SpanId`を渡し、ログを発生時の`span`へ関連付けられるようにする
- `span`と構造化ログの両方で失敗を記録する場合に同じ`error_type`を使用できる境界を実装する

## 目的

Canvasで確定したRAGScope側の責務を基準に、OpenTelemetryの`trace`・`span`実装を利用して実行追跡とログ関連付けを実現する。

## 完了条件

- RAGScopeが定めたユースケース実行境界でroot `span`を開始・終了できる
- loggingが発生時の`TraceId`・`SpanId`を現在契約へ渡せる
- 失敗時の`error_type`を`span`とログで共有できる
- OpenTelemetry固有の都合だけを理由にRAGScopeの公開APIや論理契約を増やしていない
- 実行追跡境界を自動テストで確認できる
