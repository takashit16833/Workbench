---
fileClass: Idea
type: idea
projects:
  - "[[RAGScope]]"
review_gate: RS-0015 Step 15で共通エラー型と ErrorContext の具体的な表現を実装した後
created: 2026-08-10
---

# BR-0002 ErrorContextとLoggingの安全な構造化値の共通化

> [!warning] 非正本
> このBrainstormは現在仕様そのものではありません。正本と矛盾する場合は正本を優先します。

## 次のレビュー

**条件:** RS-0015 Step 15で共通エラー型と ErrorContext の具体的な表現を実装した後

**確認すること**

- ErrorContextとlogging側の値表現が実際に同じ意味と変更理由を持つか
- ErrorからLogging、LoggingからErrorへの依存を作らずに共通化できるか
- 共有抽象がErrorCodeやEventごとの許可項目の制約を弱めないか
- 共有層の複雑さが重複削減の利益に見合うか

## 背景

Error側にもlogging側の `LogValue` などに似た構造化値表現が必要になる可能性があるが、片方へ依存させると責務が崩れる。

## 現在の仮結論

`ErrorContext` とloggingの下位に、ErrorにもLoggingにも属さない中立な安全な構造化値抽象を置く案を有力視する。ただし `ErrorContext` と `Payload` 自体は別の意味を持つため統合しない。

## この案を支持する理由

- ErrorとLoggingの責務分離を保てる
- 本当に共通な低水準の値表現だけを再利用できる
- 上位の意味上の型を残せる

## 重要な代替案

- ErrorとLoggingで別々の値型を持ち、純粋変換で接続する
- Errorからloggingの型を直接利用する
- 汎用Utilityへ移す

## 正本との関係

参照時はRS-0015と、関係する設計・コード・テストの現在内容を改めて確認します。
このノートだけを根拠に現在仕様を断定しません。
