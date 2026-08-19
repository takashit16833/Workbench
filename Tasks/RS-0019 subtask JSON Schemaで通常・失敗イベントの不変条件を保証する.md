---
status: done
priority: medium
dateCreated: 2026-08-19T18:48:00+09:00
dateModified: 2026-08-19T20:56:50.315+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0019 構造化ログのイベントモデルを直和へ再設計する]]"
blockedBy:
  - uid: "[[RS-0019 subtask 構造化ログイベントモデルの設計判断を確定する]]"
    reltype: FINISHTOSTART
branch: RS-0019/schema-invariants
completedDate: 2026-08-19
---

## Squash merge commit body

- `log-event.schema.json`を通常イベントと失敗イベントの相互排他的な不変条件を検証できる形へ更新する
- 通常イベントの`level = error`、失敗イベントの非`error` level、通常イベントへの`error`付与を拒否するinvalid fixtureを追加する
- valid / invalid fixtureとSchema適合テストを更新し、外部JSON構造を維持したまま新しい契約を固定する

## 目的

共通JSON契約で、通常イベントと失敗イベントの矛盾した`event`、`level`、`error`の組み合わせを機械的に拒否できるようにする。

## 関連Subtask

- 先行: [[RS-0019 subtask 構造化ログイベントモデルの設計判断を確定する|構造化ログイベントモデルの設計判断を確定する]]
- 後続: [[RS-0019 subtask 共通ログ契約とHaskell実装の整合性を検証する|共通ログ契約とHaskell実装の整合性を検証する]]

## 完了条件

- 通常イベントは`event != failed`、`level = debug | info | warn`、`error`なしとしてSchemaへ適合する
- 失敗イベントは`event = failed`、`level = error`、`error`必須としてSchemaへ適合する
- 矛盾した組み合わせを代表するinvalid fixtureがSchemaから拒否される
- 既存の外部JSONの`LogEvent` / `spec`項目構造を変更していない
- Schema適合テストが更新後のfixtureを検証できる
