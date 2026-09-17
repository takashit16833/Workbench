---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-17
---

# RS-0024 SDKライフサイクルの責務分離案

## 1. 推奨

**資源の寿命は`Control.Exception.bracket`、終了処理の実行と観測は小さな専用関数、終了結果の保存は実行範囲に閉じた`IORef`、返す値・再送出する例外の選択は純粋関数へ分ける。** 固定されたTrace・Logs・Metricsの3資源には、これが現時点で最も見通しのよい構成だと判断する。

リソース管理と結果収集を同じ抽象化へ組み込む必要はない。ただし、解放処理を実行した直後にその結果を保存する接続は必要になる。この接続を短い関数へ限定し、資源取得の各段階で例外の優先順位まで判断しない。

独自の汎用資源管理機構は作らない。既存の`withOwned`と`ProviderAcquisition`をそのまま育てるより、標準`bracket`へ寿命管理を戻す。`CleanupResult`によるSDK結果の保持、既存Trace/Logs境界、Metricsの単独所有と終了手順は維持する。`IORef`を使うこと自体は問題ではなく、どこから操作でき、何を記録するかを限定することが重要である。

このノートは**未採用の設計提案**。対象は[[RS-0024 subtask OpenTelemetry SDKライフサイクルとMetrics基盤を実装する]]。正本の実装や採用済み設計を変更するものではない。既存の[[RS-0024 SDKライフサイクルとMetrics基盤の設計案]]と[[RS-0024 SDKライフサイクルとMetrics基盤 実装計画]]に対する再検討であり、今回採用する場合は後述の差分を実装計画にも反映する。

## 2. 確認した正本と判断の範囲

| 対象 | 確認した状態 |
|---|---|
| RAGScope | `RS-0024/sdk-lifecycle-metrics`、commit `957d04a962ffc1804ae2234b08fb83c6cc982555` |
| Workbenchの作業情報 | `feat/RS-0024-opentelemetry-observability-foundation`、commit `d45f735ffd503708aa9406c55b537034cb617768` |
| Workbench main | `27ab0f82db68de92ef99c4ca41c2f73a64380bc3`。対象Subtaskは存在せず、上の作業branchで確認した |
| 対象Subtask | `doing`、RAGScope側branchも指定と一致。直接の前提「OpenTelemetry依存とCabal境界」は`done` |
| OpenTelemetry調査対象 | SDK 1.0.0.0の上流tagが指すcommit `46a42cdf80405fdb36fbb48a309254b2332617b4` |
| Haskell標準の例外処理 | GHC `ghc-9.12.4-release`の`GHC.Internal.Control.Exception.Base` |

正本の`ragscope.cabal`は`base ^>=4.21.2.0`、API/SDKは`^>=1.0.0.0`を指定している。現在の利用者環境の解決済みversion、ローカルpatchは**確認不能**。Workbenchにある9月8日のbuild成功記録は、今回の実測には数えない。SDKについて以下で述べる挙動は調査した上流commitに限定する。

| 論点 | 状態と根拠 |
|---|---|
| SDKを機能処理から隔離する | **決定済み**。Ticket、Observability設計、Cabalのprivate named library |
| 標準Metricsを利用可能にし、共通の独自Metricは作らない | **決定済み**。TicketとMetrics設計 |
| Telemetryの記録・export失敗で機能の成功を失敗へ変えない | **決定済み**。TicketとObservability設計 |
| 現在の例外処理と結果保持 | **コード上で決定済み**。`Lifecycle.hs`に型・処理が存在する。白紙とは扱わない |
| 今回の責務分離 | **AIの提案**。現在の`Lifecycle.hs`を読み直した上での変更案 |
| 初期化に失敗したら無条件にno-opへ切り替える | 今回の提案へ追加しない。成功した機能結果を保つ要求からは導けない |

サブタスクの目的は、差し替え可能なSDK初期化、安全な利用範囲、部分取得失敗時の解放、終了失敗後の継続、Metrics接続の検証である。`CleanupJournal`や`WriterT`の採用それ自体は目的ではない。

## 3. 現在の実装の評価

