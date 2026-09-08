---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
branch: RS-0024/sdk-cabal-boundary
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T19:00:00+09:00
tags:
  - task
---

## Current state

- `RS-0024/sdk-cabal-boundary`の基準HEAD `a829713bca576b01278351bf30cac20d06f2b94a`、GHC `9.12.4`、`base-4.21.2.0`、Cabal `3.16.1.0`で依存解決・import smoke testを実施した
- Hackage index-state `2026-09-08T05:30:34Z`で、`hs-opentelemetry-api-1.0.0.0`、`hs-opentelemetry-sdk-1.0.0.0`、`hs-opentelemetry-exporter-in-memory-1.0.0.0`を同時に依存解決・buildできた
- 3 packageはいずれもHackage revision `0`であることを確認した
- `OpenTelemetry.Trace.Core`、`OpenTelemetry.Trace`、`OpenTelemetry.Exporter.InMemory`をimportする最小executableのcompile、link、実行が成功した
- smoke testはRAGScopeリポジトリ外の一時ディレクトリで実施し、RAGScope作業ツリーがcleanであることを確認した
- 正本で、無名main libraryまたは1つの`application` libraryを今後の全機能moduleの包括的な受け皿にしない方針を採用した
- 今回のSubtaskではprivate named library `telemetry-boundary`と`opentelemetry-adapter`の2つだけをまず構築し、Cabalの`build-depends`によるSDK依存境界を実測で確認する
- 将来の文書・検索・評価・実験などのlibrary構成は先に固定せず、各実装時の型、import、API、package依存、禁止したい依存方向から決める
- 正本の現在設計は`project-docs/design/RAGScopeアプリケーションHaskell構成設計.md`、判断理由はADR-0007を参照する

## Scope

- `library telemetry-boundary`をprivate named libraryとして追加し、OpenTelemetry packageへ依存させない
- `library opentelemetry-adapter`をprivate named libraryとして追加し、`ragscope:telemetry-boundary`と、実際にimportする`hs-opentelemetry-api` / `hs-opentelemetry-sdk`へ依存させる
- `telemetry-boundary`に`RAGScope.Telemetry`、`opentelemetry-adapter`に`RAGScope.Telemetry.OpenTelemetry`の最小moduleを用意し、今回の依存境界をbuild/importで確認できる状態にする
- `hs-opentelemetry-exporter-in-memory`はこのproduction Adapterの依存へ入れず、後続で実際に利用するtest componentへ追加する
- Telemetryの具体的な操作、SDK lifecycle、Context、Trace、Logs、Metricsの実装はこのSubtaskでは行わない
- 無名main libraryをApplication全体の受け皿として残すことも、代わりに包括的な`application` libraryを追加することもしない

## Verification

1. `ragscope-app/`で`cabal target all:libs`を実行し、実際のlibrary target名を取得する
2. `cabal build all:libs`と`cabal build all`が成功することを確認する
3. `telemetry-boundary`のREPLで次を確認する
   - `import RAGScope.Telemetry ()`は成功する
   - `import OpenTelemetry.Trace ()`は失敗する
   - `import OpenTelemetry.Trace.Core ()`は失敗する
4. `opentelemetry-adapter`のREPLで次を確認する
   - `import RAGScope.Telemetry ()`は成功する
   - `import OpenTelemetry.Trace ()`は成功する
   - `import OpenTelemetry.Trace.Core ()`は成功する
5. REPL targetには`cabal target all:libs`が出力した完全修飾targetを使用する
6. `cabal repl --build-depends=...`はpackage露出を変更して境界検証にならないため使用しない

## Squash merge commit body

- RAGScope環境で利用するOpenTelemetry packageの依存解決とimportを確認した
- `telemetry-boundary`と`opentelemetry-adapter`をprivate named libraryとして追加した
- OpenTelemetry SDK依存を`opentelemetry-adapter`側のCabal境界へ閉じ込めた
- `telemetry-boundary`ではSDK importが失敗し、`opentelemetry-adapter`では成功することを確認した
