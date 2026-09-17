---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-18
---

# RS-0024 SDKライフサイクル再設計案 E — 型付きライフサイクル・プログラム

> [!important] 位置付け
> このノートは、[[RS-0024-SDKライフサイクル批評と再設計案]] のA〜D案を受けた**追加のAI提案**と、次の批評的レビューに渡す論点を保存する。RAGScopeの現在仕様・採用済み設計・実装結果ではない。コード断片は概念図であり、コンパイル・テストは未実施。元ノートの結論Bを採用済みへ変更しない。
>
> 正本リポジトリ: `takashit16833/RAGScope`、調査対象: `RS-0024/sdk-lifecycle-metrics`、比較基準commit: `48e2fa04ca02474d0e7f68c02153a6437c2d53e9`。別AIが再評価するときは対象branchのHEADを再確認すること。Workbenchは現在仕様の根拠にしない。

## 1. 背景と設計を検討する目的

現行ライフサイクルは、確保・利用・逆順解放を行い、Cleanup結果を集約してから例外・通常値を選ぶ。ただし理解するには、戻り値、例外のunwind、`record` callbackによる履歴記録の複数経路を追う必要がある。最外側の`runLifecycle`は既に`tryWithContext`で例外を値として保持し、最後に`chooseExit`と`rethrowIO`を使う。下位の部分確保失敗も値として運搬できるかを検討する余地がある。正確な現在動作は下記の正本を確認すること。

**設計目標:** 関数の型と合成関係から、誰が何を所有し、どう確保・利用・解放し、元の結果とCleanup履歴をどこで集約し、何を最後に再送出するかを読み取れること。FPらしさやモナドの採用そのものは目標ではない。

**ユーザーの設計上の価値観:** 「ワクワクする設計がモチベーションになる」。個人開発において、Haskellの数学的構造・型・合成の力を探究でき、設計や実装そのものを楽しめることも重視する。これは正しさや読みやすさを免除する理由ではなく、最小変更・実装量だけでは測れない独立の判断材料である。思い切った再設計も歓迎する。今回、どの案を採用するかは未決定で、ユーザーと議論して決める。

## 2. Eの中心仮説

Bの「結果を値で返すscoped runner」とCの「Scopeを継続で合成する」という発想を基礎に、**Ownership / Scope / Runner / Exitを別々の概念とする**。Dの線形型は全面採用を前提にせず、Ownershipの保証を強める選択肢として検証する。

```text
Ownership: Exporter → Processor → Provider の解放責任を移す
      ↓ 完成したProvider
Scope: Trace → Logs → Metrics の利用範囲を合成する
      ↓ 利用結果と解放対象
Runner: 例外を捕捉し、Cleanupを実行して結果を順序付きで集約する
      ↓ 利用結果・元例外・Cleanup履歴
Exit: reportを試み、既存の優先順位で通常値を返すか例外を再送出する
```

上は概念上の責務であり、必ず4個のmodule・packageに分けるという提案ではない。境界に渡す型・具体的なimport・Cabal依存は実コードに照らして決める。

## 3. Ownership — 解放責任の移転

Trace内部で実在する `Exporter → Processor → Provider` を「各資源を独立に積み重ねる」のではなく「所有者が置き換わる」遷移として扱う。次のfactoryが成功したら旧ownerの独立したfinalizerを残さない。次のfactoryが失敗したら旧ownerをrollbackし、元の例外とCleanup結果を保持する。factory自身が内部で未完了の資源を作った場合、そのfactoryの例外安全性も必要。

```haskell
-- 概念的な提案。実際の型・関数シグネチャは未決定。
data ExporterStage
data ProcessorStage
data ProviderStage

data Owned stage resource

-- 例: exporterからprocessorへの遷移を、対応するstageだけに限定する。
-- advanceOwnerは masked 区間でfactoryの結果と所有権を引き継ぐ。
-- 失敗時は旧ownerのrollback結果を失わずに返す。
advanceOwner :: ...
```

