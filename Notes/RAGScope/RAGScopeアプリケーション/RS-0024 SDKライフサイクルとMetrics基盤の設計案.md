---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-16
---

# RS-0024 SDKライフサイクルとMetrics基盤の設計案

## 1. 結論と、この文書の位置付け

**推奨は、SDKの各資源を段階的に取得し、取得した範囲を入れ子にして解放する構成である。機能処理のTelemetry操作、SDKの構築、SDK資源の終了処理を分ける。MetricsではSDKの定期Readerを使いつつ、Reader停止・最終export・Exporter終了を独立した終了手順として扱う。**

既存の`TraceBoundary`、`LogsBoundary`、Trace / Logs Adapter、例外のexactly-once記録は維持する。修正コストを考慮しなくても、この境界を置き換える根拠は今回確認した要求・コードからは得られなかった。必要な変更は、それらを組み立てて資源の寿命を管理する外側に集中する。

この文書はWorkbench上の**未採用の設計提案**である。コード案は正本の実装ではなく、コンパイル・実行未検証である。SDKの確認済み実装、正本の決定、提案を区別して記載する。採用する場合は、必要な内容自体を正本リポジトリのコード・テスト・適切な実装設計へ反映する。

対象Task: [[RS-0024 subtask OpenTelemetry SDKライフサイクルとMetrics基盤を実装する]]

## 2. 確認した状態

### 2.1 branchとcommit

2026-09-16にGitHubから確認した。

| 対象 | branch | 確認したHEAD |
|---|---|---|
| 正本リポジトリ | `RS-0024/sdk-lifecycle-metrics` | `7526326d076c5ce8c2a51a3358a4e47a5197f76e` |
| 正本リポジトリの親branch | `feat/RS-0024-opentelemetry-observability-foundation` | 同上 |
| Workbench | `feat/RS-0024-opentelemetry-observability-foundation` | `30d334d5057193c6f7a81a96e0ce056ead7efa8a` |

正本の両branchは引き継ぎと一致した。Workbenchの対象Taskは`doing`、`branch`も一致し、直接の`blockedBy`である「OpenTelemetry依存とCabal境界を実装する」は`done`だった。Taskの完了済み表現を含む`Squash merge commit body`は成果の予定文であり、実装済みの根拠には使用しない。

正本Ticketは`in_progress`である。今回の実装状態は、Ticketの未チェック項目だけで判断せず、対象commitのCabal・コード・テストと照合した。

### 2.2 決定済みの要求と今回の選択

| 論点 | 状態 | 根拠・扱い |
|---|---|---|
| SDK依存を機能処理から隔離する | 決定済み | Ticket、Observability設計、private libraryの`build-depends` |
| 既存のTrace / Logs利用境界 | 決定済み | `telemetry-boundary`の実コード |
| batching・集約・送信・Context管理をSDKに委ねる | 決定済み | Observability設計 §2、Ticket |
| Trace / Logs / Metricsを初期化・終了し、構成を差し替える | 決定済み | Ticket。今回の部分取得・終了失敗の具体的な作業単位は対象Taskでも確認 |
| Metricの対象 | 決定済み | Metrics設計。共通の独自Metricは追加しない |
| 記録・export失敗で成功した機能結果を失敗へ変えない | 決定済み | Observability設計 §3、Ticket |
| lifecycleの具体的なmodule・公開関数・終了順 | 未決定 | ルートAdapter moduleは公開要素なし。Observability設計 §5は具体的な型・関数を実装時に委ねる |
| 初期化できない場合にアプリ全体を継続するか | 未決定 | 成功済みの機能結果を保つ要求から、起動失敗時の無条件継続までは導けない |
| production backend・送信経路 | 未決定／今回固定しない | Observability設計 §5とTicketの対象外 |
| 利用者環境の現在の解決済みSDK version | 確認不能 | この調査環境に利用者の`dist-newstyle/cache/plan.json`はない |

「具体的なmoduleは未決定」はSDK非依存境界まで白紙という意味ではない。既に存在する境界とAdapterを出発点にする。

### 2.3 package versionの精度

正本の`ragscope.cabal`はAPI / SDKに`^>=1.0.0.0`、テストにin-memory Exporterの`^>=1.0.0.0`を指定している。`cabal.project`は`packages: .`のみで、確認したtreeにはfreezeファイルがない。この制約だけで解決済みversionが厳密に1.0.0.0だとは断定できない。

本調査では上流commit `46a42cdf80405fdb36fbb48a309254b2332617b4`のソースを実際に読み、API・SDK・in-memory ExporterそれぞれのCabalで`version: 1.0.0.0`を確認した。以下のSDK実装に関する結論は**このソースcommitに限定**する。Hackage配布物との全ファイル一致や利用者のインストール済みソースとの一致は未検証である。

Workbenchの依存導入Taskには、2026-09-08時点でGHC 9.12.4、base 4.21.2.0、Cabal 3.16.1.0、上記3 packageの1.0.0.0を実測した記録がある。これは過去の作業記録として参照し、現在の解決結果の代わりにはしない。

## 3. 現在のコードから維持する構造

### 3.1 具体的な接続点

現在の関数シグネチャは次である。

```haskell
mkOpenTelemetryLogsBoundary
  :: LoggerProvider
  -> LogsBoundary

mkOpenTelemetryTraceBoundary
  :: TracerProvider
  -> EventRecordEmitter
  -> TraceBoundary
```

取得した`LoggerProvider`から`LogsBoundary`を作り、`emitEventRecord logsBoundary`をTrace Adapterへ渡せる。新しいclass、汎用イベントbus、SDK Providerを機能処理まで引き回す環境型は必要ない。

```haskell
-- 提案: lifecycle側で行う純粋な組み立て。
mkTelemetry :: TracerProvider -> LoggerProvider -> Telemetry
mkTelemetry tracerProvider loggerProvider =
  let logs = mkOpenTelemetryLogsBoundary loggerProvider
  in Telemetry
       { telemetryLogs = logs
       , telemetryTrace =
           mkOpenTelemetryTraceBoundary
             tracerProvider
             (emitEventRecord logs)
       }
```

Trace Adapterは`makeTracer`、`inSpan''`、`setStatus`、`addAttribute`を使用する。Logs Adapterは`makeLogger`、`emitLogRecord`を使用し、`context = Nothing`によって記録時のContext解決をSDKへ委ねる。Providerをglobalに登録しなくても、現在の明示的な接続を利用できる。

`OpenTelemetry.Exception`は`ExceptionWithContext SomeException`、`catchNoPropagate`、`rethrowIO`を使い、例外伝播の注釈にexactly-onceの記録済み情報を保持する。lifecycleの例外処理でこの文脈を落とさないことが必要である。単に例外の型が同じというテストでは足りない。

`eventNameLiteral` / `NonEmptyEventName`と機能固有ADTから`EventRecord`への純粋変換にも変更は不要である。

### 3.2 現在のCabal境界

