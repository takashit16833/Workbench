---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-18
---

# RS-0024 SDKライフサイクル再設計 F — 型付きの構築計画と単一の実行器

## 0. 位置付けと結論

本ノートはAIによる未採用の設計案である。正本の現在仕様ではなく、Haskell断片もコンパイル・実行していない。RAGScopeのコード・設計文書は変更しない。

- 正本: `takashit16833/RAGScope`
- 対象branchの最新HEADを再確認: `RS-0024/sdk-lifecycle-metrics`、`48e2fa04ca02474d0e7f68c02153a6437c2d53e9`
- 検討対象E案: Workbenchの`7dfc5b306ba7f5771237320ebec276eb3c7e371e`
- 保存先branch: `feat/RS-0024-opentelemetry-observability-foundation`
- 関連: [A〜D案の元ノート](RS-0024-SDKライフサイクル批評と再設計案.md)、[E案の追補](RS-0024-SDKライフサイクル批評と再設計案-E案追補.md)

FはEの概念分離を受け継ぎつつ、**利用側に所有権tokenや任意の継続を操作させず、型の合う構築手順をデータとして渡す**案である。その手順を、所有者・例外・Cleanup結果を管理する一つの実行器が解釈する。

Eより抽象化を増やすことが目的ではない。次の二点を具体化する。

1. 外へ渡すのは資源そのものを持つ`Owned`ではなく、資源をこれから作る計画。
2. Cleanupの操作列は、資源取得後に任意の関数で作らず、資源取得前に形を準備する。

前回のB推奨を、E案が提示されたことだけで撤回しない。Bは小さな実行核として依然有力。Fは構築手順の合成・事前検査・学習の価値を重く見る場合の具体的な比較候補である。安全性と読解性が実装・テストで裏付けられる前に、Fを最終採用案とはしない。

## 1. 正本から維持する振る舞い

現行の具体的動作は次のとおり。

- Trace → Logs → Metricsの順で取得し、成功したProviderだけを逆順で解放する。[Construction][R1]
- Trace内部ではExporter → Processor → Providerへ解放責任が移る。次段階の失敗時には現在のownerだけをrollbackする。[TraceProvider][R2]
- CleanupではSDKの`FlushResult / ShutdownResult / ExportResult`または`ExceptionWithContext SomeException`を記録する。[Cleanup][R3]
- 最外側は既に例外を値として保持している。最後に「元の中断 → Cleanupの最初の中断 → reportingの中断 → 元の同期例外または通常値」の順で選ぶ。[Lifecycle][R4]
- 同期のCleanup・reporting失敗だけで、正常なcallback結果を失敗へ変えない。callbackが返した業務上の`Left`は通常値として保持する。[LifecycleSpec][R5]
- SDKの送信・batching・Contextを独自のTelemetry Runtimeとして作り直さない。[Observability設計][R7]

Fは上記の所有・結果・例外選択を維持する。内部で例外を一時的な値にしても、公開入口では必要な例外を再送出する。型付きの構築計画を、UseCase全体の失敗型や汎用アプリケーションMonadへ広げない。

実装状況にも注意する。TraceProviderSpecはまだ`pendingWith`であり、現行LifecycleSpecはmock中心。Fのモデル検証が通っても、SDKと非同期例外の実行検証が済んだことにはならない。[TraceProviderSpec][R6]

## 2. E案から何を変えるか

| 論点 | Eで示されている方向 | Fで具体化する選択 |
|---|---|---|
| 所有権 | `Owned stage resource`と`advanceOwner` | 通常利用側へOwnedを公開せず、入力型・出力型がつながる構築列を渡す |
| 利用範囲 | 継続型Scopedによる合成 | 外側の合成をデータ構造にし、実行順・資源数・解放義務を事前に走査可能にする |
| Cleanup | Providerが操作列を作りRunnerが実行 | 資源に依存しない操作列の形を事前に準備し、資源依存部分は捕捉対象のIO actionへ閉じる |
| 例外・履歴 | RunResultにまとめる | 元のExitと履歴を独立した引数・値として保持し、解放側の異常で元のExitを上書きしない |
| maskの責任 | 検証課題として列挙 | 公開`withSdk`が確保開始から報告・最終選択まで所有する |
| 線形型 | 選択肢として残す | 初期版では採用せず、通常利用側の操作からownerの二重使用を取り除く |

