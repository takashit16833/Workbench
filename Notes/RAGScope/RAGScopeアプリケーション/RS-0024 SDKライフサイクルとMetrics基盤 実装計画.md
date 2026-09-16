---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-16
---

# RS-0024 SDKライフサイクルとMetrics基盤 実装計画

## 1. 目的と位置付け

対象: [[RS-0024 subtask OpenTelemetry SDKライフサイクルとMetrics基盤を実装する]]。作業branchはRAGScope正本リポジトリの`RS-0024/sdk-lifecycle-metrics`。このノートは写経の実行計画であり、現在仕様や採用済み設計の正本ではない。実装上の確定事項は正本のコード・テスト・該当設計へ反映する。実ファイルと相違する場合は、指定branch上の正本を優先して確認する。

判断の出発点: [[RS-0024 SDKライフサイクルとMetrics基盤の設計案]]（Workbench commit [`9497b4a`](https://github.com/takashit16833/Workbench/commit/9497b4a8798c3f96340a20d9d861017cfbc28b9f)）。本計画はその段階取得・機能/構築境界の分離・Metrics外側所有を維持し、レビューで合意したReader終了結果、delta集約、非同期中断、Lifecycle責務の修正を反映した作業基準とする。

対象の正本基点はcommit [`7526326d`](https://github.com/takashit16833/RAGScope/commit/7526326d076c5ce8c2a51a3358a4e47a5197f76e)。既存の`TraceBoundary`、`LogsBoundary`、Trace/Logs Adapterおよび例外のexactly-once処理を維持する。新しい共通`emitMetric`、RAGScope独自Metric、共通失敗ADT、Telemetry独自queue/送信worker/Context管理を導入しない。

## 2. 完成時の責務と公開API

### 機能処理用のSDK非依存境界

`ragscope-app/telemetry-boundary/RAGScope/Telemetry.hs`に次の積型を設ける。各UseCaseには束を一律に渡さず、必要な既存の操作だけを渡す。

```haskell
-- 設計上の公開型。実装時には既存Trace/Logs moduleをimportする。
data Telemetry = Telemetry
  { telemetryTrace :: TraceBoundary
  , telemetryLogs  :: LogsBoundary
  }
```

このlibraryの`build-depends`へOpenTelemetry SDK/APIを追加しない。既存`RAGScope.Telemetry.Trace`の`SpanRunner`・`TraceBoundary`、`RAGScope.Telemetry.Logs`の`LogsBoundary`・`EventRecordEmitter`・EventName制約を変更しない。

### SDK構築側

`opentelemetry-adapter`に以下を配置する。`OpenTelemetry.*`は`RAGScope.Telemetry.OpenTelemetry.*`の略記。

| Module | Cabal公開状態 | 担当 |
|---|---|---|
| `RAGScope.Telemetry.OpenTelemetry` | exposed | 高水準`withTelemetry :: (Telemetry -> IO a) -> IO a`。通常設定を選び共通入口を呼ぶ |
| `OpenTelemetry.Construction` | exposed | `SdkPlan`、`SdkTelemetry`、`withTelemetryUsing`、3資源の接続、既存Adapterから機能境界の組み立て。テスト/ローカルも同じ実装へ接続 |
| `OpenTelemetry.Lifecycle` | other | 取得範囲、途中rollbackの報告、cleanup操作結果の捕捉・集約、利用結果と終了結果の分離 |
| `OpenTelemetry.Metrics` | other | `MeterProvider`/`SdkMeterEnv`、Periodic Reader、単独所有Exporter、停止確認と結果、最終export・終了の依存順序 |
| `OpenTelemetry.Configuration` | other | 通常のResource、ID生成器、Processor/Exporter/Readerのfactoryと環境設定 |
| 既存`OpenTelemetry.Trace`、`.Logs` | exposed（現状維持） | Providerから境界への変換 |
| 既存`OpenTelemetry.Exception` | other（現状維持） | Context注釈、例外EventRecordの重複防止 |

構築用の`SdkTelemetry`は`Telemetry`と`MeterProvider`を持つ。`MeterProvider`は標準計装を組み立てる起動側と接続テストにのみ渡す。構築moduleは必要な型・スマートコンストラクタだけを公開し、`MetricsResources`のconstructorや内部終了操作を不用意に公開しない。

```haskell
-- 構築側での設計上の型。
data SdkTelemetry = SdkTelemetry
  { sdkTelemetry     :: Telemetry
  , sdkMeterProvider :: MeterProvider
  }

withTelemetryUsing :: SdkPlan -> (SdkTelemetry -> IO a) -> IO a
```

通常入口`withTelemetry`は`withTelemetryUsing`を経由し、callbackへ`sdkTelemetry`だけを渡す。いずれもcallback実行回数は1回。型だけで資源依存のIO値のスコープ外への退避を完全禁止できるとは主張しない。子threadの終了をcallback内で待ち、Providerより長寿命にしない。

### 静的な依存方向

`telemetry-boundary`はSDK/APIに依存しない。`opentelemetry-adapter`は境界、OpenTelemetry API/SDKへ依存する。内部のimportはroot→Configuration/Construction、Configuration→Construction、Construction→Lifecycle/Metrics/Trace/Logs、Metrics→LifecycleおよびSDK。LifecycleからMetricsの具象Reader型へ依存させない。`ragscope-test`は公開されたConstruction入口を利用し、`telemetry-boundary-test`は引き続きSDK非依存とする。

## 3. 資源取得と所有

取得順はTrace→Logs→Metrics、解放順はMetrics→Logs→Traceとする。資源を返した直後から取得済み範囲にcleanup責任を設定する。第二段階でLogs取得に失敗すればTraceを解放し、第三段階でMetrics取得に失敗すればLogs→Traceを解放する。途中失敗ではcallbackを呼ばず、元の取得例外を保存する。

概念上は以下の入れ子。実際の`withOwned`は`mask`と`restore`を使い、callbackをmaskしたまま実行しない。`bracket`だけでは同一finalizer中のflush例外からshutdownへ進めず、release例外が元のcallback例外を上書きする点に注意する。

```haskell
withProviders journal plan use =
  withOwned journal (acquireTrace plan) $ \tp ->
    withOwned journal (acquireLogs plan) $ \lp ->
      withOwned journal (acquireMetrics plan) $ \metrics ->
        use tp lp metrics
```

`SdkPlan`は3つの`ProviderAcquisition`と終了報告の出力先を持つ。Trace/LogsのProcessor/Exporter、MetricsのExporter/Readerはfactoryまたは取得関数として渡せる。任意の`IO provider`の内部リークまで`withOwned`が防ぐと主張しない。各標準取得関数自身が途中で取得した資源を保護する。

特にMetrics内部は(1)`createMeterProvider`でProvider/Env取得、(2)Exporter取得、(3)`forkPeriodicMetricReader`でReader取得、の順とし、(2)(3)の取得失敗では既に得た資源を逆順にcleanupする。Trace/LogsもExporter→Processor→Providerで所有権を移す前の取得失敗を保護し、成功後は所有者を重複shutdownしない。rollbackの失敗情報はlifecycle内部のjournalへ集め、診断関数の例外がrollbackそのものを妨げないようにする。

SDK global Providerは登録しない。既存Adapterは`mkOpenTelemetryLogsBoundary :: LoggerProvider -> LogsBoundary`、`mkOpenTelemetryTraceBoundary :: TracerProvider -> EventRecordEmitter -> TraceBoundary`に明示的にProviderを渡せる。Logsで作った`emitEventRecord`をTrace Adapterへ接続する。

## 4. Metrics構築と正常終了

`SdkMeterProviderOptions.metricExporter`は必ず`Nothing`にする。`Just`を渡す構成は取得前に`Left ExporterOwnedByMeterProvider`等の明示的な設定エラーとして拒否する。Exporterの所有者は外側のMetrics取得範囲だけ。SDK Readerは定期的な`exportMetricsOnce`を実行するが、`stopPeriodicMetricReader`を呼ばず、公開`periodicMetricReaderAsync`からReaderを停止・終了待ちする。これにより停止helper内の最終export例外でExporter shutdownが飛ぶ経路を避け、二重export/shutdownも避ける。

通常終了順:

1. Readerを`cancel`し終了を確認する。`poll`/`waitCatch`の終了結果から正常・例外・意図的中断を区別し、単なる`isJust`への変換で理由を捨てない。
2. `exportMetricsOnce env exporter`の`Success`/`Failure`または例外を記録する。
3. `metricExporterForceFlush exporter`の結果または例外を記録する。
4. `metricExporterShutdown exporter`の結果または例外を記録する。外側が1回だけ実行する。
5. `shutdownMeterProvider provider ...`の結果または例外を記録する。Provider側Exporterは`Nothing`。

最終exportが`Failure`を返す、または例外を投げても、Exporter flush/shutdownとProvider shutdownを続ける。Reader停止が未確認なら使用中のExporterを閉じる競合を避け、Metricsの依存する後続操作を未実行として報告し、独立したLogs/Traceのcleanupへ進む。中断時は停止を再試行・確認できる範囲で実施するが、停止不能な外部処理の有限時間終了や全資源の解放成功までは保証しない。

`metricExporter = Nothing`のProviderに対し、最終export前に`forceFlushMeterProvider`を呼ばない。SDKのdelta集約では収集時に保存値がリセットされ、exportなしのforce flushが測定値を消費し得る。`exportMetricsOnce`自体も収集→export間でReaderがcancelされるとdelta値を失う余地があるため、初期通常構成はcumulative集約を選ぶ。delta集約まで損失ゼロを保証したとは報告せず、delta試験では不要な追加collectの不在を検証する。SDK自体の集約・収集・送信は置き換えない。

## 5. cleanup結果、元例外と中断

`Lifecycle`は汎用的な終了操作の実行と報告を担当する。`CleanupStep`は対象名・操作名・結果を返す`IO`の組とし、Reader具象型や`StopReaderStep ReaderControl`を含めない。SDKの`ExportResult`、`FlushResult`、`ShutdownResult`の異なる失敗constructor、および例外を捨てずに`CleanupReport`へ記録する。Reader停止の成否、停止未確認によるskip、先行取得途中のrollbackはMetrics/取得関数側が判定・報告する。短い実行単位のjournalは許可するが、汎用Runtime、送信queueやTelemetry sinkは作らない。

- callbackが値`a`を返しcleanupの同期失敗だけが生じた場合、同じ`a`を返し、失敗は別経路で診断する。`Left FeatureFailure`という戻り値は`Right (Left FeatureFailure)`として保持し、例外扱いしない。
- callbackまたは取得が同期例外を投げた場合、取得済み資源をcleanup後、既存`ExceptionWithContext SomeException`の文脈を保持して元例外を再送出する。失敗したcallbackを再実行しない。
- callback/取得に非同期中断が来た場合はcleanup後にその中断を再送出する。cleanup中の同期的失敗は終了報告へ記録する。
- callbackが正常終了した後、cleanup中に非同期中断が来た場合は、可能な範囲で残りの終了を試み、保留した中断を最外層で再送出する。
- callback/取得の元例外が同期例外で、cleanup中に新たな非同期中断が来た場合は、元例外を報告へ保存し、非同期中断を最外層へ再送出する。元の非同期中断がある場合はその伝播を維持し、後続の中断・失敗は報告へ残す。元例外を上書きする普通の同期的cleanup失敗と、ユーザー中断の抹消を同一視しない。
- `SomeAsyncException`と通常の`SomeException`を区別する。診断は同じTelemetry経路へ再帰しない。診断出力の同期例外は機能結果・元例外を変えない。`uninterruptibleMask`でネットワーク送信やReader待ち全体を囲まない。

これらは今回の**ライフサイクル取得・終了**の方針。`withSpan`内部や通常の記録・export workerの隔離は後続Subtaskの責務であり、起動失敗後にcallbackを再実行するfallbackや、起動失敗時の無条件no-op継続は追加しない。

## 6. 通常構成

`Configuration`がResourceを共通構築し、Traceへ`defaultIdGenerator`を明示設定する（`emptyTracerProviderOptions`は`dummyIdGenerator`）。Trace/LogsはSDKのbatch Processor、Metricsは上記Provider+Periodic Reader+Exporterとする。通常送信手段はOpenTelemetry SDKのOTLP Exporter factoryを使い、送信先は環境設定で渡す案。production backendやCollector配置の決定ではない。環境変数対応は実際に使用する公開APIとテストで範囲を固定し、内部関数や全`OTEL_*`互換を仮定しない。無効化設定では背景workerを起動しない構成を選択する。通常入口も同じ`withTelemetryUsing`を通す。

Cabalでは`telemetry-boundary`の依存を増やさず、`opentelemetry-adapter`へ`Construction` exposed、`Lifecycle`/`Metrics`/`Configuration` otherを登録する。Reader終了待ちの`async`、通常Exporterを直接importする場合の`hs-opentelemetry-exporter-otlp`はAdapterへ直接依存を追加する。テストで直接使う`async`/`vector`等はテストcomponentへ追加する。version boundsは利用者の解決版と公開APIを照合して設定し、推移依存に頼らない。executableへの起動統合は別Subtaskの範囲。

## 7. 自動テストと完了基準

共通`withTelemetryUsing`をproduction/テスト双方から使用。`ragscope-test`のMain/Cabalへ登録し、既存Trace/Logs/例外/SDK挙動テストを維持する。`telemetry-boundary-test`へSDK依存を増やさない。

| ケース | 検証対象 |
|---|---|
| 正常終了、戻り値`Left`、callback例外 | callbackは1回、返り値またはExceptionContext維持、解放順Metrics→Logs→Trace |
| 第2・第3Provider取得失敗 | 取得済みProviderは逆順終了、callbackは0回、取得元例外保持 |
| Exporter/Reader取得失敗 | Metrics内部rollback、さらに外側Logs/Trace終了 |
| flush/shutdownが失敗値または例外 | 同じProviderの後続操作と独立Providerの終了が続く、診断へ全結果 |
| cleanup中断、診断失敗 | 非同期中断の伝播、元同期例外は診断保存、診断失敗による結果変化なし |
| in-memory Metrics | テスト限定`Counter Int64`で2+3を記録し、共通終了経路から送信されたscope/Metric名/合計5を検査 |
| delta集約 | 最終export前の余分なcollect不在、exporter shutdown一回。損失ゼロの一般保証と混同しない |
| SDK Periodic Reader | 通知/MVarで目的測定のexportと同期し、終了結果と終了後export無しを確認。短いdelayのみで判定しない |
| 既存境界統合 | Trace/Logsと例外EventRecord exactly-onceを新lifecycle内でも保持 |

SDKの`inMemoryMetricExporter`とテスト限定Counterだけを用い、production独自Metricは追加しない。測定値の取得先は`ResourceMetricsExport`のscope、名前、pointまで照合する。Periodic Readerは初回exportが即時なので、目的値の通知を待ち空の初回exportを許容する。`make check-app`でformat/build/test/型制約/Haddockまで検証する。未実施の検証を成功と記録しない。

## 8. 写経の手順

各段階で小さなコードと検証を提示する。新規ファイルは場所と全文、既存ファイルは差分を先に示してから全文を示す。コード・テストを正本へ書き込むのはその変更を明示依頼されたときだけ。作業branchは既存`RS-0024/sdk-lifecycle-metrics`を使い、別branchを作らない。

1. **環境確認:** `ragscope-app/dist-newstyle/cache/plan.json`から解決済みAPI/SDK/in-memory Exporter/asyncのversionを読み取る。`cabal.project.local`とlocal patchの有無も確認し、異なるSDKでは取得・終了・MetricReaderを再照合する。読み取り専用で行う。
2. **最小lifecycle:** `Lifecycle`の取得範囲と`Construction`のTrace→Logs→Metricsの入れ子を実装。背景Readerなしの最小Metricsで第2/第3取得失敗、rollback、元例外とcallback回数をテストする。flush失敗後のshutdown継続も同段階で確認する。
3. **終了失敗・文脈:** cleanup結果値と例外を区別し、同期例外、`Left`、ExceptionContext、非同期中断、診断失敗の優先関係をテストする。
4. **Metrics手動構成:** Provider/Exporter単一所有、最終export→flush→shutdown、in-memory Counter、delta確認、途中取得・終了失敗をテストする。
5. **SDK Periodic Reader:** 公開Async handleの停止・終了結果と取得rollback、通知による測定export、停止未確認時の依存操作skipをテストする。
6. **通常構成と既存Adapter:** Resource/ID生成器/Batch/環境設定を接続し、既存Trace/Logs/exactly-onceの統合と`make check-app`を確認する。

最初のコード変更に先立ち、ステップ1の環境確認結果を確定する。`plan.json`がなければversion未確認と記録し、Cabalの解決をどう確認するか判断する。実装・実行テストはこのノートを作った時点では完了したと扱わない。

## 9. 参照

- [正本Ticket](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScopeアプリケーションへOpenTelemetry%20Observability最小基盤を実装する.md)
- [正本Cabal](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/ragscope.cabal)
- [設計案・SDKソース調査と比較](https://github.com/takashit16833/Workbench/blob/9497b4a8798c3f96340a20d9d861017cfbc28b9f/Notes/RAGScope/RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3/RS-0024%20SDK%E3%83%A9%E3%82%A4%E3%83%95%E3%82%B5%E3%82%A4%E3%82%AF%E3%83%AB%E3%81%A8Metrics%E5%9F%BA%E7%9B%A4%E3%81%AE%E8%A8%AD%E8%A8%88%E6%A1%88.md)
- [SDK MetricReader実装](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MetricReader.hs)、[MeterProvider実装](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MeterProvider.hs)
- [[RAGScopeアプリケーション Haskellライブラリ・モジュールマップ]]