| component | 現在の役割・依存 |
|---|---|
| `telemetry-boundary` | private library。`base`、`bytestring`、`containers`、`text`、`time`。SDK依存なし |
| `opentelemetry-adapter` | private library。境界、API、SDKへ依存。Trace / Logsを公開し、Exceptionは`other-modules` |
| `ragscope-test` | Adapter、境界、API、SDK、in-memory Exporter、Hspecに依存 |
| `telemetry-boundary-test` | 境界とHspec等だけに依存。SDK非依存の利用を検証 |
| executable | 現在は`base`とmain libraryのみ。`Main.hs`は挨拶を出力する段階 |

private libraryの`exposed-modules`は、そのcomponentの利用者へ公開するmoduleである。`visibility: private`だから同じpackage内の別componentから全moduleを見られる、という意味ではない。`other-modules`に置いた内部実装をテストから当然にimportできるとも考えない。

## 4. SDKソースの確認結果

### 4.1 統合helperの限界

`OpenTelemetry.SDK.initializeOpenTelemetry`は、Trace、Metrics、Logsの順に`initializeGlobal*Provider`を実行し、すべて成功してから`OTelSignals`を返す。第2・第3取得が例外になった場合に、それ以前のProviderを終了する処理はこの関数に存在しない。

`withOpenTelemetry = bracket initializeOpenTelemetry otelShutdown`でも、この問題は解消しない。`bracket`の取得処理全体が成功して戻る前の内部資源には、外側のreleaseが適用されないためである。

`otelShutdown`は各shutdownの`SomeException`を捕捉して次へ進むが、結果値を`void`で捨て、明示的なforce flushも行わない。globalへの登録を伴うため、失敗した初期化の途中状態と独立テストの扱いも増える。

`OpenTelemetry.Configuration.Create.createFromConfig`も確認した。こちらも段階取得のrollbackはなく、通常経路のshutdownは直列で、途中例外によって後続へ到達しない。また、Metricsの構築では同じExporterをProviderとReader双方へ渡している。環境変数helperを設定オブジェクトhelperへ替えるだけでは解決しない。

### 4.2 Trace / Logsの個別API

`IO`へ具体化すると、使用する関数は次である。

```haskell
createTracerProvider
  :: [SpanProcessor] -> TracerProviderOptions -> IO TracerProvider
forceFlushTracerProvider :: TracerProvider -> Maybe Int -> IO FlushResult
shutdownTracerProvider   :: TracerProvider -> Maybe Int -> IO ShutdownResult

createLoggerProvider
  :: [LogRecordProcessor] -> LoggerProviderOptions -> IO LoggerProvider
forceFlushLoggerProvider :: LoggerProvider -> Maybe Int -> IO FlushResult
shutdownLoggerProvider   :: LoggerProvider -> Maybe Int -> IO ShutdownResult
```

元のcreate / flush / shutdownには`MonadIO`で一般化されたものがあるが、今回の資源管理は`IO`で行えばよい。

Trace / Logs Providerの終了処理は各Processorの処理を`async`で開始し、`waitCatch`で結果を集約する。例外だけでなく`FlushError`、`FlushTimeout`、`ShutdownFailure`、`ShutdownTimeout`も扱う必要がある。Providerはshutdown開始時に終了済み状態を設定するため、失敗したら同じProviderのshutdownを繰り返せばよい、とは考えない。

さらに、`emptyTracerProviderOptions`のID生成器は`dummyIdGenerator`である。これをそのまま通常実行の既定値にしてはならない。通常の構成では`OpenTelemetry.Trace.Id.Generator.Default.defaultIdGenerator`を明示する。

### 4.3 Metricsの個別APIと終了処理

```haskell
createMeterProvider
  :: MaterializedResources
  -> SdkMeterProviderOptions
  -> IO (MeterProvider, SdkMeterEnv)

forkPeriodicMetricReader
  :: SdkMeterEnv
  -> MetricExporter
  -> PeriodicMetricReaderOptions
  -> IO PeriodicMetricReaderHandle

exportMetricsOnce
  :: SdkMeterEnv -> MetricExporter -> IO ExportResult
```

`PeriodicMetricReaderHandle`は`periodicMetricReaderAsync :: Async ()`と`stopPeriodicMetricReader :: IO ()`を公開している。Readerは最初にexportし、その後intervalだけ待つ。最初のexportがinterval経過後だというテストは誤る。

確認した停止処理は、順に`cancel`、`waitCatch`、`exportMetricsOnce`、`metricExporterShutdown`を実行する。最後のexportが例外を投げるとExporter shutdownへ到達しない。結果値として返った`Failure ...`や`ShutdownFailure`は捨てられる。

`SdkMeterProviderOptions.metricExporter`を`Nothing`にすると、Providerのforce flushは収集するだけでexportしない。`Just ex`にすると、Providerのflush / shutdownもexportし、shutdownがExporterも終了する。同じ`ex`をReaderに渡す場合、所有を別途整理しなければならない。

**特にdelta集約では、exportの前に素の`forceFlushMeterProvider`を呼ぶことが有害になり得る。** `collectResourceMetrics`はdeltaの場合、収集時に保存値を取り出してリセットする。`metricExporter = Nothing`のProviderで「Providerをflushしてから`exportMetricsOnce`」と並べると、前者で収集した測定値を送信せずに消費する。この結論は`collectResourceMetrics`と`meterProviderForceFlush`の実装から導かれる。

### 4.4 timeoutと「終了成功」の限界

`MeterProvider`の実装は`_timeoutMicros`を受け取っても使用していない。定期Readerのoptionsもintervalだけである。APIの説明にtimeoutが書かれていることと、その実装が上限を守ることを分ける。

Trace / Logsも、timeout後の`cancel`が相手の終了を待つ。相手が中断不能な処理に入り続ける場合まで有限時間で終わるとは保証できない。

Simple Processorでは、workerを`wait`した後にExporterをshutdownする実装も確認した。workerが例外終了するとExporter終了に到達しない経路がある。通常構成の候補であるBatch Processorは別の実装である。したがって「Providerのshutdownを呼んだ」ことと「内部の全資源が確実に解放された」ことは同一ではない。今回の終了継続テストは、後続操作が実際に呼ばれることとSDK結果を区別して検証する。

## 5. 案の比較

### 5.1 初期化と寿命管理

| 評価項目 | A: `withOpenTelemetry` | B: 個別取得と入れ子の資源範囲 | C: `ResourceT` / `Acquire`等を中心にする |
|---|---|---|---|
| 部分取得失敗 | 確認ソースでは以前のProviderをrollbackしない | 取得済みの資源範囲から逆に終了できる | 登録済み資源を解放できるが、単一取得関数の内部失敗は別途対応 |
| 終了失敗 | helperの結果は捨てられる。必要なflushも別実装 | 操作ごとの結果と例外を収集して次へ進める | 同様の結果処理は別途必要 |
| 型と依存 | `OTelSignals`、SDK、global登録 | SDK型は構築側だけ。機能境界への依存は現状維持 | 上記に資源管理libraryへの依存が増える |
| テスト | 第2取得等の失敗注入が難しい | 実際の共通lifecycleへ取得関数・Processor等を注入 | 実装可能。解放順と例外優先も検証が必要 |
| コード量 | 表面は小さい。完了条件を補うにはSDK修正等が必要 | 3つの取得範囲と短い終了処理実行器 | 固定3Providerだけなら導入による簡略化は小さい |
| 変更範囲 | SDK依存のhelper仕様に強く依存 | 構築・終了moduleに限定 | 全体を`ResourceT`へ伝播させる必要はないが、境界設計が増える |