`RAGScope.Telemetry.OpenTelemetry.Lifecycle`には以下が同居している。

| 現在の要素 | 実際に担うこと | 評価 |
|---|---|---|
| `CleanupResult` | `FlushResult`、`ShutdownResult`、`ExportResult`を変換せず保持 | 維持する価値がある。失敗値を成功へ潰さない |
| `CleanupStep` / `runCleanupSteps` | 名前付きSDK操作を順に実行し、各例外を捕捉 | 専用の終了処理として妥当。ただし再送出の判断とは分ける |
| `CleanupJournal` | 終了結果と、別例外に置き換わった元例外を2つの`IORef`へ保存 | 終了結果の蓄積と例外選択の履歴が混ざっている |
| `ProviderAcquisition.acquireProvider` | 記録関数を受け取って資源を取得 | 内部rollbackの観測に必要な接続だが、汎用資源型の中心へ置く必要はない |
| `withOwned` | mask、取得、callback、cleanup、記録、元例外と中断の選択 | 標準資源管理とアプリ固有の終了方針を一度に担っている |

特に現在は各`withOwned`が内側で中断を選んで再送出するため、外側で元の同期例外を知るために`journalSupersededExceptions`が必要になる。**全資源の解放後に1回だけ例外を選べば、元例外を途中で置き換えることも、その復元用の記録も不要になる。**

取得側にも確認すべき差がある。現在の`withOwned`は`mask`の中で`restore (acquireProvider ...)`を呼ぶ。標準`bracket`は取得をmaskされた状態で実行する。取得関数が資源を得た後、外側へ正常に返る前に非同期例外が届くと、外側は資源を受け取れず解放できない。現在の型と「失敗前に内部資源を片付ける」というコメントだけでは、その受け渡し区間まで保護する契約を表せていない。

これは実環境で漏洩を観測したという報告ではなく、コード上の例外保護範囲の評価である。取得全体を安易に`restore`する形をやめ、標準`bracket`の取得契約へ合わせる。mask中も割り込み可能な待機点はあるため、取得関数内部の部分取得保護は依然として必要である。

ルート`RAGScope.Telemetry.OpenTelemetry`は現在もexportなし。`Lifecycle`を使う3Providerの構築入口やMetrics実装は、確認したbranchでは未実装である。既存の`Telemetry`は`TraceBoundary`と`LogsBoundary`の積型であり、これを維持する。

## 4. Haskellの既存機能を比較する

`bracket`は`base`の機能。`generalBracket`は`exceptions`、`Acquire`と`ResourceT`は`resourcet`、`WriterT`は`transformers`等が提供する。いずれもHaskell言語の構文として自動実行されるものではなく、対応する関数を呼んだときに働く。

| 選択肢 | 寿命・部分取得 | 終了結果の扱い | 今回の判断 |
|---|---|---|---|
| `bracket`の入れ子 | 取得成功ごとに解放を保証し、内側の取得失敗で外側も解放 | releaseの返値は捨てる。releaseが投げると元例外を置き換え得る | **推奨**。release側を「結果を記録して戻る」関数にし、固有方針を外へ分離 |
| `generalBracket` | `bracket`相当の寿命に`ExitCase`が加わる | 正常経路で`(useの値, releaseの値)`を返す。IO例外で脱出した場合はこの組を受け取れない | 有用だが、今回の例外時の全結果保持を単独では解決しない |
| `Data.Acquire` | `Applicative`/`Monad`で取得を合成し、失敗時rollback・逆順解放を提供 | finalizerは`IO ()`。結果収集と例外優先順位は別に必要 | 汎用資源の合成が増えれば候補。今回は固定3資源とSDK固有の終了条件に対して利点が小さい |
| `ResourceT` | 動的な資源登録、`ReleaseKey`による早期解放、共有する実行範囲 | 標準動作はcleanup例外を`ResourceCleanupException`として扱う。SDKの失敗返値の保存は別途必要 | 今回の固定寿命に対し登録表・キー・追加依存が増えるため不採用 |
| `WriterT` | 資源管理そのものは提供しない | 成功して返ってきた計算の出力を結合 | `IORef`の単純な代替にしない |

