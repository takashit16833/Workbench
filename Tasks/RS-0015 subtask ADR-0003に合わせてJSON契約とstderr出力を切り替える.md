---
status: doing
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:27:31.093+09:00
dateModified: 2026-08-16T14:47:18.326+09:00
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
timeEntries:
  - startTime: 2026-08-16T05:22:18.231Z
    description: Work session
    endTime: 2026-08-16T05:47:18.326Z
---

## Squash merge commit body

- `log-event.schema.json`とfixtureをADR-0003の`spec`構造へ更新する
- productionのstderr出力を完成済み`ToJSON LogEvent`へ切り替える
- JSON表現を`Backend.Json`へ集約し、`Backend.JsonStderr`から旧手書きencoderを削除する
- `Backend.JsonStderr`を完成済みJSON表現のencoding、1行stderr出力、IO failure処理へ整理する

## 目的

ADR-0003で採用したログモデルの型構造に対応するJSONへ、Schema、fixture、productionのstderr出力を一括して切り替える。

旧root平坦化JSONから`spec`を持つ新しいJSON契約への移行を、このTaskで完了させる。

JSON構造の定義は`Backend.Json`へ集約し、productionの`Backend.JsonStderr`は完成済み`ToJSON LogEvent`をencodingしてstderrへ出力する。

## 現在地

先行するAeson serializationのSubtaskは完了し、親branchへSquash merge済み。`Backend.Json`では完成済み`LogEvent`を`spec`構造のJSONへ変換でき、optional fieldの省略とAeson標準の`UTCTime`表現もテストで固定されている。

一方、現在のJSON Schemaとfixture、productionの`Backend.JsonStderr`は旧root平坦化JSONを使用している。`Backend.JsonStderr`には`encodeLogEvent`と型別の旧手書き`encode*`関数が残っている。

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
- Timestamp制約をAeson標準の`UTCTime`表現と整合させ、整数秒と小数秒を扱えるようにする
- valid fixtureを新構造へ更新する
- invalid fixtureを新構造へ更新する
- productionの`Backend.JsonStderr`で完成済み`ToJSON LogEvent`をencodingする
- JSON表現を重複実装する`encodeLogEvent`と旧`encode*`関数を削除する
- `Backend.JsonStderr`というモジュール名は維持する
- `Backend.JsonStderr`ではJSON構造を組み立てず、encoding、1行stderr出力、`IOException -> LoggingSinkFailure`だけを扱う

## 完了条件

- JSON SchemaがADR-0003の`spec`構造を表現している
- valid / invalid fixtureが新構造へ更新されている
- production stderr出力が`Backend.Json`の`ToJSON LogEvent`を使用している
- `Backend.JsonStderr`にJSON構造の重複実装や旧`encode*`関数が残っていない
- `Backend.JsonStderr`が完成済みJSON表現のencoding、1行stderr出力、IO failure処理を担っている
- 1つの`LogEvent`がstderrへ1行のJSONとして出力される