Fの外側構造はデータとして検査できるが、末端の`IO`や関数の中身を純粋な計画として解析できるという意味ではない。SDK factoryは引き続き信頼・検証する境界である。

## 3. 構築手順 — 型がつながる所有権移転の列

### 3.1 概念的な型

以下は型の関係を具体化するための設計断片。公開constructorやinstanceの最終実装ではない。

```haskell
data OwnerPlans r = OwnerPlans
  { rollbackPlan :: CleanupPlan r
  , closePlan    :: CleanupPlan r
  }

data Seed a = Seed
  (IO a)
  (OwnerPlans a)

data Transfer a b = Transfer
  (a -> IO b)
  (OwnerPlans b)

data Chain a b where
  Done :: Chain a a
  (:>>) :: Transfer a x -> Chain x b -> Chain a b

data Build b where
  Build :: Seed a -> Chain a b -> Build b
```

`Seed`は最初の資源と、その資源を所有している場合の解放方法を定義する。`Transfer a b`は、`a`を現在ownerとして次のfactoryへ渡し、成功したら`b`へ所有を移す。

`rollbackPlan`は構築途中で後段が失敗した場合、`closePlan`は完成資源の通常scopeを閉じる場合に使う。TraceではExporter / Processorのrollbackはshutdown、完成Providerのcloseはflush → shutdownとなる。構築段階ごとに同じ操作列でよい場合は値を共有できる。

### 3.2 Traceへの対応

```haskell
-- 提案。各factoryは現在のTraceProviderConfigから対応付けられる。
traceBuild :: TraceProviderConfig -> Build TracerProvider
traceBuild config =
  Build
    (Seed (traceExporterFactory config) exporterPlans)
    ( Transfer (traceProcessorFactory config) processorPlans
        :>> Transfer (traceProviderFactory config) providerPlans
        :>> Done
    )
```

`(:>>)`は右結合として定義する。`SpanExporter -> SpanProcessor -> TracerProvider`の型がつながらなければ、この構築列は型検査を通らない。

今回のTraceでは各段階の資源型が異なるため、段階名だけのphantom型を重ねなくても型の接続を制限できる。同じ資源型の別状態を本当に区別する必要が出た時点で、その状態を表すnewtypeや索引を追加する。

### 3.3 factoryの契約と責任範囲

`Transfer a b`に入れるfactoryは次を満たす必要がある。

1. 正常に戻るまでは、入力`a`の最終的な解放責任は実行器にある。
2. 正常に戻ったら、`b`の解放操作が入力`a`に関係する必要な解放も引き受ける。
3. factory内部だけで取得し、戻せなかった資源はfactory自身が片付ける。
4. 失敗したfactoryが入力`a`も解放するなら、その契約を前提とする別の操作が必要。FのTransferへ黙って入れない。

これは現行TraceProviderのfactory契約と対応する。[TraceProvider][R2]

型が`a -> IO b`であるだけでは、SDKが実際にこの所有関係を守ることは保証できない。任意の`fmap`や任意の型変換をTransferとして扱わず、SDK接続moduleが確認済みのfactoryを登録する。

### 3.4 解釈時の不変条件

実行器内部は「現在資源」と「現在のOwnerPlans」を一組だけ保持する。

| 結果 | 実行器がすること |
|---|---|
| Seed失敗 | 後段へ進まない。Seed内部の部分資源はSeed側の例外安全契約に従う |
| Transfer成功 | 現在ownerを旧資源から新資源へ置き換える。旧finalizerを独立した終了列へ追加しない |
| Transfer失敗 | 現在ownerのrollbackを全件試し、取得例外とCleanup履歴を返す |
| Chain完了 | 完成資源とclosePlanを、外側Provider scopeへ引き渡す |