`generalBracket`の型を`IO`へ限定すると次になる。

```haskell
generalBracket
  :: IO resource
  -> (resource -> ExitCase a -> IO cleanup)
  -> (resource -> IO a)
  -> IO (a, cleanup)
```

callbackの例外を先に`Either`へ捕捉すれば、この戻り値で正常・例外とcleanupを組み合わせる設計も可能である。ただし後段の取得失敗、取得関数内部のrollback、終了中断をすべて値として運ぶには、取得と終了の全体へ専用の戻り値を行き渡らせる必要がある。その追加設計は不可能ではないが、今回の局所的な記録関数より単純にはならない。

`Acquire`は本来この種の合成に適した抽象化であり、車輪の再発明を避ける有力候補である。ただし確認した上流実装では`with`と`Monad`の例外経路が`catch`/`throwIO`で`SomeException`を受け渡している。RAGScopeの`ExceptionWithContext`内の注釈を保つことを、そのまま保証できるとは扱わない。採用版の確認と注釈の往復試験が必要になる。一方、確認したGHC 9.12.4の`bracket`は`onException`を経由し、その中で`catchNoPropagate`/`rethrowIO`を使っている。

今回`Acquire`を採用しない主理由は、**必要な固定寿命を既存依存の`bracket`で表せ、固有の結果収集はどちらでも残る**ことである。例外文脈の問題だけを理由に不採用とするものではない。

### WriterTで置き換えない理由

```haskell
runWriterT :: WriterT w IO a -> IO (a, w)
```

基底の`IO`が例外で脱出すると`(a, w)`は返らない。たとえば`try (runWriterT action)`の失敗側は例外だけであり、それまでの`w`を含まない。`ExceptT e (WriterT w IO)`なら明示的な`throwE`の前の出力を保持できるが、任意のIO例外まで自動的に同じ扱いになるわけではない。

すべての失敗を適切な内側で捕捉すればWriterを使える。ただし単に全体をWriterTで包むだけでは、今回必要な取得失敗時のrollback結果は残らない。終了操作を値へ捕捉した後の単純な列は`traverse`で十分であり、そのためだけのWriter導入も不要である。

## 5. 推奨する責務配置

以下のmodule名・型・関数は**提案**。既存のTrace/Logs/Exception moduleは変更しない。

| Module | 所有するもの | 所有しないもの |
|---|---|---|
| `OpenTelemetry` | 通常設定で呼ぶ高水準入口 | SDK終了手順の詳細 |
| `OpenTelemetry.Configuration` | Resource、Processor/Exporter/Readerの設定とfactory選択 | 終了結果の保存、例外優先順位 |
| `OpenTelemetry.Construction` | 3つの`bracket`の合成、Providerから既存境界への接続 | journalの読取り、再送出する例外の選択 |
| `OpenTelemetry.Cleanup` | 終了結果型、1操作を捕捉・記録する関数 | 資源の取得、Reader停止条件、アプリ結果の選択 |
| `OpenTelemetry.Lifecycle` | 一度の実行に閉じた記録領域、全体の結果捕捉、純粋な終了判断、最後の診断と再送出 | Provider別の取得/解放手順、SDK Reader型 |
| `OpenTelemetry.Metrics` | Metricsの資源所有、Readerの終了確認、依存順に終了する処理 | アプリ例外の優先順位、汎用資源登録機構 |

小さな純粋関数のためだけに別libraryや型クラスは作らない。`chooseExit`は`Lifecycle`内の純粋関数で十分。`Cleanup`はSDK結果型を扱うAdapter内部のmoduleであり、全アプリ共通のエラー層にはしない。

依存方向は、root→Configuration/Construction、Construction→Lifecycle/Cleanup/Metrics/Trace/Logs、Lifecycle→Cleanup、Metrics→CleanupとSDK。CleanupからConstructionやLifecycleへ戻らない。設定用の型はConstructionが定義し、Configurationがその値を組み立てることで循環を避ける。

