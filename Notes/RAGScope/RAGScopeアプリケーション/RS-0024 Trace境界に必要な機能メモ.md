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


---
## 必要な知識

### Telemetry

システムの実行状態を観測するためのデータの総称。
RAGScopeでは主にTrace・Logs・Metricsを指す。

### Instrumentation Scope

Telemetryを生成した計装コードを識別する情報。
Tracerに紐づき、名前やversionなどを持つ。

- Instrumentation Scope: 誰がTelemetryを生成したか
- Trace Context: どのTrace / Spanの親子関係にいるか

両者は別の概念。

---
## ChatGPTへ質問するときのプロンプト

次の用語・型・関数について、Haddockを自分で読みながら理解したいです。
質問した範囲だけ、必要最小限で説明してください。

- まず一文で何かを説明する
- RAGScopeでなぜ関係するかを短く説明する
- 正確な理解に必要なら、混同しやすい概念との差を1つだけ補足する
- 私が求めるまで、候補関数名・検索語・実装方法などのネタバレは出さない
- 次に調べるものを先回りして列挙しない
- 私の理解が誤っている場合は、その点だけ明確に指摘する
