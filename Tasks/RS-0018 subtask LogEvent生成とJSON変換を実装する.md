---
status: todo
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-18T18:55:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask 共通エラーと例外変換境界を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0018/log-event-json
---

## Squash merge commit body

- Envelope、`context`、`spec`からなる`LogEvent`の意味上の構造をPythonで表現する
- execution / service context、`execution_id`、`event_id`、記録時刻を現在の共通契約に沿って扱う
- `failed`イベントの`level = error`と`error`必須、それ以外の`error`禁止を生成境界で保証する
- optional fieldを`null`で残さず省略し、完成した`LogEvent`を共通JSON契約へ変換する

## 目的

現在の構造化ログ基本設計と共通JSON契約を、AI推論サービスのPython実装で扱える形にする。

通常の機能処理から任意のログ構造を直接組み立てさせず、閉じたイベント表現から共通`LogEvent`へ変換できる境界を作る。

## 完了条件

- Envelope、`context`、`spec`の構造をPythonで表現できる
- execution eventとservice eventを区別できる
- 呼び出し元の`execution_id`を引き継ぎ、イベントごとに`event_id`と記録時刻を付与できる
- failedイベントの不変条件を生成境界で保証できる
- 該当しないoptional fieldを省略できる
- 完成した`LogEvent`を共通JSON契約へ変換できる
