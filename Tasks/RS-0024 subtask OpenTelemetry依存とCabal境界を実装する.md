---
status: done
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/sdk-cabal-boundary
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-09T07:21:51+09:00
tags:
  - task
timeEntries:
  - startTime: 2026-09-08T21:13:32.153Z
    description: Work session
    endTime: 2026-09-08T21:38:32.190Z
---

## Squash merge commit body

- RAGScopeアプリケーションを1 packageのままmain libraryを公開Facade、機能実装をprivate named libraryへ分けるHaskell構成を設計した
- RAGScope環境で利用するOpenTelemetry packageの依存解決とimportを確認した
- OpenTelemetry SDK依存をAdapter側のCabal境界へ閉じ込めた
- 後続のTelemetry境界実装に必要な最小module構成を追加した

## 目的

RAGScopeのGHC / base条件で利用できるOpenTelemetry packageを実測し、機能側UseCase / 内部処理からSDKを参照できず、AdapterだけがSDKへ依存するCabal境界を実装する。

## 現在地

- `RS-0024/sdk-cabal-boundary`の現在HEAD `0214c195850319a10426e63db881d6b910e343cb`で、`telemetry-boundary`と`opentelemetry-adapter`の2つのprivate named libraryを実装した
- `telemetry-boundary`は`RAGScope.Telemetry`を公開し、`build-depends`は`base`だけとしてOpenTelemetry packageへ依存しない
- `opentelemetry-adapter`は`RAGScope.Telemetry.OpenTelemetry`を公開し、`ragscope:telemetry-boundary`、`hs-opentelemetry-api ^>=1.0.0.0`、`hs-opentelemetry-sdk ^>=1.0.0.0`へ依存する
- RAGScope環境のGHC `9.12.4`、`base-4.21.2.0`、Cabal `3.16.1.0`、Hackage index-state `2026-09-08T05:30:34Z`で、`hs-opentelemetry-api-1.0.0.0`、`hs-opentelemetry-sdk-1.0.0.0`、`hs-opentelemetry-exporter-in-memory-1.0.0.0`の依存解決・buildと最小import smoke testを確認済み
- component単位のGHCi import確認で、Telemetry境界からOpenTelemetry API / SDKとAdapterを参照できず、AdapterからTelemetry境界とOpenTelemetry API / SDKを参照できることを確認した
- executable `ragscope`からOpenTelemetry API / SDKを直接参照できないことを確認した
- `make check-app`成功を確認し、本Subtaskの完了条件は満たしている

## 作業範囲

- RAGScopeのGHC / base条件で、`hs-opentelemetry-api`、`hs-opentelemetry-sdk`、`hs-opentelemetry-exporter-in-memory`の依存解決・import smoke testを行う
- 実測した依存を前提に、機能側UseCase / 内部処理からSDKを参照できず、AdapterだけがSDKへ依存するCabal component / `build-depends`境界を実装する
- 後続のTelemetry実装を追加できる最小module構成として`RAGScope.Telemetry`と`RAGScope.Telemetry.OpenTelemetry`を用意する

## 完了条件

- `make check-app`: 成功
- `telemetry-boundary`: `OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`、`RAGScope.Telemetry.OpenTelemetry`のimportはすべて失敗
- `opentelemetry-adapter`: `RAGScope.Telemetry`、`OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`のimportはすべて成功
- executable `ragscope`: `OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`のimportはともに失敗
- Cabal設定とcomponent単位のimport結果から、OpenTelemetry依存がAdapter側へ隔離されていることを確認した
