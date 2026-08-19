---
status: todo
priority: medium
dateCreated: 2026-08-19T18:48:00+09:00
dateModified: 2026-08-19T18:48:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0019 構造化ログのイベントモデルを直和へ再設計する]]"
branch: RS-0019/event-model-design
---

## Squash merge commit body

- 通常イベントと失敗イベントを直和として扱い、不正な組み合わせを内部モデルで表現しにくくする判断をADR-0004へ記録する
- ADR-0003との関係を整理し、置き換える判断を`superseded`として明示する
- 構造化ログ基本設計と詳細設計を、内部不変条件を型で表しJSON境界で外部契約へ展開する方針へ更新する

## 目的

RS-0019の後続実装が共通して従うイベントモデル、不変条件、内部モデルと外部JSON契約の境界を確定する。

## 関連Subtask

- 後続:
  - [[RS-0019 subtask JSON Schemaで通常・失敗イベントの不変条件を保証する|JSON Schemaで通常・失敗イベントの不変条件を保証する]]
  - [[RS-0019 subtask HaskellのEventSpecを直和モデルへ変更する|HaskellのEventSpecを直和モデルへ変更する]]

## 完了条件

- ADR-0004で内部イベントモデルとJSON変換境界の判断が明確になっている
- ADR-0003との置換関係が整理されている
- 構造化ログ基本設計に通常イベントと失敗イベントの意味上の不変条件が反映されている
- 構造化ログ詳細設計にHaskell実装が従う責務境界が反映されている
- 後続のSchemaとHaskell実装が独立して着手できる判断基準が揃っている