「解放責任を一度だけ選ぶ」と「解放処理が必ず完了する」は別である。rollbackがthrowしても同じSDK shutdownを無条件に再実行しない。

### 3.5 数学的構造

```haskell
appendChain :: Chain a b -> Chain b c -> Chain a c
```

`Done`が空の遷移、`appendChain`が遷移列の連結である。資源型を接続点とし、型の合う遷移列だけを合成する構造になる。構文上は型付きの経路の圏として扱える。

結合則によって、連続した遷移列の括弧付けを変えられる。ただし、SDK呼出し順の交換、factoryの副作用の消去、二重解放の一般的な型証明を意味しない。

## 4. Provider間の利用範囲 — 静的な合成計画

### 4.1 外側の合成をデータにする

```haskell
data Plan a where
  PurePlan :: a -> Plan a
  ApPlan   :: Plan (a -> b) -> Plan a -> Plan b
  Resource :: Build a -> Plan a
```

`Plan`にFunctor / Applicativeを与え、利用側では次の形で書く。

```haskell
providersPlan :: SdkConfig -> Plan Providers
providersPlan config =
  Providers
    <$> resource (traceBuild (traceConfig config))
    <*> resource (logsBuild (logsConfig config))
    <*> resource (metricsBuild (metricsConfig config))
```

Logs / MetricsのBuildとConfigは提案上の名前であり、現在の実装にはまだない。

このApplicativeの解釈は左から順の確保と逆順の解放。並列化ではない。初期版でMonadを提供しないため、取得結果に応じて後続のProvider計画を自由に生成する用途は対象外となる。

現在の`withProviders`ではLogs / Metricsのacquireへ前段Providerを渡していないため、この限定は現在の骨格に対応する。将来の実装で本当に値依存が必要となれば、その依存を確認してから拡張する。[Construction][R1]

### 4.2 C/Eの継続表現との違い

継続型でも取得・解放は安全に合成できる。しかし、任意の関数として包まれたscopeの内部を、実行前に走査することはできない。

Fは`Plan`の外側構造を走査できるため、次を確保前に準備できる。

- Providerの取得順。
- それぞれのBuildにある所有権移転の段階。
- 各段階が持つrollback / closeの操作一覧。
- 構築中のどこが失敗すれば、どのownerと外側Providerを解放すべきか。

`Plan`値を2か所で使えば、2回の資源確保を意味する。同じ計画値の共有が、同じ生きたProviderの共有や一度だけの確保を意味することはない。暗黙のキャッシュは導入しない。

### 4.3 準備済み計画の内部表現候補

```haskell
data Env xs where
  ENil  :: Env '[]
  ECons :: r -> Env rs -> Env (r ': rs)

data Acquisitions xs where
  ANil  :: Acquisitions '[]
  ACons :: PreparedBuild r -> Acquisitions rs
        -> Acquisitions (r ': rs)

data PreparedPlan a where
  PreparedPlan :: Acquisitions xs -> (Env xs -> a)
               -> PreparedPlan a
```

`PreparedBuild`は3章のBuildについてCleanupの形を事前に準備した内部型。`prepare`はPlanを取得順の列と、取得済み資源から`Providers`を組み立てる関数へ変換する。

この表現なら、収集した資源の型と、最後にProvidersを組み立てる関数の入力型を一致させられる。代償は型付きの異種リストと、その結合を保守する必要があること。

この正規化を実装しても、組立て関数が例外を起こさない保証は得られない。組立て関数は、すべての資源の解放義務を保持した状態で、利用処理の例外捕捉範囲内で評価・使用する。

Fの初期試作でこの正規化が過大なら、Planを再帰的に解釈する方式も比較する。ただし事前の計画走査は維持する。実行器内部で継続を使うことを禁止する設計ではない。

## 5. Cleanup — 取得後に操作列の形を作らない

### 5.1 Bから引き継いだ条件を改善する