`telemetry-boundary`の`build-depends`へSDK依存を追加しない。ConstructionはAdapterの構築用公開module、Cleanup/Lifecycle/Metrics/Configurationは`other-modules`とする。SDKへの直接依存を持たない機能componentからのimport禁止は、既存のCabal境界で制約する。同じlibrary内部のmodule間依存までCabalで禁止できるとは主張しない。

### 組み立てと利用の入口

```haskell
-- 提案シグネチャ。設定値やreportの具体定義を含む完成コードではない。
withTelemetry :: (Telemetry -> IO a) -> IO a

withTelemetryUsing
  :: SdkConfig
  -> (LifecycleReport -> IO ())
  -> (SdkTelemetry -> IO a)
  -> IO a

data SdkTelemetry = SdkTelemetry
  { sdkTelemetry     :: Telemetry
  , sdkMeterProvider :: MeterProvider
  }
```

`SdkTelemetry`は起動時の構築側と接続テスト向け。UseCaseには既存の`TraceBoundary`/`LogsBoundary`の必要な操作だけを渡す。標準計装の接続側で`MeterProvider`を使うことと、機能用の`Telemetry`へSDK型を追加することを区別する。

productionとテストは同じ`withTelemetryUsing`を使う。通常入口は設定と独立した診断先を選び、callbackへ`sdkTelemetry`を渡すだけ。低水準設定にはProcessor/ExporterのfactoryとReader構成を渡せるが、正常・異常終了を別々の実装へ分岐させない。

```haskell
-- 寿命の形を示す提案。各releaseは例外を記録して戻る。
withProviders record config use =
  bracket (acquireTrace record config) (releaseTrace record) $ \tp ->
    bracket (acquireLogs record config) (releaseLogs record) $ \lp ->
      bracket (acquireMetrics record config) (releaseMetrics record) $ \mp ->
        use tp lp mp
```

Trace→Logs→Metricsの取得とMetrics→Logs→Traceの解放が構文で読める。第2・第3の取得例外では、既に成功した外側のbracketが解放を実行する。各取得関数には、その内部で発生するrollback結果を記録する能力だけを渡す。`IORef`やjournalの読取り能力は渡さない。

資源を安全に返す取得関数を用意する責務は消えない。Trace/LogsのExporter→Processor→Providerでは、Exporterを取得してProcessorへ所有を移す段階を`bracketOnError`で保護し、**その成功後**にProcessorを取得済み資源としてProvider構築を別の`bracketOnError`で保護する。Provider構築失敗時はProcessorがExporterも終了するので、Exporterを外側から重ねてshutdownしない。任意の利用者提供factoryの内部リークを自動修復できるとは説明しない。

callbackが作った子threadはcallback内で終了を待つ。通常のcallback型だけでは、Providerに依存するIO値を外へ返す行為まで禁止できない。型だけで寿命を完全保証するためにLinearTypesや新しい効果体系を導入することは、今回の要求からは選ばない。

## 6. 終了結果の収集と例外選択

### 1操作の実行と、その結果の保存

現行の`CleanupResult`は維持し、Reader終了と依存操作の未実行を表す情報を追加する。例外を文字列だけに変換せず、捕捉できた`ExceptionWithContext SomeException`を保持する。

```haskell
-- 提案の中核。recordは外部の任意callbackではなく、内部の追記関数。
type CapturedException = ExceptionWithContext SomeException

attemptCleanup
  :: (CleanupOutcome -> IO ())
  -> String
  -> IO CleanupResult
  -> IO (Either CapturedException CleanupResult)
attemptCleanup record name action = mask_ $ do
  result <- tryWithContext @SomeException action
  record (CleanupOutcome name result)
  pure result
```

この関数は「操作→結果捕捉→記録」だけを行う。結果の失敗constructorを成功へ変換せず、再送出する例外を選ばず、資源を取得しない。終了処理は1ステップごとにこれを呼ぶ。途中結果を最後にまとめて書くより、記録済みの位置が明瞭になる。

`record`は一度のlifecycleに閉じた`IORef [CleanupOutcome]`へ先頭追加し、終了時に`reverse`する。現行の`xs <> [x]`の繰り返しも不要になる。この経路はlifecycleを実行する同一threadだけが書き込み、ReaderやExporterの背景threadには渡さないので、そこでの`modifyIORef'`で足りる。並行書込みを許す設計へ変える場合は、その時点で原子的更新を選ぶ。

