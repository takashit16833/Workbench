---
tags:
  - task
status: todo
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
next_action: Step 15完了後、Setupから本番Loggerを初期化できるようにする
dateModified: 2026-08-11T16:47:00+09:00
priority: medium
---

# ステップ16：Setupと本番Logger初期化を実装する

RS-0015のうち、composition rootが内部モジュールへ直接依存せず、本番用Loggerを初期化できる公開境界を完成させる。

現在の`RAGScope.Logging.Setup`は公開Facadeだけが存在し、実装は空のため、着手時に`構造化ログ設計.md`、Cabalの公開境界、Runtime、stderr Backendの現在内容を確認する。

## やること

- `RAGScope.Logging.Setup`の公開APIを、composition rootに必要な最小範囲で定義する
- `Logger`の初期化に必要なcomponent、context、最低ログレベル、EventId生成、Clock、出力先をSetup内で組み合わせる
- `event_id`をログイベントごとにUUID v4として生成できるようにする
- execution scopeでは、最初のログより前に生成した`execution_id`を同じ実行中に引き継げるようにする
- service scopeでは`execution_id`を持たない現在設計を崩さない
- timestampに使用する現在時刻をRuntimeへ供給する本番Clockを用意する
- RAGScopeアプリケーションの本番出力先として、既存のstderr BackendをSetupから利用できるようにする
- executableや通常の機能処理が`Runtime`や`Backend.AesonStderr`などの内部モジュールへ直接依存しない境界を保つ
- 必要なテストまたはコンパイル確認を追加し、公開FacadeからLoggerを構築できることを確認する

## このステップでは決めないこと

- 本格的なCLIコマンドや文書処理の実装
- CloudWatchなど外部ログ基盤への送信
- 複雑なログ設定ファイルや環境別設定機構
- JSON Schema・fixtureの網羅的な適合確認
- JSON encoding失敗経路の最終判断

## 完了の目安

- `RAGScope.Logging.Setup`が空ではなく、composition root向けの実用可能なLogger初期化Facadeになっている
- UUID v4のEventIdと、scopeに応じた実行contextを本番経路で用意できる
- Clockとstderr Sinkを内部実装として組み合わせられる
- executable側がlogging内部モジュールを知らずにLoggerを取得できる
- private sublibraryのFacade・依存方向が現在設計と一致している
- 追加・変更したコードのテストとビルドが成功する

## Step16完了後のRS-0015残タスク

- JSON / Schema適合テストを追加し、valid fixtureが通りinvalid fixtureが拒否されることを確認する
- production `Logger`をcomposition rootへ接続する
- 正常結果のstdoutと構造化ログのstderrが混在しないことを確認する
- 設計との最終整合を確認し、`make check`成功後にRS-0015の結果とstatusを更新する