前回Bは`cleanupResource :: r -> [CleanupStep]`が有限で全域的であることを条件としていた。その条件のもとでは、操作ごとに例外を捕捉して一覧を返せる。

しかし、`cleanupResource r`自体が例外を起こすと、Bの断片では`own <- runCleanupSteps ...`から例外が漏れ、既に得ていた利用結果や内側履歴を外側のcatchが別の失敗へ置き換える経路がある。E§7.3はこの問題を明示的に検討課題にしている。

これは「Bはあらゆる入力に対して安全」とする根拠がなかった点であり、元ノートの全域性条件を省いてよいという話ではない。Fではその前提を、事前に形を準備する処理と、実行時の捕捉境界へ具体化する。

### 5.2 形は事前に、資源への適用は捕捉範囲内で

```haskell
data CleanupOp result where
  FlushOp    :: CleanupOp FlushResult
  ShutdownOp :: CleanupOp ShutdownResult
  ExportOp   :: CleanupOp ExportResult

data CleanupAction r where
  CleanupAction
    :: StepId
    -> CleanupOp result
    -> (r -> IO result)
    -> CleanupAction r

-- 実装ではconstructorを隠す。
newtype CleanupPlan r = CleanupPlan [CleanupAction r]

data SomeCleanupOutcome where
  SomeCleanupOutcome
    :: StepId
    -> CleanupOp result
    -> Either CapturedException result
    -> SomeCleanupOutcome
```

`FlushOp`へ`IO ShutdownResult`を対応付ける間違いは型で拒否できる。StepIdの意味の正しさや、「このshutdownがどの資源を終了するか」までは型だけで証明されない。

Providerに資源を渡して操作列を作らせる代わりに、操作列の各要素へ資源を渡す。TraceのclosePlanなら、取得前から「flush action、shutdown action」の2項目を持つ。

```haskell
providerClose = cleanupPlan
  [ CleanupAction traceFlush FlushOp
      (\provider -> forceFlushTracerProvider provider Nothing)
  , CleanupAction traceShutdown ShutdownOp
      (\provider -> shutdownTracerProvider provider Nothing)
  ]
```

各actionは単一の観測可能なSDK呼出しを包む。例えば`flush >> shutdown`を1個のCleanupActionに詰め込むと、flush失敗時にshutdownへ進めない問題を再導入する。

### 5.3 prepareの実際の保証

`prepare`は資源取得前に、計画の外側構造、操作列の全要素、StepId、操作タグ、保存された関数の外側まで評価して、準備済みの内部表現を作る。IO actionは実行せず、将来の資源値も評価しない。

Haskellは通常、任意の値の停止性や全域性を型だけでは証明しない。無限の計画を準備しようとすればprepareが終了しない場合もある。その場合はまだSDK資源を取得していない。Fは「どんな計画でも必ずprepareが終了する」とは約束しない。

資源に関数を適用した際の例外は実行時に捕捉する。関数の外側を事前評価しただけで、その関数が全入力に対して安全になるわけではない。

SDK結果を記録する際、結果constructorを捕捉範囲内でWHNFまで評価する案を採る。Cleanup結果の外側が未評価の例外である状態を成功記録にしないためである。業務上の戻り値`a`へこの評価を適用せず、SDK結果内部のすべてを深く評価する保証も追加しない。

## 6. 実行器の状態と例外処理

### 6.1 公開入口がmaskを所有する

```haskell
withSdk
  :: Plan Providers
  -> (LifecycleReport -> IO ())
  -> (Providers -> IO a)
  -> IO a
```

公開入口の動作:

1. 入口全体を最外側`mask`で包む。資源がない状態でprepareを`restore`と`tryWithContext`の内側で行う。失敗すれば後続の確保へ進まず、元の初期化例外として報告・最終選択へ進む。
2. 最外側`mask`内で、準備済みのBuildを順に実行する。
3. 取得・所有者置換・解放義務の登録・結果の受渡しをmasked区間に置く。
4. 全Provider取得後、組立てとユーザー処理だけを`restore`と`tryWithContext`で包む。
5. 元の`Either CapturedException a`を確定して保持し、Cleanupを逆順に試す。
6. reportの発行を捕捉付きで試す。
7. 現行と同じ優先順位を適用し、値を返すか`rethrowIO`する。