内部記録にネットワーク、ログ出力、ユーザーcallbackを混ぜない。解放中に外部の診断処理が失敗して、次の解放を妨げる経路を作らない。`mask_`は割り込み可能なIOの中断を禁止しないため、操作の中断はここで捕捉して後で伝播する。プロセス強制終了やメモリ枯渇まで記録成功を保証するものではない。

### 最外層の処理

```haskell
-- 制御構造の提案。makeReport/chooseExitは下記の責務を持つ補助関数。
runLifecycle acquireAndUse publish = mask $ \restore -> do
  ref <- newIORef []
  let record outcome = modifyIORef' ref (outcome :)
  original <- tryWithContext @SomeException $
    restore (acquireAndUse record)
  cleanup <- reverse <$> readIORef ref
  let report = makeReport original cleanup
  reporting <- tryWithContext @SomeException (publish report)
  either rethrowIO pure (chooseExit original cleanup reporting)
```

`acquireAndUse`の内部が上のbracketの入れ子になる。外側の`restore`はこの全体を元のmask状態へ戻すものであり、個々の資源取得をbracketの保護から外すものではない。各bracketが自分の取得と解放をmaskし、callbackには元の状態を渡す。

`makeReport`はcleanup全結果と、取得/callbackの元例外があればその文脈付き例外を報告へ入れる。アプリ戻り値`a`の内容は診断へ渡さない。報告は全取得済み資源の解放を試みた後に1回行い、その後`chooseExit`の結果を返すか`rethrowIO`する。取得失敗時もこの経路を通り、callbackは実行しない。

```haskell
chooseExit
  :: Either CapturedException a
  -> [CleanupOutcome]
  -> Either CapturedException ()
  -> Either CapturedException a
```

| 条件（上から優先） | 返すもの |
|---|---|
| 取得/callbackの元例外が`SomeAsyncException` | 元の中断を文脈付きで再送出 |
| cleanup実行threadに非同期中断が届いた | 最初に記録したその中断を再送出。元の同期例外はreportに残す |
| 診断実行threadに非同期中断が届いた | その中断を再送出。元例外は既にreportの入力に含む |
| 取得/callbackが同期例外 | 元例外を文脈付きで再送出 |
| 取得/callbackが値`a` | 同じ`a`を返す |

cleanupの同期例外、SDKの`FlushError`/`FlushTimeout`/`ShutdownFailure`/`ShutdownTimeout`/`Failure ...`、診断の同期例外だけではアプリ結果を置き換えない。`a`が機能固有の`Left failure`なら、その`Left`もそのまま返す。

**Reader自身の終了結果に含まれる`AsyncCancelled`と、lifecycle実行threadに届いた中断は別である。** Readerを意図的に止めた結果を「利用者から新しい中断が来た」と判断しない。SDKの`Failure (Just exception)`も、背景処理の失敗情報であり、ただ型が非同期例外だからといって親threadの中断に変換しない。

外部診断先が失敗した場合、全情報が外部へ保存されたとは保証できない。同期的な診断失敗は機能結果を保ち、同じ診断やTelemetry経路へ再帰しない。テストでは診断callbackが受け取ったreportを保存して検査する。失敗する診断先まで確実に永続化する仕組みは今回追加しない。

## 7. Metricsには専用の終了手順を残す

標準bracketは「いつ解放を呼ぶか」を解決するが、「SDKの何をどの順で呼ぶか」は解決しない。確認したSDKでは次が重要になる。

