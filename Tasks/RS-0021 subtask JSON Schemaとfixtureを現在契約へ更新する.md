---
status: done
priority: medium
dateCreated: 2026-08-27T06:05:30+09:00
dateModified: 2026-08-27T07:32:17.490+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0021 構造化ログJSON Schemaとfixtureを現在契約へ更新する]]"
blockedBy:
  - uid: "[[RS-0021 subtask 共通Schema検証とHaskell生成JSON検証を分離する]]"
    reltype: FINISHTOSTART
branch: RS-0021/update-json-contract
tasknotes_manual_order: tnmzzzzzzzzy
completedDate: 2026-08-27
---

## Squash merge commit body

- 共有構造化ログJSON Schemaを現在のJSON表現契約へ更新する
- 現在契約を代表するvalid / invalid fixtureへ置き換え、共有Schema検証で適否を確認できるようにする
- 旧`schema_version`・`event_id`・`execution_id`・`operation`・固定`failed`・専用`error` object契約を共有Schemaから除去する

## 目的

共有JSON ContractとfixtureをRS-0020で確定した現在の構造化ログJSON表現へ置き換え、機械的に検証できる状態にする。

## 完了条件

- root必須項目`timestamp`、`component`、`event`、`level`、`trace_id`、`span_id`と任意の`message`、`attributes`をSchemaで検証できる
- `timestamp`、TraceId、SpanId、`level`の値形式が現在設計と一致する
- `attributes`がstring、number、boolean、array、objectを再帰的に扱い、`null`を拒否する
- `message`と`attributes`の省略、および空文字列・空array・空objectの保持を検証できる
- 特定のcomponent、event、error_typeを共有Schemaの固定enumへ閉じ込めていない
- 現在契約を代表するvalid fixtureが受理され、主要なinvalid fixtureが拒否される
