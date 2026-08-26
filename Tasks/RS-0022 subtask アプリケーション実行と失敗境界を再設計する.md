---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-08-27T08:12:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask trace・spanによる実行追跡とログ関連付けを実装する]]"
    reltype: FINISHTOSTART
---

## Squash merge commit body

- logging再設計と実行追跡境界に合わせてアプリケーション実行結果と失敗確定の責務を組み直す
- `Observation`・`Result`・`AppError`を現在の責務から再評価し、不要な旧共通エラー・必須ログ合成構造を変更または削除する
- logging自身の失敗と機能失敗が重なった場合のRAGScopeアプリケーション固有の扱いをコードとテストで確定する

## 目的

旧logging基盤と一体化しているアプリケーション実行・失敗境界を、新しいlogging公開APIと実行追跡の責務に合わせて再構成する。

## 完了条件

- 機能処理の結果、最終失敗の確定、失敗ログ、`span`のStatus設定の担当箇所が一貫している
- logging失敗を同じlogging経路へ再帰的に記録しない
- `Observation`・`Result`・`AppError`は必要性を説明できる構造だけが残っている
- 旧共通エラー契約を維持するためだけの型や変換が残っていない
- 正常・機能失敗・logging失敗・両方の失敗について必要な自動テストがある
