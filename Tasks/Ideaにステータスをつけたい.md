---
status: waiting
priority: medium
scheduled: 2026-08-16
projects:
  - "[[Workbench]]"
branch: idea-status
dateCreated: 2026-08-16T15:01:53.993+09:00
dateModified: 2026-08-16T15:06:09+09:00
tags:
  - task
---

## Decision

Ideaの`status`はレビュー完了結果だけを保持する。

- 未設定: active
- `accepted`: 採用済み
- `rejected`: 却下済み
- deferred: `status`は未設定のまま`review_gate`を更新する

未レビューと再レビュー待ちは、どちらも`review_gate`が満たされたらレビューするという次の行動が同じため、別statusにはしない。

## Implementation

- FileclassのIdeaに`accepted` / `rejected`を選べる`status` Selectを追加
- DashboardのIdeas viewにStatus列を追加
- AGENTSにstatusとreview_gateの運用を明記
- 既存Ideaはmigrationしない

Branch: `idea-status`
Commit: `71f97a48e61823848b5c7dce9ba32e762369016e`

## Verification

- Fileclass 0.2.10のSelect / ValuesList形式と整合することを確認
- 実装差分がAGENTS.md / Bases/Dashboard.base / FileClasses/Idea.mdの3ファイルだけであることを確認
- Obsidian上のdropdown表示とDashboard表示は未確認
