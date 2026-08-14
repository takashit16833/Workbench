---
status: todo
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:31:38.703+09:00
dateModified: 2026-08-14T11:09:00+09:00
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
---

## Squash merge commit body

- stdoutの正常結果とstderrの構造化ログが混在しないことを検証する
- memory Sinkとfailure Sinkによる出力境界のテストを完成させる
- `Backend.Stderr`がJSON / Aeson固有の変換責務を持たないことを確認する
- IO失敗だけを`LoggingSinkFailure`として扱うことを確認する
- 記録対象外の文書本文、秘密情報、認証情報などを不用意にログへ出さないことを確認する

## 目的

RS-0015で要求されているstdout / stderrの分離、差し替え可能なSink、Sink失敗時の扱い、記録対象外情報の保護を実際の利用境界で確認する。

すでに実装済みの部分は再実装せず、不足する実装またはテストだけを追加する。

## やること

- 正常結果がstdoutへ出力される境界を確認する
- 構造化ログがstderrへ出力される境界を確認する
- 正常結果とログが混在しないことをテストまたは代表実行で確認する
- 機能処理が具体的なstderr実装へ直接依存していないことを確認する
- `Backend.Stderr`がJSON / Aeson固有の変換を持たず、stderrへの出力とIO failure処理だけを担っていることを確認する
- memory Sinkを使用して`LogEvent`を自動テストから検査できることを確認する
- failure Sinkを使用して`LoggingSinkFailure`の挙動を確認する
- Sink失敗を元の機能処理の失敗と区別できることを確認する
- Sink失敗時に同じ失敗したログ経路へ再帰的に書き込まないことを確認する
- JSON値への変換には回復可能なfailure経路がなく、JSON生成後のIO失敗だけがSink failureとなることを確認する
- 文書本文、秘密情報、認証情報などを不用意にログへ含めないことを確認する
- raw exceptionやstack traceなど、設計上記録対象外の情報を直接出力していないことを確認する

## 完了条件

- stdoutとstderrの責務が分離されている
- Sinkを差し替えられる
- `Backend.Stderr`が出力形式から独立している
- memory Sinkによる検査ができる
- failure Sinkの挙動が自動テストで固定されている
- JSON変換に不要な回復可能failure modelが存在しない
- 記録対象外情報を不用意に出力しないことを確認できる