**Bを推奨する。** Aの不足は好みの問題ではなく、部分初期化失敗の完了条件との不一致である。Cを否定する必要はないが、今回は資源の依存関係が固定で、入れ子の関数だけで表せる。新しい一般資源管理基盤の設計を主題にしない。

### 5.2 MetricsのExporter所有

| 案 | 具体的な構造 | 評価 |
|---|---|---|
| Reader所有 | Providerは`metricExporter = Nothing`。`stopPeriodicMetricReader`に最終exportとExporter終了を任せる | 通常経路は短い。しかし停止時export例外でExporter終了が飛ぶ |
| ProviderとReaderの両方に所有させる | Providerに`Just ex`、Readerにも同じ`ex` | 二重export / shutdownを生む。採用しない |
| ReaderへshutdownしないExporterの写しを渡す | レコード更新でReader側shutdownをno-opにし、外側が元Exporterを終了 | 正常なReader helperを使えるが、helperがexport結果を捨てる点は残る。追加の結果捕捉が必要 |
| 外側のMetrics取得範囲が所有する | SDK Readerは定期実行を担当。公開Async handleで停止・終了待ちし、最終export・flush・Exporter shutdownを個別に呼ぶ | 操作を分けて結果と例外を扱える。SDKの公開handleへの依存が増えるが1 moduleに限定できる |

**最後の案を推奨する。** `stopPeriodicMetricReader`を呼んだうえで同じExporterをさらにshutdownする案ではない。定期実行、収集、集約、送信はSDKに残し、停止helperが一体化している終了手順だけを分ける。

上流SDKで停止helperが例外安全・結果取得可能になった場合は、この互換処理を置き換えられる。現時点では上流修正を本Subtaskの前提にしない。

## 6. 公開APIとmodule配置の提案

### 6.1 機能操作とSDK組み立て用の値を分ける

```haskell
-- 提案。telemetry-boundary側のRAGScope.Telemetryに置く。
data Telemetry = Telemetry
  { telemetryTrace :: TraceBoundary
  , telemetryLogs  :: LogsBoundary
  }

-- 提案。opentelemetry-adapter側で定義し、構築入口だけに公開する。
-- constructorと全フィールドを高水準moduleから公開しない。
data SdkTelemetry = SdkTelemetry
  { sdkTelemetry     :: Telemetry
  , sdkMeterProvider :: MeterProvider
  }

-- 高水準入口。利用者にSDK設定型を要求しない。
withTelemetry :: (Telemetry -> IO a) -> IO a

-- ローカル構成と自動テスト向けの低水準入口。
withTelemetryUsing
  :: SdkPlan
  -> (SdkTelemetry -> IO a)
  -> IO a
```

`Telemetry`は起動時の組み立てに使う小さな積型であり、すべてのUseCaseへ渡す共通環境ではない。機能には現在の利用テストと同じく、必要な`TraceBoundary`、`EventRecordEmitter`や機能固有の関数値だけを渡す。

`MeterProvider`は後続の標準計装を組み立てる外側、及び接続テストでのみ使う。今は具体的な標準計装を接続しない。`telemetry-boundary`へ`MeterProvider`や万能な`emitMetric`を追加しない。

`withTelemetryUsing`も本番と同じ組み立て・取得・終了処理を使う。`withTelemetry`は設定を選び、callbackへ`sdkTelemetry`だけを渡す薄い入口にする。将来の標準計装の組み立ては、この同じ内部入口を使う。

callback形式は正しい利用範囲を表すが、Haskellの通常の`IO`では、callbackがProviderやそれを捕捉した関数を`IORef`へ保存したり戻り値で返したりできる。**スコープ外使用を型で完全に禁止できるとは主張しない。** `forall s`という幽霊型を足すだけでも、既存の無印の`TraceBoundary`や任意の`IO`への退避を禁止できない。今回は公開範囲を絞り、範囲外へ資源依存操作を持ち出さない利用契約と、子処理を範囲内で待つ構造で扱う。

### 6.2 moduleごとの責務

以下の`OpenTelemetry.*`は`RAGScope.Telemetry.OpenTelemetry.*`の略記である。

| module | 公開範囲 | 責務 |
|---|---|---|
| `RAGScope.Telemetry` | 境界libraryの公開module | SDK非依存の`Telemetry`積型 |
| `RAGScope.Telemetry.OpenTelemetry` | Adapterの高水準公開module | `withTelemetry`。通常構成を選んで共通入口へ渡す |
| `OpenTelemetry.Construction` | Adapterの低水準公開module | `SdkPlan`、`SdkTelemetry`、`withTelemetryUsing`、Trace / Logs Providerの構築と境界の組み立て |
| `OpenTelemetry.Lifecycle` | `other-modules` | 取得直後の保護、終了操作の結果収集、元例外・中断の優先関係 |
| `OpenTelemetry.Metrics` | `other-modules` | MeterProvider・SDK Reader・Exporterの取得、所有、終了手順 |
| `OpenTelemetry.Configuration` | `other-modules` | 環境設定から通常構成の取得計画を作る。SDK factoryと設定型をここに閉じ込める |
| 既存`OpenTelemetry.Trace` / `.Logs` | 現状維持 | 既存のProviderから機能操作への変換 |
| 既存`OpenTelemetry.Exception` | 現状維持 | Spanの例外観測とEventRecord重複防止 |

LifecycleとMetricsは最初から分ける。前者は例外と資源取得範囲、後者はSDK固有のReader・Exporter所有を扱い、変更理由も必要なimportも異なるためである。APIの再exportだけを行うmoduleをさらに増やさない。

型の定義場所も固定する。`ProviderAcquisition`・`CleanupStep`・`CleanupReport`・`ReaderControl`はLifecycle、`MetricsResources`はMetrics、`SdkPlan`・`SdkTelemetry`はConstructionに置く。Constructionは必要な型を選んで再exportする。静的なimport方向は、ルート→Configuration / Construction、Configuration→Construction、Construction→Metrics / Lifecycle / 既存Trace / Logs、Metrics→LifecycleとSDKであり、逆方向のimportを作らない。ReaderControlはthread実装を知らない終了権限の型なので、LifecycleからMetricsへの依存は不要である。

### 6.3 差し替え入口の型

低水準の骨格は次とする。`ProviderAcquisition`の契約は後述する。これは型・責務を示す案で、完成実装ではない。

```haskell
data ProviderAcquisition provider = ProviderAcquisition
  { acquireProvider :: (CleanupReport -> IO ()) -> IO provider
  , providerCleanup :: provider -> [CleanupStep]
  }

data SdkPlan = SdkPlan
  { acquireTrace   :: ProviderAcquisition TracerProvider
  , acquireLogs    :: ProviderAcquisition LoggerProvider
  , acquireMetrics :: ProviderAcquisition MetricsResources
  , onCleanupReport :: CleanupReport -> IO ()
  }

-- MetricsResourcesは内部型。低水準利用者もconstructorを直接組み立てず、
-- Metrics用の構築関数からProviderAcquisitionを得る。
data MetricsResources = MetricsResources
  { metricsProvider :: MeterProvider
  , metricsEnv      :: SdkMeterEnv
  , metricsExporter :: MetricExporter
  , metricsReader   :: ReaderControl
  }

data ReaderControl = ReaderControl
  { stopAndWaitReader :: IO ()
  , readerIsStopped   :: IO Bool
  }
```

