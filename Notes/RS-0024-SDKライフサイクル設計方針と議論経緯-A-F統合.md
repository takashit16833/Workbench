---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-18
---

# RS-0024 SDKライフサイクル：議論経緯・A〜F統合方針・次の検証

> [!important] 最初に読むこと：このノートの地位
> 2026-09-18のユーザーとAIの議論を、次のAIへの引き継ぎ用に詳しく保存する**Workbenchの検討ノート**。RAGScopeの現在仕様・採用済み設計・正式な進捗・実装承認を意味しない。「今回の推奨方針」は会話で到達した**次のレビューにかける統合提案**であり、正本へ採用・反映されたという意味ではない。A〜Fの既存ノートは改変・上書きせず、各案の詳細な型・失敗経路・資料参照は原文も読むこと。ここにあるHaskell例は、明記のない限りAIの概念案であり、コンパイル・テスト済み実装ではない。
>
> 正本リポジトリ：`takashit16833/RAGScope`、実装対象branch：`RS-0024/sdk-lifecycle-metrics`。この議論で照合したcommitは`48e2fa04ca02474d0e7f68c02153a6437c2d53e9`。作業再開時は対象branchのHEAD、関連する実ファイル・テスト・SDK解決versionを必ず再確認する。Workbenchは正本の仕様根拠ではない。
>
> ノート作成先：`takashit16833/Workbench`の`feat/RS-0024-opentelemetry-observability-foundation`。このノートは実装・正本文書・Taskの変更を依頼するものではない。次の一手は**別AIによるA〜F＋本ノートの批評的レビュー**。その評価をユーザーと確認してから設計判断を進める。

## 0. 読む順番、出典、情報の区分

1. [[RS-0024-SDKライフサイクル批評と再設計案]]：正本確認、実装・SDK・既存テスト、A〜D案、失敗経路、当時のB推奨。省略せず読む。
2. [[RS-0024-SDKライフサイクル批評と再設計案-E案追補]]：EのOwnership / Scope / Runner / Exit、設計の楽しさ、懸念と別AIへの問い。
3. [[RS-0024-SDKライフサイクル再設計-F案]]：Eへの批評を受けた、型付きBuild / Chain / Plan、事前Cleanup計画、単一実行器、テスト案。
4. 本ノート：なぜ問題を再定義したか、提案と評価の変遷、現時点の統合推奨、確定と未決定の境界、次の実施手順。
5. 正本の対象commitまたは最新対象branchの実ファイル（末尾リンク）：このノートや他AIより優先。正確な型・API・振る舞いはコード・Contract・Schema・テスト等の機械可読な正本を優先する。

用語は以下を区別する。

- **正本確認済み（対象commit時点）**：RAGScope実ファイルから読み取れる現行実装・要求・制約。
- **既存の実装上の選択**：現在の振る舞い・例外優先順位など。上位要求と同一視しないが、互換性比較では黙って変えない。
- **検討済みのAI提案**：A〜Fと、このノートの統合案。採用済みではない。
- **今回の推奨**：ユーザーとの議論で次の批評へ渡す設計の方向。最終承認・実装成功を意味しない。
- **検証待ち・未決定・確認不能**：未コンパイル断片、実SDK契約の解決version、非同期競合など。推測で埋めない。

## 1. なぜ議論が始まったか：ユーザーが解きたい問題

ユーザーは現行のライフサイクルコードについて「詰まるところ、今のコードが複雑でついていけないのです笑」と述べた。`IORef`、`record` callback、例外の捕捉と再スロー、`bracket`によるunwind、Cleanup記録、最後の優先順位選択を複数moduleにまたがって追うのが負担だった。目標は例外や`IORef`の排除ではなく、**確保→利用→解放→結果集約→終了判断のデータ・制御の流れを、上から順に局所的に理解できること**。

初期の議論ではAIが`bracket`の是非へ固執し、ユーザーの提示した一仮説を本題と取り違えた。ユーザーは`bracket`禁止を求めていない。「非局所脱出が唯一の構造なのか」「FP/Haskellの型と合成でより線形に記述できないか」を独立に問うていた。この誤解を修正した後、`Acquisition`で取得失敗とrollback履歴を一緒に返す案に至った。`IORef`の使用は`bracket`が原因だ、とする因果関係にも根拠はない。A〜Dノートで確認された古い実装のCleanupJournalは`bracket`導入以前にも存在していた。現行`IORef`自体を危険なグローバル状態や実証済みraceと評してはならない。

ユーザーが疑問を呈した重要な点は、「`UserInterrupt`を捕捉したら、その場で再スローしなければならないのか。RAGScopeの後片付けが終わるまで値として連れ回してから再スローしてよいのではないか」。回答は**可能**。問題は非同期例外を一時的に`Left`へ入れることではなく、キャンセルを通常の回復可能な機能失敗へ変換してその後に新しい取得やユーザー処理を再開すること。最外側は現行実装でも既に例外を`Either`で保持し、Cleanupとreporting後に`chooseExit`で選ぶ。新提案では下位の部分確保・rollbackまでこの考えを適用できるか検討した。

ユーザーは「FPだから／Haskellだからそうしたいわけではないが、FPやHaskellは非局所脱出による読みにくさを克服する力があるのでは」と述べた。その後「どれを選ぶか、という四択ではない」「ドラスティックな変更を歓迎」「ワクワクする設計がモチベーションになる」と明言。型、モノイド、直積、継続、GADT、所有権、線形性の探究によって得られる**学習・楽しさ・個人開発の継続意欲を独立した設計価値として扱う**。ただし、正しさや読みやすさを免責する理由にせず、最小変更・実装量だけを優先するのも避ける。ユーザーは採用判断をAIに委ねず「判断は一緒にしましょう」と述べた。複数案を同じ事実と制約で評価し、反論に迎合せず、根拠が変わったときだけ結論を更新する。

## 2. 正本で確認した現在の動作・要求：設計比較の基準

