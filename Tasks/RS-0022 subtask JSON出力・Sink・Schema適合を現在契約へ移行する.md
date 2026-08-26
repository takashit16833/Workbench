---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-08-27T08:12:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask logging全体像を設計して公開APIと中核型を実装する]]"
    reltype: FINISHTOSTART
---

## Squash merge commit body

- logging中核型を現在の構造化ログJSON表現へ投影するserializationを実装する
- stderr・memoryなどのSink境界を新しいlogging Runtimeへ接続し、1ログ1JSON objectを1物理行で出力する
- RS-0021の共有fixtureとSchemaへHaskell側のSchema適合テストを追随させる

## 目的

Canvasと新しいlogging中核型を基準に、JSON外部表現・Sink・テスト差し替え境界を現在契約へ移行する。

## 完了条件

- `timestamp`、`component`、`event`、`level`、`trace_id`、`span_id`と任意の`message`・`attributes`を現在JSON契約へ出力できる
- `message`・`attributes`の省略と空文字列・空array・空objectの保持を確認できる
- 属性値のstring・number・boolean・array・objectを再帰的に出力でき、論理上の`null`を導入しない
- stderr出力が1ログ1JSON object・1物理行・UTF-8となり、余分な接頭辞を付けない
- memoryなどの差し替え可能なSinkで実出力なしにlogging境界を検証できる
- `SchemaSpec.hs`がRS-0021の現在fixtureへ追随し、Haskell生成JSONを含むSchema適合検証が成功する
