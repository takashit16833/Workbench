---
status: done
priority: medium
scheduled: 2026-08-19
dateCreated: 2026-08-19T12:55:09.392+09:00
dateModified: 2026-08-19T14:03:28.276+09:00
tags:
  - task
timeEntries:
  - startTime: 2026-08-19T04:10:38.119Z
    description: Work session
    endTime: 2026-08-19T04:35:38.211Z
  - startTime: 2026-08-19T04:41:17.487Z
    description: Work session
    endTime: 2026-08-19T05:03:28.276Z
projects:
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask AI推論サービスのPython実装・テスト基盤を作る]]"
    reltype: FINISHTOSTART
completedDate: 2026-08-19
---

## Squash merge commit body

- pushとPull RequestでAI推論サービスの品質検査を起動するGitHub Actions workflowを追加する
- Pythonとuvをプロジェクト定義に沿って準備し、`uv.lock`から開発依存を再現する
- CIから`make check-ai`を実行し、Ruff、Pyright、pytestをローカルと同じ入口で検査する
- 外部Actionをcommit SHAへ固定し、リポジトリ読み取り専用権限でCIを実行する

## 目的

AI推論サービスの品質検査をpushとPull Requestで自動実行し、RS-0018の後続実装でもローカルと同じ検査基準を継続して確認できるようにする。

正本Ticketの共通エラー・構造化ログ仕様を増やさず、既存の`make check-ai`をGitHub Actionsから実行できるようにする。

## 現在地

- `RS-0018/ai-ci`へGitHub Actions workflowを追加し、push済み
- 意図的な失敗テストでpytest失敗がCIを失敗させることを確認し、実験用変更を削除済み
- 復旧後のCIは成功している
- 親branchとの差分は`.github/workflows/ai-service-ci.yml`だけで、Squash merge可能な状態

## 完了条件

- pushとPull RequestでAI推論サービスのCIが起動する
- `pyproject.toml`、固定したuv、`uv.lock`からCI環境を再現できる
- CIが`make check-ai`を実行し、Ruff、Pyright、pytestの失敗を検出できる
- CIにリポジトリへの書き込み権限を与えない
- 実験用の失敗テストが最終差分へ残っていない
- 親branchへSquash merge後、意図したworkflowが反映されていることを確認する