prepareから戻った時点でも最外側のmasked区間は続いており、捕捉した例外の受渡しでunmaskedの隙間を作らない。捕捉した中断を通常値として公開する`runLifecycleProgram :: ... -> IO (RunResult a)`を一般利用側へ公開しない。

最外側が複数の概念を呼び出すことと、maskを複数moduleへ分散所有させることは別である。Ownership / Scope / Exitを別moduleにする場合でも、最上位の1関数が安全な実行範囲を所有する。

### 6.2 保持する状態

| 実行段階 | 保持するもの | 次の段階に進める条件 |
|---|---|---|
| 構築 | 現在Buildのowner、完成済みの外側Provider、予定操作 | factoryが正常に戻る |
| 利用 | 全Providerと全解放義務 | callbackの正常終了または捕捉した例外 |
| 解放 | 元のExit、残りの解放操作、取得済み履歴 | 直前操作の結果を履歴へ追加した後 |
| 報告 | 元のExit、全Cleanup履歴 | reportingの正常終了または捕捉した例外 |
| 最終選択 | 元のExit、Cleanup・reporting中断候補 | 純粋な優先順位判定 |

この状態は実行器の引数・戻り値として保持する。Providerへ履歴追加callbackを渡さない。巨大なアプリ共通状態やworkerと共有するIORefも必要ない。

全Providerのclose操作を無条件に先に平坦化するだけで所有を表すのではない。Buildの途中は現在ownerのrollback、Build完了後はProviderのcloseがそれぞれ有効になる。両方を同時に有効な解放義務として登録しない。

### 6.3 元の結果を保持したままCleanupを進める

```haskell
-- 設計上の形。実行入口はmasked。
drain
  :: Either CapturedException a
  -> Seq SomeCleanupOutcome
  -> [PendingCleanup]
  -> IO (RunResult a)
```

`PendingCleanup`は資源と、その資源へ適用する準備済みの操作を包む実行器内部の存在型。`drain`は各操作について捕捉を行い、その結果をSeq末尾へ追加して次へ進む。

重要なのは、Cleanup失敗から新しい`RunResult (Left cleanupException) []`を作り直さないこと。元のExitと既存履歴はすでに別の引数として生存している。

異常が起きた操作の`r -> IO result`の適用と、SDK結果の外側の評価は捕捉範囲内に入れる。内部不具合を診断する場合も元のExitを書き換えず、解放側の追加診断として保持する。

ただし、実行器自身のあらゆるプログラム誤り、メモリ枯渇、強制的なプロセス終了まで回復する一般的な仕組みではない。未知の不具合を外側の1個のcatchで包むだけでは、外へ戻らなかった途中履歴を回収できない。Fが保証する境界は、準備済み計画・信頼する小さな実行器・個別に捕捉するSDK / callback / reportingの呼出しである。

### 6.4 非同期例外

- 取得中に中断を捕捉したら、後続factoryや利用処理へ進まない。
- Cleanup中に中断を捕捉したら、履歴へ保存し、残りのCleanupとreportingだけを試す。
- 結果・現在owner・履歴の受渡しで`restore`しない。
- factory内部のblocking操作は`MaskedInterruptible`でも中断され得る。そのfactory内部の部分取得責任は消えない。
- Cleanupを一括して`uninterruptibleMask`にしない。
- pending状態でまだ受領していない割込みを、過去のreportへ記録できるとはしない。

`mask`は割込みを全面禁止する操作ではなく、blocking操作では中断が届く。[Control.Exception][X1]

### 6.5 worker例外と終了期限

workerの終了結果とライフサイクルthreadの中断は、観測できる境界で別の結果として扱う。例えば`tryWithContext (waitCatch worker)`の外側Leftと内側Right(Left e)は別物である。SDKが内部でworker例外を再送出・集約した場合、その由来を型だけで復元しない。