`ReaderControl`は集約器・スケジューラではなく、作成したReaderの停止権限と停止確認だけを表す。通常構成の実装はSDKの公開Async handleを終了待ちし、`poll`で停止を確認する。テスト用の手動構成は背景threadを作らず、停止操作を空、停止確認を`pure True`にできる。exportは双方とも`exportMetricsOnce`を使う。`onCleanupReport`は通常構成ではstderr診断、テストではIORef等への結果保存とする。呼び出すのは共通lifecycleの最外層であり、その失敗も後述の優先関係に従う。

低水準moduleで公開するのは`ProviderAcquisition`の構築に必要な型・関数だけとし、内部の`MetricsResources` constructorや診断用IORefは公開しない。テストのために内部moduleをすべて`exposed-modules`へ移す必要はない。

例えばMetricsの構築関数は次の型で、同じProvider構築・最終export・終了処理へReader生成だけを差し替えられる。

```haskell
metricsAcquisition
  :: MaterializedResources
  -> SdkMeterProviderOptions
  -> IO MetricExporter
  -> (SdkMeterEnv -> MetricExporter -> IO ReaderControl)
  -> Either MetricsConfigurationFailure (ProviderAcquisition MetricsResources)

data MetricsConfigurationFailure = ExporterOwnedByMeterProvider
```

この関数は渡されたMeter optionsの`metricExporter`が`Nothing`なら取得計画を`Right`で返し、`Just`なら資源取得前に`Left ExporterOwnedByMeterProvider`を返す。`Just`を黙って無視して所有者を変えない。純粋な設定検証をIO例外にしない。公開する`MetricsResources`のconstructorを隠し、この構築関数を通すことで、通常の構築経路から二重所有を作れないようにする。

`ProviderAcquisition`は資源安全性の証明ではない。**取得関数が返る前の途中資源は取得関数自身がcleanupする**という契約を持つ。任意の`IO provider`を注入すれば、内部リークも自動的に防げるという説明はしない。標準の構築関数と、その取得失敗テストがこの契約を支える。

`acquireProvider`の引数は、部分取得rollbackの結果を、そのlifecycle呼び出しの内部記録へ追記する関数である。共通入口は`appendCleanupReport journal`を渡す。外部の`onCleanupReport`を取得途中で直接呼ばないため、診断出力の失敗でrollbackを妨げない。失敗注入テストの取得関数はこの引数を無視してよい。新しい独立した診断経路ではなく、通常終了と部分取得の終了結果を同じ場所へ集めるための引数である。

## 7. 初期化・所有・解放の具体的な手順

### 7.1 全体の取得順

1. 通常設定を解釈し、資源をまだ取得していない計画を作る。
2. Traceの取得範囲を開始する。
3. Logsの取得範囲を開始する。
4. Metricsの取得範囲を開始する。
5. `mkTelemetry`で既存Adapterを組み立て、callbackを1回だけ実行する。
6. Metrics、Logs、Traceの順に終了する。

TraceとLogsの取得順に業務上の意味はない。固定した順序と逆順の終了をテスト可能にするため、この順を選ぶ。機能処理や起動処理の子threadはcallbackを抜ける前に終了待ちする。実行中の処理を残してProviderだけ先に終了させない。

### 7.2 Provider内部の部分取得

| 取得段階 | 成功している資源 | 次の段階が失敗した場合 |
|---|---|---|
| Trace Exporter生成 | Exporter | Processor生成失敗ならExporterを終了 |
| Trace Processor生成 | Exporterを所有するProcessor | Provider生成失敗ならProcessorを終了 |
| Trace Provider生成 | Processorを所有するProvider | 以降はProviderの終了処理へ一本化 |
| Logs | Traceと同様 | さらに外側のTraceも終了 |
| MeterProvider生成 | Providerと`SdkMeterEnv` | Exporter生成失敗ならProviderを終了 |
| Metric Exporter生成 | Provider、Exporter | Reader生成失敗ならExporter、Providerを終了 |
| Reader生成 | Provider、Exporter、Reader | 以降はMetrics全体の終了手順を使用 |

Processor / Providerへの所有移転が成功したら、親と子の双方を通常終了で重複shutdownしない。複数Processorを扱う構築関数では、一括`mapM`を裸で実行せず、各取得を保護する。現段階で複数を必要としない通常構成に、架空の複数Exporter要求を追加する必要はない。

`bracket`の外側だけでこの表を満たせるわけではない。例えば「Exporter取得→Processor作成」の途中保護は`mask`下で取得成功を確認してから`onException`を設置するか、さらに小さな入れ子の取得範囲で実装する。SDK factory自体が内部workerを作成した後、handleを返す前に失敗する経路はSDK側の実装確認も必要になる。

この案の保証は、取得に成功してhandleを得た資源へ所定の終了処理を実行することと、構築関数で保有している途中資源のcleanupである。失敗する外部libraryの内部まで、Haskellの型だけで解放成功を保証するものではない。

### 7.3 global Providerを使わない

今回の通常構成とテストでは、`setGlobalTracerProvider`、`setGlobalLoggerProvider`、`setGlobalMeterProvider`を呼ばない。現在のAdapterには明示的なProvider引数があり、Metrics接続テストも明示的なProviderで可能だからである。

これによって複数テストのProviderが互いを上書きしない。SDKのContextを自作する意味ではなく、Contextは引き続きSDKに委ねる。将来の標準計装がglobal Providerしか受け付けない場合は、その具体的なAPIを調べた上で、その組み立て箇所に限って判断する。未確認の将来要求でglobal登録を先行追加しない。

## 8. 終了処理と例外の優先関係

### 8.1 終了操作を列として扱う

終了処理は「一つ失敗したら全体の`Left`を返して止まる」合成にしない。各操作を必ず個別に評価し、結果を列として蓄積する。

```haskell
-- Adapter内部の技術的な終了結果。機能失敗やerror.typeの分類ではない。
data CleanupStep
  = StopReaderStep ReaderControl
  | CloseLogExporterStep (IO ())
  | ExportMetricsStep (IO ExportResult)
  | FlushStep CleanupTarget (IO FlushResult)
  | ShutdownStep CleanupTarget (IO ShutdownResult)

data CleanupTarget
  = TraceProviderTarget
  | LogsProviderTarget
  | MeterProviderTarget
  | MetricExporterTarget
  | TraceProcessorTarget
  | TraceExporterTarget
  | LogsProcessorTarget
```

`CloseLogExporterStep`は部分取得rollbackで使用する。確認SDKのLogRecord Exporter shutdownは`IO ()`であり、Trace / Metric Exporterの`IO ShutdownResult`と同じ型ではない。無理に成功コードを補わず、正常復帰と例外を記録する。`CleanupReport`には実行した各stepの結果、保留した`ExceptionWithContext SomeException`、依存資源の停止未確認によって実行できなかったstepを区別して保持する。

