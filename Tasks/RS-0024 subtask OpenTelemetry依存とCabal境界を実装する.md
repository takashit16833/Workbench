---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/sdk-cabal-boundary
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T21:04:00+09:00
tags:
  - task
---

## Current state

- `RS-0024/sdk-cabal-boundary`の基準HEAD `a829713bca576b01278351bf30cac20d06f2b94a`、GHC `9.12.4`、`base-4.21.2.0`、Cabal `3.16.1.0`で依存解決・import smoke testを実施した
- Hackage index-state `2026-09-08T05:30:34Z`で、`hs-opentelemetry-api-1.0.0.0`、`hs-opentelemetry-sdk-1.0.0.0`、`hs-opentelemetry-exporter-in-memory-1.0.0.0`を同時に依存解決・buildできた
- 3 packageはいずれもHackage revision `0`であることを確認した
- `OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`、`OpenTelemetry.Exporter.InMemory`をimportする最小executableのcompile、link、実行が成功した
- smoke testはRAGScopeリポジトリ外の一時ディレクトリで実施し、RAGScope作業ツリーがcleanであることを確認した
- `RS-0024/sdk-cabal-boundary`の現在HEAD `cff0193c20fce89b7ddd9effd7151c39f6681bd6`で、RAGScopeアプリケーションを1 Cabal packageのまま、無名main library `ragscope`を公開Facade、機能実装を`document`、`retrieval`、`evaluation-data`、`experiment-evaluation`のprivate named libraryへ分ける構成を正本へ反映した
- RS-0024の`telemetry-boundary` / `opentelemetry-adapter`というcomponent名と具体的なmodule構成は、Workbenchの[[RS-0024 Haskellライブラリ・モジュールマップ]]で実装候補として整理している
- 次は、確定した機能側library構成を前提にTelemetry利用境界とOpenTelemetry AdapterのCabal component / `build-depends`境界を実装し、SDK参照の許可・禁止をbuildで確認する

## Scope

- RAGScopeのGHC / base条件で、候補の`hs-opentelemetry-api`、`hs-opentelemetry-sdk`、`hs-opentelemetry-exporter-in-memory`と必要なPropagator / Exporter packageの依存解決・import smoke testを行う
- 実測した依存を前提に、機能側UseCase / 内部処理からSDKを参照できず、AdapterだけがSDKへ依存するCabal component / `build-depends`境界を実装する
- 後続SubtaskがTrace / Logs / MetricsのSDK非依存境界を追加できる最小module構成を用意する

## Verification

- RAGScopeアプリケーションが依存解決・buildできる
- このSubtaskで追加するSDK非依存のTelemetry境界componentがOpenTelemetry SDK packageを`build-depends`に持たず、SDK moduleを直接importできないことを確認できる
- OpenTelemetry Adapter componentだけが必要なSDK packageを`build-depends`に持ち、必要なSDK moduleをimportできることを確認できる
- executableとTelemetry境界からOpenTelemetry SDK packageを直接参照せず、Adapterを介する依存方向をCabal設定とimportで確認できる

## Squash merge commit body

- RAGScopeアプリケーションを1 packageのままmain libraryを公開Facade、機能実装をprivate named libraryへ分けるHaskell構成を設計した
- RAGScope環境で利用するOpenTelemetry packageの依存解決とimportを確認した
- OpenTelemetry SDK依存をAdapter側のCabal境界へ閉じ込めた
- 後続のTelemetry境界実装に必要な最小module構成を追加した