対象commitの`Construction.hs`の`ProviderOperations trace logs metrics`は、Trace / Logs / Metricsの各取得・解放へ `(CleanupOutcome -> IO ())` を渡す。`withProviders`はTrace→Logs→Metricsをnested `bracket`で取得、use後または途中失敗時にMetrics→Logs→Traceの順で取得済みProviderだけを解放する。`releaseSafely`は各release全体の予想外例外を捕捉し、`<signal>.release`の`CleanupOutcome`として記録して外側の解放へ進む。release内の各SDK操作を個別に捕捉して次の操作へ進む契約は、当該release実装側が担う。[Construction]

`TraceProvider.hs`の`TraceProviderConfig`は`traceExporterFactory :: IO SpanExporter`、`traceProcessorFactory :: SpanExporter -> IO SpanProcessor`、`traceProviderFactory :: SpanProcessor -> IO TracerProvider`。Exporter→Processor→Providerへ所有者と解放責任が移る。Processor作成失敗ならExporterをshutdownし、Provider作成失敗ならProcessorをshutdownする。移転後の旧ownerを別途shutdownしない。失敗時は`attemptCleanup record ...`でrollback結果を保存してから`rethrowIO originalException`する。Factory内部で未返却の資源を作って失敗した場合は、Factory自身が片付けるという契約。成功Providerのreleaseは`forceFlushTracerProvider provider Nothing`と`shutdownTracerProvider provider Nothing`を個別に試す。[TraceProvider]

`Cleanup.hs`はSDKの`FlushResult / ShutdownResult / ExportResult`を`CleanupResult`に包み、`CleanupOutcome { cleanupOutcomeName :: String, cleanupOutcomeResult :: Either (ExceptionWithContext SomeException) CleanupResult }`を保持する。`captureCleanup`は1操作を捕捉し、`attemptCleanup`はcallbackに即時記録して結果を返す。`runCleanupSteps`は操作列の全結果を一覧として返すが、当該実装では移行途中のインターフェースとして併存。[Cleanup]

`Lifecycle.hs`の`runLifecycle`はinvocation内`IORef [CleanupOutcome]`へ逆順に記録・最後にreverseし、`tryWithContext @SomeException`でacquireAndUseの結果を保持してreportを作り、publishを捕捉し、`chooseExit`で選んだ結果へ最後に`either rethrowIO pure`を適用する。reportには元の例外とCleanup結果が入る。reporting自体の失敗は、reportを発行する処理の結果なので同じreportには入らず、reportが外部へ届く保証もない。[Lifecycle]

現行の選択順位（既存の実装上の選択）は、(1)元の非同期例外、(2)実行順で最初のCleanup非同期例外、(3)reportingの非同期例外、(4)元の同期例外または正常値。同期Cleanup・同期reporter例外やSDK失敗値は正常な利用結果を失敗へ変えない。元の同期例外が後続の中断に優先順位で負けてもreportには残る。callback自身が`Left FeatureFailure`を返した場合は普通の`a`の値であり、ライフサイクルが展開してはいけない。`SomeAsyncException`で判定しており、例外の発生thread自体を識別する実装ではない。[Lifecycle]

`RS-0024`の要求は、SDKを起動時に初期化し終了時flush/shutdown、Processor/Exporter差替え、SDK型をUseCaseへ漏らさずAdapterで接続、SDKによるContext/batching等の再実装禁止、Telemetry記録/export失敗だけで成功した機能処理を失敗へ変えないこと。特定Monad・自由Applicative・線形型を要求していない。ADR-0010は機能ごとの具体的失敗型を保ち、キャンセル・予期しない例外を機能失敗型へ一律変換しない。Lifecycle内部の例外運搬用`Either Captured a`を共通アプリ失敗型へ拡張しない。[Ticket][ADR][Observability]

実装進捗の境界：`Construction`は三資源の型多相な骨格で、実SDKの3Providerを本番起動に結び付けた完成形ではない。TraceProviderの具体的処理はあるが`OpenTelemetryTraceProviderSpec`は`pendingWith`、LifecycleSpecは主として`()`のmockを使った8件。Logs/Metricsの具体的Provider構築は対象commitでまだ完成していない。`Main.hs`にも本番ライフサイクルは未接続。未実装を設計欠陥や検証済み保証と混同しない。[A-D][LifecycleSpec][TraceProviderSpec]

SDKについて：Cabalの`hs-opentelemetry-api`と`sdk`は`^>=1.0.0.0`であり、実際に解決された厳密versionは確認不能。A〜D/Fが調査したupstream 1.0.0.0ではSDK統合helperへの単純置換で部分rollback・診断保持・中断伝播を全部満たせない。SDKの`shutdownTracerProvider`などはworker結果を失敗値へ集約することがあり、SDK内部で失われた詳細はRAGScope側の型では復元不能。Simple Span Processorの`spanProcessorShutdown`は`wait exportWorker`の後にExporter shutdownを行うため、workerが例外終了した場合には後段へ進めない可能性がある。`Nothing` timeout、全体の終了期限、直接rollback APIの期限は同じものではない。worker例外と親スレッドの中断の区別はSDK境界と実versionを確認して判断する。[A-D][F]

## 3. 議論と提案の変遷：何が新たに分かったため判断が進んだか

### 3.1 非局所脱出の検討 → Bの種

`bracket`を機械的に悪者にするのをやめ、現行最外側が例外を値として保持している事実へ立ち戻った。`data Acquisition a = Acquired a | AcquisitionFailed CapturedException [CleanupOutcome]`という案を提示。TraceのProcessor factory失敗ならExporterのrollback結果を得て`AcquisitionFailed original [rollback]`として返し、上位がCleanup履歴を連結し最後に再スローする。これにより「rollback→record→rethrow→bracket unwind→外側で再捕捉」という複数経路を、元の例外と履歴の明示的な戻り値へ寄せられる。`WriterT`等を使うだけではIO例外で履歴が消え得るので、型と例外捕捉区間を実証する必要がある。「線形に読めること」と`LinearTypes`で線形に値を使うことも別の要求。