結果には対象、操作、SDKが返した失敗値、又は文脈付き例外を保持する。Reader停止の`()`は、その操作が正常に戻ったことだけを意味し、最終export成功を意味しない。

`ExportResult`の`Failure (Maybe SomeException)`、`FlushResult`の非成功constructor、`ShutdownResult`の非成功constructorを`()`へ消さない。失敗情報の集約はリストの連結で表せる。IO操作そのものを`Monoid`にしても、例外時の継続は得られない。必要なのは各操作を捕捉してから結果を合成することである。

一回のlifecycle呼び出しに対する短い結果蓄積用IORefを内部で使ってよい。これは終了処理と保留中断の保持だけに限定する。SDKのqueue、Metric storage、送信worker、Contextの代替は作らない。

### 8.2 `bracket`をそのまま使う場合との違い

基本形は次の入れ子である。

```haskell
-- 提案の構造図に相当するコード。withOwned等は新規関数。
withProviders journal plan use =
  withOwned journal (acquireTrace plan) $ \tp ->
    withOwned journal (acquireLogs plan) $ \lp ->
      withOwned journal (acquireMetrics plan) $ \metrics ->
        use tp lp metrics
```

素の`bracket`でも、内側のreleaseが例外になった後に外側のreleaseを実行する構造は作れる。しかし同じrelease内の「flush→shutdown」は別で、flush例外の後にshutdownは自動では実行されない。また、release例外がcallbackの元例外を上書きし得る。

そこで`withOwned`は、`bracket`と同じ取得・利用・解放の構造を保ちながら、利用結果と終了結果を分離する。必要な処理は次である。

```haskell
-- 処理の骨格。補助関数の契約を示す提案で、写経用完成コードではない。
withOwned journal resource use =
  mask $ \restore -> do
    value <- acquireProvider resource (appendCleanupReport journal)
    outcome <- captureWithContext (restore (use value))
    report <- runCleanupSteps (providerCleanup resource value)
    appendCleanupReport journal report
    either rethrowIO pure outcome
```

`captureWithContext`は既存実装と同じ`catchNoPropagate` / `ExceptionWithContext SomeException`で捕捉する。利用側が`Left FeatureFailure`を正常に返した場合、`outcome`は`Right (Left FeatureFailure)`である。この二つを混同しない。

`runCleanupSteps`は終了操作ごとに例外を捕捉し、非同期例外も一時的に保持して残りを試みる。ただしReader停止は依存関係上の境目であり、停止未確認なら同じMetrics資源へのexport / shutdownを無条件には実行しない。§9.3の停止確認を行い、未確認のままならそれらを未実行として報告し、独立したLogs / Traceの終了へ進む。終了操作の純粋なリスト生成も総域的に書き、解放の準備で`error`等を起こさない。具体的なSDK失敗は結果に残す。

### 8.3 `mask`を使う箇所と限界

- 取得成功から解放責任が確立するまでに、非同期例外で資源が取り残される隙間を作らない。
- callback本体は`restore`で呼ぶ。入れ子の管理によって利用者の処理を意図せずmaskし続けない。
- `mask`中でも待ち操作では非同期例外を受け得る。各取得関数の内部rollbackと、終了操作ごとの捕捉は必要である。
- `uninterruptibleMask`でSDKのネットワーク送信・thread終了待ち全体を囲まない。停止不能な待ちを作り得る。

通常の`IO`とSDKの非同期処理を扱うための限定的な`mask`であり、機能処理の実行方式を変更するものではない。

### 8.4 最外層で確定する優先関係

| 状況 | 最外層から返すもの |
|---|---|
| callbackが`a`を返し、終了処理に同期的な失敗だけがある | 同じ`a`。終了失敗は別経路で診断する |
| callbackが例外を投げる | 元の`ExceptionWithContext`を`rethrowIO`で再送出 |
| 第2・第3取得が失敗する | 取得済み資源を終了後、元の取得例外を再送出。callbackは呼ばない |
| callback又は取得が中断される | cleanup後、元の中断を再送出 |
| callbackは正常終了し、cleanup中に中断を受ける | 残りの終了処理を試みた後、保持した中断を再送出 |
| 既に元例外があり、cleanup中にさらに中断を受ける | 元例外を主因として維持し、追加中断を終了報告に保持する。正常復帰にはしない |

非同期例外の判定は、既存コードと整合する`SomeAsyncException`への`fromException`を基礎にする。`SomeException`を全部通常のTelemetry失敗として握りつぶさない。終了処理内で保留した中断を各内側scopeで再送出すると元例外を上書きするため、最外層で優先関係を決める。

診断は終了結果を確定してから、同じTelemetry経路を使わず、例えば`stderr`へ出す。診断出力の同期例外も機能結果を置き換えない。診断のためにcallbackをもう一度実行してはならない。診断関数を差し替えて結果をテストで取得できるようにしてよいが、常駐診断queueや汎用Sinkは作らない。

### 8.5 今回と後続Subtaskの境界

今回の結果保持は**起動時の取得と終了操作**に限定する。`withSpan`内の`setStatus`、`emitEventRecord`、通常のexport workerの失敗、記録不能時に本体をどう継続するか等は、後続「Telemetry失敗を機能処理から隔離する」の対象である。

起動失敗後にno-op境界でアプリを継続する方針は、この案では採用しない。まずcleanupして起動例外を返す。初期化失敗を許容する要求が別途採用された場合に、起動境界で組み合わせる。`try (withTelemetry callback)`の失敗後にcallbackを再実行するfallbackは、本体が既に実行済みの場合を区別できないので使用しない。

## 9. Metricsの具体的な組み立て

### 9.1 通常構成

1. `metricExporter = Nothing`のoptionsで`createMeterProvider`を呼び、Providerのcleanup責任を確立する。
2. Exporter factoryを実行し、Exporterのcleanup責任を確立する。
3. `forkPeriodicMetricReader env exporter options`でSDK Readerを開始する。
4. 返された公開Async handleを捕捉した`ReaderControl`を作り、全体を返す。

```haskell
-- 提案: 通常Readerの開始部分。取得範囲の保護は呼び出し側が担当する。
startSdkReader
  :: PeriodicMetricReaderOptions
  -> SdkMeterEnv
  -> MetricExporter
  -> IO ReaderControl
startSdkReader options env exporter = do
  handle <- forkPeriodicMetricReader env exporter options
  pure ReaderControl
    { stopAndWaitReader = cancel (periodicMetricReaderAsync handle)
    , readerIsStopped =
        isJust <$> poll (periodicMetricReaderAsync handle)
    }
```

`cancel`はSDK自身の停止処理が利用している終了待ち付きの操作である。停止時のworker結果を診断する場合は、公開handleに`waitCatch`等を適用し、意図的な停止と、それ以前のworker例外終了を区別する。独自の`forkIO` / `forever`によるReaderは作らない。

### 9.2 終了順

| 順 | 操作 | 成功・失敗の確認 |
|---|---|---|
| 1 | Readerの停止と終了待ち | 停止操作の正常完了、必要ならworker終了結果 |
| 2 | `exportMetricsOnce env exporter` | `Success` / `Failure ...` |
| 3 | `metricExporterForceFlush exporter` | `FlushResult` |
| 4 | `metricExporterShutdown exporter` | `ShutdownResult` |
| 5 | `shutdownMeterProvider provider ...` | `ShutdownResult` |

