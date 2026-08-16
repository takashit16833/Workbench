---
fileClass: Idea
type: idea
projects:
  - "[[RAGScope]]"
status: active
review_gate: 最初のAppErrorからLogErrorへの変換を実装し、ErrorValueとLogValueの重複コストを評価できるとき
created: 2026-08-10
---

# BR-0002 ErrorContextとLoggingの安全な構造化値の共通化

> [!warning] 非正本
> このBrainstormは現在仕様そのものではありません。正本と矛盾する場合は正本を優先します。

## 次のレビュー

**条件:** 最初のAppErrorからLogErrorへの変換を実装し、ErrorValueとLogValueの重複コストを評価できるとき

**確認すること**

- ErrorContextとlogging側の値表現が実際に同じ意味と変更理由を持つか
- ErrorからLogging、LoggingからErrorへの依存を作らずに共通化できるか
- 共有抽象がErrorCodeやEventごとの許可項目の制約を弱めないか
- 共有層の複雑さが重複削減の利益に見合うか

## 背景

Error側の`ErrorValue`とlogging側の`LogValue`は、どちらも安全な構造化値として似た形を持つ。一方を他方へ依存させると責務が崩れるため、共通化する場合は中立な抽象が必要になる。

## 現在の仮結論

現時点では共通化しない。

`ErrorValue`と`LogValue`の構造は似ているが、まだ`AppError`から`LogError`への具体的な変換がなく、共有抽象を追加する利益を実測できない。まず別々の意味上の型を維持し、最初の変換実装で重複が実際の保守負担になるかを確認する。

## 再検討を延期する理由

- `ErrorContext`と`Payload`は上位の意味が異なるため、構造の類似だけでは統合理由にならない
- 現時点で中立な共有層を追加すると、実利用のない抽象が1層増える
- 純粋変換だけで十分なら、型の意味を分離したまま保てる

## 重要な代替案

- ErrorとLoggingで別々の値型を持ち、純粋変換で接続する
- ErrorとLoggingの下位に中立な安全な構造化値抽象を置く
- Errorからloggingの型を直接利用する

## 正本との関係

参照時はRS-0015と、関係する設計・コード・テストの現在内容を改めて確認します。
このノートだけを根拠に現在仕様を断定しません。