### 3.2 最初の別AIレビュー → A〜D

ユーザーは別AIへゼロから現行正本を確認させる批評プロンプトを依頼。「A〜Dのいずれかを予め決めない」「コードを先入観として提供しすぎない」「現行の維持も可」とした。別AIは対象commitとSDK・テストを調べ、読みにくさの原因を戻り値、例外、記録callbackの複数経路と特定。A：nested bracketとjournal維持、Cleanup操作列や記録規則を整理。B：`Acquisition`と`Report`、`within`による戻り値の合成。C：Bの安全な核に継続型`Scoped a`を重ね`Functor / Applicative / Monad`でscopeを合成。D：線形な所有tokenをSDKと通常IOの境界へ導入する研究案。別AI当時の推奨はB。ただしA〜Dは排他的な同一軸の選択肢ではない。[A-D]

Bの核心は`Report a { originalExit :: Either Captured a, cleanupOutcomes :: [CleanupOutcome] }`という直積。`Either Captured (a, history)`は失敗側に履歴がない。`AcquisitionFailed`は失敗時に資源を保持してはいけず、現在ownerのrollback試行と記録を終えて返す。`within :: ResourceSpec r -> (r -> IO (Report a)) -> IO (Report a)`は1資源の取得、内側利用、自己Cleanup、履歴連結を担当する。ただし、旧acquireがrollback記録後にthrowするAPIを混ぜると、`within`の生例外捕捉分岐が空履歴を返して記録を失う。Bへの移行はacquireの契約を含む一体変更。`cleanupResource :: r -> [CleanupStep]`自体が有限・全域という前提も必要。maskされた結果のhandoff、Factory内部の部分取得、報告の例外処理の安全性は未証明。[A-D]

Cの`Scoped`は`forall r. (a -> IO (Report r)) -> IO (Report r)`という継続型で後続の計算をresource scopeへ包み込む。`Providers <$> traceScope <*> logsScope <*> metricsScope`のような構成が可能。これは順次取得・逆順解放を表すが、型だけでは継続を1回だけ呼ぶこと、SDK値のscope外持ち出し、非同期例外安全性を保証しない。Dも`%1`を数か所に付けただけでは例外・worker・SDK別名を扱えない。数学的に魅力があっても、できる保証を具体的に分ける。[A-D]

### 3.3 A〜Dへの最初の評価

AIはBを有力と評価したが、即採用とはしなかった。懸念は(1)旧callback契約との混在によるrollback履歴喪失、(2)Cleanup計画構築自体の例外、(3)現行`releaseSafely`が扱うrelease全体の予想外例外、(4)maskと実際の`throwTo`テストが不十分、(5)worker由来例外の誤分類の可能性。これは「Bは危険で却下」ではなく、「Bの核を実装する条件がまだ必要」という判断。TraceProviderSpecがpendingであり、ノート内コードは未コンパイル。[A-D][F]

### 3.4 ユーザーの再方向付け → E

ユーザーは案の四択ではないと明言し、抜本改修とHaskellの数学的抽象化の探究を歓迎。AIはE「型付きライフサイクル・プログラム」を提案：**Ownership（Exporter→Processor→Providerの責任移転）、Scope（Trace/Logs/Metricsという独立資源の利用範囲）、Runner（例外・結果・Cleanup履歴の実行集約）、Exit（reportingと純粋な選択）**という別概念に分離する。Bの値返却＋CのScope合成を基盤にし、Dの線形性はOwnershipの内部に限定して検証する発想。4概念が4module/4packageを意味するわけではない。[E]

Ownership用`Owned stage resource` / `advanceOwner`は概念例であり、phantom stageだけでは値の複製や解放義務を禁止しない。EはCleanupの操作列をRunnerで個別捕捉し、必要なら`CleanupOp result`のGADTでFlushとShutdownの結果型を区別する案も含む。RunResultの元Exitと履歴の直積、Cleanup履歴の順序付き・非可換モノイド、最後の純粋`chooseExit`はBと共有。Exitだけを公開関数へ分離してmaskを切ってはならないという懸念、release全体・計画構築の例外、worker中断の由来、依存循環、読みやすさをEノートへ明記。Eは当時まだ「完成した実行核」ではなく、設計上の責務仮説。[E]

### 3.5 別AIによるEの批評 → F

別AIはEのOwnershipとScopeの区別、直積、保証限界の自覚、ワクワクする設計の価値を肯定した一方、「EだけでB推奨を撤回する根拠はない」とした。具体的には(1)Ownedという名前で何を禁止できるかAPIで厳密化すること、(2)概念の4分割とmaskされた一つの実行区間を混同しないこと、(3)Cleanup計画の構築自体の失敗を解決すること、(4)即時再送出・状態収集・資源管理を別々に判断することを指摘。その具体化としてF「型付きの構築計画と単一の実行器」を作成。Fはユーザーのレビューとして届いたもので、すでにWorkbenchへ保存済みだが、採用済み正本ではない。[F]

Fは`Seed a`、`Transfer a b`、`Chain a b`のGADT、`Build b`によって、資源型の合う所有権移転の列を事前に表現する。`OwnerPlans r`はrollbackPlanとclosePlanを区別する。成功時に実行器内部の現ownerを置換し、旧ownerのfinalizerを独立登録しない。失敗時には現在ownerのrollbackを試し、元の例外と履歴を返す。現在のTraceはExporter・Processor・Providerが別型なので、段階名だけのphantom型を足さずとも接続型を制約可能。ただし`Transfer a b`の型だけでSDK側の所有契約は証明できない。[F]

Fは外側Providerのscopeを`data Plan a = PurePlan a | ApPlan (Plan (a -> b)) (Plan a) | Resource (Build a)`という自由Applicative風の構文木で構成し、実行前の走査、構成の説明、失敗時の解放対象の解析という別解釈を可能にする。初期版ではMonadを提供しないため、前段Providerの値で後段の資源計画を作る依存には対応しない。現行の`withProviders`は前段Provider値を後段のacquireへ渡していないので、現時点の固定骨格には対応し得る。一方、構文木に含まれる任意IO/factoryの内部までは事前解析できない。Planを2回実行すれば取得も2回であり、値共有やキャッシュではない。[F]

