---
status: done
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:28:30.406+09:00
dateModified: 2026-08-17T12:34:26.949+09:00
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
timeEntries:
  - startTime: 2026-08-16T09:01:15.324Z
    description: Work session
    endTime: 2026-08-16T09:26:15.429Z
  - startTime: 2026-08-16T21:23:58.705Z
    description: Work session
    endTime: 2026-08-16T21:48:58.864Z
  - startTime: 2026-08-16T21:54:27.111Z
    description: Work session
    endTime: 2026-08-16T22:19:27.154Z
  - startTime: 2026-08-16T22:26:29.059Z
    description: Work session
    endTime: 2026-08-16T22:31:12.976Z
  - startTime: 2026-08-17T03:09:26.884Z
    description: Work session
    endTime: 2026-08-17T03:34:26.949Z
completedDate: 2026-08-17
---

## Squash merge commit body

- valid fixtureがJSON Schemaへ適合することを自動テストする
- invalid fixtureがJSON Schemaから拒否されることを自動テストする
- Haskellが生成した代表的な`LogEvent`のSchema適合性を検証する
- execution / service、通常 / failed、optional fieldを代表ケースとして固定する

## 目的

RAGScopeアプリケーションが生成する構造化ログと共通fixtureが、`log-event.schema.json`へ適合することを自動テストで保証する。

JSON objectの項目順ではなく、Schemaへの適合性とJSONの意味を検査する。

## 引き継ぎ

- 前提Subtask「ADR-0003に合わせてJSON契約とstderr出力を切り替える」は完了し、親branch `feat/RS-0015-common-error-logging-completion`へSquash merge済み（`d03f10dc8f63fca777a27e0946f8a0697db6f212`）
- 親branchの現在HEADは`89f58777319a26eae447a7b3ff93765bea81484f`。このSubtask用branch `RS-0015/schema-validation`はまだ作成されていないため、作業開始時に最新の親branchから作成する
- `log-event.schema.json`とvalid / invalid fixtureはADR-0003の`spec`構造へ更新済み。適合テストで実際の不整合が見つからない限り、このSubtaskでSchema構造を再設計しない
- `Backend.Json`ではAesonによるJSON表現とproduction向けencodingが実装済み。既存`JsonSpec`は各型と`LogEvent`のJSON表現を意味ベースで検査しているため、このSubtaskでは同じobject比較を重複させずSchema適合性を追加する
- `RAGScope.Logging.Testing`の固定値と代表`LogEvent`をSchema適合テストへ再利用できる
- 現在のtest-suiteはHspecを使用し、JSON Schema validator依存はまだない。Draft 2020-12対応、GHC 9.12.4との互換性、Aeson `Value`との接続方法を一次資料で確認してから採用する
- 直前Subtaskでは`make check`がformat、build、39 examples / 0 failures、Haddock生成まで成功している

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
