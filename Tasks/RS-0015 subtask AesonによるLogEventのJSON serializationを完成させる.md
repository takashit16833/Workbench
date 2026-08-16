---
status: done
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:26:07.066+09:00
dateModified: 2026-08-16T13:14:04.701+09:00
tags:
  - task
due: 2026-08-13
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
branch: RS-0015/aeson-serialization
timeEntries:
  - startTime: 2026-08-15T20:59:53.812Z
    description: Work session
    endTime: 2026-08-15T21:24:53.869Z
  - startTime: 2026-08-15T21:38:38.226Z
    description: Work session
    endTime: 2026-08-15T21:41:56.067Z
  - startTime: 2026-08-15T21:45:59.219Z
    description: Work session
    endTime: 2026-08-15T22:07:43.181Z
  - startTime: 2026-08-15T22:13:16.564Z
    description: Work session
    endTime: 2026-08-15T22:38:16.575Z
  - startTime: 2026-08-16T00:56:54.083Z
    description: Work session
    endTime: 2026-08-16T01:21:54.291Z
  - startTime: 2026-08-16T01:23:45.486Z
    description: Work session
    endTime: 2026-08-16T01:48:45.575Z
  - startTime: 2026-08-16T01:55:29.079Z
    description: Work session
    endTime: 2026-08-16T02:20:29.164Z
  - startTime: 2026-08-16T02:32:26.828Z
    description: Work session
    endTime: 2026-08-16T02:57:26.856Z
completedDate: 2026-08-16
---

## Squash merge commit body

- `Component`から`LogEvent`までのAesonによるJSON serializationを完成させる
- `Payload`、`LogValue`、`EventContext`、`LogError`をJSON契約に沿って変換する
- optional fieldを`Nothing`の場合に省略し、Haskellのconstructor名をJSONへ露出させない
- `toJSON`と`encode`が同じJSON表現になることをテストで固定する

## 目的

RS-0015の構造化ログについて、`RAGScope.Logging.Backend.Json`へJSON表現の責務を集約し、完成済み`LogEvent`をAesonの`ToJSON` / `toEncoding`によって純粋にJSONへ変換できる状態にする。

ADR-0003に従い、Haskellのログモデルの意味上の型構造とJSON構造をできるだけ整合させる。AesonのGeneric、`Options`、既存instanceを優先し、必要以上の手書きencoderを作らない。

## 現在地

以下は対応済み。

- `SchemaVersion`
- `LogLevel`
- `EventId`
- `ExecutionId`
- `OperationName`
- `EventName`
- `ErrorCode`
- `SafeMessage`

productionのstderr出力経路には、旧来のroot平坦化を行う手書きencoderが残っている。

## やること

- `Component`をJSONへ変換する
  - `RAGScopeApp -> "ragscope_app"`
  - `AIService -> "ai_service"`
- `LogErrorCategory`をJSONへ変換する
  - `Log` prefixを除去した外部表現にする
- `Timestamp`についてAeson既存`UTCTime`のencodingを確認し、採用する表現を固定する
- `FieldName` / `Payload`について`ToJSONKey`と`Map`の既存変換を利用できる形にする
- `LogValue`をstring / number / boolean / array / objectへconstructor tagなしで変換する
- `EventContext`を`scope` discriminatorを持つJSON objectへ変換する
- `LogError`をJSONへ変換し、`context = Nothing`を省略する
- `EventSpec`をJSONへ変換し、`errorInfo = Nothing`を省略する
- `LogEvent`をADR-0003の型構造に対応するJSONへ変換する
- 必要な型で`Generic`を利用できるようにする
- custom変換では`toJSON`と`toEncoding`を一致させる
- `JsonSpec`で`toJSON`と`encode`の両方を検査する

## このTaskではまだやらないこと

- JSON Schemaの更新
- fixtureの更新
- JSON Schema validatorによる適合テスト
- productionのstderr出力の新serializerへの切り替え

Schemaとの同時切り替えまで、現在のproduction出力経路は維持する。

## 完了条件

- 完成済み`LogEvent`を`toJSON` / `encode`できる
- ADR-0003で意図した`spec`構造をJSON変換テストで確認できる
- optional fieldが`Nothing`の場合に省略される
- `LogValue`へHaskell constructor名が露出しない
- `toJSON`と`encode`が同じJSON契約を表現する
- 追加した単体テストが成功する
