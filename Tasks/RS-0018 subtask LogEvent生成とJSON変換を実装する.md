---
status: doing
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-20T15:09:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask 共通エラーと例外変換境界を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0018/log-event-json
timeEntries:
  - startTime: 2026-08-19T05:20:19.887Z
    description: Work session
    endTime: 2026-08-19T05:45:19.908Z
  - startTime: 2026-08-19T06:02:38.053Z
    description: Work session
    endTime: 2026-08-19T06:27:38.116Z
  - startTime: 2026-08-19T06:35:02.947Z
    description: Work session
    endTime: 2026-08-19T07:00:03.041Z
  - startTime: 2026-08-19T07:05:42.401Z
    description: Work session
    endTime: 2026-08-19T07:30:42.451Z
  - startTime: 2026-08-19T07:37:25.497Z
    description: Work session
    endTime: 2026-08-19T08:02:25.580Z
  - startTime: 2026-08-19T21:06:14.291Z
    description: Work session
    endTime: 2026-08-19T21:31:14.352Z
  - startTime: 2026-08-19T21:41:17.014Z
    description: Work session
    endTime: 2026-08-19T22:06:17.079Z
  - startTime: 2026-08-19T22:11:55.278Z
    description: Work session
    endTime: 2026-08-19T22:36:55.332Z
  - startTime: 2026-08-19T22:43:10.125Z
    description: Work session
    endTime: 2026-08-19T23:08:10.181Z
  - startTime: 2026-08-19T23:50:21.830Z
    description: Work session
    endTime: 2026-08-20T00:15:21.892Z
  - startTime: 2026-08-20T00:22:23.007Z
    description: Work session
    endTime: 2026-08-20T00:47:23.064Z
---

## Squash merge commit body

- Envelope、EventContext、EventSpecからなる`LogEvent`の意味上の構造をPythonで表現し、通常イベントと失敗イベントを型または同等の境界で区別する
- execution / service context、`execution_id`、`event_id`、記録時刻を現在の共通契約に沿って扱う
- 失敗イベント名と`error` levelを内部の独立入力として持たず、失敗variantからJSON変換境界で導出する
- optional fieldを`null`で残さず省略し、完成した意味上有効な`LogEvent`をv1の共通JSON表現へ投影する

## 目的

現在の構造化ログ設計で定義した意味と不変条件をAI推論サービスのPython内部モデルで表現し、構造化ログJSON表現設計と共通JSON契約へserialization境界で投影できるようにする。

通常の機能処理から任意のログ構造を直接組み立てさせず、閉じたイベント表現から共通`LogEvent`へ変換できる境界を作る。

## 現在地

- RS-0019は完了し、通常イベントと失敗イベントを直和または同等の意味構造として区別する共通契約が確定している
- `ExecutionContext` / `ServiceContext`と安全な`LogError`への投影は現在契約と整合しており、継続利用できる
- 現在branchの`EventSpec`はRS-0019以前の`event`、`level`、optionalな`error`を独立入力として持つため、新しい意味モデルへ合わせ直す必要がある
- 共通fixtureを使ったJSON Schema適合性の網羅検証は後続の`RS-0018/schema-validation`で行う

## やること

1. `EventSpec`を通常イベントと失敗イベントの直和または同等の型表現へ変更する
2. Envelopeと完成済み`LogEvent`を表現し、execution / service contextと識別子・記録時刻を組み合わせる
3. 内部モデルとは別のserialization境界でv1 JSONへ投影し、失敗variantから`event = failed`と`level = error`を導出する
4. 通常 / 失敗、execution / service、optional field省略の単体テストを追加し、`make check-ai`を通す

## 関連Subtask

- 先行: [[RS-0018 subtask 共通エラーと例外変換境界を実装する|共通エラーと例外変換境界を実装する]]
- 後続:
  - [[RS-0018 subtask 共通JSON Schema適合テストを追加する|共通JSON Schema適合テストを追加する]]
  - [[RS-0018 subtask ログ出力境界とSink失敗を実装する|ログ出力境界とSink失敗を実装する]]

## 完了条件

- Envelope、EventContext、EventSpecからなる`LogEvent`の意味をPythonで表現できる
- EventSpecが通常イベントと失敗イベントを区別し、通常イベントは通常イベント名と通常レベル、失敗イベントは安全な`LogError`を必須とする
- 失敗イベントで固定的に決まるイベント名と`error` levelを内部の独立入力として保持しない
- execution eventとservice eventを区別できる
- 呼び出し元の`execution_id`を引き継ぎ、イベントごとに`event_id`と記録時刻を付与できる
- 失敗variantから`event = failed`、`level = error`、`error`を導出し、通常variantでは通常イベント名、通常level、`error`なしとしてv1 JSONへ投影できる
- 該当しないoptional fieldを`null`で残さず省略できる
- 関連単体テストと`make check-ai`が成功する