| SDKの事実 | 設計への影響 |
|---|---|
| `createMeterProvider`は`(MeterProvider, SdkMeterEnv)`を返す | 利用するProviderと、Readerへ渡す収集用EnvをMetrics内で所有 |
| `metricExporter = Just ex`のProvider shutdownは収集→export→Exporter shutdown | 例外で後続が飛び、export返値も捨てられるため、そのままでは必要な観測と独立した終了試行が得られない |
| `stopPeriodicMetricReader`はcancel→wait→最終export→Exporter shutdown | Reader停止だけの操作ではない。返値を捨て、一部の例外で後続が飛ぶ |
| `periodicMetricReaderAsync`は公開されている | SDK workerを使ったまま、停止確認とExporter終了を分離できる |
| Provider force flushはExporterなしでもcollectする | delta集約で最終export前に呼ぶと、送らない収集が値を消費し得る |

推奨は既存設計案と同じく**ExporterをMetrics側で単独所有**すること。`SdkMeterProviderOptions.metricExporter = Nothing`を構築時に保証する。通常の設定入口ではそもそもこのフィールドを呼出し側へ公開せず、低水準入口でSDK optionsを受けるなら`Just`を明示的に拒否する。設定を黙って書き換えない。

取得はProvider/Env→Exporter→SDK Reader。各段階の取得失敗でそれ以前の資源をrollbackする。成功後の終了順は次の通り。

1. Readerの公開Async handleを停止し、終了結果を確認する。
2. 終了確認後、`exportMetricsOnce env exporter`で最終送信する。
3. `metricExporterForceFlush exporter`を呼ぶ。
4. `metricExporterShutdown exporter`を1回呼ぶ。
5. Exporterを持たないProviderの`meterProviderShutdown`を呼ぶ。

2〜5はそれぞれ結果・例外を記録し、先の失敗だけで次を打ち切らない。`forceFlushMeterProvider`を最終exportの前へ挿入しない。Provider shutdown内部にもcollectはあるので、「収集が一度しかない」とは説明しない。

Reader停止操作が中断された場合、停止要求が失敗したことと、Readerがまだ生きていることを同一視しない。`poll`/`waitCatch`で終了結果を確認し、終了済みなら先へ進む。終了結果の`Left`を`isJust`等で捨てず、先行するReaderの例外もreportへ残す。

停止を確認できない場合、使用中のExporter・Providerの終了と競合する2〜5は理由付きで未実行として報告し、独立したLogs/Traceのcleanupへ進む。これは「失敗後も残りを試す」という方針の中で、依存先がまだ動いている操作を安全に区別するためである。全体を`uninterruptibleMask`で囲んで解放成功や有限時間終了を装わない。

Readerの終了状態はMetrics内部の`ReaderStopped`/`ReaderUnconfirmed`等の型で区別できる。後続操作を`ReaderStopped`の分岐内だけで構築する。汎用の資源依存グラフや終了命令言語を作る必要はない。

SDKのPeriodic Readerのループ、集約、送信は再実装しない。初期の通常構成はcumulativeを使う提案とし、deltaもテスト可能な構成にする。ただしcollect後・export前の中断によるdelta値の損失までは、このlifecycleだけで防げない。Reader開始時に引き継がれるmask状態と停止可能性もSDK実装に依存するため、実際のfactoryで確認する。取得全体のmaskを外す方法で解決しない。

Trace/LogsはProviderのforce flushとshutdownをそれぞれ`attemptCleanup`で囲む。Providerが既にProcessor/Exporterを所有するため、正常終了時に外側から各Exporterを重ねて終了しない。SDKがProcessor例外を`ShutdownFailure`へ集約した場合、Adapterが元の例外を復元できるとは主張せず、APIが返した結果をそのまま残す。

## 8. 通常構成とMetricsの利用

ConfigurationはTrace/Logs/Metricsに共通のResourceを使い、Trace/LogsはSDK Processor、MetricsはSDK Periodic Readerへ接続する。Exporterはfactoryを差し替えられるようにし、通常設定でもテストと同じ構築経路を通す。通常の送信先、OTLPの選択、対応する環境変数は具体的なSDK factoryと設定テストで確定し、このノートでproduction backendを決定したことにはしない。

既存の接続関数はそのまま使う。

```haskell
mkOpenTelemetryLogsBoundary
  :: LoggerProvider -> LogsBoundary

mkOpenTelemetryTraceBoundary
  :: TracerProvider -> EventRecordEmitter -> TraceBoundary
```

