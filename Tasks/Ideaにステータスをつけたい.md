---
status: waiting
priority: medium
scheduled: 2026-08-16
projects:
  - "[[Workbench]]"
branch: idea-status
dateCreated: 2026-08-16T15:01:53.993+09:00
dateModified: 2026-08-16T15:17:00+09:00
tags:
  - task
---

## Decision

Ideaの`status`は明示的に保持する。

- `active`: レビュー対象
- `accepted`: 採用済み
- `rejected`: 却下済み
- deferred: `status: active`のまま`review_gate`を更新する

未レビューと再レビュー待ちは、どちらも`review_gate`が満たされたらレビューするという次の行動が同じため、別statusにはしない。

新規Ideaは最初から`status: active`を持たせ、ユーザーがstatusプロパティの追加を意識しなくてよい状態にする。既存Ideaにも一度だけ`status: active`を追加する。

## Implementation

- FileclassのIdeaに`active` / `accepted` / `rejected`を選べる`status` Selectを追加
- Ideaテンプレートに`status: active`を追加
- 既存Ideaへ`status: active`をmigration
- DashboardのIdeas viewにStatus列を表示
- AGENTSにstatusとreview_gateの運用を明記

Branch: `idea-status`

## Verification

- Fileclass 0.2.10のSelect / ValuesList形式と整合することを確認
- 既存Ideaはすべて`review_gate`を持つactiveなIdeaであることを確認
- Obsidian上のdropdown表示、新規Idea作成時のstatus付与、Dashboard表示は未確認