Fのもう一つの重要な具体化は、取得後に`cleanupResource r`で操作列を生成しないこと。取得前に`CleanupPlan r`の操作列の形、StepId、タグ、関数の外側を`prepare`で準備する。`CleanupAction`は`StepId`と`CleanupOp result`と`r -> IO result`を保持し、資源への関数適用とSDK操作はそれぞれ捕捉範囲へ入れる。FlushタグとShutdown結果型の誤接続は型で拒否できる。計画準備が失敗・発散してもその時点ではSDK資源を取得しない設計。ただし任意の関数の停止・全域性をHaskellの型で保証したわけではない。SDK結果は捕捉内でWHNFまで評価する案、利用者の返す`a`は勝手に強制しない。[F]

Fは公開入口`withSdk`がprepareから確保・利用・Cleanup・reporting・最終選択まで一つのmask境界を所有する。`drain :: Either CapturedException a -> Seq SomeCleanupOutcome -> [PendingCleanup] -> IO (RunResult a)`のように元Exitと履歴を別引数で保持し、Cleanup失敗のたびに`RunResult (Left cleanupError) []`へ作り直さない。`PendingCleanup`は資源と準備済み操作を包む実行器内部の存在型。SDK内部の停止・プロセス終了・runner自身のあらゆるbottomまで保証するとは主張していない。[F]

### 3.6 A〜F比較から、最新の統合推奨へ

その後、ユーザーが「A〜Fを分析し、ここから設計方針を固めよう」と依頼。AIの前回回答は「BかFかという一案選択ではなく、独立の論点ごとに統合する」と提案した。**Bの戻り値設計＋Eの概念分離＋Fの型付きOwnershipと事前Cleanup計画＋一つの安全な実行入口**が現在の推奨。CのScope合成・Fの静的Planは比較対象、Dの線形型はOwnershipの実験対象とする。B単独推奨から前進した理由は、FによりCleanupの計画構築時失敗とOwnershipを、具体的な型・操作・実行境界として記述する手段が示されたこと。ユーザーの反論へ無条件に追随した結果ではない。Fの全部を採用した、またはBを放棄したという意味ではない。次の別AIレビューを経て一緒に判断する。[F][E]

## 4. 現時点の統合推奨：Typed Lifecycle（正式採用前）

> [!summary] 現在の統合提案
> **結果モデルはB、概念境界はE、Owner遷移とCleanup事前準備はFを中核にする。公開入口一つがmask・reporting・最終選択まで統括する。Provider間ScopeとProvider内部Ownershipを混ぜない。Fの外側自由Applicative構文木とDの線形型は、まず具体的な効用を検証して採否を決める。** 正本上の現在設計を変更したとは主張しない。

### 4.1 結果と履歴：Bの直積を採る方向

```haskell
-- 構造の説明例。正式な型・名前は未決定。
data RunResult a = RunResult
  { originalExit    :: Either CapturedException a
  , cleanupOutcomes :: [CleanupOutcome]
  }
```

資源取得失敗も`AcquisitionFailed originalException rollbackOutcomes`に相当する構造で、元例外とrollback履歴を同時保持する。`Either CapturedException (a, [CleanupOutcome])`では例外側に履歴が残らない。利用者の業務結果が`Either FeatureFailure a`なら`RunResult (Either FeatureFailure a)`の通常値部分として保持し、外側の例外と混ぜない。途中では例外も値として運搬するが、公開入口から普通のキャンセル結果として返さず、Cleanup・報告後に必要な例外を再送出。下位の「recordしてrethrow、上位で再捕捉」を同一の結果経路へ寄せる。ただし、部分確保の旧APIを残したまま新Runnerだけへ移行すると記録を失うため、一括変更の単位を定める。`IORef`を消すだけが目標ではない。

### 4.2 所有権：Fの型付き移転列を基礎として検証

`Seed a`から`Transfer a b`を`Chain a b`で合成する。例えばSpanExporterからSpanProcessorへ、それからTracerProviderへ接続する。`Done`は同一型の空遷移で、`appendChain :: Chain a b -> Chain b c -> Chain a c`は型の合う経路だけを合成する。結合律が意味するのは型付き列の括弧付けの変更であり、SDK操作の交換可能性や二重解放の静的証明ではない。[F]

実行器が常に現在ownerと対応する解放義務を一組だけ保持する設計を目指す。Transfer成功で旧ownerの独立finalizerを破棄し新ownerの義務へ置換。失敗なら現在ownerをrollbackし、元の例外と履歴を保存。完成Providerのみ外側scopeへ渡す。通常利用側へ`Owned`や`advanceOwner`を公開しない。Traceは段階ごとに実型が違うので不要なphantom stageを先行追加しない。同一型に複数の意味的段階があると判明した時にnewtype・型索引を検討する。factoryが入力ownerを失敗前に自分でshutdownするようなAPIはこのTransfer契約に黙って混ぜない。

この方向を選ぶのはFの新しい型付き計画が具体化したからであり、現段階でChainを実装・型検査して所有保証を実証したという意味ではない。元ownerの二重shutdown・未解放・SDK内部の別名は別の保証である。

### 4.3 Cleanup：Fの「形を取得前に、実行を個別捕捉」

`CleanupPlan r`を資源取得前に作り、例えばTracerProvider用の操作列として`trace.flush`と`trace.shutdown`を定義する。`CleanupOp result` GADTの`FlushOp :: CleanupOp FlushResult`、`ShutdownOp :: CleanupOp ShutdownResult`で、操作の種類と戻り値型を対応付ける。`CleanupAction r`に`r -> IO result`を保持し、操作列を生成する関数`r -> [CleanupStep]`を取得後に呼ぶ設計の全域性条件を、事前準備＋個別捕捉へ置き換える。StepIdの意味や、SDK操作が実際に意図どおりの資源を解放することまでは型で証明しない。[F]