手順2が例外又は`Failure`でも、3・4・5を試みる。3の失敗でも4・5を試みる。Exporterのshutdownは外側が1回だけ呼ぶ。ProviderにExporterは設定しておらず、`stopPeriodicMetricReader`も併用しないため、ここで二重所有を作らない。

Metricsのflushは手順2・3の組み合わせである。素の`forceFlushMeterProvider`をその前に追加しない。低水準callbackへ渡したProviderは計装用の借用値であり、利用者が個別にflush / shutdownするAPIとして案内しない。将来、外部計装がProviderのforce flushまで必要とする場合は、この共通の収集・送信経路へ接続するProvider wrapperの必要性を、そのAPIから判断する。

SDKのProvider shutdown自体も最後に収集を行う。`metricExporter = Nothing`なら、その収集結果はexportされない。このSDK仕様は残るため、shutdown後に最終exportの成功を判定し直したり、shutdownの戻り値を最終送信の証拠にしない。

### 9.3 Reader停止が完了しない場合

ReaderとExporterが並行して動いている間にExporterをshutdownすると、使用中の資源を解放する競合になる。停止時に中断を受けた場合は、その文脈を保持し、`readerIsStopped`で終了状態を確認する。未停止なら停止待ちを再開し、安全に停止を確認してからExporter終了へ進む。Readerが既に例外終了していれば停止済みとして、その例外を診断して後続終了を行える。停止確認自体が失敗し状態を確定できない場合は、Metrics資源への後続操作を未実行として報告し、独立したLogs / Traceの終了へ進む。

任意の停止不能なExporterについて、「Readerを必ず停止」「全資源を必ず解放」「一定時間で終了」を同時に保証する案ではない。停止を確認できない異常状態は、終了未確認として報告する。単にtimeoutを外から付けて使用中のExporterを解放してはならない。

この限界は今回の完了条件を曖昧にするためのものではない。通常終了・明示的失敗値・有限時間で投げる例外・中断可能な待ちについて、残りの終了操作の実行を検証する。その上で、SDKの停止不能な内部処理まで成功保証したと報告しない。

## 10. 通常実行向けの構成

高水準の`withTelemetry`はSDK設定型を要求せず、`Configuration`が通常構成を作る。**通常構成でも、テストと同じ`withTelemetryUsing`を通す。**

この案では、初期実装の通常送信手段としてSDKのOTLP Exporterを使い、送信先は環境設定で渡すことを提案する。これはproduction backendやCollector配置の決定ではない。`OTEL_SDK_DISABLED`等による無効構成も、資源を取得する前に選択する。

具体的な構成要素は次とする。

| 要素 | 提案する構築 |
|---|---|
| 共通Resource | `detectBuiltInResources`、`detectResourceAttributes`、`mkResource`、`mergeResources`、`materializeResources`を使い、同じ値を3Providerへ渡す |
| Trace ID | 通常構成は`defaultIdGenerator`。テストでは制御可能なID生成器を注入可能にする |
| Trace Processor | SDKの`batchProcessor`。`SpanExporter`と構成を渡す |
| Logs Processor | SDKの`batchLogRecordProcessor`。`LogRecordExporter`と構成を渡す |
| Metrics | 本文のMeterProvider + SDK Periodic Reader + MetricExporter |
| OTLP | `hs-opentelemetry-exporter-otlp`の`otlpExporter` / `otlpLogRecordExporter` / `otlpMetricExporter`を使用する構築案 |

`loadExporterEnvironmentVariables`等のSDK設定読取関数は、実装時に各signalへの適用範囲を確認して利用する。`withTelemetry`という型を提示しただけで、全`OTEL_*`設定に互換な読取実装が完成したとは扱わない。最初に対応する環境設定と既定値をテストで固定する。無効化設定では背景workerを起動しない構成を選ぶ。

`getTracerProviderInitializationOptions`は名前に反してProcessor等の資源も生成するため、純粋な設定読取として扱えない。取得後にResource検出等が失敗する可能性も含め、保護されない一括取得helperを通常構成へ隠して呼ばない。

さらに、上流の`detectLogExporter`等は確認ソースでは内部関数である。SDKに存在する名前を見つけたことと、Adapterからimportできることを混同しない。必要な公開Exporter factoryを直接importするなら、そのpackageをCabalに直接追加する。

送信方式や設定対応範囲の追加は構築側に閉じる。HTTP / DB / GenAIのMetric名、単位、attributesを選ぶ責務は、その後続機能の計装側に残す。

## 11. Cabalの変更案

| component | 変更案 | 必要な理由 |
|---|---|---|
| `telemetry-boundary` | 依存追加なし | `Telemetry`は既存2境界の積型のみ |
| `opentelemetry-adapter` | `Construction`を`exposed-modules`へ、`Lifecycle` / `Metrics` / `Configuration`を`other-modules`へ追加 | 高水準と構築入口を分け、内部管理を隠す |
| `opentelemetry-adapter` | `async`を直接依存へ追加 | SDK Readerの公開Async handleを終了待ちするため |
| `opentelemetry-adapter` | 通常OTLP構成を実装する段階で`hs-opentelemetry-exporter-otlp`を直接依存へ追加 | Exporter factoryを直接importするため。SDKの推移依存だけに頼らない |
| `ragscope-test` | lifecycle / MetricsのSpecを`other-modules`へ追加。必要な`async` / `vector`を直接依存へ追加 | 中断・Reader終了の同期、`ResourceMetricsExport`中のVectorの検査 |
| `telemetry-boundary-test` | SDK依存を追加しない | 機能利用の独立性を維持 |
| executable | 今回は変更を要しない | アプリ起動への統合は別Subtask |

`async`等のversion boundsは利用者環境で解決されているものと対応APIを確認して決める。未確認の数値をこの案で確定しない。

機能componentは境界libraryだけに依存し、SDK / Adapterへの`build-depends`を持たない。構築側だけがSDKと境界の両方を知る。同じpackage内のmoduleをフォルダで分けるだけで静的依存が禁止されるとは説明しない。

将来の起動統合でmain libraryをFacadeとして使う場合は、実際の組み立てmoduleをそこへ接続する。今回、実行ファイルへSDK型を直接公開するためだけの依存追加は行わない。

## 12. 自動テストの設計

### 12.1 ライフサイクルの失敗経路

すべて共通の`withTelemetryUsing`へ接続する。取得順・終了順は`atomicModifyIORef'`で記録し、複数threadから書く可能性がある箇所に非原子的な更新を使わない。

