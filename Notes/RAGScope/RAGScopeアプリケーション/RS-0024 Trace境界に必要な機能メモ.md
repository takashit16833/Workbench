---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-09
---

# RS-0024 Trace境界に必要な機能メモ

> [!note]
> RS-0024のTrace境界を検討するためのWorkbench上の学習メモ。RAGScopeの正本ではない。

## RAGScopeとして欲しい機能

- root Spanを作成できる
- child Spanを作成できる
- Spanの実行範囲を開始・終了できる
- Span実行中はそのSpanを現在のSpanとして扱い、終了後は元へ戻せる
- Spanを`Unset`または`Error`として扱える
- `error.type`など必要な属性をSpanへ付けられる
- 未処理の同期例外がSpan外へ出るとき、Spanへ失敗情報を残しつつ元の例外を再throwできる
- 不要な例外Span Eventを重複して記録しない
- 現在のTrace Contextを後続処理へ引き継げる

### root Spanを作成できる
