---
status: doing
priority: medium
dateCreated: 2026-08-21T20:39:00+09:00
dateModified: 2026-08-24T08:58:49.750+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask RAGScope要求定義を用語集と整合させる]]"
    reltype: FINISHTOSTART
branch: RS-0020/system-architecture
timeEntries:
  - startTime: 2026-08-23T23:33:49.719Z
    description: Work session
    endTime: 2026-08-23T23:58:49.750Z
---

## Squash merge commit body

- システムアーキテクチャを、用語集と要求定義で整理した概念モデルへ整合させる
- RAGScopeが保存するデータ、一時的に進行する処理、主要コンポーネントの責務と境界を区別して整理する
- 正式用語の定義を用語集へ委ね、削除済み設計への参照や旧`execution_id`など、現在設計と食い違う箇所を全体構造に合わせて見直す

## 目的

RAGScope全体を、何を保存・管理するか、どんな処理が動くか、どのコンポーネントが担当するかという軸で一貫して説明できるシステム設計へ整理する。

## 完了条件

- RAGScopeアプリケーション、AI推論サービス、PostgreSQLの責務と依存方向が明確である
- 文書、評価データセット、評価データ、実験、実行結果などの主要データの関係を用語集と矛盾なく説明できる
- 永続データとtrace / spanなど一時的な処理追跡を混同していない
- 用語の意味をシステムアーキテクチャ側で重複して正本化していない
- 現在存在する機能設計への導線と、今後必要になった段階で作る設計の扱いが現在の`design/`と整合している