| 条件 | 観測する結果 |
|---|---|
| 正常終了 | callbackが1回。終了操作が指定順に呼ばれ、戻り値が同じ |
| callbackが`Left FeatureFailure`を返す | `Left`は正常な返値として維持。再実行しない |
| callback例外 | 全取得済み資源を終了し、元例外とExceptionContextを維持 |
| Logs取得失敗 | Traceのflush・shutdown。callbackは0回 |
| Metrics取得失敗 | Logs→Traceの終了。callbackは0回 |
| Metric Exporter取得失敗 | MeterProviderも終了し、外側のLogs / Traceも終了 |
| Reader取得失敗 | Metric ExporterとMeterProviderを終了し、外側も終了 |
| Trace / Logs flushが失敗値を返す | 同じProviderのshutdownへ進む |
| flushが例外を投げる | 同じProviderのshutdownと残りのProvider終了へ進む |
| shutdownが失敗値又は例外 | 残りのProvider終了へ進み、結果が診断に残る |
| Metrics最終exportが`Failure`又は例外 | Exporter flush / shutdownとMeterProvider終了へ進む |
| 診断出力が同期例外 | 機能結果・元例外を置き換えず、本体実行回数も変わらない |
| callback中の中断 | callbackのmask状態、中断の伝播、取得済み資源の終了 |
| cleanup中の中断 | 残りの終了処理の試行と、最外層での中断の再送出 |

元例外の検証は、独自例外constructorだけでなく、テスト専用の`ExceptionAnnotation`を付けてそれが残ることを確認する。既存のexactly-onceは、共通lifecycleの内側で例外を投げる統合例を追加して、既存Span / EventRecordの表現も確認する。

失敗注入は`throwIO`だけで済ませず、SDKが返す非成功constructorを別々に検証する。Processor内部の例外はProviderが`ShutdownFailure`等へ変換し得るので、Provider呼出し境界へ直接投げる試験と区別する。

### 12.2 Metricsの接続テスト

SDKの`inMemoryMetricExporter`を使い、テスト内だけで`Counter Int64`を作る。測定例は次である。

```haskell
-- 提案。確認SDKの実際のAPI名・引数に基づく測定部分。
-- OverloadedStringsを使用し、getMeter等はOpenTelemetry.Metric.Coreからimportする。
meter <- getMeter provider "ragscope.lifecycle-test"
counter <-
  meterCreateCounterInt64 meter
    "ragscope.test.lifecycle.count"
    Nothing
    Nothing
    defaultAdvisoryParameters
counterAdd counter 2 emptyAttributes
counterAdd counter 3 emptyAttributes
```

`meterCreateCounterInt64`は`Meter`のフィールド、`counterAdd`は`Counter Int64`のフィールドである。`emptyAttributes`は`OpenTelemetry.Attributes`から得る。このMetricは`test/`のみに配置し、共通Metricの正式仕様へ登録しない。

背景Readerを起動しない手動構成では、callback終了時の**実際の共通終了経路**からexportさせる。テストが独自にExporterへ値を直接書くだけの確認はしない。

in-memoryの`IORef [ResourceMetricsExport]`を読み、`resourceMetricsScopes`→`scopeMetricsExports`を辿り、`MetricExportSum`の`mesName`、`mesUnit`、`mesMonotonic`、`mesAggregationTemporality`と、`mesSumPoints`内の`sumDataPointValue`を確認する。Counter値は`IntNumber 5`である。別scope / 別名の値を誤って拾わないようにする。

delta構成でも同じテストを行い、最終export前の余分な収集で値が消えないことを検証する。Exporter shutdownの呼出し回数が1回であることも確認する。

### 12.3 SDKのPeriodic Readerを通すテスト

手動構成の成功だけではReader接続の証明にならない。通常構成と同じ`forkPeriodicMetricReader`を通す試験も1本以上必要である。

Exporter側で目的のMetric値を受け取ったことをMVar等で通知し、テスト側はその通知を待つ。短い`threadDelay`で「多分exportされた」と推測しない。試験にはハング検出用のtimeoutを付ける。

終了後は公開Async handleに`poll` / `waitCatch`を使い、threadが終わったことを確認する。Exporterに「終了後export」を検出する状態を置き、終了したExporterへの記録がないことも確認する。SDK Readerの初回exportは即時なので、空の初回batchが届くことを許容し、目的の測定値で同期する。

Readerが例外終了済みの場合、最終exportの失敗、Exporter shutdown失敗も分けて試験する。停止未確認の状態を成功扱いしない。

### 12.4 既存テストと検証コマンド

既存のTrace、Logs、例外EventRecord、SDK挙動のSpecは維持する。特にSDK自体を調べるBehaviorSpecまで新lifecycleへ無条件に置き換えると、調査対象とAdapterの検証が混ざる。既存テスト支援の統合は、その責務に応じて判断する。

正本の`Makefile`では、`make check-app`が整形確認、`cabal build all`、`cabal test all`、Telemetry型制約検査、Haddockの順に実行する。

```bash
# 正本リポジトリのルートで実行
cd ragscope-app
cabal test ragscope-test --test-show-details=direct
cabal test telemetry-boundary-test --test-show-details=direct
```

```bash
# 正本リポジトリのルートで実行する最終確認
make check-app
```

テスト追加時は`test/Main.hs`とCabalの`other-modules`へ登録する。テスト本体を作っただけで実行対象になったとは扱わない。

## 13. FP・Haskell・アーキテクチャの観点からの評価

**関数値による依存の注入を中心にする。** `TraceBoundary`、`LogsBoundary`、Exporter factory、Reader開始関数は、それぞれ必要な能力を値として渡せる。実装が一つで済む箇所に`MonadTelemetry`等の型クラスやアプリ全体の効果体系を追加する根拠はない。

**純粋な変換とIOを分ける。** 機能failureやeventの観測表現への変換、Providerから境界の組み立て、終了結果の分類・優先順位は純粋にできる。資源取得・SDK実行・終了だけを`IO`にする。すべてを純粋に見せるために実際の資源取得を設定値の中へ隠さない。

**積型で必要な組み合わせを表す。** `SdkPlan`はTrace / Logs / Metricsの三つが存在する計画である。異種のProviderを`Map Text Dynamic`へ入れ、実行時に名前で引き出す構造は不要である。一方、普通の積型は資源を一度だけ使用する保証までは持たないため、その主張はしない。

**外側でSDKへ接続する。** Clean Architecture / Hexagonal Architectureを適用する点は、層名を増やすことではなく、機能componentがSDK型をimportせず、起動時に具体的な関数値を受け取る依存方向にある。これは現在のCabal境界を維持すれば実現できる。

**ドメインの失敗型をTelemetryの都合で統合しない。** DDDの観点でも、実験結果・機能failure・観測結果は別の責務である。`CleanupTarget`や終了結果はAdapter内部の資源管理情報であり、機能共通の`RAGScopeError`や`ErrorClassifier`として公開しない。

新しい`ReaderT AppEnv`、Free Monad、GADTのTelemetry命令体系、LinearTypesによる全面再設計は今回採用しない。これらに価値がないからではなく、現在のSDK境界と資源数に対して追加する具体的な利点を確認できず、既存の`IO` APIを含む寿命保証も自動では得られないためである。

## 14. 添付案との共通点と相違点