Logs境界の`emitEventRecord`をTrace境界へ渡し、既存の例外EventRecordの注釈を維持する。SDKのglobal Provider登録はこの接続に不要。`MeterProvider`は標準計装を構築する外側へ渡し、万能な`emitMetric name value attributes`やRAGScope独自Counterを機能境界へ追加しない。

今回増やす直接依存は、SDK ReaderのAsync handle操作に必要な`async`と、選んだExporter factoryを直接importするpackage。`bracket`のために`resourcet`や`exceptions`を追加する必要はない。version範囲は実際の解決結果と照合して決める。単なる型の中継だけを担う新packageは作らない。

## 9. 検証計画

以下は実装採用時の試験であり、今回成功済みの試験ではない。低水準の共通構築入口へ制御可能なfactoryと診断callbackを渡す。

| 観測するケース | 検証する結果 |
|---|---|
| 正常値と`Left FeatureFailure` | 同じ返値、callbackは1回、Metrics→Logs→Traceの順に終了 |
| 第2・第3Provider取得失敗 | callbackは0回、取得済み資源だけ終了、元例外を保持 |
| Exporter/Processor/Readerの途中取得失敗 | 所有移譲前後に応じて一度だけ終了し、rollback結果も同じreportへ残る |
| force flushの非成功値とthrow | 同じProviderのshutdownへ進む。SDK結果の各constructorを区別 |
| shutdown失敗 | 独立した残りのProviderの終了を試す |
| 文脈付きcallback/取得例外 | テスト用`ExceptionAnnotation`が再送出後も残る |
| callbackで中断 | 元のmask状態と中断の伝播、取得済み資源の解放 |
| cleanupで中断、元同期例外との競合 | 残りの終了を試し、中断を最後に伝播。元同期例外もreportに残る |
| 診断が同期失敗/非同期中断 | 上記優先表通り。callbackの再実行や診断の再帰なし |
| Reader停止済み/例外終了/未確認 | その結果を区別し、未確認時にExporterへ後続終了を掛けない |
| 手動構成のMetrics | テスト限定Counterで2+3を記録し、実際の共通終了経路のexportに合計5がある |
| SDK Periodic Reader | Exporter側の通知で目的値の送信を待ち、終了後のexportがないことを確認 |
| delta | 最終export前の不要なcollectがなく、Exporter shutdownが1回。損失ゼロの一般保証とは区別 |

中断試験にはMVar等で到達位置を通知し、別threadから`throwTo`する。取得保護の確認は、factoryが`getMaskingState`で期待状態を観測する試験と、資源を取得した途中の失敗に対する解放回数の試験を分ける。短い`threadDelay`だけで成功を推測しない。

Metrics接続試験では`getMeter`→`meterCreateCounterInt64`→`counterAdd`を実際に呼び、in-memory Exporterでscope・Metric名・`IntNumber 5`を確認する。Readerを使わない試験だけでReader接続を検証したとは扱わない。テスト限定の名前をproductionの共通Metricへ昇格しない。

内部moduleの単体試験用に公開面を無闇に広げず、優先表も含めて構築入口から結果を検証できる。既存Trace/Logs/exactly-once試験を維持し、新しいlifecycle内で注釈が保たれる統合試験を追加する。実装完了時は正本の`make check-app`でformat/build/test/型制約/Haddockを確認する。

## 10. 以前の案から何を変えるか

| 論点 | 以前の設計・現行コード | 今回の推奨と根拠 |
|---|---|---|
| 寿命の管理 | `withOwned`でmask/try/rethrowを実装 | 標準`bracket`。確認したbaseが取得保護と例外文脈の再送出を提供する |
| 例外の優先順位 | 各`withOwned`で選択 | 全資源終了後の純粋関数で1回だけ選ぶ |
| 元同期例外の保存 | `journalSupersededExceptions`に途中の置換を記録 | 元の`Either CapturedException a`を最外層で持ち、置換履歴を不要にする |
| 終了操作の結果 | SDKの具体型を保持 | 維持。結果型と収集をCleanupへ分離する |
| 終了処理の保存先 | `CleanupJournal`を資源管理へ渡す | 内部追記関数だけ渡し、記録領域の所有はLifecycleに限定 |
| 部分取得rollback | 取得関数側でも対応 | 維持。標準bracketだけで取得関数内部まで自動保護されるとは扱わない |
| Metrics単独所有・停止順序 | 専用手順 | 維持。実際のSDK helperが複数操作と結果破棄を束ねているため |
| SDK非依存の機能境界 | Trace/Logs、Metricsは構築側 | 維持。今回変更する根拠はない |