`prepare`は資源ゼロの時点で外側構造・操作列・ID・タグ・関数の外側を評価する。無限計画の停止性、任意関数の全域性まで型保証しない。資源へのaction適用、SDK呼出し、SDK結果のWHNF評価を個別の捕捉内に入れる。flushがthrowしてもshutdownを別操作として試す。取得中rollbackと完成後closeは別計画で、旧owner・新owner双方のfinalizerを同時に登録しない。Cleanup履歴は実行順の非可換リストモノイドとして連結し、全履歴を残した上で最終例外だけを選択する。

現行`releaseSafely`の「解放関数全体の予期しないthrow」に相当する異常は、新しいprepare/runnerのどこで記録するか具体設計が必要。計画の構築・組立て・runner内の純粋例外も捕捉範囲、失敗した操作のID、既存の履歴がどこまで保持されるかを決める。「任意のbottomやOOMでも履歴を必ず保存できる」と誇張しない。

### 4.4 Scope：Ownershipとは別の合成規則

Trace・Logs・Metricsは完成した別々のProvider。Trace→Logs→Metricsの順に確保し、利用後・途中取得失敗時は既に確保したProviderを逆順に解放する。Exporter→Processor→Providerのように旧ownerの義務を置換する操作とは異なる。[Construction][TraceProvider]

C/Eの`Scoped`（継続によるScopeの合成）と、Fの`Plan`（自由Applicative風の静的構文木）は、**Provider間の合成をどう表現するか**の異なる方法。初期構成では`Providers <$> traceScope <*> logsScope <*> metricsScope`または`Providers <$> resource (traceBuild ...) <*> ...`に相当する形が候補。いずれも逐次取得・逆順解放を表し、並列処理や暗黙キャッシュを意味しない。現行は3Provider固定、後段のacquireへ前段の値を渡しておらず、自由Monadの必要性は現行要求から導けない。Cの`Scoped`の継続を一度だけ使う規律、Fの計画の静的走査と組立て評価、どちらも実行核の安全性を型だけで自動証明しない。

**統合推奨はScopeとOwnershipの分離まで。CかFの外側表現を最終確定するには、§6の実験で価値と安全性を確認する。** 「すでにFの自由Applicativeを採用した」と記述しない。

### 4.5 単一の公開入口とmask所有

概念上のOwnership / Scope / Runner / Exitを別moduleにできるが、`Runnerが戻る → unmasked区間 → 別公開Exitが報告する`という形へ実装してはいけない。例外や履歴が帰還する短い隙間で非同期中断が到達し、結果を失う可能性がある。`withSdk :: Plan Providers -> (LifecycleReport -> IO ()) -> (Providers -> IO a) -> IO a`はFの説明用APIで、実際の公開型は検討対象。[F]

一つの公開関数が`mask`を開始からreporting/選択まで管理する。prepareは資源取得前に実行し失敗を捕捉。取得、owner置換、解放義務登録、scopeからの結果handoff、履歴連結はmasked区間。全資源確保後にユーザー処理を`restore`＋`tryWithContext`で実行し、終了・中断を`Either`に保持。Cleanupは個別捕捉で可能な後続操作へ進み、reportを1回試し、選択後に通常値か例外を返す。取得時の例外を捕捉した後に新しい資源を取得・通常利用しない。factory/SDKのblocking操作はmaskedでも割り込まれ得る。全Shutdownを`uninterruptibleMask`で包まず、待機が止まるケースの有限終了を勝手に保証しない。未受領の割り込みを過去のreportに記録したと主張しない。

### 4.6 Exit：選択を純粋に、reportingを実行入口内に

`chooseExit`の現在の優先順位を比較基準とし、同期Cleanup・SDK失敗値・reporter同期例外で正常な機能結果を変更しない。元の中断→Cleanupで最初の中断→reporter中断→元の同期例外または正常値。元の同期例外が後からの中断に負けてもdiagnostic reportへ残す。reporter自身の例外を同じTelemetry経路へ再帰報告しない。`a`はlazyな返却値であり、業務値を勝手にWHNF/NFへ強制評価して評価時機や意味を変えない。`chooseExit`は純粋関数にし、RunnerがpublishのI/O・捕捉を担当し、最後に`rethrowIO`などを適用する。[Lifecycle][ADR]

### 4.7 module、依存、公開APIの境界

最初は既存`opentelemetry-adapter` private library内部にまとめ、新しいUseCase共通Monad、SDK互換Runtimeや空の汎用packageは導入しない。Eの4概念=4ファイルという決め方はしない。Fのmodule案は`Plan`（Seed/Transfer/Chain/Build/prepare）、`Cleanup`（計画・操作・Outcome）、`Runner`（withSdk、所有とdrain）、`Exit`（純粋な選択）、`TraceProvider`（SDK固有factory・cleanup plan）、`Construction`（Provider構成入口）。実際の関数・型・import・Cabal `build-depends`を照合して責務を決定する。`Plan`が`TraceProvider`をimportし、同時に`TraceProvider`が`Plan`をimportする循環は作らない。SDK固有結果型をCleanupに残したまま、同一private library内module分割だけでCabalレベルのSDK依存遮断ができたとは言わない。SDK型をUseCase/telemetry-boundaryへ漏らさない。[Cabal][ADR][F]

## 5. この段階で固めたこと／固めていないこと（必ず区別）

