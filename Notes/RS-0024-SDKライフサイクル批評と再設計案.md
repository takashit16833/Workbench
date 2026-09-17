---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-18
---

# RS-0024 SDKライフサイクルの批評と再設計案

## 0. このノートの位置付け

このノートはAIによるレビューと未採用の設計提案である。RAGScopeの現在仕様、採用済み設計、Ticketの完了記録ではない。正本リポジトリは変更していない。

- 調査対象: `takashit16833/RAGScope` の `RS-0024/sdk-lifecycle-metrics`
- 調査時の最新commit: `48e2fa04ca02474d0e7f68c02153a6437c2d53e9`。調査中にもbranch headを再確認した。
- 保存先: Workbenchの既存作業branch `feat/RS-0024-opentelemetry-observability-foundation`
- 日付: 2026-09-18 JST
- 主目的: 保守する人間が、確保・利用・解放・結果保持・例外選択を正確に理解できること。
- 副目的: 実際に存在する数学的構造を見つけ、上記の目的に役立つ範囲で型と合成規則へ落とし込むこと。

以下のHaskell断片はすべて提案であり、コンパイル済み実装ではない。`Report`等の型名は現在のコードには存在しない。実装開始前には最新branchとの差分を再確認する。

## 1. 現在の要求と実装状態

### 1.1 正本から確認した要求

| 要求 | 根拠 | どこまで意味するか |
|---|---|---|
| Trace・Logs・MetricsのSDKを初期化し、終了時にflush / shutdownする | [RS-0024][S5] | SDKライフサイクルの基盤が必要。特定のモナドや`bracket`の採用要求ではない |
| Processor / Exporterをテスト・ローカル用に差し替えられる | [RS-0024][S5] | 本体とテストを別実装にする要求ではない |
| SDK型をUseCase・内部処理へ不要に漏らさない | [Observability設計][S6]、[Cabal][S9] | SDK接続をAdapter側へ隔離する |
| Telemetry記録・exportの失敗だけで、成功した機能処理を失敗へ変えない | [Observability設計 §3][S6]、[ADR-0010][S8] | 起動失敗を必ず無視する、という意味ではない |
| キャンセルを機能上の失敗値に変換しない | [失敗設計 §3・§6][S7]、[Haskell規約 §7.3][S15] | 必要な後片付け後に伝播させる。一時的な例外の値保持は禁止されていない |
| SDKのContext・batching・送信を独自Runtimeとして再実装しない | [RS-0024][S5]、[Observability設計 §2][S6] | SDK資源の安全な所有・終了制御と、Telemetry処理そのものを区別する |
| 共通のアプリケーション失敗型へすべての例外を正規化しない | [ADR-0010][S8] | Adapter内部の例外運搬型と、UseCaseの失敗型は別物 |
| RAGScope独自Metricを共通基盤へ先行追加しない | [Metrics設計][S16]、[RS-0024][S5] | 今回の再設計もMetricの意味や名前を追加しない |

要求定義の`REQ-NF-REL-001`、`REQ-NF-REL-005`等は異常系の検証・実行追跡という上位要求を示すが、具体的な例外優先順位までは定めていない。[要求定義][S17]

ADR-0006 → ADR-0009 → ADR-0010の置換関係を確認した。現在acceptedなのはADR-0010。旧ADRだけを現行判断の根拠にしていない。[ADR-0006][S18]、[ADR-0009][S19]、[ADR-0010][S8]

### 1.2 コードとテストで決まっている具体的な方針

| 項目 | 現在の決定 | 根拠 |
|---|---|---|
| Provider確保順 | Trace → Logs → Metrics | [Construction][S1] |
| Provider解放順 | Metrics → Logs → Trace | [Construction][S1]、[LifecycleSpec][S10] |
| 確保失敗 | callbackを実行せず、取得済みProviderを解放する | 同上 |
| Provider内部の部分確保 | 各acquire実装が自分の内部資源をrollbackする | [Construction][S1]、[TraceProvider][S4] |
| Traceの所有者 | Exporter → Processor → Providerと移る。失敗時は現在の所有者だけをshutdownする | [TraceProvider][S4] |
| Cleanup記録 | 操作名と、SDKの結果または文脈付き例外を保存する | [Cleanup][S3] |
| 結果集約 | invocation内の`IORef [CleanupOutcome]`。先頭追加後にreverseする | [Lifecycle][S2] |
| 同期Cleanup例外 |元のcallback結果・例外を置き換えない | [Lifecycle][S2]、[LifecycleSpec][S10] |
| reportingの同期例外 | 元の結果・例外を置き換えない | 同上 |
| reportingの回数 | cleanup後に1回呼び出す | 同上 |
| 例外の情報 | `ExceptionWithContext SomeException`を保持し、`rethrowIO`で再送出 | [Lifecycle][S2]、[TraceProvider][S4] |
| 戻り値の`Left` | callbackが返した通常の値。ライフサイクル例外ではない | [LifecycleSpec][S10] |

上表の順序、結果形式、収集手段、優先順位は現在採用された実装上の選択であり、変更不可能な上位要求ではない。ただし再設計では既存の振る舞いとして明示的に扱い、黙って変えない。

### 1.3 完成していると誤認してはいけない部分

- `Construction`は任意の`trace / logs / metrics`を受ける骨格であり、3種類の実SDK資源を組み立てる完成済み入口ではない。[Construction][S1]
- Traceの具体的な確保・終了処理は存在するが、`OpenTelemetryTraceProviderSpec`は`pendingWith`のみ。実SDKの所有権移動、rollback、flush失敗後のshutdownを検証するテストはまだない。[TraceProviderSpec][S11]
- 対象treeに本番用LogsProvider / MetricsProviderの確保実装は存在しない。`Logs.hs`はLogs操作のAdapterであって、LoggerProviderのライフサイクル実装ではない。[Logs][S20]、[Cabal][S9]
- `Main.hs`は`Hello, Haskell!`を出力するだけ。SDKライフサイクルはアプリ起動へ未接続。[Main][S12]
- テスト用Trace・Logs初期化は別の`bracket`によるfixtureを使っている。既存のSpan / Logsテストをそのまま新ライフサイクルの統合テストと数えない。[TestSupport][S13]
- `LifecycleSpec`の8例は、主に資源を`()`としたmockによる順序・結果保持の検証である。`throwIO UserInterrupt`は例外選択を試すが、別threadから届く割込みとmask境界の競合までは試していない。[LifecycleSpec][S10]

これは進行中Ticketの到達点の確認であり、未完成部分を設計欠陥と数えるものではない。

### 1.4 決定済み・未決定・確認不能

