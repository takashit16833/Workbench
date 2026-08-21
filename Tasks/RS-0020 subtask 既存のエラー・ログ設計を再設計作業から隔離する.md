---
status: todo
priority: medium
dateCreated: 2026-08-21T09:16:00+09:00
dateModified: 2026-08-21T09:16:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
branch: RS-0020/isolate-existing-design
---

## Squash merge commit body

- 再設計対象の既存エラー・構造化ログ設計書を親branchの作業対象から取り除く
- 要求定義とシステムアーキテクチャは新設計の入力として残し、ADRは判断履歴として削除しない
- 既存の型、JSON Schema、実装を新しい論理モデルの制約として参照しない作業状態を作る

## 目的

既存のエラー・ログモデルを目にしたまま意味を後付けしないよう、白紙設計へ入る前に再設計対象の現在設計を作業branch上から隔離する。

## 完了条件

- 再設計対象のエラー・構造化ログ設計書がこの作業branchから取り除かれている
- 要求定義、システムアーキテクチャ、ADRの判断履歴は保持されている
- 正本リポジトリからWorkbenchへの参照を作っていない