| 論点 | 添付案に対する評価 | 本案 |
|---|---|---|
| 段階的取得 | 同意。SDKソースでも根拠を確認 | 固定した入れ子の資源範囲で実現 |
| 既存Adapterの維持 | 同意 | 既存のconstructorへProviderを渡して純粋に組み立てる |
| `TelemetryServices`に`MeterProvider`を含める | 外側専用という説明は妥当。ただし利用用の束との区別を公開APIでも明瞭にしたい | SDK非依存`Telemetry`と構築専用`SdkTelemetry`を分ける |
| ルートmoduleにlifecycleをまとめる | 小さな実装なら成立する | 例外制御とSDK Reader互換処理は必要なimportと変更理由が異なるため分ける |
| ReaderにExporter所有を寄せる | 通常経路だけなら成立 | 最終export例外でshutdownが飛ぶため、外側で所有して終了操作を分離 |
| `forceFlushMeterProvider` | exportされない点の注意は妥当 | delta収集のリセットまで考慮し、最終export前に素のProvider flushを入れない |
| `SomeException`と中断 | 区別する方針に同意 | 終了中断の保留・最外層での優先関係、元のExceptionContext保持まで定める |
| SDK version | 下限ソースの確認だけで実環境versionは確定しない | ソースcommit・Cabal版・利用者の解決結果を区別する |

添付案の主結論を変える提案ではない。具体的なSDK終了処理をさらに辿った結果、所有・delta収集・例外文脈を明確にした案である。

## 15. 写経モードの実装順

### ステップ0: 解決済みSDKの確認

利用者の`ragscope-app`で、存在するplanを読み取り専用で確認する。

```bash
python3 - <<'PY'
import json
from pathlib import Path
p = Path('dist-newstyle/cache/plan.json')
if not p.exists():
    print('plan.json がありません。現在の解決済みversionは確認できません。')
else:
    plan = json.loads(p.read_text())
    names = {
        'hs-opentelemetry-api',
        'hs-opentelemetry-sdk',
        'hs-opentelemetry-exporter-in-memory',
        'hs-opentelemetry-exporter-otlp',
        'async',
    }
    versions = sorted({(x.get('pkg-name'), x.get('pkg-version'))
                       for x in plan.get('install-plan', [])
                       if x.get('pkg-name') in names})
    for name, version in versions:
        print(name, version)
PY
```

結果が一致した場合も、SDKに対する局所patchや`cabal.project.local`の有無を確認する。異なるversionなら、今回根拠にした取得・Reader停止・MeterProvider flush / shutdownをそのソースで再確認する。設計案を書くために利用者の環境を推測で変更しない。

### ステップ1: 最小の取得・終了骨格

最初の写経単位は、`Lifecycle`の元結果を保つ取得範囲と、`Construction`での3Providerの入れ子にする。Metricsはこの段階では背景Readerのない最小Providerを使用する。高水準の環境設定、既存Adapterの組み立て、全失敗パターンを一度に書かない。

最初の検証は「第2取得失敗でTrace終了」「第3取得失敗でLogs→Trace終了」「callbackは呼ばれない」「元の取得例外が残る」とする。終了結果を単に捨てる暫定実装を長く残さず、同じ小さな段階でflush失敗後のshutdown継続も確認する。

### ステップ2: 終了結果・例外文脈・中断

結果型の非成功と例外を分け、元のExceptionContextを維持する。callback実行回数、返された`Left`、cleanup中断、診断失敗を検証する。ここが確定してからSDKの背景処理を増やす。

### ステップ3: Metricsの手動収集構成

MeterProvider→Exporterの取得と単一所有、最終export→Exporter flush→Exporter shutdown→Provider shutdownを接続する。テスト限定Counter、delta集約、export失敗時の後続終了を検証する。

### ステップ4: SDK Reader

`forkPeriodicMetricReader`、終了待ち、取得失敗rollbackを追加する。通知による同期とthread終了確認を行う。停止helperを併用して二重shutdownしないことを確認する。

### ステップ5: 通常構成と既存Adapter接続

通常設定から同じ`withTelemetryUsing`へ接続する。共有Resource、通常のID生成器、Batch Processorを確認する。既存のSpan / Logs / exactly-onceと新lifecycleの統合例を追加し、`make check-app`を実行する。

写経用コードを提示する際は、新規ファイルは配置場所と全文、既存ファイルは変更差分を先に、その後全文とする。この文書の断片コードを、未定義の補助関数があるまま実装済みとして扱わない。

## 16. 今回行った確認と未実施事項

実施: 指定branchのHEAD確認、正本Ticket・Observability / Metrics / 実行追跡 / ログ・イベント設計の読取、Cabalと既存境界・Adapter・関連テスト・Makefileの読取、WorkbenchのAGENTS・対象Task・直接依存Task・失敗隔離Task・Noteテンプレートの確認、指定SDKソースの読取。

未実施: 利用者環境の解決済みversion再測定、提案コードのコンパイル、SDKの挙動実験、`cabal test`、`make check-app`。この調査環境ではGHCを利用できなかった。記載したSDK挙動はソース確認によるもので、今回実測したテスト結果ではない。

この変更はWorkbenchの設計Note追加であり、正本の実装変更、Taskの完了化、採用決定を意味しない。

## 17. 根拠資料

正本参照はすべて`7526326d076c5ce8c2a51a3358a4e47a5197f76e`に固定する。

- [RS-0024 Ticket](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScopeアプリケーションへOpenTelemetry%20Observability最小基盤を実装する.md)
- [Observability設計](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/design/observability/Observability設計.md)
- [Metrics設計](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/design/observability/Metrics設計.md)
- [実行追跡設計](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/design/observability/実行追跡設計.md)
- [ログ・イベント設計](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/project-docs/design/observability/ログ・イベント設計.md)
- [ragscope.cabal](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/ragscope.cabal)
- [Trace Adapter](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Trace.hs)、[Logs Adapter](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Logs.hs)、[Exception](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Exception.hs)
- [既存テスト支援](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryTestSupport.hs)、[Makefile](https://github.com/takashit16833/RAGScope/blob/7526326d076c5ce8c2a51a3358a4e47a5197f76e/Makefile)

上流参照はすべて`46a42cdf80405fdb36fbb48a309254b2332617b4`に固定する。

| 確認対象 | ソース |
|---|---|
| 統合取得・終了 | [SDK.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/SDK.hs) |
| 設定による一括取得 | [Configuration/Create.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/Configuration/Create.hs) |
| Trace Provider | [Trace/Core.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Trace/Core.hs) |
| Logs Provider | [Internal/Log/Core.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Internal/Log/Core.hs) |
| MeterProvider、収集、deltaリセット | [MeterProvider.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MeterProvider.hs) |
| 定期Reader・停止手順 | [MetricReader.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MetricReader.hs) |
| SDK結果型 | [Internal/Common/Types.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Internal/Common/Types.hs) |
| Metricのexport表現 | [Internal/Metric/Export.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Internal/Metric/Export.hs) |
| in-memory Metric Exporter | [InMemory/Metric.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/exporters/in-memory/src/OpenTelemetry/Exporter/InMemory/Metric.hs) |
| Simple Processor | [Span.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/Processor/Simple/Span.hs)、[LogRecord.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/Processor/Simple/LogRecord.hs) |
| SDK package定義 | [hs-opentelemetry-sdk.cabal](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/hs-opentelemetry-sdk.cabal) |

添付「貼り付けたマークダウン（1）(20260916-113333).md」は比較対象として読んだが、現在仕様やSDK挙動の根拠は上記の実ファイルから得た。
