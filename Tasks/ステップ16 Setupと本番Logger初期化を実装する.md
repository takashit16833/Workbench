---
tags:
  - task
status: todo
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
next_action: ADR-0003に従い、Aeson標準機能を優先してJSON契約と変換実装をログモデルの型構造へ整合させる
dateModified: 2026-08-13T15:08:00+09:00
priority: medium
---

# ステップ16：Setupと本番Logger初期化を実装する

RS-0015のRAGScopeアプリケーション側を完成させるための作業ハンドル。

`task/Step16`では`RAGScope.Logging.Setup`による本番Logger初期化まで実装済み。ADR-0003で、構造化ログのJSON構造をHaskellのログモデルの意味上の型構造と整合させ、AesonのGeneric導出を積極的に利用する方針を採用した。

## 作業開始時に確認する正本

このTaskは作業ハンドルであり、現在仕様・採用済み設計・実装状態はRAGScope正本リポジトリを正とする。別のAIへ引き継ぐ場合も、このTaskだけで判断せず、`task/Step16`の最新内容を確認してから作業する。

- [ADR-0003 — 構造化ログのJSON構造をログモデルの型構造と整合させる](https://github.com/takashit16833/RAGScope/blob/task/Step16/project-docs/adr/ADR-0003%20%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E3%81%AEJSON%E6%A7%8B%E9%80%A0%E3%82%92%E3%83%AD%E3%82%B0%E3%83%A2%E3%83%87%E3%83%AB%E3%81%AE%E5%9E%8B%E6%A7%8B%E9%80%A0%E3%81%A8%E6%95%B4%E5%90%88%E3%81%95%E3%81%9B%E3%82%8B.md)
- [RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する](https://github.com/takashit16833/RAGScope/blob/task/Step16/project-docs/project-management/milestones/v0.0/error-logging/RS-0015%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E5%85%B1%E9%80%9A%E3%82%A8%E3%83%A9%E3%83%BC%E3%83%BB%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md)
- [構造化ログ基本設計](https://github.com/takashit16833/RAGScope/blob/task/Step16/project-docs/design/%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E5%9F%BA%E6%9C%AC%E8%A8%AD%E8%A8%88.md)
- [構造化ログ詳細設計](https://github.com/takashit16833/RAGScope/blob/task/Step16/project-docs/design/%E6%A7%8B%E9%80%A0%E5%8C%96%E3%83%AD%E3%82%B0%E8%A9%B3%E7%B4%B0%E8%A8%AD%E8%A8%88.md)
- [`RAGScope.Logging.Core`](https://github.com/takashit16833/RAGScope/blob/task/Step16/ragscope-app/logging-src/RAGScope/Logging/Core.hs)
- [`RAGScope.Logging.Backend.AesonStderr`](https://github.com/takashit16833/RAGScope/blob/task/Step16/ragscope-app/logging-src/RAGScope/Logging/Backend/AesonStderr.hs)
- [`log-event.schema.json`](https://github.com/takashit16833/RAGScope/blob/task/Step16/contracts/logging/v1/log-event.schema.json)
- [valid fixture](https://github.com/takashit16833/RAGScope/tree/task/Step16/contracts/logging/v1/fixtures/valid) / [invalid fixture](https://github.com/takashit16833/RAGScope/tree/task/Step16/contracts/logging/v1/fixtures/invalid)
- [`ragscope.cabal`](https://github.com/takashit16833/RAGScope/blob/task/Step16/ragscope-app/ragscope.cabal)

Aesonの挙動は記憶や自前実装を前提にせず、実装時の依存バージョンを`ragscope.cabal`で確認したうえで、[Data.Aeson](https://hackage.haskell.org/package/aeson/docs/Data-Aeson.html)と[Data.Aeson.Types](https://hackage.haskell.org/package/aeson/docs/Data-Aeson-Types.html)の一次資料を再確認する。

## 現在地

- `RAGScope.Logging.Setup`からexecution / service scopeの本番Loggerを構築できる
- EventId生成、Clock、stderr Sinkの本番依存をSetupで組み合わせられる
- ADR-0003「構造化ログのJSON構造をログモデルの型構造と整合させる」を採用済み
- 次はSchema適合テストを作る前に、Schema・fixture・Aeson変換をADR-0003へ合わせる

## 次にやること

### 1. Aeson標準機能を使ってJSON変換を整理する

手書きencoderを増やす前に、Aesonが提供するGeneric / `Options` / 既存instanceで表現できないかを優先して確認する。

- `LogEvent` / `EventSpec` / `LogError`は`Generic` + `genericToJSON` / `genericToEncoding`を基本にする
- field名は`fieldLabelModifier` + `camelTo2 '_'`でsnake_caseへ変換し、`errorInfo -> error`のような例外だけ最小限に補正する
- `Maybe`の任意fieldは`omitNothingFields = True`で省略し、`Nothing`を`null`へ変換する手書き処理を作らない
- `LogLevel`などのnullary sum typeは`allNullaryToStringTag`と`constructorTagModifier`を利用する
- `EventContext`は`TaggedObject`で`scope`をdiscriminatorとして表現する。`execution_id`を同じobjectへ出すため、必要なら`ExecutionContext`をrecord constructorへ変更する
- `LogValue`は`sumEncoding = UntaggedValue`でstring / number / bool / array / objectへ直接変換できるか、小さいencoding testで確認する。成立するなら手書き`encodeLogValue`を削除する
- `EventId` / `ExecutionId`はAeson既存の`UUID`の`ToJSON`をnewtype経由で再利用し、`UUID.toText`を自前で呼ばない
- `Timestamp`はAeson既存の`UTCTime`の`ToJSON`をまず利用する。固定3桁ミリ秒が要求として不要なら、独自formatterを残さずSchemaをAesonのISO 8601表現へ合わせる
- `OperationName` / `EventName` / `ErrorCode` / `SafeMessage`は`Text`の`ToJSON`をnewtype経由で再利用する
- `FieldName`は`Text`の`ToJSONKey`をnewtype経由で再利用し、`Payload`の`Map`をAesonへ直接encodeできる形を優先する
- `SchemaVersion`の`SchemaV1 -> 1`のように値そのものの意味変換が必要な箇所だけ、小さい専用`ToJSON`を残す
- `Component`など単純な名前変換で済む型は`constructorTagModifier`を優先し、Genericのデフォルトconstructor名をJSONへ露出させない
- `toJSON`だけでなく`toEncoding`も定義し、本番stderr出力では中間`Value`を経由せず`encode logEvent`できる形を目指す
- `encodeLogEvent`は、純粋なJSON契約境界として名前が有用なら`toJSON`の薄いaliasとして残し、不要なら独自encoder自体をなくす

Aesonで表現できるか不明な箇所は、先に最小のencoding testで実際のJSONを固定してから手書き実装へ進む。Aesonが既に持つ変換・instanceを再実装しない。

### 2. ADR-0003に合わせてSchemaとfixtureを更新する

- `LogEvent.spec :: EventSpec`に合わせ、JSONでも`spec` objectを持つ構造へ`log-event.schema.json`を更新する
- `operation` / `event` / `level` / `payload` / `error`は`spec`配下へ移す
- `event = failed`、`level = error`、`error`必須の相関条件も`spec`配下の新構造へ合わせる
- `context`はHaskellの`EventContext`とAesonの`TaggedObject`で自然に対応するSchemaにする
- timestampはAesonの`UTCTime`標準encodingを実測し、必要以上に出力形式を狭めない
- valid / invalid fixtureを新Schemaへすべて追従させる

### 3. Aeson変換をテストで固定する

- 代表的な`LogEvent`を`toJSON`して新Schemaへ適合することを確認する
- `EventContext`のexecution / service両variantのJSON形状を確認する
- `errorInfo = Nothing`と`LogError.context = Nothing`でfieldが省略されることを確認する
- `LogValue`のstring / number / bool / array / objectが余計なconstructor tagなしでJSON値になることを確認する
- `Payload`がJSON objectとして出力され、`FieldName`がobject keyになることを確認する
- `toJSON`と本番`encode`が同じ契約を表すことを確認する

### 4. JSON Schema適合テストを追加する

- Draft 2020-12を扱えるvalidatorを一次資料で確認して選定する
- valid fixtureがすべてacceptされることを確認する
- invalid fixtureがすべてrejectされることを確認する
- Haskellが生成した実際のJSONもSchemaへ適合することを確認する
- JSON objectのfield順には依存せず、Schema適合性と意味を検査する

### 5. RS-0015を閉じる

- production `Logger`をcomposition rootへ接続する
- 正常結果のstdoutと構造化ログのstderrが混在しないことを確認する
- `構造化ログ基本設計.md` / `構造化ログ詳細設計.md`をADR-0003と実装結果へ合わせる
- `make check`を実行する
- RS-0015の結果を記録し、完了条件を確認してstatusを更新する

## 実装時の原則

- JSONの形を手続き的に組み立てる前に、AesonのGeneric、`Options`、既存`ToJSON` / `ToJSONKey` instanceで表現できないか確認する
- Genericのデフォルト出力へ契約を無理に合わせるのではなく、意味上のHaskell型構造をJSONでも保ち、表記差だけをAesonの設定で吸収する
- 手書き`ToJSON`は、SchemaVersionのようにAesonの構造変換だけでは意味を表現できない箇所へ限定する
- Schema適合テストを追加する前にSchema・fixture・encoderを同じ契約へ揃える