SDK 1.0.0.0のTrace Providerはworker例外をFlushError / ShutdownFailureへ集約する。一方Simple Span Processorのshutdownは`wait exportWorker`後にExporter shutdownを行うため、worker例外で後段へ進まない経路がある。直接Processor rollbackを呼ぶ構成ではその契約を再確認する。[SDK Trace.Core][X3]、[SDK Simple.Span][X4]

RAGScopeの依存は`^>=1.0.0.0`で厳密な解決versionを固定したものではない。このupstream調査を、ユーザー環境のすべてのSDK動作の断定に使わない。[Cabal][R8]

終了処理の試行と有限時間での完了も別である。全体の終了期限は現行コードで共通規則が確定していない。Fの型を導入しても永久blockingは自動解決しない。

## 7. 具体的な失敗経路

以下は設計上の追跡であり、実行済みテストではない。

| 失敗点 | 現在owner | 試す操作 | 保持する情報 |
|---|---|---|---|
| prepare | なし | SDK解放なし、報告を試す | prepareの例外 |
| Exporter factory | 正常に返ったownerなし | factory内部資源はfactoryの契約に従う | 元の取得例外 |
| Processor factory | Exporter | Exporter rollback | 取得例外＋rollback結果 |
| Provider factory | Processor | Processor rollback。Exporterを独立解放しない | 取得例外＋rollback結果 |
| Logs Build | TraceとLogs内部の現在owner | Logs内部rollback→Trace close | 元例外＋実行順のCleanup履歴 |
| Metrics Build | Trace・LogsとMetrics内部の現在owner | Metrics内部rollback→Logs close→Trace close | 同上 |
| 利用処理 | 3Provider | Metrics→Logs→Trace close | 元の正常値または例外＋全履歴 |
| Trace flush | Trace | 次にTrace shutdown | flush結果・例外を保持し、元の利用結果を維持 |
| close actionの資源への適用 | 対象Provider | 当該操作を失敗記録し、既知の残り操作を試す | 既存履歴を捨てない |
| reporting | 解放試行済み | 再帰的な同経路報告はしない | 元の結果とCleanup履歴は内部に残るが外部保存は不保証 |

元の中断をA1、Cleanup中断をA2、reporting中断をA3とすると、すべてを捕捉した場合はA1を選ぶ。元が同期例外ならA2、Cleanup中断がなければA3、どちらもなければ元の結果へ戻る。同期Cleanup例外やSDK失敗値はこの順位へ入れない。[Lifecycle][R4]

## 8. 型の保証と実行器の保証を分ける

| 性質 | Fでの根拠 | 限界 |
|---|---|---|
| 型の違う段階を直結できない | ChainのGADT | 同じ型の意味的に誤ったfactoryは拒否できない |
| flushにshutdown結果型を結び付けない | CleanupOp resultとactionの型一致 | StepIdやSDK APIの意味まで自動検証しない |
| 取得した資源型とProviders組立て入力が一致 | Env / Acquisitionsの型 | 組立て関数の停止性は保証しない |
| 呼出し側がOwnedを複製し二重advanceしない | Ownedやadvance操作を公開しない | 実行器・SDK接続module内の誤実装はテストが必要 |
| 旧ownerの解放義務が成功後に残らない | 実行器の置換規則 | 通常のHaskell型だけで線形消費を証明したわけではない |
| 中断後も必要なCleanupを試す | mask、捕捉、drainの実装 | 任意のSDK関数の停止・解放完了までは保証しない |
| 資源をscope外へ持ち出さない | 初期版では型保証しない | raw SDK値や自由なIO callbackを渡せば持ち出せる |
| factoryが内部資源を漏らさない | SDK契約と失敗注入テスト | Plan / Chainだけでは保証しない |

`LinearTypes`を採用すると内部tokenの使用回数をさらに制約する余地はあるが、通常のSDK IOと例外安全性は別途必要。Fは「線形型と同じ保証を得た」と主張しない。[GHC LinearTypes][X2]

