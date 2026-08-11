---
tags:
  - task
status: todo
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
next_action: Step 16完了後、Schema適合とfixture検証を自動テストへ追加する
dateModified: 2026-08-11T16:47:00+09:00
priority: medium
---

# ステップ17：JSON・Schema・fixtureテストを追加する

RS-0015の共通ログ契約について、Haskellが生成するJSONと共通fixtureをJSON Schemaに対して自動検証できる状態にする。

現在のtest-suiteはRuntimeの振る舞い確認が中心で、Schema適合テストは未実装。着手時に最新の`log-event.schema.json`、valid / invalid fixture、encoder、Testing Facade、test-suite設定を確認する。

## やること

- Haskell側からJSON Schemaを検証するための最小のテスト方法と必要な依存関係を決める
- Haskellで生成した代表的な`LogEvent`のJSONがSchemaへ適合することを自動テストする
- `fixtures/valid`の代表例が受理され、`fixtures/invalid`の代表例が拒否されることを確認する
- 通常イベントと失敗イベントの違いを確認し、失敗イベントでは`error`必須・`level = error`となる契約を検証する
- execution contextとservice contextの両方を検証する
- `error.context`など任意項目が存在しない場合に、`null`ではなく項目自体が省略されることを確認する
- payload、timestamp、識別子など共通項目がSchemaの形式・値域へ適合することを確認する
- Testing Facadeの固定`event_id`と`execution_id`を、Schemaが要求するUUID v4へ明示的に適合させる
- JSON objectの項目順に依存せず、Schema適合性と意味を検査する
- 追加したSpecをtest-suiteへ登録し、通常のテストコマンドから実行されるようにする

## このステップでは決めないこと

- SchemaをHaskell実装へ都合よく変更して契約差異を隠すこと
- fixtureを正式な`operation`・`event`一覧として扱うこと
- JSON property順を固定するゴールデンテスト
- JSON encoding失敗経路の最終設計判断
- 各機能固有のログイベントを先行実装すること

## 完了の目安

- Haskell生成JSONのSchema適合を自動テストで検査できる
- valid fixtureの受理とinvalid fixtureの拒否を自動検証できる
- execution / service context、通常 / 失敗イベント、任意項目の扱いを代表ケースで確認できる
- テスト用固定UUIDがUUID v4要件を満たしている
- Schema・fixture・Haskell実装の差異が見つかった場合、正本関係に従って解消または明示されている
- 追加したテストが通常のtest-suiteから成功する
