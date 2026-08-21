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
blockedBy:
  - uid: "[[RS-0020 subtask 既存設計・ADR・契約との差分を整理する]]"
    reltype: FINISHTOSTART
branch: RS-0020/apply-canonical-design
---

## Squash merge commit body

- 新しい論理契約に基づいて、責務が必要なエラー・構造化ログ設計書を新規作成または再構成する
- 置き換える既存ADRを`superseded`として整理し、必要な新しいADRへ判断と理由を記録する
- システムアーキテクチャなど関連する現在設計を必要な範囲だけ更新し、実装変更が別作業なら正本Ticketを作成する

## 目的

検証済みの論理契約と既存設計との差分を、現在設計と判断履歴の正本へ反映する。

## 完了条件

- 現在有効なエラー・ログ・関連付けの設計を、過去Ticketや旧設計を読まず理解できる
- 文書の分割が各設計対象の責務に対応している
- ADRの現在statusと置換関係が新しい判断に一致している
- 正本リポジトリからWorkbenchへの参照がない
- 実装・Contractの後続変更が必要な場合は対応する正本Ticketが作成されている
