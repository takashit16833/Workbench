---
tags:
  - task
status: todo
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
next_action: Step 15完了後に着手
dateModified: 2026-08-11T08:03:22.283+09:00
priority: medium
---

# ステップ16：Setupと本番Logger初期化を実装する

- `RAGScope.Logging.Setup` から本番用 `Logger` を初期化できるようにする
- ID生成、時刻、context、最低ログレベル、stderr Sinkを組み合わせる