| 論点 | 状態 | 次へ渡す正確な意味 |
|---|---|---|
| 目標 | ユーザー要求 | 上から追える制御と結果、正しさ・保守性、型と合成の探究の楽しさを同時に重視する。最小変更が最優先ではない |
| 元の結果と履歴の直積 | 今回の推奨 | Bのモデルを基礎に具体化する。正式な型名・実装は未採用 |
| 内側の即時再スロー | 今回の推奨 | 結果記録のためのrethrow→再捕捉は値返却へ寄せる。公開境界での必要例外再送出は維持する |
| `IORef` | 単独では不採用理由なし | 現行局所journalは合理的。排除そのものを目的にせず、戻り値の理解しやすさを評価する |
| OwnershipとScopeの分離 | 今回の推奨 | 移転と独立scopeを同一finalizer積み上げで扱わない |
| `Chain` / `Build` | 今回の推奨・検証待ち | Fの型付き構築計画を具体化の基礎に。接続の型保証≠線形消費・SDK解放保証 |
| 事前Cleanup計画 | 今回の推奨・検証待ち | 操作列の形を取得前に準備し、実行時に各actionを捕捉。有限性・bottomには限界 |
| 単一実行入口 | 今回の推奨 | 一つのmask所有下で取得からreporting/Exitまで運ぶ。個別I/Oの割込みをゼロにする意味ではない |
| Cの`Scoped` vs Fの外側`Plan` | 未決定 | 静的走査/複数解釈の実益と核の理解容易性、必要な合成を同じ基準で実験する |
| Fの自由Applicative・PreparedPlan/Env/Acquisitions | 未決定 | 型付き異種リストによる正規化も自動採用しない。まず必要な解釈と導入負担を評価 |
| Dの`LinearTypes`、phantom stage | 未決定・研究 | 本当に排除する誤使用とSDK/IOとの橋渡しを示す。楽しさも価値だが形式上の保証を誇張しない |
| SDK worker例外の発生元 | 確認・設計検証待ち | worker結果と親thread中断を識別可能なSDK境界で分ける。外側SomeExceptionから由来を捏造しない |
| SDK exact version・実行結果 | 確認不能 | Cabal制約はあるが実解決version、提案コードのコンパイル・実行は未確認 |
| 全体終了期限・report外部保存 | 正本で未決定／保証なし | 今回の型だけで終了期限や診断の永続化を勝手に仕様化しない |
| 正本反映・採用 | 未実施 | 本ノート保存は設計承認ではない。次のレビュー後、ユーザーと判断し明示依頼で正本へ反映する |

特に前回B推奨との関係を誤読しないこと。Bを「却下」したのではなく、Bの基本的結果モデルを維持して、FによってOwnerとCleanupを安全に具体化する方向へ**推奨内容が拡張**された。Fを単に見たからではなく、B/Eの未具体化問題へFが具体的な手段を示したことが判断変化の根拠。一方、Fの外側構文木の利益はまだ立証されていないので同じ理由で採用へ進めない。

## 6. ここからやること：レビュー→検証→採否→実装の実行計画

この節は**未来の作業計画**であって実施済み進捗でも、新たなTask作成の依頼でもない。ユーザーが次に行うと明示した作業は、まず別AIにA〜Fと本ノートを確認させること。コード・正本文書・Task・PRをこのノートに従い無断変更しない。後続の実装・実験・反映はユーザーが実行を依頼した段階で、対象branchとRAGScope操作ルールに従う。

### Phase 0：次の別AIによる批評的レビュー【次の一手】

1. このノート、A〜Dノート、E追補、Fノートを読む。各ノートが同じ時点の採用済み正本ではなく、時系列で進化したAI案であることを理解する。
2. 正本RAGScopeの対象branch HEADを再取得し、前回比較commitとの差分を確認する。Ticket、設計、ADR、Construction / TraceProvider / Lifecycle / Cleanup / Cabal / テストを実ファイルで再確認する。Workbenchの説明だけで正本の現行状態を断定しない。
3. ユーザー要求、現行の振る舞い、今回の推奨、未決定を分離。重要な型・モジュール・呼出し順・mask範囲・所有責任を具体的に特定する。
4. A〜Fの勝者選びをやめ、論点別の統合案を独立に批評する。Bの直積・値運搬、FのChain、事前Cleanup、単一runner、C/EとFのScope合成、線形性を必要に応じて再結合・切り離す。EやFを擁護するための理由を後付けしない。別の構造が有効なら提案する。
5. 「既存保証を維持できるか」と「上から読んで理解しやすいか」と「型・数学的構造から得られる検証/学習/楽しさ」をそれぞれ根拠付きで評価する。実装量だけでF/C/Dを退けず、ワクワクすることだけで安全性を免除しない。
6. 具体的に何を推奨するか、従来結論から変わるなら新事実・前提誤り・評価基準の変更と影響した根拠を記載。未証明の保証は未証明と表明し、実験で解消する論点を絞る。AIはユーザーへ採否決定を押し付けない。
7. レビュー結果をユーザーと議論して進める。レビューだけではGitHub変更を行わない。

### Phase 1：安全性・契約の詳細化（レビュー後に必要な場合）

1. 正本のSDK package exact解決version、SDKの`createTracerProvider`・`shutdownTracerProvider`・`forceFlushTracerProvider`、SpanProcessor/Exporterの所有・shutdown委譲・worker例外・timeoutの挙動を確認。SDK helperが元結果・後段cleanup・例外を何まで保存するか調べる。upstream 1.0.0.0の調査を解決versionと同一視しない。
2. Factory契約を段階ごとに表にする：入力ownerをいつ引き継ぐか、factory自体が失敗前に何を解放するか、内部部分資源の責任は誰か、成功後に旧ownerの独立finalizerを残してよいか。二重解放と未解放を別々に判定。
3. Runtimeが追う状態（現在Buildのowner・残存する外側Provider・pending cleanup・元Exit・順序付き履歴）と、各段階の型・遷移・例外捕捉点を列挙。最外側`mask`と限定的`restore`の範囲を図示し、maskedなhandoffが必要な場所を示す。
4. 異常分類を区別：SDKが失敗値を返す、同期例外、親threadへの中断、workerの失敗結果、SDKがworker例外を再送出・集約した値。見分けられないものを型だけで分類したことにしない。
5. release関数全体の例外、計画準備のbottom/発散、組立て関数の純粋例外、Cleanup action適用時の例外、SDK結果の遅延例外をどう扱うかをそれぞれ定義。報告callbackの失敗は再帰報告しない。業務戻り値の評価時期を変えない。
6. Cleanupの各操作の試行、成功、実際の資源解放完了、有限時間終了を別の保証として定義。共通timeout budgetが正本で未決定なら勝手に追加しない。

