---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-08-27T08:42:40.210+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
branch: RS-0022/design-logging-architecture
---

## Squash merge commit body

- RAGScopeアプリケーションから見たloggingの公開API、module責務、依存方向を現在契約から組み直す
- 現在契約を直接表すlogging中核型と機能固有イベントから共通loggingへ渡す境界を実装する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを、新設計で不要な前提として残さない

## 進め方

Haskellコードへ着手する前に、`Notes/RAGScope/RAGScopeアプリケーション/RAGScope実行追跡・構造化ログ基盤.canvas`を新規作成する。`RAGScope旧共通実行基盤.canvas`はCanvasの粒度・配置・表現方法の参考に使い、旧設計の構造を引き継ぐ根拠にはしない。

Canvasでは少なくとも次を一つの全体像として完成させてから実装へ進む。

- 利用側から見た公開API
- module一覧と各責務
- module間の依存方向
- 中心となる型とデータの流れ
- 機能固有イベントから共通loggingへの境界
- `trace`・`span`と構造化ログの関係
- Runtime、Sink、JSON出力、テスト差し替え境界
- logging自身の失敗処理
- `Observation`、`Result`、`AppError`を維持・変更・削除するかの位置づけ

OpenTelemetryはRAGScopeの要求を決める基準ではなく、Canvasで定めるRAGScope側の実行追跡を実現するために利用する。

## 完了条件

- 新しいCanvasでHaskell logging基盤と周辺境界の全体像を説明できる
- Canvasの全体像を基準に公開APIと中核型が実装されている
- 既存module構成を残すこと自体を理由にした責務や型がない
- 後続SubtaskがCanvasと実装済み公開境界を基準に独立して進められる
- 正本リポジトリの設計書を変更した場合、Subtask終了前に作業時点の最新`RAGScope文書作業ルール.md`を再確認し、「必須の責務・配置チェック」を変更した設計書全体と差分に対して再実施している
