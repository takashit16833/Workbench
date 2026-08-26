---
status: done
priority: medium
dateCreated: 2026-08-27T06:05:00+09:00
dateModified: 2026-08-27T06:16:47.211+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0021 構造化ログJSON Schemaとfixtureを現在契約へ更新する]]"
branch: RS-0021/separate-schema-validation
tasknotes_manual_order: tngmzzzzzzzz
completedDate: 2026-08-27
---

## Squash merge commit body

- 共有JSON Schemaとfixtureの適合検証を、現在のHaskell `LogEvent`生成JSONのSchema適合検証から分離する
- Haskell logging実装を変更せず、新SchemaへのHaskell追随をRS-0022で検証できる責務境界にする

## 目的

現在の共有Schemaを更新しても旧Haskell logging実装がRS-0021を妨げないよう、Schema・fixture検証とHaskell生成JSON検証の責務を分離する。

## 完了条件

- 共有Schemaとfixtureだけを対象にした適合・不適合検証を独立して実行できる
- 現在のHaskell `LogEvent`生成JSONを新Schemaへ適合させる変更をこのSubtaskへ含めていない
- Haskell生成JSONの新Schema適合はRS-0022で復旧・検証する責務として残っている
