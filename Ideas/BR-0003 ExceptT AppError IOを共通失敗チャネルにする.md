---
fileClass: Idea
type: idea
projects:
  - "[[RAGScope]]"
status: accepted
created: 2026-08-10
---

# BR-0003 ExceptT AppError IOを共通失敗チャネルにする

> [!warning] 非正本
> このBrainstormは現在仕様そのものではありません。正本と矛盾する場合は正本を優先します。

## 背景

機能固有エラーを`AppError`へ変換した後、IOを伴う複数段階の処理を同じ失敗型で合成する方法として`ExceptT AppError IO`を検討した。

## 最終判断

`ExceptT AppError IO a`は、複数のIO処理を`AppError`で短絡しながら組み立てる局所的な処理では利用できる。

ただし、RAGScope全体の共通失敗チャネルや、すべての機能処理を表す共通型としては採用しない。

- 純粋な検証・変換・判断は純粋な型のまま保つ。
- IOを伴う処理でも、必要がなければ`ExceptT AppError IO`へ統一しない。
- `FeatureAction = ExceptT AppError IO`という共通型エイリアスは設けない。
- 機能処理と必須ログ出力を合成したアプリケーション全体の実行は、BR-0006で採用した`AppAction = ExceptT ExecutionFailure IO`を使用する。
- `AppResult = ExceptT AppError IO`はアプリケーション共通結果型としての役割を失うため削除する。

## 採用範囲を限定した理由

`ExceptT AppError IO`だけでは、機能処理の失敗である`AppError`とログ出力の失敗である`LoggingFailure`を独立した失敗として扱えない。

また、共通型を機能処理全体へ適用すると、副作用を必要としない処理まで`IO`へ巻き込む圧力になる。

そのため、`ExceptT AppError IO`は必要な局所IO処理で使える手段として残し、アーキテクチャ上の共通実行型は`AppAction`へ分離する。

## 関連Idea

- `BR-0006 アプリケーション実行を機能処理結果とログ出力結果から合成する`: 機能処理結果とログ出力結果を合成し、`AppAction`へ持ち上げる現在の判断を具体化した。

## 正本との関係

このIdeaだけを根拠に現在仕様を判断しない。正確な型と動作はRAGScope正本リポジトリのコードとテストを正本とし、現在設計は対応する設計書へ反映する。