| 状態 | 内容 |
|---|---|
| 決定済み | 上記コード上の確保・解放順、同期失敗の隔離、`chooseExit`の例外優先順位 |
| 決定済み | UseCase失敗型、Telemetry境界、SDK依存の方向 |
| 未決定 | 実プロセスの終了コードと起動・終了全体の成功判定。失敗設計§6が明示的に後続へ委ね、Mainも未接続 |
| 未決定 | 現在のReporterを本番でどこへ接続するか、報告先失敗時の診断をどう公開するか。コードには任意のcallbackしかない |
| 未決定 | ライフサイクル全体の終了期限と、期限超過後の扱い。現コードに共通budgetはない |
| 確認不能 | ユーザー環境で実際に解決・インストールされたSDKの厳密なversion。Cabalは`^>=1.0.0.0`で、対象treeにfreeze / plan.jsonはない |
| 確認不能 | 対象commitのテスト実行結果。本環境にGHC / Cabalはなく、このcommitのGitHub check-runsも0件だった |

共通失敗設計が起動・終了規則を後続に委ねていることと、このbranchの`chooseExit`がライブラリの返り方を定めたことは両立する。これを正本間の矛盾とは判定しない。

## 2. 現行の処理・データ・例外の流れ

### 2.1 正常系と異常系

1. `withProviders operations publish use`が`runLifecycle`へ、3重の`bracket`を実行する関数を渡す。
2. `runLifecycle`は`mask`内で結果用IORefを作り、そのIORefへ先頭追加する`record`を作る。
3. `restore (acquireAndUse record)`を`tryWithContext`で包む。
4. Trace / Logs / Metricsを順に確保する。各`bracket`のacquire / releaseはmaskされ、useで元のmask状態へ戻る。
5. 3資源取得後に`use trace logs metrics`を実行する。正常値を返すか例外で終了する。
6. 内側からreleaseする。通常の各SDK操作は`attemptCleanup`が捕捉・記録する。release全体が予想外にthrowすると`releaseSafely`が`metrics.release`等の例外記録を追加する。
7. callback / acquireの例外は`bracket`を抜けて最外側の`tryWithContext`に入り、`original :: Either CapturedException a`になる。
8. IORefをreverseしてCleanup実行順の一覧を作る。元の例外とともに`LifecycleReport`を組み立てる。
9. `publish report`を捕捉付きで1回試す。
10. `chooseExit`で返す値・再送出する例外を選び、最後に`either rethrowIO pure`を実行する。[Construction][S1]、[Lifecycle][S2]、[Cleanup][S3]

したがって「現行実装は例外をすべて即時再送出している」は誤りである。最外側は既に値保持と遅延再送出を行う。改善対象は、その方法を内部にも一貫して使うべきかどうかである。

### 2.2 Traceの部分確保

`acquireSdkTraceProvider`は以下の所有権移動を手書きしている。

| 成功した最後の段階 | 次の段階が失敗したとき | 呼ばない解放 |
|---|---|---|
| Exporter | `spanExporterShutdown exporter`を`trace.exporter.rollback`として記録 | 存在しないProcessor / Provider |
| Processor | `spanProcessorShutdown processor`を`trace.processor.rollback`として記録 | Exporterを別途shutdownしない |
| Provider | 通常のProvider releaseでflush、shutdown | Processor / Exporterを別途shutdownしない |

rollback結果を`record`へ保存した後、取得失敗の例外を`rethrowIO`する。この再送出は外側の既存Providerを`bracket`で解放し、最終的に`runLifecycle`へ元の失敗を渡すために使われる。[TraceProvider][S4]

成功時にもExporterとProcessorのfinalizerを独立して積む設計へ単純変更すると二重shutdownになる。この取得列は「3資源をずっと別々に所有すること」ではなく、「1本の解放責任を次の段階へ移すこと」である。

### 2.3 最後にどの例外を選ぶか

`chooseExit`の優先順位は次のとおり。

1. acquireまたはcallbackからの元の非同期例外。
2. Cleanup一覧の実行順で最初の非同期例外。
3. publishからの非同期例外。
4. 元の同期例外、または元の正常値。

同期Cleanup例外と同期publish例外は、この順位へ候補として入らない。SDKが`ShutdownFailure`、`FlushError`、`Failure ...`を値で返した場合もそれ自体は再送出対象ではない。選ばれなかった元の同期例外はreportへ残る。[Lifecycle][S2]

`SomeAsyncException`に分類できる型かを調べており、「実際に`throwTo`で送られたか」を判別しているわけではない。`throwIO UserInterrupt`も同じ分岐へ入る。

### 2.4 maskについての重要な読み方

`acquireSdkTraceProvider`内にある`restore`は、無条件に割込み可能へ変更する関数ではない。呼出し時のmask状態へ戻す。

- `withProviders`の`bracket`から呼ぶ場合、acquireは既に`MaskedInterruptible`。内部の`restore factory`も通常この状態へ戻る。
- 同関数をunmaskedな場所から直接呼ぶと、factory全体がunmaskedになる。資源作成後から戻り値受領までの引渡しを、外側の型だけでは保証できない。
- この関数はCabalで公開されるTraceProvider moduleにあるため、再設計では「安全なscoped入口」と「maskされた構築内部でのみ使うprimitive」を区別したい。

これは`withProviders`の既存経路に資源漏れを実測したという指摘ではない。利用文脈への依存がAPIに表れていない点の指摘である。[TraceProvider][S4]、[Cabal][S9]、[GHCのmask説明][E1]

## 3. 独立した評価

### 3.1 維持してよい部分

- `bracket`の入れ子は、既に取得した外側資源の解放を自然に表現する。3Providerという固定個数なら、入れ子そのものを重大問題とは見ない。
- 取得順と逆の解放順、通常結果とTelemetry失敗の分離、例外文脈の保持は妥当である。
- `chooseExit`を純粋関数として分離した方向は良い。実行順と優先順位を分離できている。
- `IORef`はinvocation内、同一thread、非blockingな追加に限定されている。これを「危険なグローバル共有状態」「並列raceの実証」と評価する理由はない。
- Resource内部のrollbackと、Provider間の解放を分離する責務配置も妥当である。
- GHC 9.12.4の`bracket`は`onException`を使い、`onException`は`catchNoPropagate` / `rethrowIO`を使う。現状の`bracket`を通ることだけを理由にExceptionContextが失われるとは言えない。[GHC実装][E5]

### 3.2 読みにくさの具体的な原因

| 原因 | 現在追う必要がある箇所 | 実際の負担 |
|---|---|---|
| 戻り値と記録が別経路 | acquireは資源を返しつつ`record`を受け取り、releaseは`IO ()`だが記録を発生させる | 関数型だけでは、何件・どの順序の結果が外へ出るか読めない |
| 例外の制御経路が二種類 | 内側は再送出でunwind、外側は`Either`で保持 | rollback→record→rethrow→bracket→tryを横断して理解する必要がある |
| release契約が文章頼み | `release* :: recorder -> r -> IO ()` | 操作ごとの例外捕捉・残りの継続は実装者の責任。型からは保証されない |
| 同じreport一覧へ異なる粒度が入る | `trace.flush`と`trace.release` | SDK操作結果と、解放関数全体の予想外例外が同じ`String`で表現される |
| 例外の発生主体が型にない | `firstAsyncException`のコメント | worker終了結果を入れないという約束を全producerが覚える必要がある |
| 移行用APIが併存 | `attemptCleanup`と`runCleanupSteps` | 一方はcallback記録、他方は一覧返却。現対象では後者の呼出しはない |

