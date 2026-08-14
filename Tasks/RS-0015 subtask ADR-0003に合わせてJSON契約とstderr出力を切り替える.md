---
status: todo
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:27:31.093+09:00
dateModified: 2026-08-14T10:02:21.232+09:00
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
- `AesonStderr`からJSON構造を組み立てる旧手書きencoderを削減する
- `AesonStderr`を1行stderr出力とIO failure処理を担う薄いBackendへ整理する

## 目的

ADR-0003で採用したログモデルの型構造に対応するJSONへ、Schema、fixture、productionのstderr出力を一括して切り替える。

旧root平坦化JSONから`spec`を持つ新しいJSON契約への移行を、このTaskで完了させる。

## 現在地

現在のJSON Schemaと`AesonStderr`は、`operation`、`event`、`level`、`payload`、`error`をrootへ平坦化する旧構造を使用している。

先行するAeson serializationのSubtaskで新しい変換を完成させた後、このTaskで契約とproductionを同時に切り替える。

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
- `EventContext`のSchemaをAeson表現と整合させる
- Timestamp制約を先行するAeson serializationで確定した表現と整合させる
- valid fixtureを新構造へ更新する
- invalid fixtureを新構造へ更新する
- `AesonStderr`を完成済み`ToJSON LogEvent`へ接続する
- production出力を`encode logEvent`中心の実装へ変更する
- JSON表現を重複実装する旧`encode*`関数を削除または縮小する
- `IOException -> LoggingSinkFailure`の責務は維持する

## 完了条件

- JSON SchemaがADR-0003の`spec`構造を表現している
- valid / invalid fixtureが新構造へ更新されている
- production stderr出力が`Backend.Aeson`の`ToJSON`を使用している
- `AesonStderr`にJSON構造の手作業組み立て責務が残っていない
- 1つの`LogEvent`がstderrへ1行のJSONとして出力される
