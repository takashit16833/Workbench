---
status: done
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:31:38.703+09:00
dateModified: 2026-08-18T16:02:20.146+09:00
tags:
  - task
due: 2026-08-13
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0015 subtask JSON Schema適合テストを追加する]]"
    reltype: FINISHTOSTART
branch: RS-0015/output-boundaries
completedDate: 2026-08-18
---

## Squash merge commit body

- stdoutの正常結果とstderrの構造化ログが混在しないことを検証する
- memory Sinkとfailure Sinkによる出力境界のテストを完成させる
- `Backend.Stderr`がJSON / Aeson固有の変換責務を持たず、出力形式から独立していることを確認する
- IO失敗だけを`LoggingSinkFailure`として扱うことを確認する
- 機能処理結果と必須ログ出力結果を`ExecutionOutcome`から`ExecutionFailure`へ解釈し、`AppAction`へ合成する境界を実装・検証する
- 記録対象外の文書本文、秘密情報、認証情報などを不用意にログへ出さないことを確認する

## 目的

RS-0015で要求されているstdout / stderrの分離、差し替え可能なSink、Sink失敗時の扱い、記録対象外情報の保護を実際の利用境界で確認する。

加えて、機能処理の`AppError`と必須ログ出力の`LoggingFailure`を独立した事実として保持し、アプリケーション実行上の成功・失敗へ合成する共通境界を完成させる。

すでに実装済みの部分は再実装せず、不足する実装またはテストだけを追加する。

## 引き継ぎ

- 前提Subtask「JSON Schema適合テストを追加する」は親branch `feat/RS-0015-common-error-logging-completion`へSquash merge済み（`90a638807cac353daf24c6a7058a3219ef90059c`）
- 直前Subtask branchでは最終`make check`がformat、build、56 examples / 0 failures、Haddock生成まで成功している
- このSubtask用branch `RS-0015/output-boundaries`は作成済みで、現在の作業branchとして使用する
- `RuntimeSpec`ではすでにmemory Sinkによる`LogEvent`捕捉、最低ログレベル未満の抑止、failure Sinkからの`Left LoggingSinkFailure`を検証している。これらを再実装せず、このSubtaskでは不足する境界だけを追加する
- `Backend.Stderr.writeLine`はencoding済み`ByteString`の1行stderr出力と`IOException -> LoggingSinkFailure`だけを担当している。productionの`Setup.stderrSink`は`Backend.Json.encodeLogEvent`と`Backend.Stderr.writeLine`を組み合わせている
- 現在の`app/Main.hs`は`Hello, Haskell!`をstdoutへ出すだけで、Loggerを含むstdout / stderr分離をまだ実行経路として検証していない。このSubtaskでは機能実装を広げず、必要最小限の境界テストまたは代表実行で確認する

## 実行結果合成の決定

BR-0006のレビューで次を採用した。

- `ExecutionOutcome`で`Either AppError a`と`Either LoggingFailure ()`を独立した事実として保持する
- `interpretOutcome`で`Either ExecutionFailure a`へ解釈する
- `ExecutionFailure`は`FeatureFailed`、`LoggingFailedAfterSuccess`、`FeatureFailedWithLoggingFailure`を持つ
- `AppAction = ExceptT ExecutionFailure IO`で、機能処理と必須ログを含むアプリケーション実行を合成する
- `FeatureAction`は共通型として設けない。個々の機能処理は純粋値、`Either`、`IO (Either AppError a)`、`ExceptT AppError IO a`など自然な型を使用する
- 専用の`ExecutionResult`は設けず、`Either ExecutionFailure a`を使用する
- 既存の`AppResult = ExceptT AppError IO`は共通アプリケーション実行型としての役割を失うため削除する
- 機能処理結果と必須ログ出力結果を合成して`AppAction`へ持ち上げる共通境界として`observe`を実装する

正確な型と動作は正本リポジトリのコード・テストを正本とする。WorkbenchのIdeaは現在仕様の参照先にしない。

## やること

- 正常結果がstdoutへ出力される境界を確認する
- 構造化ログがstderrへ出力される境界を確認する
- 正常結果とログが混在しないことをテストまたは代表実行で確認する
- 機能処理が具体的なstderr実装へ直接依存していないことを確認する
- JSON表現とencodingの責務が`Backend.Json`にあり、stderrへの書き込み責務が`Backend.Stderr`に分離されていることを確認する
- `Backend.Stderr`がJSON / Aeson固有の変換を持たず、1行stderr出力とIO failure処理だけを担っていることを確認する
- production用`Sink`がcomposition rootで`Backend.Json`と`Backend.Stderr`を組み合わせて構築されていることを確認する
- memory Sinkを使用して`LogEvent`を自動テストから検査できることを確認する
- failure Sinkを使用して`LoggingSinkFailure`の挙動を確認する
- `interpretOutcome`を実装し、機能処理結果とログ出力結果の4組を自動テストで固定する
  - feature成功 + logging成功 -> `Right a`
  - feature成功 + logging失敗 -> `LoggingFailedAfterSuccess`
  - feature失敗 + logging成功 -> `FeatureFailed`
  - feature失敗 + logging失敗 -> `FeatureFailedWithLoggingFailure`
- 両方失敗した場合に元の`AppError`が保持されることを確認する
- `observe`を実装し、機能処理が失敗した場合も必須ログを1回だけ試行して結果を合成することを確認する
- `observe`でログ出力が失敗した場合、同じ失敗したログ経路へ再帰的に書き込まないことを確認する
- `AppAction`がlogging失敗時に後続処理へ進まないことを確認する
- JSON値への変換には回復可能なfailure経路がなく、JSON生成後のIO失敗だけがSink failureとなることを確認する
- 文書本文、秘密情報、認証情報などを不用意にログへ含めないことを確認する
- raw exceptionやstack traceなど、設計上記録対象外の情報を直接出力していないことを確認する

## 完了条件

- stdoutとstderrの責務が分離されている
- Sinkを差し替えられる
- `Backend.Json`と`Backend.Stderr`の責務が分離されている
- `Backend.Stderr`が出力形式から独立し、1行stderr出力とIO failure処理だけを担っている
- memory Sinkによる検査ができる
- failure Sinkの挙動が自動テストで固定されている
- `ExecutionOutcome`の4組が`ExecutionFailure`または成功値へ正しく解釈される
- `observe`が機能処理結果と必須ログ出力結果を`AppAction`へ合成できる
- 機能処理とloggingが両方失敗しても元の`AppError`が失われない
- logging失敗時に同じログ経路へ再帰的に出力せず、後続の`AppAction`へ進まない
- JSON変換に不要な回復可能failure modelが存在しない
- 記録対象外情報を不用意に出力しないことを確認できる