型の不足は、即バグという意味ではない。しかしLogs・Metricsを追加する際、同じ暗黙契約を新しい実装者へ配ることになる。ここに変更の実益がある。[Construction][S1]、[Cleanup][S3]、[Lifecycle][S2]

### 3.3 現行が保証するのは「解放の試行」である

`releaseSafely`は、あるProviderの解放がthrowしても外側Providerのreleaseへ進める。しかし、そのrelease内でまだ実行していなかった操作までは再開しない。

例えば`releaseLogsProvider = flush >> shutdown`と書き、flushを個別に捕捉しなければ、flushのthrow後にLogs自身のshutdownは呼ばれない。Traceのreleaseは呼ばれる。現行のTrace releaseは2回の`attemptCleanup`を使っており、この問題を避けている。[Construction][S1]、[TraceProvider][S4]

また、`mask`中でもblocking I/O等では非同期例外を受ける。解放処理の実行開始・例外記録・残りの操作の試行と、外部資源が実際に解放完了したことは別である。全体を`uninterruptibleMask`で包む案は、停止不能の危険と引換えになり推奨しない。[GHCのmask説明][E1]

### 3.4 診断の保持は現状でも無制限ではない

`LifecycleReport`には元の例外とCleanup結果が入るが、publish自身の失敗は入らない。reportを作ってからpublishを呼ぶため当然であり、再帰的な同経路報告を追加すべきではない。ただし「すべての失敗を外部へ保持できる」という保証はない。publishが失敗すれば今回のreportが外部に保存されたかも保証できない。[Lifecycle][S2]

元の正常値`a`は最後の選択まで内部に保持するが、非同期例外が優先されたときに`a`をreportへ載せる仕様はない。これも既存契約として区別する。

評価はIO actionが返った時点までであり、返した`a`に遅延評価された例外が含まれていた場合まで先取りしない。再設計で無断に`NFData a`を要求して評価時期を変えない。

## 4. SDKの制約を含めた確認

### 4.1 調査version

RAGScopeの`hs-opentelemetry-api` / `sdk`依存は`^>=1.0.0.0`。対応するupstream release tag `hs-opentelemetry-sdk-1.0.0.0`のcommit `46a42cdf80405fdb36fbb48a309254b2332617b4`を読んだ。これは許容範囲内の基準versionの調査であり、ユーザー環境の正確な解決結果を断定しない。[Cabal][S9]

### 4.2 SDKの統合helperへ任せれば解決するか

同releaseの`initializeOpenTelemetry`はTrace → Metrics → Logsを連続取得する。途中失敗時に前段をrollbackする処理はこのhelper内にない。返すshutdownは各Providerの結果を`void`し、`SomeException`もcatchして捨てる。`withOpenTelemetry`はこのacquire全体を1つの`bracket`で包む。[SDK.hs][E6]

従って現状必要な「部分確保の解放」「結果の保持」「中断の伝播」をこのhelperへ単純移行して維持できない。SDK型を自分で構成する現在の方向には具体的理由がある。

### 4.3 Provider APIから見える情報の限界

同releaseの`shutdownTracerProvider`はProcessorのshutdownをworkerで実行し、`waitCatch`の例外を`ShutdownFailure`へ集約する。`forceFlushTracerProvider`もworker例外を`FlushError`へ集約する。`Nothing`のtimeout引数は無期限ではなく既定5秒を指定する。[Trace.Core][E7]

ただしtimeout後に`cancel jobs`を待つ箇所があり、これだけでライフサイクル全体の厳密な最大終了時間が保証されるとは言えない。直接呼ぶExporter / Processor rollbackにも同じ5秒が自動適用されるわけではない。

RAGScopeのCleanupは「呼んだSDK APIが返した完全な結果」を保持できるが、そのAPI内部で既に失われた個々のworker例外まで復元できない。この限界を改善案の型だけで解決したと説明しない。

### 4.4 worker終了と親threadのキャンセルを混同しない

`Lifecycle.firstAsyncException`にはworker終了を混ぜないというコメントがあるが、`CleanupOutcome`に発生主体の区別はない。[Lifecycle][S2]

同releaseのSimple Span Processorのshutdownは`wait exportWorker`の後にExporter shutdownを呼ぶ。workerが例外終了すると`wait`が再送出し、その後のExporter shutdownには進まない。`trace.processor.rollback`から直接この処理を呼ぶ構成では、worker由来の非同期型例外を親のキャンセルと誤認する可能性がある。現在productionのProcessor factoryは未固定なので、既に発生している障害とは断定しない。[Simple.Span][E8]、[TraceProvider][S4]

今後のMetricsでもこの区別が必要になる。`forkPeriodicMetricReader`の停止処理はcancel / waitCatch / final export / Exporter shutdownを連続実行し、exportやshutdownの結果を捨てる。途中throw後の後段継続もこのhelper単体では保証しない。[MetricReader][E9]

案B/Cではworker結果を通常のデータとして保持する。例えば`tryWithContext (waitCatch worker)`の外側`Left`は待機側で捕捉した例外、内側`Right (Left workerError)`はworker結果として別々に表現する。ただし任意のSDK関数が内部でworker例外を再送出する場合、外側のcatchだけで由来を復元することはできない。SDK関数の契約確認またはworkerを直接扱える境界での分離が必要である。

Readerの独自スケジューラを作ることを今回の推奨には含めない。SDKの停止APIをどう組み合わせて保証を作るかはMetrics実装時に、そのversionの所有関係とともに具体化する。

## 5. 比較する案

| 案 | 中心構造 | 修正規模 | 評価 |
|---|---|---|---|
| A: 現行を維持し契約を狭める | nested `bracket` + invocation内journal + 純粋な例外選択 | 小〜中 | 安全機構を大きく変えず改善可能。二重のデータ経路は残る |
| B: 結果を返すscoped runner | 確保失敗、利用結果、Cleanup一覧を型で運び、公開入口で再送出 | 中 | 今回の推奨。結果の集約場所と制御が明示される |
| C: 合成可能な資源scope | Bの安全な実行核 + 非公開の継続型 + 必要箇所の所有状態型 | 大 | 構成の美しさと再利用が増す。抽象化を保守する負担も増す |
| D: 線形型による所有権 | 線形な所有tokenとSDKを包む専用実行層 | 非常に大 | 学習・実験候補。今回の既定案にはしない |

以後B/C/DはAI提案。修正コストだけを理由に大きな案を退けず、得られる保証と読解負担を比較する。

## 6. 案A — 現行を維持し、暗黙契約を減らす

### 6.1 変更内容

1. `bracket`とIORefによる記録は維持する。
2. `CleanupStep`による操作列をProvider側から作り、中央のrunnerが1操作ずつ捕捉・即時記録する。Provider作者に`flush >> shutdown`の例外処理を毎回書かせない。
3. 操作IDは`String`に全面依存せず、Signal / phase / operationを区別できる内部型にする。特に操作例外とrelease全体の異常を区別する。
4. `record`は任意のIO callbackとして広く公開せず、内部専用の抽象型にする。SDKのworkerへ渡すAPIを設けない。
5. `chooseExit`を直接検証できる内部テスト入口を用意する。`runCleanupSteps`の移行途中コメントと未使用経路は採用方針に合わせて整理する。

