---
status: doing
priority: medium
dateCreated: 2026-08-19T18:48:00+09:00
dateModified: 2026-08-19T20:57:05.451+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0019 構造化ログのイベントモデルを直和へ再設計する]]"
blockedBy:
  - uid: "[[RS-0019 subtask 構造化ログイベントモデルの設計判断を確定する]]"
    reltype: FINISHTOSTART
branch: RS-0019/haskell-event-model
---

## Squash merge commit body

- `RAGScope.Logging.Core`の`EventSpec`を通常イベントと失敗イベントを区別する直和または同等の型表現へ変更する
- 失敗時の`event = failed`と`level = error`を内部の独立入力から除き、Runtimeで使う実効levelとJSON契約上の値をイベントvariantから導出する
- `Backend.Json`、Testing、Runtime・JSON変換関連テストを新しい内部モデルへ整合させ、完成済み`LogEvent`からJSONへのtotalな純粋変換を維持する

## 目的

Haskell内部で通常イベントと失敗イベントの不正な組み合わせを構築できないイベントモデルを実装し、既存の外部JSON契約へ純粋に投影できるようにする。

## 関連Subtask

- 先行: [[RS-0019 subtask 構造化ログイベントモデルの設計判断を確定する|構造化ログイベントモデルの設計判断を確定する]]
- 後続: [[RS-0019 subtask 共通ログ契約とHaskell実装の整合性を検証する|共通ログ契約とHaskell実装の整合性を検証する]]

## 完了条件

- 通常イベントと失敗イベントを型で区別できる
- 通常イベントから`Error` levelや`LogError`付きの状態を構築できない
- 失敗イベントでは`LogError`が必須で、`failed`と`error` levelを独立入力として持たない
- Runtimeの最低ログレベル判定が新しいモデルから導出した実効levelで動作する
- JSON変換結果が既存の外部JSON構造を維持する
- 関連するHaskellテストが新しいモデルを検証できる
