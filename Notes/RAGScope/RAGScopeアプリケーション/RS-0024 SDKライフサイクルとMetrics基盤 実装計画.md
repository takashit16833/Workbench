---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-16
---

# RS-0024 SDKライフサイクルとMetrics基盤 実装計画

## 1. 目的と位置付け

対象: [[RS-0024 subtask OpenTelemetry SDKライフサイクルとMetrics基盤を実装する]]。RAGScope正本リポジトリの作業branchは`RS-0024/sdk-lifecycle-metrics`。このノートは写経の実行計画であり、現在仕様や採用済み設計の正本ではない。実装上の確定事項は正本のコード・テスト・該当設計へ反映する。実ファイルと相違する場合は対象branchの正本を優先する。

検討の経緯: [[RS-0024 SDKライフサイクルとMetrics基盤の設計案]]（Workbench commit [`9497b4a`](https://github.com/takashit16833/Workbench/commit/9497b4a8798c3f96340a20d9d861017cfbc28b9f)）と[[RS-0024-SDKライフサイクルの責務分離案]]（Workbench commit [`e4ebd63`](https://github.com/takashit16833/Workbench/commit/e4ebd6312434f6f2ff091a9461011757dc1ecc1b)）。後者のレビュー結果に従い、**寿命管理は標準`bracket`、cleanupの実行と結果保持は小さな専用処理、例外の選択は最外層で一度**に分離する。段階取得、機能/構築境界の分離、Metrics Exporterの単独所有は維持する。これは作業上の採用方針であり、正本へ未反映の型・moduleを採用済み仕様と呼ばない。

正本の開始基点は[`7526326d`](https://github.com/takashit16833/RAGScope/commit/7526326d076c5ce8c2a51a3358a4e47a5197f76e)。2026-09-17に確認した作業branchのHEADは[`957d04a`](https://github.com/takashit16833/RAGScope/commit/957d04a962ffc1804ae2234b08fb83c6cc982555)。現行`Lifecycle.hs`には`withOwned`と`ProviderAcquisition`が存在するが、以下の構成へ置き換える予定であり、完成済みとは扱わない。既存の`TraceBoundary`、`LogsBoundary`、Trace/Logs Adapterおよび例外EventRecordのexactly-once処理を維持する。新しい共通`emitMetric`、RAGScope独自Metric、共通失敗ADT、Telemetry独自queue/送信worker/Context管理は追加しない。

## 2. 完成時の責務と公開API

### SDK非依存の機能境界

既存`ragscope-app/telemetry-boundary/RAGScope/Telemetry.hs`の`Telemetry`を維持する。

```haskell
data Telemetry = Telemetry
  { telemetryTrace :: TraceBoundary
  , telemetryLogs  :: LogsBoundary
  }
```

UseCaseへ束を一律に渡さず、必要な`TraceBoundary`または`LogsBoundary`の操作だけを渡す。`telemetry-boundary`の`build-depends`へOpenTelemetry SDK/APIを追加しない。`SpanRunner`、`EventRecordEmitter`、EventName制約を変更しない。

### SDK構築側の責務（以下の新moduleとAPIは提案）

`OpenTelemetry.*`は`RAGScope.Telemetry.OpenTelemetry.*`の略記。

| Module | Cabal状態 | 責務 |
|---|---|---|
| `RAGScope.Telemetry.OpenTelemetry` | exposed | 通常設定用`withTelemetry :: (Telemetry -> IO a) -> IO a` |
| `OpenTelemetry.Configuration` | other | Resource、ID生成器、Processor/Exporter/Reader factory、環境設定の選択。結果収集や例外選択はしない |
| `OpenTelemetry.Construction` | exposed | `SdkPlan`と構築用`SdkTelemetry`、3つの`bracket`の合成、既存Trace/Logs境界への接続。journalの読取りや例外選択はしない |
| `OpenTelemetry.Cleanup` | other | SDK結果の`CleanupResult`、操作名と結果/例外の`CleanupOutcome`、1操作の捕捉・記録。Provider取得やReader具象型を持たない |
| `OpenTelemetry.Lifecycle` | other | 実行ごとの内部記録領域、取得/use全体の結果捕捉、最終報告、純粋な`chooseExit`、文脈付き再送出 |
| `OpenTelemetry.Metrics` | other | `MeterProvider`/`SdkMeterEnv`、Periodic Reader、単独所有Exporter、停止確認と終了依存順序 |
| 既存`OpenTelemetry.Trace`、`.Logs` | exposed（維持） | ProviderからSDK非依存境界への変換 |
| 既存`OpenTelemetry.Exception` | other（維持） | Context注釈、例外EventRecord重複防止 |

内部import方向はroot→Configuration/Construction、Configuration→Construction、Construction→Lifecycle/Cleanup/Metrics/Trace/Logs、Lifecycle→Cleanup、Metrics→CleanupとSDK。CleanupからLifecycleやConstructionへ戻らない。`telemetry-boundary`と`opentelemetry-adapter`間の方向はCabalの`build-depends`で制約する。同じAdapter library内のmodule間importまではCabalで静的禁止できない。

構築用の型は機能境界と区別する。

```haskell
-- 設計用シグネチャ。設定値とReportの具体定義は実装時に確定する。
data SdkTelemetry = SdkTelemetry
  { sdkTelemetry     :: Telemetry
  , sdkMeterProvider :: MeterProvider
  }

withTelemetryUsing
  :: SdkPlan
  -> (LifecycleReport -> IO ())
  -> (SdkTelemetry -> IO a)
  -> IO a
```

`SdkTelemetry`は起動側と接続テスト用であり、UseCaseの型へ`MeterProvider`を漏出させない。通常入口は共通構築入口を呼び、`sdkTelemetry`だけをcallbackへ渡す。productionとテストで別のAdapter実装を作らない。callbackは一回だけ。Provider依存の子threadはcallback内で終了を待つ。型だけでスコープ外へIO値を退避する行為まで完全には禁止できない。

## 3. 資源取得と所有

取得順はTrace→Logs→Metrics、終了順はMetrics→Logs→Trace。`Construction`では次の標準`bracket`を合成する。

```haskell
-- 寿命の形を示す提案。各releaseは失敗を捕捉・記録し、原則として例外を外へ出さない。
withProviders record plan use =
  bracket (acquireTrace record plan) (releaseTrace record) $ \tp ->
    bracket (acquireLogs record plan) (releaseLogs record) $ \lp ->
      bracket (acquireMetrics record plan) (releaseMetrics record) $ \metrics ->
        use tp lp metrics
```

第2Provider取得失敗ならTrace、第3Provider取得失敗ならLogs→Traceを解放する。取得失敗ではcallbackを実行しない。標準`bracket`の取得はmask状態で保護され、使用中は元のmask状態へ戻る。現行`withOwned`の`restore (acquireProvider ...)`をそのまま引き継がない。

ただし`bracket`は取得関数の**内部**で既に取得したExporter/ProcessorやMetrics資源まで自動解放しない。Trace/LogsはExporter→Processor→Providerという所有権移譲の各段階を`bracketOnError`等で保護し、移譲成功後は所有者を重ねてshutdownしない。MetricsはProvider/Env→Exporter→Readerの部分取得失敗で既取得資源を逆順rollbackする。内部rollbackの各結果も`record :: CleanupOutcome -> IO ()`へ渡す。任意の利用者提供factory内部のリークまで自動修復できるとは主張しない。

SDK global Providerを登録しない。既存の`mkOpenTelemetryLogsBoundary :: LoggerProvider -> LogsBoundary`と`mkOpenTelemetryTraceBoundary :: TracerProvider -> EventRecordEmitter -> TraceBoundary`へ明示的にProviderを渡す。Logsの`emitEventRecord`をTrace Adapterへ接続する。

## 4. cleanup結果の取得と保存

`CleanupResult`はSDKの`FlushResult`、`ShutdownResult`、`ExportResult`を成功値へ変換せず保持する。`CleanupOutcome`には対象操作名と`Either (ExceptionWithContext SomeException) CleanupResult`を保存する。既存の`runCleanupSteps`の逐次実行・例外捕捉という機能は`Cleanup`へ移し、SDK固有の結果型を同moduleに閉じる。Readerの結果や依存操作のskipも診断で識別可能にするが、Readerのworker例外とlifecycle実行threadの例外は異なる区分として表現する。

```haskell
-- 提案の1操作実行。recordはLifecycleが渡す内部追記関数。
attemptCleanup
  :: (CleanupOutcome -> IO ())
  -> String
  -> IO CleanupResult
  -> IO (Either (ExceptionWithContext SomeException) CleanupResult)
attemptCleanup record name action = mask_ $ do
  result <- tryWithContext @SomeException action
  record (CleanupOutcome name result)
  pure result
```

flush失敗constructorや同期例外が発生しても、後続shutdownと独立したProviderのcleanupを試す。`attemptCleanup`は例外を選択・再throwせず、結果を記録するだけ。各step実行後に即時記録し、最後に一括して記録する方式を採らない。

`Lifecycle`は一度の呼出し専用`IORef [CleanupOutcome]`を作り、内部`record`は`modifyIORef' ref (outcome :)`で追記し、読取り時に`reverse`する。ユーザーcallback/Exporter背景threadへこのrefや記録関数を公開しない。ライフサイクルthreadだけが書き込むという制約の下で`modifyIORef'`を使用する。並行書込みを要求するなら原子的更新へ見直す。`CleanupJournal`の公開APIと`journalSupersededExceptions`は廃止する方針。結果を返すだけの個別操作にWriterTや別Runtimeを追加しない。

内部recordにネットワーク、Telemetryログ、任意のreporter callbackを混ぜない。`mask_`はinterruptibleなIOの中断を禁止しない。操作中の中断は捕捉して記録し、最外層で選択する。強制終了、停止不能、メモリ枯渇時の記録成功や有限時間解放を保証しない。

## 5. 元の機能結果と例外を最外層で選択する

`Lifecycle`は3つの`bracket`を含む取得/use全体を`tryWithContext @SomeException`で捕捉し、`original :: Either CapturedException a`を保持する。全取得済み資源のrelease試行後にrefを読み、`LifecycleReport`を独立診断先へ一回渡す。診断失敗も`tryWithContext`で捕捉してから、**純粋関数**`chooseExit`で値/再送出例外を一度だけ選ぶ。例外は`rethrowIO`でcontextごと再送出する。報告先の同期失敗は機能結果を変更せず、Telemetryへ再帰的に報告しない。失敗したreporterへの全情報の永続保存は保証しない。

```haskell
-- 提案。記録用referenceの所有と読取りはLifecycleに限定する。
runLifecycle acquireAndUse publish = mask $ \restore -> do
  ref <- newIORef []
  let record outcome = modifyIORef' ref (outcome :)
  original <- tryWithContext @SomeException $ restore (acquireAndUse record)
  cleanup <- reverse <$> readIORef ref
  let report = makeReport original cleanup
  reporting <- tryWithContext @SomeException (publish report)
  either rethrowIO pure (chooseExit original cleanup reporting)

chooseExit
  :: Either CapturedException a
  -> [CleanupOutcome]
  -> Either CapturedException ()
  -> Either CapturedException a
```

優先順位は、(1) 元の取得/use中断、(2) lifecycle threadのcleanupで新たに捕捉した中断、(3) 診断threadの中断、(4) 元の同期例外、(5) 元の値`a`。cleanup/診断の同期失敗やSDKの失敗戻り値だけでは、元の`a`または同期例外を置換しない。`a = Left FeatureFailure`は通常の戻り値としてそのまま維持する。元の同期例外が後発中断に優先されなかった場合でも、元例外は`report`内に保持し、置換履歴専用の`IORef`は増やさない。報告先自身の同期失敗はこのreportの成功を保証しない。

Reader workerの`waitCatch`/`poll`が返す`Left AsyncCancelled`と、`attemptCleanup`が**lifecycle threadで捕捉**する`SomeAsyncException`は混同しない。前者はReader終了状態のデータであり、それだけで`chooseExit`の中断候補にしない。後者だけがcleanup由来の中断候補となる。停止結果の型と記録先ではこの由来を保持し、単に`SomeException`へ平坦化しない。`uninterruptibleMask`でネットワーク送信やReader待ち全体を囲まない。

この方針は初期化失敗時の無条件no-op fallbackやcallback再実行を意味しない。`withSpan`等の個別Telemetry記録経路は別Subtaskの責務。

## 6. Metricsの単独所有とReader停止（レビュー反映）

`SdkMeterProviderOptions.metricExporter = Nothing`を保証し、呼び出し側の`Just`は取得前に明示的な設定エラーとして拒否する。ExporterはMetrics資源が一度だけ所有する。SDK `stopPeriodicMetricReader`はReader停止・最終export・Exporter shutdownをまとめて実行するため、このhelperは使わない。公開`periodicMetricReaderAsync`を使い、SDK定期収集/送信自体は再実装しない。

成功終了での依存順序:

1. Reader workerに停止要求を送り、終了結果を確認する。
2. 終了確認後、`exportMetricsOnce env exporter`のSDK戻り値/例外を記録する。
3. `metricExporterForceFlush exporter`の戻り値/例外を記録する。
4. `metricExporterShutdown exporter`を一回呼び、戻り値/例外を記録する。
5. exporterを所有しないProviderの`meterProviderShutdown`を呼び、戻り値/例外を記録する。

**Reader停止契約の補足:** 使用環境の`async 2.2.6`の`cancel`は中断送信に加えてworkerの終了待ちを行う。workerが応答しなければ`cancel`自体がブロックし、その後の`poll`へ到達できない。`cancel`が必ず有限時間で戻る、`poll`を後置すれば停止不能を検出できる、とは書かない。停止要求または待機が中断された場合は別途`poll`/`waitCatch`で終了済みか確認し、`ReaderStopped`（workerの成功/例外終了を保持）と`ReaderUnconfirmed`を区別する。この型名は案であり、実装時に具体化する。workerの`AsyncCancelled`は通常の意図的停止でも現れるので、lifecycle thread中断へ昇格させない。

停止確認済みの場合だけ2〜5へ進む。未確認の場合、動作中のReaderと競合し得るExporter/Providerの後続終了操作は**理由付きでskip記録**し、独立するLogs→Traceの解放を続行する。停止不能、全資源解放成功、Metricsの全配送成功を保証しない。`cancel`/`poll`はMVar等を使う制御されたテストで分岐を検証し、短いdelayだけから停止成功を推測しない。

最後のexportが失敗してもExporter flush/shutdownとProvider shutdownへ進む。最終export前にexporterなしProviderへ`forceFlushMeterProvider`を呼ばない。delta収集は保存値をリセットし得るため、初期通常構成はcumulativeを選び、deltaの損失ゼロは保証しない。Provider shutdown内部の収集は残るため「収集が一回だけ」とも主張しない。

## 7. 通常構成と依存

`Configuration`がResourceを共通構築し、Traceへ`defaultIdGenerator`を明示設定する（`emptyTracerProviderOptions`は`dummyIdGenerator`）。Trace/LogsはSDK batch Processor、Metricsは上記Provider/Periodic Reader/Exporterを用いる。通常送信手段はSDK OTLP Exporter factory、送信先は環境設定で渡す案。production backendやCollector配置の決定ではない。対応する環境変数は使用する公開APIとテストで範囲を確定し、全`OTEL_*`互換を仮定しない。無効化時は背景workerを起動しない構成を選び、通常入口も`withTelemetryUsing`を通す。

Cabalでは`telemetry-boundary`へSDK依存を追加せず、Adapterに`Construction` exposed、`Configuration`/`Cleanup`/`Lifecycle`/`Metrics` otherを登録する。ReaderのAsync handle操作に`async`、利用Exporter factoryを直接importする場合に`hs-opentelemetry-exporter-otlp`を直接依存として追加する。テストが直接使う`async`/`vector`等もテストcomponentへ明示的に依存させる。version boundsは解決済みversionと公開APIを照合し、推移依存に頼らない。executableへの起動統合は別Subtask。

## 8. 自動テストと完了基準

production/テスト双方が共通`withTelemetryUsing`を呼ぶ。`ragscope-test`のMain/Cabalへ登録し、既存Trace/Logs/例外/SDK挙動試験を維持する。`telemetry-boundary-test`はSDK非依存を維持する。

| ケース | 検証対象 |
|---|---|
| 正常値、`Left FeatureFailure`、callback例外 | callback一回、元の値/ExceptionContext維持、解放順Metrics→Logs→Trace |
| 第2/第3Provider取得失敗 | callback零回、既取得資源の逆順解放、元の取得例外維持 |
| Exporter/Processor/Reader途中取得失敗 | 所有権移譲に応じて一度だけrollback、結果も同じreportに残す |
| flush/shutdownの失敗constructorとthrow | 同じProviderの後続と独立Providerの終了を試し、結果を区別して報告 |
| callbackの同期/非同期例外、cleanup中断 | 文脈、mask復元、元例外と中断の優先順位、全解放後に一度だけ選択 |
| reporter同期失敗/中断 | 上記優先表、機能結果の保護、再実行と診断の再帰なし |
| Reader正常停止/worker例外終了/停止未確認 | worker結果とlifecycle中断を区別。未確認は依存するMetrics終了をskip、Logs/Traceは続行 |
| `cancel`の待機/中断 | MVar通知と別threadの中断で制御し、後続`poll`へ無条件に進めると仮定しない |
| in-memory Metrics | テスト限定Counter Int64で2+3、実際の共通終了経路からscope/Metric名/合計5を検査 |
| delta集約 | 最終export前の余分なcollectなし、Exporter shutdown一回。損失ゼロと混同しない |
| SDK Periodic Reader | Exporter通知/MVarで目的測定のexportと同期、終了結果と終了後exportなしを確認 |
| 既存境界 | Trace/Logsと例外EventRecord exactly-onceを新lifecycleでも保持 |

Meterの取得→Counter作成→`counterAdd`→in-memory Exporter検査を実行する。Readerなしの測定だけでPeriodic Reader接続を検証済みとはしない。初回の空exportは許容する。`make check-app`でformat/build/test/型制約/Haddockを検証し、未実施を成功とは記録しない。

## 9. 写経の手順と現在地

各段階で小さなコードと検証を提示する。新規ファイルは配置場所と**全文**、既存ファイルは変更箇所ごとの**Before → After**の後に**変更後の全文**を示す。RAGScope正本のコードは写経案の提示だけでは変更せず、変更依頼が明示されたときだけGitHubへ反映する。既存`RS-0024/sdk-lifecycle-metrics`を使用し、別branchは作らない。

1. **環境確認（実施済み）:** 利用者が`ragscope-app/dist-newstyle/cache/plan.json`で`hs-opentelemetry-api/sdk/exporter-in-memory/exporter-otlp = 1.0.0.0`、`async = 2.2.6`を確認。`cabal.project.local`/`cabal.project.freeze`はなし。環境中のすべてのpatchまで検証したという意味ではない。
2. **責務分離の第一歩:** `OpenTelemetry.Cleanup`を新設し、現行`Lifecycle`の`CleanupResult`/`CleanupStep`/`CleanupOutcome`と1操作の捕捉・記録を移す。Cabalのmodule登録と関連テストを行う。新moduleだけを追加して同じ型を二重定義しない。
3. **標準bracketと最外層:** `Lifecycle`を単一呼出しの内部ref、`runLifecycle`、`chooseExit`へ置換する。`Construction`の3つの`bracket`へ繋ぎ、Trace/Logs/Metrics段階取得とrollback、元例外、callback回数、解放順、診断失敗をテストする。
4. **部分取得と割込み:** Processor/Exporterの所有権移譲、mask状態、取得中断、flush失敗後のshutdown継続、`ExceptionContext`保存をテストする。
5. **Metrics手動構成:** Provider/Exporter単独所有、最終export→flush→shutdown、in-memory Counter、delta/取得途中失敗を検証する。
6. **Periodic Reader:** SDK公開Async handleの停止・終了結果、`cancel`ブロック/中断、workerとlifecycleの例外由来、停止未確認時のskip、通知によるexportを検証する。
7. **通常構成と統合:** Resource/ID生成器/Batch/環境設定、Trace/Logs/exactly-onceを繋ぎ、`make check-app`を実施する。

直近の正本`Lifecycle.hs`は旧`withOwned`を含み、この新構成は未実装。コード提案のコンパイル、テスト、SDK挙動の実測は本計画更新時点では未実施。次は`Cleanup.hs`の写経から開始する。

## 10. 参照

- [正本Ticket](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScopeアプリケーションへOpenTelemetry%20Observability最小基盤を実装する.md)
- [作業branchのLifecycle.hs](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs)
- [正本Cabal](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/ragscope.cabal)
- [[RS-0024 SDKライフサイクルとMetrics基盤の設計案]]、[[RS-0024-SDKライフサイクルの責務分離案]]
- [SDK MetricReader](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MetricReader.hs)、[MeterProvider](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MeterProvider.hs)
- [[RAGScopeアプリケーション Haskellライブラリ・モジュールマップ]]