### 6.2 保証と限界

- 外側Providerの解放は既存の`bracket`が担当する。
- 部分確保のrollbackは各Provider実装が担当する。再送出の流れは維持する。
- CleanupのprefixはIORefへ逐次保存されるので、後続の操作がthrowしても既に記録した結果は残る。
- `record`を抽象型にするだけでthread局所性や一度だけの呼出しが型証明されるわけではない。実装を閉じることとテストが必要。
- 別経路の結果記録と例外unwindを読む負担は残る。

既存コードの説明可能性を少し改善すれば十分という要求ならAは妥当。しかし今回の「返り値と結果の集約を追いやすくしたい」にはBの方が直接応える。

## 7. 案B — 結果を返すscoped runner（推奨）

### 7.1 型で分ける三つのもの

```haskell
type Captured = ExceptionWithContext SomeException

-- SDK確保中のrollbackを終えてから返す。
data Acquisition r
  = Acquired r
  | AcquisitionFailed Captured [CleanupOutcome]

-- 元の利用結果と、既に試したcleanupの事実。
data Report a = Report
  { originalExit :: Either Captured a
  , cleanupOutcomes :: [CleanupOutcome]
  }

-- acquireと、その資源が所有する解放操作列を組にする。
-- constructorは信頼する構築moduleとテストだけに限定する。
data ResourceSpec r = ResourceSpec
  { acquireResource :: IO (Acquisition r)
  , cleanupResource :: r -> [CleanupStep]
  }
```

`AcquisitionFailed`は資源を持たない。取得できたのに解放責任を放棄した状態を通常の失敗constructorで返してはいけない。失敗を返す前に、自分が所有する最上位資源のrollbackを試して記録する。

`Report (Either FeatureFailure a)`では、外側の`Either Captured`が例外を表し、内側の`Either FeatureFailure`はアプリの通常結果である。外側を`Left`にしたままアプリ処理を再開するAPIは提供しない。

### 7.2 1個の資源を使う内部primitive

以下は動作を示す設計断片。`within`は公開汎用関数ではなく、ライフサイクル最外側の`mask`内からのみ呼ぶ内部primitiveとする。

```haskell
within
  :: ResourceSpec r
  -> (r -> IO (Report a))
  -> IO (Report a)
within spec next = do
  acquired <- tryWithContext @SomeException (acquireResource spec)
  case acquired of
    Left e -> pure (Report (Left e) [])
    Right (AcquisitionFailed e rollback) ->
      pure (Report (Left e) rollback)
    Right (Acquired r) -> do
      nested <- tryWithContext @SomeException (next r)
      own <- runCleanupSteps (cleanupResource spec r)
      let prior = either (\e -> Report (Left e) []) id nested
      pure prior
        { cleanupOutcomes = cleanupOutcomes prior <> own }
```

ここで重要な不変条件:

- `next`は任意のユーザーcallbackではなく、内側の`within`または最終利用処理を包む内部関数。
- `cleanupResource`は有限でtotalな操作列を作る。SDK呼出しは各`CleanupStep`のIO actionの中に置く。操作列を構築するためにSDK I/Oを実行しない。
- `runCleanupSteps`は各操作を`tryWithContext`で包み、同期・非同期どちらを捕捉しても後続操作を試す。途中で例外を再送出しない。
- 信頼するrunner自身の純粋計算にbottomがある場合まで、上の短い断片が全記録保持を保証するとは主張しない。中央runnerを小さく閉じ、その不変条件をテストする。
- raw acquireが内部でrollbackを記録した後throwする旧APIは混在させない。そのまま混在させると`Left e -> []`でrollback履歴を失う。Bへの移行はacquireの返り値契約まで含む。

### 7.3 最外側でのみ通常結果へ戻す

```haskell
withProvidersV2 traceSpec logsSpec metricsSpec publish use =
  mask $ \restore -> do
    report <-
      within traceSpec $ \trace ->
        within logsSpec $ \logs ->
          within metricsSpec $ \metrics -> do
            result <- tryWithContext @SomeException
                        (restore (use trace logs metrics))
            pure (Report result [])

    reporting <- tryWithContext @SomeException
                   (publish (toLifecycleReport report))

    either rethrowIO pure $
      chooseExit (originalExit report)
                 (cleanupOutcomes report)
                 reporting
```

`toLifecycleReport`は現在と同じく元の例外とCleanup一覧だけを公開する純粋な変換とする。既存`LifecycleReport`と`withProviders`の利用者向け返り方は維持できる。`ProviderOperations`の内部・テスト向け構築契約は変わる。

ここで`Report`を最外側の一般利用者へ単に返して終わらせない。そうすると中断が通常値になって呼出し側へ漏れ、キャンセルを無視する余地を作る。例外を値にするのは後片付け中の運搬のためであり、外部の例外契約を消すためではない。

### 7.4 非同期例外に関する核心

「各scopeを`restore`して実行し、返されたreportを後で足す」設計は避ける。内側のcleanup完了後、reportを外側が受け取る前に割込みが届くと、戻り値のreportを失う隙間を作る。

Bでは**結果の受け渡しと連結を最外側のmask内に保ち、`restore`するのはユーザーの利用処理だけ**とする。取得処理も現在の`bracket`経路と同じmasked acquisition契約を維持する。factory全体を安易にunmaskしない。

待機が必要なfactoryでは`MaskedInterruptible`でもblocking箇所で割込みを受ける。factory内部で作った資源については、そのfactoryが例外安全である必要がある。この責任はA/B/C/Dのどれでも消えない。

捕捉した中断後に実行するのは残ったcleanupとpublishだけ。新しいProvider確保やユーザー処理へは進まない。最後の選択は現行と同じ純粋関数で行う。

全cleanupが終わってmaskを抜けるときに初めて配送される未受領の割込みを、先に作ったreportへ記録することまでは保証しない。優先順位は当該ライフサイクルで実際に捕捉した例外の間の規則である。

### 7.5 Trace内部の確保をどう書き換えるか

```haskell
-- maskedな構築内部で実行する。単独の公開acquireにはしない。
acquireTraceOutcome config = do
  exporterExit <- tryWithContext @SomeException
                    (traceExporterFactory config)
  case exporterExit of
    Left e -> pure (AcquisitionFailed e [])
    Right exporter -> do
      processorExit <- tryWithContext @SomeException
                         (traceProcessorFactory config exporter)
      case processorExit of
        Left e -> do
          rollback <- runCleanupSteps [exporterRollback exporter]
          pure (AcquisitionFailed e rollback)
        Right processor -> do
          providerExit <- tryWithContext @SomeException
                            (traceProviderFactory config processor)
          case providerExit of
            Left e -> do
              rollback <- runCleanupSteps [processorRollback processor]
              pure (AcquisitionFailed e rollback)
            Right provider -> pure (Acquired provider)
```