`Owned stage resource`のphantom stageは段階を区別するが、通常のHaskell値の複製・二重使用を禁止しない。`advanceOwner`のconstructorを隠して利用を制限する方式と、`LinearTypes`の`%1`や専用tokenで使用回数を制約する方式を、各々何が保証できるか具体的に比較したい。SDKは通常の非線形な`IO` APIなので、`%1`を付けるだけで例外安全性・SDK側の別名参照・二重shutdownが自動的に解決するとは主張しない。

## 4. Scope — 利用範囲を合成する

完成したTrace・Logs・Metricsは、それぞれ利用範囲の終了時に解放する独立した資源である。Bの安全な実行核を基礎に、Cの継続型`Scoped`を使って合成する可能性を検討する。

```haskell
-- 提案の使用イメージ。型・名前は未確定。
providers :: SdkConfig -> Scoped Providers
providers config =
  Providers
    <$> traceScope config
    <*> logsScope config
    <*> metricsScope config
```

想定する`Applicative`は左から順に確保し、内側から逆順に解放する逐次合成であり、並列初期化ではない。利用コードが3重の例外捕捉・記録callback・`mask`を毎回書かないことが狙い。`Scoped`のconstructor / `runScoped` / 任意の`IO`持ち上げをどこまで公開できるかは検証対象。非公開constructorだけでは、継続を必ず1回呼ぶことやスコープ外へのSDK値の持ち出しまで型で保証できない。

Scopeの合成（Provider間）とOwnershipの移転（Provider内部）は異なる操作とする。ExporterとProcessorを独立したScopeとして登録して成功後も双方のfinalizerを残すと、所有契約によっては二重shutdownになる。

## 5. Runner — 結果とCleanupを同じデータの流れで運ぶ

Bの方針を引き継ぎ、利用結果とCleanup履歴を独立して保持する。

```haskell
-- 構造を示す概念図。現行の型ではない。
data RunResult a = RunResult
  { originalExit    :: Either CapturedException a
  , cleanupOutcomes :: [CleanupOutcome]
  }
```

`Either CapturedException (a, [CleanupOutcome])`では例外側に履歴を置けないため、結果と履歴の**直積**を採る。Cleanup履歴は実行順に連結できる非可換のリストモノイド。連結の結合則は履歴のグルーピングを自由にするが、実際のCleanup操作を並べ替えてよいことは意味しない。

Providerは実行すべきCleanupの操作列を構築し、Runnerが個々のSDK操作を捕捉し、結果を記録して次の操作を試みる構造を考える。Cleanup計画の構築時にSDK I/Oを実行しない、計画は有限・全域とする等の条件を、単なるコメント契約にするかAPI・型で制限できるか比較する。`Flush`に`ShutdownResult`を誤って結び付けないGADTの導入も選択肢だが、存在型の格納と結果の表示が複雑になる代償を評価する。

**非同期例外:** 捕捉した`UserInterrupt`などを中間結果へ一時保持し、残りのCleanup・reportを試みてから最終段階で再送出してよい。ただし中断後に新しいProvider確保や通常のユーザー処理へ戻らず、キャンセルを業務上の回復可能な`Left`へ変換しない。`mask`中でもblocking処理では割込みが届き得る。結果を内側Scopeから外側へ渡し連結する区間の安全性、処理途中で既に得たCleanup履歴のprefixを失わないことを具体的に検証する。安易な`uninterruptibleMask`で全Shutdownを包まない。

**例外発生元:** SDK workerが異常終了した情報と、ライフサイクル実行threadへ届いたキャンセルを混同しない。`SomeAsyncException`という型だけで由来は分からない。区別できるSDK境界があるかを調べ、無理に例外の発生元を推測したconstructorを作らない。

## 6. Exit — 結果の最終選択

現在の`chooseExit`の判断を純粋関数として維持することをまず比較基準にする。取得・利用中の元の非同期例外、Cleanupの非同期例外、reportingの非同期例外、元の同期例外または正常値という現在の優先順位を黙って変えない。最後に例外を再スローするか、元の通常値を返す。

```haskell
-- 擬似コード。reporting自体の例外捕捉と優先順位適用が必要。
result <- runLifecycleProgram program
reporting <- captureReporting (publish (makeReport result))
either rethrowIO pure (chooseExit result reporting)
```