## 9. moduleと依存

最初は既存`opentelemetry-adapter` private library内へ置く。新しいアプリ共通Monadや空の汎用packageは作らない。

| module案 | 主な型・関数 | 参照するもの |
|---|---|---|
| Plan | Seed / Transfer / Chain / Build / Plan / prepare | base、containers、Cleanupの計画型 |
| Cleanup | CleanupOp / CleanupAction / Outcome、各操作の捕捉 | base、SDKの結果型 |
| Runner | withSdk、構築の解釈、内部owner、drain | Plan、Cleanup、Exit、base、containers |
| Exit | RunResult、診断投影、例外選択の純粋関数 | Cleanupの結果型、base |
| TraceProvider | traceBuildと具体的factory / CleanupPlan | Plan、Cleanup、SDK Trace / Processor / Exporter |
| Construction | 3Providerの計画構成と入口 | 各Provider、Plan、Runner |

Exitのmoduleにreporting I/Oまで所有させず、Runnerがpublishを呼び、その結果を純粋な選択関数へ渡す。これによりmaskの所有が途中で切れない。

PlanはTraceProviderをimportしない。TraceProviderがPlan型を使う方向とする。Constructionだけが具体的な3Providerを組み合わせる。

CleanupがSDKの結果型を持つ限り、同じlibraryのPlan / RunnerもSDKへの依存をCabalレベルで禁止したとは言えない。SDK非依存の汎用核へ分割するなら結果型を引数化する別設計が必要だが、Fの成立条件ではない。

SDKのbatching・送信等は従来どおりSDKに委ねる。ここでいう実行器は資源の取得・利用・終了だけを担当する。[Observability設計][R7]

## 10. 数学的な構造と、楽しさの評価

| 構造 | 実際に簡単になるもの |
|---|---|
| 型付きの経路の合成 | Exporter→Processor→Providerを型の合う列として組み合わせられる |
| Planの自由Applicativeとしての構造 | 実行する前に資源構成を走査し、逐次実行や構成検査へ別々に解釈できる |
| Cleanup履歴の順序付きモノイド | 個々の操作結果を失わず連結できる |
| Exitと履歴の直積 | 失敗しても履歴を結果から切り離さず保持できる |
| 優先順位付きの左優先選択 | 全履歴を保持したまま、最後に再送出する1件だけを決められる |

特にFの面白さは、同じ計画に対して「実SDKで実行する」「所有・解放順を表示する」「どの段階で失敗すれば何を解放するか調べる」という異なる解釈を持てる点にある。

ただし末端factoryの動作は不透明なので、純粋な構成検査だけではSDK動作は検証できない。失敗を注入した抽象モデルは制御の法則を検証し、IOテストは実際の例外・所有・workerを検証する。この二つを混同しない。

学習・探究の価値は、実装行数や変更量とは独立した評価軸として認める。ユーザーが長期的に使い育てる個人開発では、その価値を理由にFを試作する判断はあり得る。安全性の未検証を理由なく正当化するものではない。

## 11. B / E / Fの比較と現在の推奨

| 基準 | B | E | F |
|---|---|---|---|
| 構築記述 | 明示的caseとscope関数 | Ownership / Scopeを分ける方向。具体APIは未確定 | 型付きBuildと静的Plan |
| 読みやすさ | 実行順が直接見える | 責務は見えるが実際の処理は未確定 | 構成側は短い。実行器にはGADT・型付き列の知識が必要 |
| Cleanup計画 | 取得後のr→操作列に全域性条件 | 計画構築失敗を検討課題として認識 | 形は取得前に準備、資源への適用は個別に捕捉 |
| Ownership | 手書きの分岐と契約 | phantom / 秘匿 / 線形型を比較中 | 外部にownerを渡さず、実行器が1個の解放義務を更新 |
| 事前検査 | 個別に用意 | 継続表現だけでは構成の走査が難しい | 外側構造を走査可能 |
| テスト | 各関数と失敗経路を直接テスト | 核が未確定 | 計画・解釈・SDK境界を分けてテスト可能 |
| 学習・探究 | 直積・履歴合成が中心 | 探究の方向が広い | 型付き経路・自由Applicative・複数の解釈を具体的に探究できる |
| 変更量・保守負担 | 中 | 具体化次第 | 大。構築言語と実行器を自分で保守 |

