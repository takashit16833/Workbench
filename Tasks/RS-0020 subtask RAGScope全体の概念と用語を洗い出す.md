---
status: done
priority: medium
dateCreated: 2026-08-21T20:39:00+09:00
dateModified: 2026-08-22T07:16:19.142+09:00
tags:
  - task
projects:
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask 既存のエラー・ログ設計を再設計作業から隔離する]]"
    reltype: FINISHTOSTART
timeEntries:
  - startTime: 2026-08-21T21:02:07.382Z
    description: Work session
    endTime: 2026-08-21T21:27:07.416Z
  - startTime: 2026-08-21T21:38:58.714Z
    description: Work session
    endTime: 2026-08-21T22:03:58.931Z
  - startTime: 2026-08-21T22:09:37.576Z
    description: Work session
    endTime: 2026-08-21T22:16:19.142Z
completedDate: 2026-08-22
---

## Squash merge commit body

- 正本変更は行わず、RAGScope全体で共有されている概念・用語・包含関係・識別子・正本候補を現在の正本から洗い出す
- 同じ意味の別名、同じ名前の異なる意味、曖昧な粒度を整理し、後続の用語集作成へ引き継ぐ
- 決定済みの「評価データ」「評価データセット」を概念モデルへ組み込み、保存構造など未決定事項とは分ける

## 目的

RAGScope概要、要求定義、システムアーキテクチャを中心に、必要に応じて現在のコード・Schema・migrationなどへ遡り、後続文書が共有すべき概念と言葉を先に整理する。

## 完了条件

- RAGScope全体で共有する主要概念が、データ・処理・コンポーネント・実行追跡などの種類ごとに整理されている
- 各概念について意味、包含関係、似た概念との違い、主な正本候補を説明できる
- 曖昧な用語、表記揺れ、意味の衝突が後続作業で判断できる形に整理されている
- 用語集へ入れる候補と、一般技術用語として定義不要なものが区別されている