ここでは意図的に3段階を明記している。共通化がないこと自体を悪い設計とはしない。`exporterRollback`は`spanExporterShutdown`、`processorRollback`は`spanProcessorShutdown`を呼ぶCleanupStepを作る。Provider成功後の操作列は`forceFlushTracerProvider`と`shutdownTracerProvider`の2項目。現在の所有関係を維持する。

rollback中の例外が元の取得例外を上書きしない。`AcquisitionFailed`に元の例外を残し、rollbackの中断はCleanup一覧に残す。上位で現在の優先順位を適用できる。

### 7.6 Bによって具体的に減るもの・増えるもの

減るもの:

- 全acquire / releaseへの`record`引数。
- 呼出し元のIORefへ結果を書き込む暗黙の副作用。
- rollback結果記録後の再送出と、その例外を結果回収のために再捕捉する流れ。
- release実装ごとの「必ず個別に捕捉して次へ進む」という約束。中央の操作列runnerが引き受ける。

増えるもの:

- `Acquisition`と`Report`という、部分確保と実行結果の明示的な型。
- `bracket`をそのまま使う代わりの、小さな資源scope実行核。
- scope実行核のmask境界を検証する責任。自作だから自動的に安全になるわけではない。

共有状態を消すこと自体は目的ではない。中央の小さなrunnerへ危険な制御を集め、その外側を資源・操作・結果の対応だけで読めるようにすることが利益である。

### 7.7 worker結果の型を分ける場合

7.1〜7.5の中心断片は、現行の`CleanupOutcome`を使って結果の返し方だけを説明した。worker結果も必要になる実装では、例えば次の観測内容を区別する。

```haskell
data CleanupObservation
  = SdkReturned CleanupResult
  | LifecycleOperationRaised Captured
  | WorkerTerminated (Either SomeException ())
```

操作名・Signal等はこれを包むOutcome側に保持する。`WorkerTerminated (Left e)`は、`e`の型が非同期例外でも、それだけを親threadの例外選択へ入れない。`LifecycleOperationRaised`の非同期型例外を選択対象にする。ただしSDKから転送された例外を適当にこのconstructorへ入れるだけでは、由来の判定は正しくならない。4.4で述べた境界で分ける必要がある。

この型は「情報の由来を表現し、選択時に区別させる」保証を追加する。任意のIOから例外の発生threadを自動判別する保証ではない。workerの例外を`SomeException`で受け取るSDK APIについて、存在しないExceptionContextを捏造しない。

現在の単純な`String`と`CleanupResult`の組は、例えばshutdownという名前にflush結果を対応付けることも許す。これを禁止したければ、`CleanupOp result`をGADTで定義し、`FlushOp :: CleanupOp FlushResult`、`ShutdownOp :: CleanupOp ShutdownResult`とする追加案がある。`Step :: CleanupOp result -> IO result -> Step`なら、操作と結果型の不一致を検査できる。一方で異なるresultを一覧に格納する存在型と、その表示用pattern matchが必要になる。まずBの結果集約を実現するための必須条件にはしない。

## 8. 案C — 合成可能なscopeと所有権移動

### 8.1 資源の「利用範囲」を値にする

Bの`within`は、資源を受け取った後の処理を引数にする。この形を非公開の型に包む。

```haskell
newtype Scoped a = Scoped
  { runScoped :: forall r.
       (a -> IO (Report r)) -> IO (Report r)
  }

instance Functor Scoped where
  fmap f (Scoped s) = Scoped (\k -> s (k . f))

instance Applicative Scoped where
  pure a = Scoped (\k -> k a)
  Scoped sf <*> Scoped sa =
    Scoped (\k -> sf (\f -> sa (\a -> k (f a))))

instance Monad Scoped where
  Scoped sa >>= f =
    Scoped (\k -> sa (\a -> runScoped (f a) k))
```

constructor、`runScoped`、任意IOを持ち上げる操作は一般利用側へ公開しない。最外側runnerがBと同じmaskを所有し、primitiveを`Scoped (within spec)`として作る。上のinstance式だけでは例外安全性は証明されない。信頼したprimitive、totalな構成関数、単一のmask境界という条件が必要。

3Providerの構成は次の形になる。

```haskell
data Providers = Providers
  { traceProvider :: TracerProvider
  , logsProvider :: LoggerProvider
  , metricsResources :: MetricsResources
  }

providers :: SdkConfig -> Scoped Providers
providers config =
  Providers
    <$> traceScope (traceConfig config)
    <*> logsScope (logsConfig config)
    <*> metricsScope (metricsConfig config)
```

この`Applicative`は左から順に確保し、scopeを逆順に抜ける定義であり、並列初期化を意味しない。Logs / Metricsの具体型と構成は今後の実装提案であって現在の型ではない。

### 8.2 この合成は何を単純にするか

Providerを追加・差し替える側は`bracket`、record、try、restoreを各段階へ書かずに済む。取得途中の失敗で後続scopeを実行しないこと、scopeから戻る際に内側からCleanup一覧を返すことはprimitiveへ集まる。

数学的には「結果を作る後続処理を受け取る」という継続の合成であり、各資源のscopeが後続を包む。上のbind式は継続の結合の形そのものになっている。結合の括弧を変えても取得・解放順が変わらないことを、正常系・取得失敗・cleanup失敗のモデルで確かめられる。

ただし、任意のIO、任意のmask変更、並列実行まで含めた観測同値を無条件に主張しない。`Scoped`の通常の型だけでは「継続を必ず1回だけ使うこと」も強制しない。非公開constructorとprimitive実装がその保証を所有する。

### 8.3 所有権移動は別の合成にする

ExporterとProcessorを別々の`Scoped`で包んでからProviderを作ってはいけない。Processorへ所有権が移った後もExporterのfinalizerが残ってしまう。

所有段階を別型で表す候補:

```haskell
data ExporterStage
data ProcessorStage
data ProviderStage

data Owned stage payload = Owned payload (IO [CleanupOutcome])

-- 成功時、旧ownerのrelease義務を新ownerへ置き換える。
-- 失敗時、旧ownerをrollbackしてReportを返す。
-- constructorと実行は構築内部に隠す。
data OwnershipStep from to a b = OwnershipStep (a -> IO b)
```

これらは設計の方向を示す型であり、`Owned`の普通のHaskell値が複製不能になるわけではない。実際のprimitiveには、新ownerのrollback構築、旧ownerの消費、失敗時の旧owner解放を一括して担わせる必要がある。

より具体的には`advanceOwner`がmasked区間で次factoryを捕捉し、成功なら新しい最上位ownerだけを返し、失敗なら旧ownerをrollbackして`AcquisitionFailed`を返す。旧ownerも新ownerも両方finalizer登録する方式にはしない。

この設計の利益は、Provider間の「独立資源のscope合成」と、Provider内部の「解放義務の移転」を違う操作として読めること。代償は新しい型とprimitiveが増えること。現段階のTrace3段階だけなら、Bの明示的caseの方が容易に検証できる。

### 8.4 利用範囲外への持ち出しは別問題

`withProviders :: ... -> (trace -> logs -> metrics -> IO a) -> IO a`は、例えばcallbackからProvider自身やProviderを使う`IO ()`を返すことを型で禁止しない。`Scoped`へ包んでも、raw SDK型と自由なIOを公開したままなら同じである。