現時点の判断:

- 早く安全なライフサイクルを完成させる目的には、Bの小さな核が依然有力。ただしCleanup計画構築失敗の条件を検証・具体化する必要がある。
- Eは独立の完成済み代替実装ではなく、B/C/Dの論点を整理した設計方針として評価する。Eを採用すれば各保証が自動的に増えるわけではない。
- 大きな再設計と型・合成の探究を重視するなら、Fを小さな実験として比較する価値がある。実行器の説明量がBより増えるため、必ずしもすべての保守者にとって読みやすくなるとは限らない。

Fの価値が事前検査や複数解釈で具体化せず、単にcaseを独自言語へ移しただけなら採用しない。その場合、5章のCleanup改善だけをBへ戻すことができる。論点を分離しておく利点でもある。

## 12. 採用判断に必要な小さな実験

まずTraceのExporter / Processor / Providerだけを対象に、SDK非接続のmodelとIO版の最小prototypeを作る。今回の依頼ではprototypeを実装していない。

### 12.1 型検査

- Processor生成を飛ばし、SpanExporterからSpanProcessorを要求するProvider生成段階へ誤接続するコードがコンパイルに失敗すること。
- FlushOpにIO ShutdownResultを渡すコードがコンパイルに失敗すること。
- Planを再使用すると別の確保となることをAPIの例とテストで示す。型エラーになるとは説明しない。

### 12.2 制御と結果

- 各取得段階で失敗を注入し、解放した最上位ownerの回数が1回、移転済み旧ownerの独立解放が0回であること。
- flushが例外でもshutdownを試し、元のcallback値・例外と既存履歴が変わらないこと。
- Cleanup actionを資源へ適用する時点の純粋例外も個別に捕捉すること。
- 不正な操作列の構造はprepare中に失敗し、SDK取得回数が0回であること。
- Providersの組立てがthrowした場合も、全取得済み資源の解放を試すこと。
- Chainの結合の括弧付けを変えても、取得順、owner移転、失敗時rollback、履歴順が変わらないこと。

### 12.3 非同期例外とSDK

- MVarで確保・利用・Cleanupの位置を制御し、別threadからthrowToする。throwIO UserInterruptだけで代替しない。
- 所有者置換と外側scopeへの引渡しがmaskedであること。
- 元中断・Cleanup中断・reporting中断の優先順位とExceptionContextを確認する。
- worker終了結果と親thread中断を分離するSDK境界を確認する。
- 実SDK versionでProcessorのshutdownが下位Exporterへ何を委譲するか確認する。

この実験でFの実行器がBより説明しにくい、所有権状態がかえって見えにくい、既存契約に適合しないと分かった場合は、その結果から採否を判断する。Haskellらしい見た目を根拠に採用を決めない。

## 参照

[R1]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Construction.hs
[R2]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/TraceProvider.hs
[R3]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Cleanup.hs
[R4]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs
[R5]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryLifecycleSpec.hs
[R6]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/test/RAGScope/Telemetry/OpenTelemetryTraceProviderSpec.hs
[R7]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/project-docs/design/observability/Observability%E8%A8%AD%E8%A8%88.md
[R8]: https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/ragscope.cabal
[X1]: https://hackage-content.haskell.org/package/base-4.21.0.0/docs/Control-Exception.html
[X2]: https://ghc.gitlab.haskell.org/ghc/doc/users_guide/exts/linear_types.html
[X3]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/api/src/OpenTelemetry/Trace/Core.hs
[X4]: https://github.com/iand675/hs-opentelemetry/blob/46a42cdf80405fdb36fbb48a309254b2332617b4/sdk/src/OpenTelemetry/Processor/Simple/Span.hs
