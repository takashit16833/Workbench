---
status: todo
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-18T19:26:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask LogEvent生成とJSON変換を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0018/output-boundary
---

## Squash merge commit body

- 構造化ログをstderrへ1イベント1行で出力するローカル向けSinkを実装する
- ログ受付処理から具体的な出力先を分離し、Sinkを差し替えられる境界を作る
- メモリ保存Sinkと意図的に失敗するSinkを用意し、出力結果とログ基盤自身の失敗を自動テストできるようにする
- Sink失敗時に壊れたJSONや通常テキストを代替出力しない

## 目的

AI推論サービスの構造化ログを、production向けstderr出力とテスト向け出力で同じ受付境界から扱えるようにする。

ログ基盤自身の失敗を機能失敗と区別し、失敗した出力経路へフォールバック出力しない境界を作る。

## 関連Subtask

- 先行: [[RS-0018 subtask LogEvent生成とJSON変換を実装する|LogEvent生成とJSON変換を実装する]]
- 後続: [[RS-0018 subtask 機能処理と必須ログ結果の合成境界を実装する|機能処理と必須ログ結果の合成境界を実装する]]

## 完了条件

- stderrへ1イベント1行の構造化ログを出力できる
- ログ受付処理がstderrへ直接固定されていない
- 自動テストから`LogEvent`を直接検査できるメモリ保存Sinkがある
- 意図的に失敗するSinkでログ基盤自身の失敗を検査できる
- 出力失敗時に壊れたJSONや通常テキストを代替出力しない
