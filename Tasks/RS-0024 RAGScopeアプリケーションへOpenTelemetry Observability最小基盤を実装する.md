---
status: doing
projects:
  - "[[RAGScope]]"
source: https://github.com/takashit16833/RAGScope/blob/main/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%B8OpenTelemetry%20Observability%E6%9C%80%E5%B0%8F%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md
branch: feat/RS-0024-opentelemetry-observability-foundation
dateCreated: 2026-09-07T21:22:00+09:00
dateModified: 2026-09-16T09:47:00+09:00
tags:
  - task
---

## Current

`未処理例外のEventRecordをexactly-onceで記録する` Subtaskまで完了し、親branchへSquash merge済み。

後続機能が利用するTelemetry境界の具体化として、`後続機能向けTelemetry利用APIを設計・実装する` Subtaskを追加した。これによりRS-0024は9つのSubtaskで実行管理する。

## Next

- `後続機能向けTelemetry利用APIを設計・実装する` Subtaskで、EventName、EventRecord構築、機能固有値からTrace / Logs表現への変換境界と依存方向を確定する
- その後は未完了Subtaskを`blockedBy`に従って進める
- 最後にアプリ起動への組み込みとRS-0024完了条件の統合検証を行う
