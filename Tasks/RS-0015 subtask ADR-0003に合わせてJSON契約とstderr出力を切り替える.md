---
status: done
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:27:31.093+09:00
dateModified: 2026-08-16T17:40:31.135+09:00
tags:
  - task
projects:
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
    endTime: 2026-08-16T08:40:31.135Z
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

## 完了結果

- `log-event.schema.json`とvalid / invalid fixtureをADR-0003の`spec`構造へ更新した
- `Backend.Json`へproduction向けJSON encodingを集約した
- JSON / Aesonに依存しない`Backend.Stderr`へ1行stderr出力と`IOException -> LoggingSinkFailure`を分離した
- `Setup`で`Backend.Json`と`Backend.Stderr`を組み合わせるproduction用`Sink`へ切り替えた
- `Backend.JsonStderr`と旧手書き`encode*`関数を削除し、Cabalとimportを新しい責務境界へ合わせた
- `make check`でformat、build、39 examples / 0 failures、Haddock生成まで成功した
- 親branch `feat/RS-0015-common-error-logging-completion`へSquash mergeした（`d03f10dc8f63fca777a27e0946f8a0697db6f212`）
