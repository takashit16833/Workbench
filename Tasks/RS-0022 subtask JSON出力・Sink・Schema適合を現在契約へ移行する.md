---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-01T09:48:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask logging全体像を設計して公開APIと中核型を実装する]]"
    reltype: FINISHTOSTART
branch: RS-0022/update-json-sink-schema
---

## Squash merge commit body

- logging中核型を現在の構造化ログJSON表現へ投影するserializationを実装する
- trace内ログとtrace外ログの両方を同じJSON / Sink境界で扱い、`trace_id`・`span_id`の両方あり／両方なし制約を実装する
- stderr・memoryなどのSink境界を新しいlogging Runtimeへ接続し、1ログ1JSON objectを1物理行で出力する
- 共有fixtureとSchemaへHaskell側のSchema適合テストを追随させる

## 目的

Canvasと新しいlogging中核型を基準に、JSON外部表現・Sink・テスト差し替え境界を現在契約へ移行する。利用者操作中のtrace関連ログとApplication lifecycleなどのtrace外ログを別Logging基盤へ分けず、同じ`LogRecord`からJSONへ投影する。

## 完了条件

- `timestamp`、`component`、`event`、`level`と任意の`message`・`attributes`を現在JSON契約へ出力できる
- trace内ログでは`trace_id`・`span_id`を組で出力し、trace外ログでは両方を省略できる
- `trace_id`だけ、または`span_id`だけを持つJSONを生成できない内部境界になっており、共有Schemaでも不適合として検証できる
- `message`・`attributes`の省略と空文字列・空array・空objectの保持を確認できる
- 属性値のstring・number・boolean・array・objectを再帰的に出力でき、論理上の`null`を導入しない
- stderr出力が1ログ1JSON object・1物理行・UTF-8となり、余分な接頭辞を付けない
- memoryなどの差し替え可能なSinkで実出力なしにtrace内・trace外双方のlogging境界を検証できる
- `SchemaSpec.hs`が現在の共有fixtureへ追随し、trace内ログ、trace外ログ、Trace Context片側だけの不正ログ、Haskell生成JSONを含むSchema適合・不適合検証が成功する