強く禁止したいなら、利用権にscope parameterを持たせ、操作も`ScopeIO s`内へ閉じ、`run :: (forall s. ScopeIO s a) -> IO a`のようにする。ただし`Telemetry s -> IO ...`という操作を公開すると、そのIOを閉包にして持ち出せるため、phantom parameterだけでは不十分。

この変更はTelemetry boundary全体へ及ぶ。現在の主問題であるCleanup集約のために一緒に導入する必要はない。Cを採用する場合でも、寿命の完全な静的保証は独立した追加案として評価する。

## 9. 案D — Haskellの尖った方向: 線形な所有token

線形型は「結果が1回使われるなら引数も1回使われる」という制約を表す。[GHC LinearTypes][E4]

SDKのraw値を公開せず線形な所有tokenで包み、`ExporterOwner %1 -> ... ProcessorOwner`のように所有権移動の旧tokenを消費する設計なら、二重解放の原因になるtoken複製を禁止する方向へ進める。

しかし`IO`とSDKのAPIは通常の非線形APIである。`%1`を数か所付けるだけでは、例外による早期終了時の解放、mask境界、worker停止、SDK内部の別名参照まで保証できない。線形な実行層・例外処理・SDK境界の封じ込めを設計する必要がある。

得られるものは所有tokenの使用規律。増えるものは独自実行層、通常IOとの橋渡し、線形な分岐の記述、コンパイル時の負例テスト、SDK境界の信頼範囲である。今回の読みやすさの改善にはB/Cの方が直接的。Dは別の小さな実験としてなら価値があるが、3Providerの基盤へいきなり採用する推奨はしない。

## 10. 既存ライブラリ・変換子との比較

| 手段 | 簡単になること | それだけでは解決しないこと |
|---|---|---|
| `bracket` | 成功した確保に対するscope終了時の解放 | releaseの返り値を返さない。複数Cleanupの結果保持と優先順位は別途必要 |
| `generalBracket` | 通常完了時にuseとreleaseの両方の値を得られる | useがthrowした経路で結果を通常返却するわけではない。例外を内部の`Either`で運ぶか、journal等が必要 |
| `ResourceT` | 動的な資源登録・早期release・scope終了時の解放 | finalizerは`IO ()`。SDKの成功・失敗値の一覧回収、独自優先順位、所有権移動は別実装 |
| `ExceptT Captured (WriterT CleanupLog IO)` | 値化した失敗の短絡と、失敗時にも戻るログを記述できる | 生のIO例外は自動的にログへ変換されない。maskと資源scopeも別に必要 |
| `WriterT CleanupLog (ExceptT Captured IO)` | 成功時の結果とログの記述 | 値化した失敗でも通常の結果形にログが残らない配置になる |
| `StateT` | 累積状態の記述 | IO例外が発生すると途中状態を普通の戻り値として回収できるとは限らない |

`generalBracket`は選択肢として有効だが、例外の値化、acquire失敗、結果保持の契約まで設計する必要がある。採用するなら既存の`ExceptionWithContext`も維持する。[exceptionsのAPI][E2]

`ResourceT`を不適切なlibraryとは評価しない。今回は3Providerの静的な入れ子が既に分かっており、最も困っているのはfinalizer登録自体ではなく結果と例外の流れ。動的な登録・解除を増やしてもその論点は直接解決しない。[resourcetのAPI][E3]

変換子の順序は具体的な結果形を見ると分かりやすい。

```haskell
ExceptT e (WriterT w IO) a
-- 実行結果: IO (Either e a, w)

WriterT w (ExceptT e IO) a
-- 実行結果: IO (Either e (a, w))
```

今回の`Report a`は前者に近い構造だが、変換子を導入しなくても小さなrecordで表せる。必要なのはこの情報保持の構造であり、`mtl`や独自Monadの採用そのものではない。

## 11. 見えている数学的構造と、採用する範囲

### 11.1 Cleanup結果は順序付きの自由モノイド

`[CleanupOutcome]`は空列`[]`と連結`(<>)`を持つ。

```haskell
[] <> xs = xs
xs <> [] = xs
(xs <> ys) <> zs = xs <> (ys <> zs)
```

これは「複数のscopeで起きた事実を、情報を捨てずに一つの列へ合成する」構造である。Bでは内側の結果の後ろに自分のCleanupを連結する。

順序は交換できない。`flush <> shutdown`と`shutdown <> flush`は同じではない。Cleanup結果の連結が結合的でも、Cleanupを並列化したり順序を交換してよいことにはならない。

### 11.2 Cleanup計画と実行結果は別のモノイド

有限の`[CleanupStep]`も連結できる。安全なrunnerを`execute`とすると、各操作を捕捉して必ず結果として返すという前提のもとで、次の逐次合成を期待できる。

```haskell
execute (p <> q)
  == do
       xs <- execute p
       ys <- execute q
       pure (xs <> ys)
```

これは同じmask条件・同じ外部入力・操作の順序を保ったときの法則であり、異なる実時間の割込みscheduleまで完全同一になるという意味ではない。型とrunnerをテストするための構成則として有用。

実行前の計画と実行後の記録を区別すると、Provider moduleは「何を試すか」、runnerは「どう全件を試して記録するか」を担当できる。

### 11.3 例外選択は履歴の集約とは別の代数

Cleanup一覧の中の最初の中断は、`Maybe Captured`の左優先選択で求められる。

```haskell
firstPresent Nothing  y = y
firstPresent x        _ = x
```

この演算は結合的で`Nothing`を単位元とする。ただし例外に順位を付ける前に、worker結果と親thread中断を区別する必要がある。

全体の選択は「元の中断」「Cleanupの最初の中断」「Reporterの中断」という優先順位付き候補を左から選び、なければ元の結果へ戻る。診断記録そのものを`First`で潰してはいけない。履歴は全部保持し、最後の決定だけを絞る。

### 11.4 失敗と記録の直積

`Either Captured a`とCleanup一覧を別フィールドにするのは、失敗しても診断を失わないための直積である。

`Either Captured (a, CleanupLog)`にすると失敗側にCleanupLogが存在しない。この情報構造の違いが、今回もっとも直接的に型へ落とす価値がある。

### 11.5 scopeと所有権移動を混ぜない

Provider間はscopeの入れ子、Trace内部はownerを進める遷移である。両方に「資源」という名前が付いていることだけを理由に同じMonadのbindで処理しない。

数学的な抽象化の価値は、同じ構造には同じ合成則を与え、違う構造を型・操作で区別できることにある。今回はモノイドと直積だけでも、十分に実務上の効果がある。

## 12. 同じ基準での比較

