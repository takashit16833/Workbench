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
### 必要な知識
### Telemetry
**Telemetry = システムの実行状態を外から観測するために収集・送信する情報の総称**です。

今回のRAGScope / OpenTelemetry文脈だと、主に

- **Trace**：処理がどの経路を通ったか
    
- **Logs**：何が起きたかという記録
    
- **Metrics**：回数・時間・量などの数値
    

をまとめてTelemetryと呼んでいます。

かなり短く言うなら、

> **Telemetry = システムが自分の動きを外へ知らせるための観測データ**

です。
### Instrumentation Scope
**Instrumentation Scope = 「このTelemetryを誰が生成したか」を表す識別情報**です。

例えば、

```text
RAGScope application
  └─ OpenTelemetry Adapter
       └─ Tracer
            └─ Span
```

というとき、その`Tracer`に

```text
name    = "ragscope"
version = "0.0.1"
```

のような情報を持たせて、

> このSpanは`ragscope`という計装コードが生成しました

と識別できるようにします。

OpenTelemetryの説明でも、`Tracer`は`TracerProvider`から取得され、**instrumentation library / application component単位にscopeされ、library名やversionを持つ**とされています。

大事なのは、**Spanの親子関係を作るscopeではない**ことです。

```text
Instrumentation Scope
→ 誰がTelemetryを生成したか

Trace Context
→ どのTrace/Spanの親子関係にいるか
```

この2つは別物です。

RAGScopeならまず、

> `RAGScope.Telemetry.OpenTelemetry`が使うTracerのInstrumentation Scopeを何にするか

というところで登場する概念ですね。