---
status: doing
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:27:31.093+09:00
dateModified: 2026-08-16T13:25:06.850+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0015 subtask AesonによるLogEventのJSON serializationを完成させる]]"
    reltype: FINISHTOSTART
branch: RS-0015/json-contract-cutover
due: 2026-08-13
---

## Squash merge commit body

- `log-event.schema.json`とfixtureをADR-0003の`spec`構造へ更新する
- productionのstderr出力を完成済み`ToJSON LogEvent`へ切り替える
- JSON表現を`Backend.Json`へ集約し、stderr出力経路から旧手書きencoderを削除する
- JSON / Aesonに依存しない`Backend.Stderr`へ出力責務を分離し、1行stderr出力とIO failure処理だけを担わせる

## 目的

ADR-0003で採用したログモデルの型構造に対応するJSONへ、Schema、fixture、productionのstderr出力を一括して切り替える。

旧root平坦化JSONから`spec`を持つ新しいJSON契約への移行を、このTaskで完了させる。

JSONへの変換とstderrへの出力を別責務とし、`Backend.Json`をJSON表現、`Backend.Stderr`を出力形式に依存しないstderr出力のBackendとして分離する。

## 現在地

現在のJSON Schemaとproductionのstderr出力経路は、`operation`、`event`、`level`、`payload`、`error`をrootへ平坦化する旧構造を使用している。

先行するAeson serializationのSubtaskで新しいJSON変換を完成させた後、このTaskで契約とproductionを同時に切り替える。

## やること

- `log-event.schema.json`をADR-0003に合わせて更新する
- JSONに`spec` objectを追加する
- 以下を`spec`配下へ移す
  - `operation`
  - `event`
  - `level`
  - `payload`
  - `error`
- `event = failed`の場合の
  - `level = error`
  - `error`必須
  のSchema条件を新構造へ合わせる
- `EventContext`のSchemaを`Backend.Json`のJSON表現と整合させる
- Timestamp制約を先行するJSON serializationで確定した表現と整合させる
- valid fixtureを新構造へ更新する
- invalid fixtureを新構造へ更新する
- productionのSinkで`Backend.Json`によるJSON encodingと`Backend.Stderr`によるstderr出力を組み合わせる
- `Backend.Stderr`にはJSON構造の組み立てやAeson固有の依存を持たせない
- JSON表現を重複実装する旧`encode*`関数を削除する
- `Backend.AesonStderr`を廃止する
- `IOException -> LoggingSinkFailure`の責務は`Backend.Stderr`で維持する

## 完了条件

- JSON SchemaがADR-0003の`spec`構造を表現している
- valid / invalid fixtureが新構造へ更新されている
- production stderr出力が`Backend.Json`の`ToJSON`を使用している
- `Backend.Stderr`にJSON / Aeson固有の変換責務がなく、stderr出力とIO failure処理だけを担っている
- `Backend.AesonStderr`が残っていない
- 1つの`LogEvent`がstderrへ1行のJSONとして出力される
