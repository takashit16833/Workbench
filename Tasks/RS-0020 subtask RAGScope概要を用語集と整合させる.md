---
status: doing
priority: medium
dateCreated: 2026-08-21T20:39:00+09:00
dateModified: 2026-08-22T07:17:16.288+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask RAGScope用語集を作成する]]"
    reltype: FINISHTOSTART
branch: RS-0020/overview
---

## Squash merge commit body

- RAGScope概要を用語集の概念と用語へ整合させる
- RAGScopeが何を扱い、何を比較・追跡するアプリケーションかを高い粒度で理解できる説明へ整理する
- 「評価データ」「評価データセット」を現在の決定に合わせて使い分け、詳細なデータ構造や実現方法は要求・設計へ委ねる

## 目的

RAGScopeの目的、価値、想定利用方法、主な能力を、後続の要求定義や設計と同じ概念と言葉で説明できる状態にする。

## 完了条件

- 概要だけでRAGScopeが何をするアプリケーションか初見で理解できる
- 用語集と異なる名称や粒度で主要概念を再定義していない
- 評価データ1件と評価データセットの意味を混同していない
- 要求や設計の詳細、DB・型・APIなどの実現方法を概要へ持ち込んでいない