元の同期例外はreportに残す。Cleanupの同期例外・SDK失敗値・reporterの同期例外で、正常な業務結果を失敗へ変えない。レポート発行が失敗した場合の外部保存は保証できない。返却値`a`を勝手に強制評価しない。

## 7. 懸念・独立に検証する論点

1. **安全性の核:** Bの`within` / Cの`Scoped`を独自実装することで、現在のリソース解放保証を後退させないか。masked handoff、取得途中の部分成功、cleanup中の追加例外、reporter失敗を失敗注入で確認する。
2. **旧APIの混在:** 旧acquireがrollback結果をcallbackへ記録してからthrowし、新Runnerが生例外を捕捉して空履歴を返すと記録を失う。どの境界まで一括移行すべきか。
3. **release全体の例外:** 現行`releaseSafely`が捕捉する「Cleanup操作個々ではなく解放関数全体の予想外例外」を、新しい計画型・Runnerでどう保持するか。計画の構築自体がthrowする経路はどうするか。
4. **所有権の実保証:** `Owned`のstage、constructor秘匿、線形tokenそれぞれは、二重shutdown・未解放・スコープ外使用のどれを本当に排除できるか。`IO`中の例外・SDK内部の別名参照との境界はどこか。
5. **スコープの意味:** `Scoped`のFunctor / Applicative / Monadの合成則は、正常時・確保失敗・Cleanup失敗・非同期例外でどう観測できるか。継続の多重使用や任意IO注入をどこまで禁止する必要があるか。
6. **履歴の完全性:** 「すべてのCleanupが成功する」ではなく「可能な各操作を試み、SDKが返した完全な結果を順序付きで残す」ことが実現できるか。SDK内部で既に情報が失われた結果は復元できない。
7. **worker由来の例外:** 親threadキャンセルと区別できる入口を確認する。型の追加だけでSDK由来の例外の発生元を復元したことにしない。
8. **依存方向:** Ownership型を`Construction`に置いてProvider側から参照し、`Construction`がProvider実装へ依存して循環しないか。必要な型・API・import・Cabal `build-depends`を図示する。
9. **読みやすさ:** 数学的に美しい構造が、利用側だけでなく実行核を保守する人間にも理解しやすいか。コード行数や抽象化の数だけで結論を決めない。

特に次の問いは共同検討したい。**「Ownershipをどこまで型で表せるか？」** 旧ownerを失効させ新ownerへ解放責任を移すこと、成功時に旧finalizerが残らないこと、失敗時に旧ownerが確実にrollbackを試みることを、通常の代数的データ型・GADT・線形型・既存libraryでそれぞれどの程度保証できるのか。必要なら小さな型検査用の実験案を示してほしい。

## 8. 次の別AIへ依頼したい批評的レビュー

- Eを既定の推奨案とせず、元ノートのA〜Dおよび独立に発見した別案と同じ要求・制約で比較してほしい。B＋C＋限定Dという表現にも引きずられないこと。
- まず正本リポジトリの対象branchの最新状態、要求、具体実装、SDK契約、テストを再確認すること。Workbenchノートは検討材料であり、現在仕様の根拠ではない。
- Eの各境界について、具体的な型・関数・返却値・importと依存方向、例外の捕捉範囲、所有状態の遷移を示し、できる保証と文章だけの約束を分けること。
- ユーザーの読みやすさと、抽象化の学習・探究によるモチベーションを独立の評価基準として扱う。ただし正しさ・テスト容易性と対立する場合はその差を明確にすること。
- 完全なコード実装やGitHub変更は求めない。結論を急がず、採用判断に必要な具体的論点・反証・改善案を提示してほしい。

## 参照

- [元ノート（A〜D案と調査）](<RS-0024-SDKライフサイクル批評と再設計案.md>)
- [正本 Construction.hs](https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Construction.hs)
- [正本 TraceProvider.hs](https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/TraceProvider.hs)
- [正本 Lifecycle.hs](https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Lifecycle.hs)
- [正本 Cleanup.hs](https://github.com/takashit16833/RAGScope/blob/48e2fa04ca02474d0e7f68c02153a6437c2d53e9/ragscope-app/opentelemetry-adapter/RAGScope/Telemetry/OpenTelemetry/Cleanup.hs)
