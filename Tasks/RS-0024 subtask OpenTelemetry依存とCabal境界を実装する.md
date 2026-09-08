---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/sdk-cabal-boundary
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T16:43:14+09:00
tags:
  - task
---

## Current state

- `RS-0024/sdk-cabal-boundary`の基準HEAD `a829713bca576b01278351bf30cac20d06f2b94a`、GHC `9.12.4`、`base-4.21.2.0`、Cabal `3.16.1.0`で依存解決・import smoke testを実施した
- Hackage index-state `2026-09-08T05:30:34Z`で、`hs-opentelemetry-api-1.0.0.0`、`hs-opentelemetry-sdk-1.0.0.0`、`hs-opentelemetry-exporter-in-memory-1.0.0.0`を同時に依存解決・buildできた
- 3 packageはいずれもHackage revision `0`であることを確認した
- `OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`、`OpenTelemetry.Exporter.InMemory`をimportする最小executableのcompile、link、実行が成功した
- smoke testはRAGScopeリポジトリ外の一時ディレクトリで実施し、RAGScope作業ツリーがcleanであることを確認した
- 次は、実測したpackageを前提にCabal component / `build-depends`境界を実装し、SDK参照の許可・禁止をbuildで確認する

## Scope

- RAGScopeのGHC / base条件で、候補の`hs-opentelemetry-api`、`hs-opentelemetry-sdk`、`hs-opentelemetry-exporter-in-memory`と必要なPropagator / Exporter packageの依存解決・import smoke testを行う
- 実測した依存を前提に、UseCase / 内部処理からSDKを参照できず、AdapterだけがSDKへ依存するCabal component / `build-depends`境界を実装する
- 後続SubtaskがTrace / Logs / MetricsのSDK非依存境界を追加できる最小module構成を用意する

## Verification

- RAGScopeアプリケーションが依存解決・buildできる
- Application / Telemetry境界からOpenTelemetry SDK packageを直接参照できないことをCabal設定とimportで確認できる
- Adapter側から必要なSDK packageを参照できる

## Squash merge commit body

- RAGScope環境で利用するOpenTelemetry packageの依存解決とimportを確認した
- OpenTelemetry SDK依存をAdapter側のCabal境界へ閉じ込めた
- 後続のTelemetry境界実装に必要な最小module構成を追加した
