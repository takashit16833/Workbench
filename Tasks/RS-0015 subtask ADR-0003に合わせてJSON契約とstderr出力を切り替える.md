---
status: doing
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:27:31.093+09:00
dateModified: 2026-08-16T17:19:27.583+09:00
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
  - startTime: 2026-08-16T07:13:38.640Z
    description: Work session
    endTime: 2026-08-16T07:38:38.708Z
  - startTime: 2026-08-16T07:46:31.383Z
    description: Work session
    endTime: 2026-08-16T08:11:31.444Z
  - startTime: 2026-08-16T08:19:27.583Z
    description: Work session
---

## Squash merge commit body

- `log-event.schema.json`とfixtureをADR-0003の`spec`構造へ更新する
- productionのstderr出力を、`Backend.Json`によるJSON encodingと`Backend.Stderr`による出力を組み合わせる構成へ切り替える
- JSON表現を`Backend.Json`へ集約し、`Backend.JsonStderr`の旧手書きencoderを削除する
- JSON / Aesonに依存しない`Backend.Stderr`へ1行stderr出力とIO failure処理を分離し、`Backend.JsonStderr`を廃止する

## 目的

ADR-0003で採用したログモデルの型構造に対応するJSONへ、Schema、fixture、productionのstderr出力を一括して切り替える。

旧root平坦化JSONから`spec`を持つ新しいJSON契約への移行を、このTaskで完了させる。

JSONへの変換とstderrへの出力を別責務とし、`Backend.Json`をJSON表現とencoding、`Backend.Stderr`を出力形式に依存しないstderr出力、`Setup`をproduction Sinkの組み立て境界として分離する。

## 現在地

先行するAeson serializationのSubtaskは完了し、親branchへSquash merge済み。`Backend.Json`では完成済み`LogEvent`を`spec`構造のJSONへ変換でき、optional fieldの省略とAeson標準の`UTCTime`表現もテストで固定されている。

このbranchでは、`log-event.schema.json`とvalid / invalid fixtureをADR-0003の`spec`構造へ更新済み。`EventContext`のSchemaは`Backend.Json`の表現と整合しており、Timestamp制約も整数秒と小数秒を扱える形へ更新済み。

残っているのはproductionのstderr出力経路の切り替えである。現在の`Backend.JsonStderr`には旧root平坦化JSONを組み立てる`encodeLogEvent`と型別の旧手書き`encode*`関数が残っている。

## 残りのやること

- `Backend.Json`側で、完成済み`LogEvent`をproduction出力へ渡せるJSON表現へencodingする
- JSON / Aesonに依存しない`Backend.Stderr`を作り、encoding済みの1イベントをstderrへ1行で出力する
- `Backend.Stderr`で`IOException -> LoggingSinkFailure`を扱う
- `Setup`で`Backend.Json`と`Backend.Stderr`を組み合わせ、production用`Sink`を構築する
- JSON表現を重複実装する`encodeLogEvent`と旧`encode*`関数を削除する
- `Backend.JsonStderr`を廃止し、Cabalとimportを新しい責務境界へ合わせる

## 完了条件

- JSON SchemaがADR-0003の`spec`構造を表現している
- valid / invalid fixtureが新構造へ更新されている
- production stderr出力が`Backend.Json`のJSON表現を使用している
- `Backend.Json`と`Backend.Stderr`の間でJSON変換とstderr出力の責務が分離されている
- `Backend.Stderr`がJSON / Aesonに依存せず、1行stderr出力とIO failure処理だけを担っている
- `Backend.JsonStderr`と旧手書き`encode*`関数が残っていない
- 1つの`LogEvent`がstderrへ1行のJSONとして出力される