### Phase 2：最小の比較可能な実験（実装依頼を別途受けてから）

対象をまずTraceのExporter→Processor→Providerに限定し、SDK非接続のmodelとIO版のprototypeを作る。Bの小さな`within`核と、FのChain＋事前Cleanup＋runnerを**同一のテスト・失敗注入条件**で比較する。CのScopedとFの静的PlanもProvider scopeの構成として比較できる最小例を作る。実SDK統合テストとは別のテスト群とする。必要ない抽象化を機械的に増やさない。

- **型の負例**：ExporterからProcessorを飛ばしてProvider factoryへ誤接続した`Chain`がコンパイル失敗。`FlushOp`へ`IO ShutdownResult`を登録するコードがコンパイル失敗。失敗理由も検証する。Plan再使用は「再取得」であり型検査エラーとは主張しない。
- **取得段階**：Exporter/Processor/Provider各factoryがそれぞれ失敗する。現在ownerのrollback試行回数は1回、移転済み旧ownerの別shutdownは0回、元例外・Context・rollback履歴が保持される。最初のFactory内部の部分取得はFactory契約どおりに処理される。
- **Provider間**：Trace成功後のLogs取得失敗、Metrics取得失敗で、内側rollback→外側Providerの逆順解放。useは未取得時に一度も実行されない。全取得成功時はuseがちょうど1回。
- **Cleanupの個別継続**：flushのSDK失敗値／同期throw／非同期throwの各場合でも、既知のshutdownを個別に試す。ShutdownFailure/ShutdownTimeout/FlushError/FlushTimeout/ExportFailure等、実SDKの正確なconstructorを確認して保持。release全体の異常も記録し、外側解放へ進む。
- **元結果の保護**：利用正常値42、業務上の通常`Left`、use同期例外、use非同期例外の全パターン。同期Cleanup・reporter例外で成功値を変更しない。優先順位で後続中断が勝っても元の同期例外をreportに保持。
- **履歴のprefix**：部分取得rollback、内側scopeから外側へhandoff、Cleanup action適用・SDK結果評価で例外が出ても、既に収集した履歴を消して空一覧に再生成しない。順序を比較。
- **prepareと構築**：不正な事前計画がSDK取得前に失敗し取得回数0。組立て関数がthrowしても取得済みProviderを解放。無限計画の停止性を保証したとは言わない。
- **本当の非同期競合**：`MVar`等で取得、owner置換、利用、Cleanup、reportingの各位置を制御して他threadから`throwTo`。`throwIO UserInterrupt`のみのテストを代用しない。元中断A1、Cleanup中断A2、reporter中断A3の組合せで選択とExceptionContext、全操作の試行順を確認。
- **worker由来の例外**：`waitCatch`等でworker結果を得られる境界と親threadへの配送を別々に発生させる。workerが`SomeAsyncException`で終わった事実だけで親をキャンセルしない。SDKが既に結果型へ変換している場合はその値を保持。
- **遅延評価**：SDK結果の外側WHNFを捕捉範囲内で評価する案を検証。`a`を勝手に強制評価しない。
- **法則・抽象化**：`Chain`の結合の括弧付けで観測される取得順、ownership、rollback、履歴順が変わらない。Scoped/Applicativeも正常・取得失敗・cleanup失敗・中断について同じ観測を比較。任意IO・任意継続を解禁した観測同値を無条件に主張しない。
- **実SDK統合**：モック通過後、実際のTrace/Logs/Metricsを同一入口へ注入する。TraceProviderSpecは対象commit時点でpendingであり、既存の別fixtureが新runnerの検証を代替するとはしない。

実行環境でGHC/Cabalを用意できるなら、コンパイル、`make check-app`など正本で定めた検査、差分確認を実施し、失敗/未実施を区別して記録する。現時点でこれらを実行済みとは書かない。

### Phase 3：抽象化の採否ゲートを別々に設ける

**ゲートA：結果返却核**。rollback・use・Cleanup・reportが元結果と順序付き診断を失わず運搬でき、現行の返り方と優先順位を保ち、実装を通読したとき複数経路の追跡が減るか。成立しなければ現行改善Aを再評価。

**ゲートB：型付きOwnership**。Chainが誤接続を実際に拒否し、runner内のowner置換が正しく、テストで二重shutdown/未解放を検出できるか。現行3段階の手書きcaseを置き換えることが本当に読みやすいか。型の学習効果と実行器の複雑さも比較。

**ゲートC：事前Cleanup計画**。計画生成失敗の境界と操作継続が具体的に改善し、Flush/Shutdown型対応や履歴保存を検証可能にできたか。Fの計画だけが有効ならBの小核へこの部分だけ取り込める。

**ゲートD：Provider Scope表現**。Cの継続型で十分か、Fの自由Applicative風Planを構文木として持つ実益があるか。同一Planに対して「実SDK実行」「構成/所有/解放順の表示」「失敗点と解放対象の解析」など少なくとも具体的な別解釈を作り、その出力が設計理解・モデル検証に使えるか確認。事前解析はfactory内部のIOまでは見えない。PreparedPlan/型付きEnv/Acquisitionsが過剰なら再帰解釈も同条件で比較。複数解釈の利益が得られなければDSLを義務化しない。

**ゲートE：線形型・所有保証**。`Owned stage`/秘匿constructor/内部token/`LinearTypes %1`の各手段で、型が禁止する誤用と禁止しない未解放・例外・SDK別名・scope外持ち出しを区別。`%1`の有無でコンパイルする正例・意図的に失敗する負例を比較。通常のSDK APIと`IO`への橋渡しやコードの読解量、学習上の面白さも評価。具体的に強くなる保証がなければ先行必須化しない。

