---
status: todo
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:32:42.162+09:00
dateModified: 2026-08-14T11:09:00+09:00
tags:
  - task
due: 2026-08-13
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0015 subtask ログ出力境界とSink失敗時の挙動を検証する]]"
    reltype: FINISHTOSTART
branch: RS-0015/design-sync
---

## Squash merge commit body

- ADR-0003の`spec`構造と現在のJSON契約を構造化ログ設計へ反映する
- `Core`、Json Backend、Stderr Backend、Runtime、Setupの現在の責務境界を設計書へ同期する
- totalなJSON変換、optional field、省略規則、Sink failureの現在設計を反映する
- コード、Schema、ADR、設計書の未解消差異をなくす

## 目的

RS-0015で完成した実装、JSON Schema、ADR-0003の内容を、現在設計の正本へ反映する。

実装が安定した後に行い、作業途中の案やWorkbench固有の情報は正本リポジトリの設計書へ持ち込まない。

## 対象

- `design/エラー設計.md`
- `design/構造化ログ基本設計.md`
- `design/構造化ログ詳細設計.md`

## やること

- ADR-0003の`spec`構造を現在設計へ反映する
- JSON Schemaとの現在の関係を反映する
- 以下の現在の責務境界を実装と照合する
  - `Core`
  - `Backend.Json`
  - `Backend.Stderr`
  - `Runtime`
  - `Setup`
- `Backend.Json`によるtotalな純粋JSON変換を反映する
- `Backend.Stderr`がJSON / Aeson固有の変換責務を持たず、stderr出力とIO failure処理だけを担うことを反映する
- productionの出力経路で`Backend.Json`と`Backend.Stderr`を組み合わせる責務境界を反映する
- stderr Sinkで扱うfailureがIO由来のSink failureであることを反映する
- stdout / stderrの責務分離を反映する
- optional fieldの省略規則を反映する
- 実装で変更されていないエラー設計を不必要に書き換えない
- コード、Schema、ADR、設計書の間に未解消の差異がないことを確認する

## 完了条件

- 現在の実装と設計書が一致している
- ADR-0003の決定が構造化ログ設計へ反映されている
- JSON Schemaと設計書が矛盾していない
- Workbenchへのリンク、参照、前提条件を正本リポジトリへ作っていない