| 基準 | A: 現行改善 | B: 明示的な結果返却 | C: 合成scope | D: 線形所有 |
|---|---|---|---|---|
| 上から読めるか | 制御はbracket、記録は別経路 | acquire結果→内側利用→cleanup→report→選択を局所化 | 構成側は非常に短い。実行核を別に理解する必要 | 所有の型は強いが、実行層の理解負担が大きい |
| 取得途中の失敗 | acquireがrollbackしてthrow | rollback記録付きの失敗を返す | Bのprimitiveに集約 | 線形型とは別にrollback実装が必要 |
| Cleanup保持 | 内部journalへ逐次追加 | 戻り値で連結。maskされたhandoffが必須 | Bと同じ | 線形性だけでは結果保持を解決しない |
| 非同期例外 | 現行mask、後段で再送出 | maskは中央、利用処理のみrestore | constructorを閉じてBの条件を維持 | 通常IO・例外との接続に別の設計が必要 |
| 型の保証 | recorder契約が弱い | 確保失敗と結果保持を明示 | scope合成と所有段階を追加で区別 | tokenの複製・破棄をより強く制約できる可能性 |
| 元の結果・優先順位 | 現状の実装 | 同じ純粋な選択規則を維持 | Bに委譲 | 別途選択規則が必要 |
| テスト容易性 | IORefとmock、記録side effectを観察 | 戻り値、操作列、選択関数を直接比較 | primitiveの法則と構成を分離して検証 | compile-fail、実行時例外、SDK境界の両方が必要 |
| 静的依存 | 現在のAdapter内 | 新しい外部package不要 | CPS/GADTはbaseで表現可能 | 利用する線形実行library等の採否から検討 |
| 実装の複雑さ | 小さいが契約が分散 | 小さな専用runnerを自分で保守 | 高階型・合成則・所有primitiveが増える | 最大 |
| 変更範囲 | Cleanup、内部収集契約、テスト | Construction / Lifecycle / Cleanup / Provider構築・テスト | Bに加えて構成DSL・所有型 | Adapterと利用境界の広い変更もあり得る |

費用を無視しても、Dを最良とはしない。現在の固定構成に対して得られる利益より、例外と通常SDK APIの接続を理解する負担が大きい。一方CはBの実行核が確認できた後の発展先として筋がよい。

## 13. 具体的な失敗経路の検証表

これはソースから行った経路検証と、B/Cを実装する際の期待動作である。Haskell runtimeで実行済みという意味ではない。Aは現行契約を守るproducer、B/Cは上記のmasked runnerとtotalな計画構築が前提。

記号: `T/L/M`はProvider、`S`は同期例外、`A1/A2`は捕捉した中断、`C*`はCleanup一覧。

| 入力・失敗点 | 必ず試す後段 | report | 最終結果 | AとB/Cの差 |
|---|---|---|---|---|
| 全取得成功、useが42 | M,L,Tの解放→publish | 元例外なし、C(M)<>C(L)<>C(T) | 42 | 記録経路だけ異なる |
| useが`Left FeatureFailure` | 同上 | 元例外なし | その`Left` | 内側のEitherを展開しない |
| Traceの最初の取得がS | publish | 元S、rollbackがなければ空 | S再送出 | BはAcquisitionFailedで運ぶ |
| Logs取得がS | Logs内部rollback→T解放→publish | 元S、rollback<>C(T) | S再送出 | Aはjournal後throw、Bは戻り値 |
| Metrics取得がS | Metrics内部rollback→L,T解放→publish | 元S、rollback<>C(L)<>C(T) | S再送出 | 同上 |
| TraceのProcessor factoryがS | Exporter rollback→publish | 元SとExporter rollback | S。ただしrollback中断なら中断優先 | 二重解放しない |
| TraceのProvider factoryがS | Processor rollback→publish | 元SとProcessor rollback | 同上 | Exporterを別途解放しない |
| useがS、cleanupは成功 | M,L,T→publish | 元Sと全C | S再送出 | Contextを保持 |
| useがA1、cleanupでA2 | 残りcleanup→publish | 元A1、C中にA2 | A1 | 元の中断を優先 |
| useがS、cleanupでA1/A2 | 残りcleanup→publish | 元S、順序付きC | 最初のA1 | 優先順位は変えない |
| use正常、flushが同期例外 / SDK失敗値 | 同Providerのshutdownと外側Provider | 失敗を含む全C | 元の正常値 | B/Cは操作列runnerが後続継続を集中管理 |
| use正常、publishがS | 追加の同経路報告はしない | 作成済みreportの外部保存は不保証 | 元の正常値 | 現在と同じ |
| useがS、publishがA1 | 再帰報告しない | publish前reportに元S | A1 | 現在と同じ |
| workerの正常なcancel完了 | 必要な後続cleanup | worker終了結果として記録 | それだけで親を中断しない | Aには型上の区別なし。B/Cでは別constructor案 |
| cleanupが永久blocking | そのままでは後続へ進めない | 途中まで | 有限時間終了を保証しない | 全案共通。別の期限規則が必要 |

`SomeAsyncException`を複数受けたとき、全部を実行制御として再送出することはできない。1つを選び、残りはreportで保持するのが現在の方針。新しい抽象化はこの判断を勝手に変更しない。

## 14. 責務・import・Cabalの提案

最初のBでは現行の`opentelemetry-adapter` private library内に置く。新しい汎用resource packageを作ることは必須ではない。

| module案 | 所有するもの | 主な依存 |
|---|---|---|
| `Cleanup` | CleanupStep / Outcome、操作列実行、SDK結果の保持 | base、SDK結果型 |
| `Lifecycle` | Report、結果回収を行うscope runner、publish、純粋な例外選択 | base、Cleanup |
| `TraceProvider` | Trace固有factory、所有権移動、Traceの操作列 | base、SDK Trace / Exporter / Processor、Cleanup、共通の構築型 |
| `Construction` | 3ProviderのResourceSpecを組み合わせる公開構築入口 | Lifecycleと構築型。具体SDK構成を置くならProvider module |
| `LogsProvider` / `MetricsProvider`（実装時） | 各SDK固有の確保・終了順 | 各SDK API、共通構築型 |

`ResourceSpec` / `Acquisition`をConstructionに置いてProviderがConstructionへ依存し、Constructionが具体Providerへ依存すると循環する。型をLifecycleまたは小さな`Resource` moduleへ置き、ConstructionとProvider双方がそこを参照する。

これは名称だけの責務分離ではない。例えばTraceProviderは`spanExporterShutdown`を呼ぶためSDKへ依存する。Lifecycleはその具体APIを呼ばず、Cleanup結果を読んで選択する。

現在の`Cleanup`はSDKの`FlushResult / ShutdownResult / ExportResult`を参照するため、Lifecycleも間接的にSDK結果型へ依存する。同じlibrary内のmodule分割だけでSDK依存をCabalレベルで禁止したとは言えない。[Cabal][S9]

SDK非依存の純粋な実行核を別private libraryにする場合は、`Report cleanup a`のように結果型を引数化し、`base`のみへの依存にする選択肢がある。ただし3Providerのために先行して汎用libraryを増やす必然性はない。まずは既存Adapter内で十分。feature / telemetry-boundaryへSDK型を広げない方針は維持する。[ADR-0008][S14]

## 15. 採用時の検証計画

### 15.1 既存テストを維持する

`LifecycleSpec`の8例をBの入口にも適用し、正常値、業務上のLeft、部分取得失敗、release失敗、例外優先順位を維持する。単にテストを新実装と同じ関数分割に書き換えず、外部から見える順序と結果をassertする。

