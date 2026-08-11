---
tags:
  - task
status: todo
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
next_action: Step 17の実装・テスト結果からJSON変換失敗経路の要否を確定する
dateModified: 2026-08-11T16:47:00+09:00
priority: medium
---

# ステップ18：JSON変換失敗の設計判断を確定する

`構造化ログ設計.md`に残っている「JSON変換に回復可能な失敗経路を設けるか」という未決定事項を、実装とStep 17のテスト結果を根拠に確定する。

現在は`LoggingFailure`に`LoggingEncodingFailure`が存在する一方、`encodeLogEvent`は`LogEvent -> Value`の純粋変換で、stderr Backendでは出力時のIO失敗だけを`LoggingSinkFailure`として扱っている。

## やること

- `encodeLogEvent`以下の変換処理が、コード内部のすべてのログ値を部分関数なしで網羅的に変換できているか確認する
- 使用しているAeson APIが、現在の値域で回復可能な失敗を返すか、例外を発生させ得るか確認する
- 変換前に実行時検証として扱うべき条件が本当に存在するか確認する
- Step 17のSchema適合テストと実行時検証の責務が重複しないか確認する
- 実際の失敗経路に基づき、totalな純粋変換とするか、回復可能なencoding failureを設けるかを決定する
- totalな純粋変換とする場合は、到達しない`LoggingEncodingFailure`など不要な失敗表現を残さず、Runtime・Backend・テスト・コメントを整合させる
- 回復可能な失敗経路を設ける場合は、Sink失敗と区別して呼び出し元へ返し、失敗した同じログ経路へ再帰的に書き込まないことをテストする
- 決定結果を`構造化ログ設計.md`の未決定事項と関連する失敗時規則へ反映する
- 実装、設計、テストの3者に同じ結論が表現されていることを確認する

## 判断するときの注意

- 「Aesonの現在のAPIが失敗値を返さない」という一点だけでtotalと断定しない
- 将来起こるかもしれない失敗だけを理由に、実在しない回復可能な失敗経路を作らない
- Schema適合性の検証と本番Runtimeの責務を混同しない
- 未使用のエラーconstructorを将来用として残さない

## 完了の目安

- JSON変換失敗について1つの設計判断が確定している
- 判断理由が現在のencoder、Aeson API、値域、テスト結果から説明できる
- `LoggingFailure`と実際に起こり得る失敗経路が一致している
- `構造化ログ設計.md`から当該未決定事項が解消されている
- Runtime・Backend・テスト・設計に矛盾がない
- 関連するテストとビルドが成功する
