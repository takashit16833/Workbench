---
status: todo
priority: medium
dateCreated: 2026-08-26T15:14:06+09:00
dateModified: 2026-08-26T15:16:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask 要求と外部標準から論理契約を設計する]]"
    reltype: FINISHTOSTART
---

## Squash merge commit body

- 同じ論理ログfixtureをJSONとSQLiteへ独立に投影し、それぞれから元の論理ログへ復元する試作を追加する
- 入れ子のarray / object、任意のmessage、属性0件、制御文字、timestamp、trace_id / span_id、error_type、ドメイン参照を代表ケースで検証する
- 検証条件、往復結果、外部形式固有の補助構造が論理契約へ影響しないことを新しいExperimentへ記録する

## 目的

現在の構造化ログ論理契約と共通外部表現を、JSONとSQLiteへそれぞれ直接投影して元の論理ログへ復元し、どちらか一方の物理構造に合わせて論理契約を変更する必要がないことを実測で確認する。

## 成果物

- `project-docs/experiments/構造化ログ論理契約のJSON・SQLite投影検証.md`
- 同じ論理ログfixtureをJSONとSQLiteへ独立に投影・復元する検証用の試作

## 完了条件

- JSONやSQLiteの構造に依存しない論理ログfixtureと同値判定規則が定義されている
- 同じfixtureをJSONとSQLiteへ直接投影し、JSONからSQLite、SQLiteからJSONの変換を経由していない
- string、number、boolean、mixed array、object、nested array / object、empty array、empty objectを往復できる
- `message`なし、空文字列の`message`、属性0件、制御文字を含むstringを往復できる
- arrayの順序を保持し、attributeとobject memberの順序を論理上の意味として扱っていない
- object member名の一意性と、数値を同じ論理値へ復元できることを確認している
- `timestamp`、`trace_id`、`span_id`、`error_type`、必要なドメイン参照を往復できる
- SQLite固有の`record_id`、`value_id`、table構造を論理契約へ追加していない
- JSON固有のobject階層をSQLite表現の前提にしていない
- 検証条件、実測結果、判明した問題、検証範囲内で言えることが新しいExperimentに記録されている