以前の「bracketだけではflush例外後のshutdownや結果保持を満たせない」という指摘は正しい。ただし、そこから「取得・利用・解放の枠まで独自実装する必要がある」とはならない。**releaseを例外捕捉・結果保存する操作へ変えれば、寿命の枠には標準bracketを使える。** これが今回変更する設計判断であり、ユーザーの違和感へ合わせてMetricsの所有方針まで変更するものではない。

変更順は、(1) 終了結果型・1操作の観測を分離、(2) `bracket`による3資源の寿命と外側の例外選択を実装、(3) 部分取得と中断の試験、(4) Metrics固有手順と接続試験、(5) 通常設定を同じ入口へ接続、を推奨する。正本コードの変更・テストは今回のノート作成には含めていない。

## 11. 確認範囲と参照

実施したのは、指定branchのコード・Cabal・Makefile・関連正本設計、Workbenchの規則・Subtask・既存設計/計画、以下の上流実装の読取りと比較。調査環境にGHC/Cabalはなく、提案コードのコンパイル、SDK挙動の実測、`make check-app`は未実施。断片コードは設計説明であり、そのまま導入できる完成実装ではない。

正本はすべて上記のRAGScope commitに固定する。

- [Lifecycle.hs](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs)
- [Telemetry.hs](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/telemetry-boundary/RAGScope/Telemetry.hs)、[Exception.hs](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Exception.hs)
- [ragscope.cabal](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/ragscope-app/ragscope.cabal)、[Makefile](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/Makefile)
- [RS-0024 Ticket](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScopeアプリケーションへOpenTelemetry%20Observability最小基盤を実装する.md)
- [Observability設計](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/project-docs/design/observability/Observability設計.md)、[Metrics設計](https://github.com/takashit16833/RAGScope/blob/957d04a962ffc1804ae2234b08fb83c6cc982555/project-docs/design/observability/Metrics設計.md)

上流の具体的な処理を比較した根拠:

- [GHC 9.12.4のbracket / onException](https://github.com/ghc/ghc/blob/ghc-9.12.4-release/libraries/ghc-internal/src/GHC/Internal/Control/Exception/Base.hs): 取得のmask、`catchNoPropagate`と`rethrowIO`。
- [exceptionsのgeneralBracketとWriterT instance](https://github.com/ekmett/exceptions/blob/f71bbe41fc59febff282a1e9da5d28ad9f6607a4/src/Control/Monad/Catch.hs): use/releaseの値、例外時の経路。調査した上流snapshotであり、RAGScopeの追加依存として採用済みのversionではない。
- [Data.Acquire.Internal](https://github.com/snoyberg/conduit/blob/6b98f070fea09a3bf0a5d0897a2e27e3aa91c8fe/resourcet/Data/Acquire/Internal.hs)、[ResourceT](https://github.com/snoyberg/conduit/blob/6b98f070fea09a3bf0a5d0897a2e27e3aa91c8fe/resourcet/Control/Monad/Trans/Resource.hs): 合成、逆順解放、登録、終了例外。こちらも比較用の上流snapshot。
- [SDK.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/SDK.hs): 統合helperは全Provider取得成功前のrollbackを持たず、shutdownの返値と例外を捨てるため、今回の入口としては採用しない。
- [MetricReader.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MetricReader.hs)、[MeterProvider.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MeterProvider.hs): Reader停止とExporter終了の合成、Provider側所有、delta収集。
- [Trace/Core.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Trace/Core.hs)、[Log/Core.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Internal/Log/Core.hs)、[Common/Types.hs](https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Internal/Common/Types.hs): Provider終了、SDK結果の具体constructor。
