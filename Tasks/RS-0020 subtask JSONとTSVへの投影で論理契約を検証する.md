---
status: dropped
priority: medium
dateCreated: 2026-08-21T09:16:00+09:00
dateModified: 2026-08-26T15:15:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask 要求と外部標準から論理契約を設計する]]"
    reltype: FINISHTOSTART
---

## 結果

正本Ticketの現在内容ではJSONとSQLiteへの投影検証が必要になったため、このSubtaskは実施しない。後継は`[[RS-0020 subtask JSONとSQLiteへの投影で論理契約を検証する]]`とする。

## Squash merge commit body

- 確定したTrace / Span / LogRecord / 共通エラーの論理契約をJSONとTSVへ独立に投影する試作を追加する
- JSONのobject構造やTSVの表形式に論理契約を合わせず、形式ごとの変換規則として実現する
- TraceとSpanの親子関係、LogRecordとの相関、共通エラーを両形式で表現し、投影で判明した制約と論理契約への影響をExperimentへ記録する

## 目的

性質の異なるJSONとTSVへ同じ論理契約を投影し、特定のserialization形式から共通モデルが決まっていないことを検証する。

## 完了条件

- JSONとTSVの両方で代表的なTrace、Span、LogRecord、共通エラー、ドメイン参照を表現できる
- TraceId / SpanIdによるSpan間の関係とLogRecordとの相関を両形式から確認できる
- TSVを本番形式として要求していない
- 形式固有の都合を共通論理契約の制約として追加していない
- 検証条件、結果、見つかった問題がExperimentに記録されている
