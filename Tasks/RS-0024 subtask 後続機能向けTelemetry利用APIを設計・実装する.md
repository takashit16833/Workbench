---
status: doing
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - "[[RS-0024 subtask 未処理例外のEventRecordをexactly-onceで記録する]]"
branch: RS-0024/feature-telemetry-api
dateCreated: 2026-09-16T09:47:00+09:00
dateModified: 2026-09-16T10:04:49.758+09:00
tags:
  - task
priority: normal
---

## Squash merge commit body

- 後続機能がSDK非依存のTelemetry境界を利用できるAPIを確定した
- 設計時に固定されるEventNameとEventRecord構築の責務を、機能固有定義と共通境界の間で明確化した
- 機能固有値からTrace / Logs表現へ変換する依存方向をコード・Cabal・テストで確認した

## 目的

後続機能が機能固有のTelemetry定義を共通Telemetry境界へ安全に接続できる利用APIを設計・実装し、機能側がOpenTelemetry SDKや不要な動的EventName生成へ依存しない境界を確定する。

## 作業範囲

- 現在のObservability設計、Telemetry境界、Cabal依存、実コードとテストを確認し、後続機能から使うAPIに必要な責務を特定する
- EventNameは設計時に固定され、実行ごとに変わる値はattributesへ置く現在設計を前提に、non-empty不変条件を保ちながら静的EventNameを自然に扱えるAPIを確定する
- EventRecordのname / timestamp / severity / attributesを機能固有のTelemetry定義から共通境界へ変換する責務配置を確定する
- 機能固有ADT等からTrace / Logsの共通表現へ変換する仕組みについて、通常関数、型クラス、関数レコード / newtype等を実際のpackage依存とimport方向から比較し、必要最小限の方式を採用する
- TraceとLogsへ同じ事実を重複記録することを前提にせず、それぞれ必要なTelemetry表現だけへ変換できるAPIにする
- 採用した設計判断が現在の正本設計へ追加・変更を必要とする場合は、関係するObservability設計へ反映する
- 公開API、Cabalの`build-depends`、自動テストでSDK型の漏出と依存方向を検証する

## 対象外

- `DocumentProcessingEvent`など個別機能のTelemetry ADTそのものの定義
- 個別機能で発生するEventName、Severity、attributes、Spanの具体的な列挙とmapping
- 文書処理、Embedding、DB等の機能実装からTelemetry APIを実際に呼び出す処理
- SDK lifecycle / Metrics、Trace Context伝播、Telemetry失敗隔離の実装

## 完了条件

- 後続機能が任意の実行時`Text`からEventNameを都度組み立てず、設計時に固定したEventNameを機能固有mappingからEventRecordへ反映できる
- EventNameのnon-empty不変条件を保ち、利用側へ現在要求されていない動的EventName生成の自由度を不要に公開していない
- 機能固有値からTrace / Logs表現へ変換する責務とAPIが具体的な型、関数、module、package依存として確定している
- UseCaseや内部処理の公開型へOpenTelemetry SDK型を漏出させていない
- 既存のexception EventRecord、Trace、Logsの挙動を変更する場合は意図した変更として正本へ反映し、変更しない場合は既存テストで回帰がないことを確認できる
- プロジェクトで定めたRAGScopeアプリケーション側のテスト・品質検査が成功する
