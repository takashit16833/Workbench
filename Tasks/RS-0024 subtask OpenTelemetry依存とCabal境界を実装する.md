---
status: todo
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/sdk-cabal-boundary
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T15:43:45+09:00
tags:
  - task
---

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
