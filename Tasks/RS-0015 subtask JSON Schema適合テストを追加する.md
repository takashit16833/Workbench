---
status: todo
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:28:30.406+09:00
dateModified: 2026-08-16T13:25:04.947+09:00
tags:
  - task
due: 2026-08-13
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0015 subtask ADR-0003に合わせてJSON契約とstderr出力を切り替える]]"
    reltype: FINISHTOSTART
branch: RS-0015/schema-validation
---

## Squash merge commit body

- valid fixtureがJSON Schemaへ適合することを自動テストする
- invalid fixtureがJSON Schemaから拒否されることを自動テストする
- Haskellが生成した代表的な`LogEvent`のSchema適合性を検証する
- execution / service、通常 / failed、optional fieldを代表ケースとして固定する

## 目的

RAGScopeアプリケーションが生成する構造化ログと共通fixtureが、`log-event.schema.json`へ適合することを自動テストで保証する。

JSON objectの項目順ではなく、Schemaへの適合性とJSONの意味を検査する。

## やること

- Draft 2020-12を検証できるJSON Schema validatorを選定する
- 採用前に一次資料と現在の依存関係を確認する
- valid fixtureがすべてSchemaへ適合することを検査する
- invalid fixtureがSchemaから拒否されることを検査する
- Haskellから生成した代表的な`LogEvent`がSchemaへ適合することを検査する
- execution contextを検査する
- service contextを検査する
- 通常イベントを検査する
- failedイベントを検査する
- `failed -> level = error + error必須`を検査する
- optional fieldが存在しないケースを検査する
- payloadのstring / number / boolean / array / objectを検査する
- JSON objectの項目順へ依存しないテストにする

## 完了条件

- valid fixtureがすべてSchemaへ適合する
- invalid fixtureが期待どおり拒否される
- Haskell生成JSONがSchemaへ適合する
- execution / service、通常 / failed、optional fieldの代表ケースを自動テストで確認できる
- JSON項目順に依存していない