各ゲートは一つの結果で全案を連動採用/却下しない。例えば静的Planを採用しなくてもBの直積とFの事前Cleanup計画は成立し得る。逆に設計に面白さがあっても現在の振る舞いを壊す場合は、その変更を別の仕様判断としてユーザーへ提示する。

### Phase 4：ユーザーと採否を合意し、正本へ反映（別途明示依頼）

1. レビューと検証結果から、論点ごとに最終API、constructor公開範囲、module責務、import、Cabal依存、mask/restore区間、SDK契約、例外優先順位、テストを確定。B/E/Fの名前ではなく具体的な設計を決める。
2. 正本へ採用する場合、現在仕様・設計・コード・テスト・Ticketのうち必要な責務を持つ正本ファイルへ内容を直接反映する。Workbenchノートへのリンクを正本へ張らない。WorkbenchのNoteを正式ADRやTicketの代わりにしない。
3. コード変更を明示依頼されたときは対象branchの最新HEADと作業差分を再確認し、関連規約に従って変更・検証・commit・pushまでを一連で実行する（ユーザーの明示範囲を優先）。PR作成、merge、mainへの直接反映、branch削除は個別の明示依頼がある場合のみ。
4. 失敗注入・型チェック・実SDK検証、public contract・Haddock・Cabal `build-depends`を実装に合わせて検証し、既存8テストだけで完了としない。観測した保証と、Factory契約・SDK内部・停止期限など信頼境界に残る保証を分けて記録。
5. その後にRS-0024の実際の残作業（Logs/Metrics具体化、実アプリ起動・終了との接続など）へ戻る。これらを、今回の設計ノート作成で実装完了したとしない。

## 7. 次の別AIへのレビュー依頼文（そのまま転送可能）

RAGScope `takashit16833/RAGScope` の`RS-0024/sdk-lifecycle-metrics`について、Workbenchの以下4ファイルを順に読み、批評的にレビューしてください：

- `Notes/RS-0024-SDKライフサイクル批評と再設計案.md`（A〜D）
- `Notes/RS-0024-SDKライフサイクル批評と再設計案-E案追補.md`（E）
- `Notes/RS-0024-SDKライフサイクル再設計-F案.md`（F）
- `Notes/RS-0024-SDKライフサイクル設計方針と議論経緯-A-F統合.md`（本ノート）

まず正本の最新対象branchの実ファイル・Ticket・ADR・関連テストと、必要なSDK契約を再確認してください。Workbenchのノートを現在仕様・採用済み設計の根拠にはしないでください。本ノートの「統合推奨」を正しいと仮定せず、A〜Fの各要素を独立に検証してください。ユーザーは案の勝者選びを求めておらず、上から追いやすいデータ/例外の流れ、所有権・scopeの正確な区別、例外安全性を求めています。同時に、数学的構造とHaskellの抽象化を探究する楽しさ・モチベーションを重視し、大幅な変更を歓迎しています。これを単なる好みとして切り捨てず、正しさや保守性と独立に評価してください。

特に、Bのrollback付き戻り値、Fの型付きChainの保証と限界、Cleanup計画の取得前prepareとaction捕捉、単一mask入口、CのScopedとFの自由Applicative風Plan、線形Ownership token、worker由来例外の区別を、実際の型・値・API・import・制御経路に落として比較してください。Fの構文木を「数学的に面白いから」採用することも、「大きいから」却下することも避けてください。非同期例外に対する保証を既存のmockだけで断言しないでください。

成果物は、(a)確認済み正本、(b)議論の中で固まった方針と未決定、(c)統合提案への反論・改善・代替、(d)型／runner／mask／所有権の具体モデル、(e)採用判断に必要な実験と期待結果、(f)前回から結論を変える場合の差分と主要な根拠、としてください。結論はユーザーと一緒に決めます。レビューだけを行い、RAGScope/Workbenchのファイル変更・commit・push・PR作成はしないでください。

## 8. 参照元と正本リンク

### Workbenchの検討資料（現在仕様を決める根拠ではない）

- [A〜D：RS-0024 SDKライフサイクルの批評と再設計案](RS-0024-SDKライフサイクル批評と再設計案.md)
- [E：型付きライフサイクル・プログラム追補](RS-0024-SDKライフサイクル批評と再設計案-E案追補.md)
- [F：型付きの構築計画と単一の実行器](RS-0024-SDKライフサイクル再設計-F案.md)

### RAGScope正本：比較対象commitに固定

[Construction]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Construction.hs
[Lifecycle]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs
[Cleanup]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Cleanup.hs
[TraceProvider]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/TraceProvider.hs
[LifecycleSpec]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryLifecycleSpec.hs
[TraceProviderSpec]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryTraceProviderSpec.hs
[Cabal]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/ragscope.cabal
[Ticket]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%B8OpenTelemetry%20Observability%E6%9C%80%E5%B0%8F%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md
[Observability]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/design/observability/Observability%E8%A8%AD%E8%A8%88.md
[ADR]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/adr/ADR-0010%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E5%A4%B1%E6%95%97%E3%82%92%E5%87%A6%E7%90%86%E5%8D%98%E4%BD%8D%E3%81%AE%E5%85%B7%E4%BD%93%E5%9E%8B%E3%81%A7%E6%89%B1%E3%81%86.md

[A-D]: https://github.com/takashit16833/Workbench/blob/54d53b854f58ef2b637c2975a6267fa0065110fc/Notes/RS-0024-SDKライフサイクル批評と再設計案.md
[E]: https://github.com/takashit16833/Workbench/blob/7dfc5b306ba7f5771237320ebec276eb3c7e371e/Notes/RS-0024-SDKライフサイクル批評と再設計案-E案追補.md
[F]: https://github.com/takashit16833/Workbench/blob/0b697098bc70eefd7757738db32204abf955530f/Notes/RS-0024-SDKライフサイクル再設計-F案.md
