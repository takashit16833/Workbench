---
status: todo
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-18T19:26:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask LogEvent生成とJSON変換を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0018/schema-validation
---

## Squash merge commit body

- 共通のvalid fixtureがJSON Schemaへ適合することをPython側の自動テストで検証する
- 共通のinvalid fixtureがJSON Schemaから拒否されることを検証する
- AI推論サービスが生成した代表的な`LogEvent`のSchema適合性を検証する
- JSON objectの項目順ではなく意味とSchema適合性を検査する

## 目的

AI推論サービスが生成する構造化ログと共通fixtureを、`contracts/logging/v1/log-event.schema.json`へ適合させる自動テスト境界を作る。

Haskell側と同じSchemaを使い、実装言語に依存しない共通JSON契約を検証する。

## 関連Subtask

- 先行: [[RS-0018 subtask LogEvent生成とJSON変換を実装する|LogEvent生成とJSON変換を実装する]]
- 後続: [[RS-0018 subtask 共通エラーと構造化ログの設計書を実装へ同期する|共通エラーと構造化ログの設計書を実装へ同期する]]

## 完了条件

- valid fixtureがすべてSchemaへ適合する
- invalid fixtureが期待どおりSchemaから拒否される
- Python生成の代表的な`LogEvent`がSchemaへ適合する
- execution / service、通常 / failed、optional fieldの代表ケースを確認できる
- JSON objectの項目順へ依存していない