### 15.2 現在不足している重要な検証

1. TraceのExporter / Processor / Provider各factoryを個別に失敗させ、解放回数と現在ownerを確認する。
2. SDKが`ShutdownFailure / ShutdownTimeout / FlushError / FlushTimeout / Failure`を返したとき、そのconstructorを保持し、正常なuse結果を変えないこと。
3. 同じProviderのflushがthrowしてもshutdownを呼ぶこと。外側Providerだけの解放確認で済ませない。
4. MVar等で取得・利用・cleanupを所定位置に止め、別threadから`throwTo`する。`threadDelay`だけに頼る競合テストにしない。
5. useの元中断、cleanupの複数中断、publishの中断を組み合わせて、具体的な例外値とContext annotationを比較する。
6. callbackが1回だけ実行され、取得失敗時は0回であること。
7. B/Cでは内側Reportの返却と外側への連結の区間がmaskedであることを確認する。報告のprefixが消えないこと。
8. workerの`waitCatch`結果と親threadへの割込みを別経路で発生させ、worker終了だけで親キャンセルにしないこと。
9. 返した`a`を無断に強制評価しないこと。report生成によって業務値の評価時期を変えないこと。
10. 実SDKのTrace・Logs・Metricsを同じ本体へ注入する統合テスト。現在のTestSupportの独立fixtureだけでは代替にならない。

正常な終了のときはpublishを1回呼ぶことを確認するが、publishがthrowした場合に「必ず外部へ届く」とはassertしない。停止期限を設けるなら、その仕様を先に決めて専用に検証する。

### 15.3 C/Dだけに必要な追加検証

- C: scope合成の括弧付けで取得・解放順、失敗時の未取得資源、Cleanup記録順が変わらないこと。
- C: Exporter→Processorの成功後にExporter finalizerが独立して残らないこと。
- D: ownerの二重使用、ownerの未消費、scope外利用が期待する理由でcompile-failすること。型検査だけで非同期例外テストを省略しない。

実装時の標準確認入口は`make check-app`。このレビューでは実行していない。[ragscope-app README][S21]

## 16. 推奨と引継ぎ

**推奨はB。CはBの実行核の上に載せられる、より大きな設計案として残す。**

理由は、現在の課題が動的な資源個数や複雑な再利用ではなく、例外と記録が別経路を通ることだからである。Bなら「この確保は資源かrollback付き失敗を返す」「このscopeは利用結果とCleanup一覧を返す」「最後の1か所で例外を選ぶ」と局所的に説明できる。

三つの論点の結論は独立している。

| 論点 | 推奨 |
|---|---|
| 即時再送出 | 最外側は既に遅延方式。部分確保の内部も値返却へ揃えると見通しが良くなる。公開境界では中断・元例外を再送出する |
| 状態を介した結果収集 | 現在のIORefは合理的だが必須ではない。Bではmaskedな戻り値受渡しにより省ける |
| 資源管理方式 | 所有とscopeの保証は不可欠。`bracket`禁止が目的ではない。Bは結果を返す小さなscope実行核、Cはその合成を型へする |

もしBのmask / result handoffを十分なテストで裏付けられないなら、見かけの簡潔さだけで置き換えずAを維持する。これは現行への敬意ではなく、保証と読解性を同じ基準で比較した判断である。

次のAIが実装する場合は、最初に対象commit以後の差分と実際に解決されたSDK versionを確認し、Bの採用範囲をユーザーと確定する。その後、結果型・操作列runner・純粋な例外選択・Trace所有権移動の順に実装し、上記テストを通す。Logs / Metricsの具体化やアプリ起動統合を、存在しない現行実装の置換として扱わない。

このノート作成は実装採用の承認を意味しない。RAGScope側へのコード・設計文書反映は別の明示的な依頼で行う。

## 参照

参照先は、特記しない限りレビュー対象commitに固定している。Workbenchの既存ノートを現在仕様の根拠には使用していない。

[S1]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Construction.hs
[S2]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs
[S3]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Cleanup.hs
[S4]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/TraceProvider.hs
[S5]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%B8OpenTelemetry%20Observability%E6%9C%80%E5%B0%8F%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md
[S6]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/design/observability/Observability%E8%A8%AD%E8%A8%88.md
[S7]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/design/RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E5%A4%B1%E6%95%97%E8%A8%AD%E8%A8%88.md
[S8]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/adr/ADR-0010%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E5%A4%B1%E6%95%97%E3%82%92%E5%87%A6%E7%90%86%E5%8D%98%E4%BD%8D%E3%81%AE%E5%85%B7%E4%BD%93%E5%9E%8B%E3%81%A7%E6%89%B1%E3%81%86.md
[S9]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/ragscope.cabal
[S10]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryLifecycleSpec.hs
[S11]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryTraceProviderSpec.hs
[S12]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/app/Main.hs
[S13]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryTestSupport.hs
[S14]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/adr/ADR-0008%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E6%A9%9F%E8%83%BD%E5%AE%9F%E8%A3%85%E3%82%92private%20library%E3%81%B8%E5%88%86%E3%81%91%E3%80%81main%20library%E3%82%92Facade%E3%81%A8%E3%81%99%E3%82%8B.md
[S15]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/rules/Haskell%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84.md
[S16]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/design/observability/Metrics%E8%A8%AD%E8%A8%88.md
[S17]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/RAGScope%E8%A6%81%E6%B1%82%E5%AE%9A%E7%BE%A9.md
[S18]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/adr/ADR-0006%20OpenTelemetry%E3%82%92Observability%E3%81%AE%E5%85%B1%E9%80%9A%E5%9F%BA%E7%9B%A4%E3%81%A8%E3%81%97%E3%80%81Trace%E3%83%BBLogs%E3%83%BBMetrics%E3%81%AE%E8%B2%AC%E5%8B%99%E3%82%92%E5%88%86%E3%81%91%E3%82%8B.md
[S19]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/adr/ADR-0009%20RAGScope%E3%81%AELogs%20Severity%E3%82%92Debug%E3%83%BBInfo%E3%83%BBWarn%E3%83%BBError%E3%81%AB%E9%99%90%E5%AE%9A%E3%81%99%E3%82%8B.md
[S20]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Logs.hs
[S21]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/README.md
[E1]: https://hackage-content.haskell.org/package/base-4.21.0.0/docs/Control-Exception.html
[E2]: https://hackage-content.haskell.org/package/exceptions-0.10.11/docs/Control-Monad-Catch.html
[E3]: https://hackage.haskell.org/package/resourcet-1.3.0/docs/Control-Monad-Trans-Resource.html
[E4]: https://ghc.gitlab.haskell.org/ghc/doc/users_guide/exts/linear_types.html
[E5]: https://github.com/ghc/ghc/blob/ghc-9.12.4-release/libraries/ghc-internal/src/GHC/Internal/Control/Exception/Base.hs
[E6]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/SDK.hs
[E7]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Trace/Core.hs
[E8]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/Processor/Simple/Span.hs
[E9]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/MetricReader.hs
