---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-08
---

# RS-0024 Haskell抽象化・実装候補調査レポート

> [!note] 位置付け
> 指定された正本設計と、[[RS-0024 Haskellライブラリ・モジュールマップ]]を照合した実装前の調査・提案である。Workbench上の参考資料であり、採用済み設計や正式な実装仕様ではない。
> 実装コードは含めない。型の形、数学的な性質、候補の採否、依存方向、実装時に観測すべき事実を記述する。以下で提案する型名・操作名は説明用であり、実在するRAGScope APIではない。

## 1. 調査対象と読み方

### 1.1 対象を固定する

| 対象 | branch / 確認commit | 用途 |
|---|---|---|
| RAGScope正本リポジトリ | `RS-0024/telemetry-boundary-sdk-lifecycle` / `a829713bca576b01278351bf30cac20d06f2b94a` | 現在要求・設計・実装状態の根拠 |
| Workbench | `feat/RS-0024-opentelemetry-observability-foundation` / `17e8403be6835c4bf1e910c371c75bc1d62b75cc` | ライブラリ・モジュールマップという検討案 |
| `iand675/hs-opentelemetry` | 調査時の`main` / `5a267e690941bc3817b1de8dbd496cb35bb4788c` | 候補SDKの型・関数・処理の確認 |

調査日は2026-09-08、日本時間。リンクは原則として確認commitへ固定した。

正本のObservability設計群5ファイル、ADR-0006、RS-0024 Ticket、システムアーキテクチャ、ユースケース設計、Haskellコーディング規約、Cabal・Main・テスト入口を確認した。SDKについては第13章に記した実ソースを確認した。SDKをRAGScopeへ導入したビルド、最小実行、性能測定は行っていない。

候補SDKの確認commitではAPI / SDKのCabal上のversionは`1.0.0.0`である。ただし、**GitHubのそのcommitと公開配布物が同じ内容であることや、RAGScopeの依存解決が成功することまでは確認していない**。本レポートはそのversionの採用を確定しない。[SDK依存定義][S1] [API依存定義][S2]

追加質問を受けて、同じ正本commitとSDK commitを再確認した。追加確認で明確になった事実・提案変更条件・最小実測は、該当節へ統合している。再確認によって第3章の全体推奨を変更する必要はなかった。

### 1.2 事実と提案を区別する

| 表記 | 意味 |
|---|---|
| 決定済み | 指定commitの正本で意味・責務が定まっている |
| 未決定 | 確認した正本では具体的な選択を固定していない |
| 確認不能 | 必要な実測や配布物の照合を今回実施できていない |
| 提案 | 正本の要求を実現するための本レポートの推奨・候補 |

SDKのソース確認結果は「そのSDK commitの事実」であり、「RAGScopeの実装済み機能」ではない。以下でライブラリ名`application`、`telemetry-boundary`、`opentelemetry-adapter`を使う場合は、Workbenchマップの提案を評価するための名前である。[マップ][W1]

## 2. 先に押さえる現在設計

### 2.1 抽象化が守るべき契約

| 項目 | 決定済みの内容 | 抽象化への制約 |
|---|---|---|
| 機能の制御 | retry、timeout、fallback、処理の継続・終了、最終結果はRAGScopeが決める | Telemetry操作に業務上の再試行や成功判定を持たせない |
| SDK依存 | UseCase / 内部処理はRAGScope側の窓口を使い、AdapterがSDKを呼ぶ | 外部SDKの型を隠すだけでなく、Cabalで参照可能な依存を分ける |
| Context | 保持と伝播をSDKへ委ねる | Reader環境に独自TraceId / SpanIdや独自Context stackを作らない |
| 配送 | Processor / Exporter、batching、flush / shutdown、送信はSDKの責務 | RAGScope独自のログ配送基盤を再建しない |
| エラー | 各処理の具体的なerror値から用途ごとに直接変換する | Telemetryの分類をドメイン共通エラー型にしない |
| 記録失敗 | 記録・export失敗で機能上の成功を失敗へ変更しない | Adapterの記録失敗と、囲まれた本体の失敗を分ける |
| Signal | Trace、Logs、Metricsで記録目的が異なる | 三者を同一の汎用イベント操作へ無理に統合しない |

根拠は[Observability設計 第1〜3章][R1]、[ADR-0006][R6]、[RS-0024 完了条件][R5]。

### 2.2 結果・例外・計測の具体的な意味

RAGScopeが用途を決め、適用するSemantic ConventionがないSpanでは、成功は`Unset`かつ`error.type`なし、最終失敗は`Error`と安定した`error.type`で表す。子の失敗を親へ機械的に合成しない。retry後に親が成功したなら親は成功である。[実行追跡設計 第4章][R2]

未処理例外がSpan外へ伝播する場合は、そのSpanを`Error`にし、元の例外を再throwする。同じ例外のLogs EventRecordは1件とし、SDKによる同じ事実のSpan Event自動記録と重ねない。キャンセル・中断は通常の失敗およびこの未処理例外の記録規則から分離する。[実行追跡設計 第5章][R2] [ログ・イベント設計 第4章][R3]

名前付きイベントはLogsのEventRecordである。失敗値が返ったことやSpanが終わったことを理由に、イベントを自動追加しない。SeverityはOpenTelemetryのSeverityNumberであり、Severityから機能結果やSpan Statusを決めない。[ログ・イベント設計 第1〜3章][R3]

Metricsは複数実行の集約であり、評価データごとの正確な実験結果はドメインデータである。現在の共通設計にはRAGScope独自Metricの追加要求がなく、適用できる標準Metricを利用する。[Metrics設計 第1〜3章][R4]

### 2.3 実装状態と未決定の範囲

確認commitの`ragscope-app/ragscope.cabal`には、無名の`library`、executable、test-suiteがある。libraryの`build-depends`は`base ^>=4.21.2.0`のみ、既定言語は`GHC2021`である。Mainは挨拶を表示するだけで、test入口は未実装を表示する。対象treeにTelemetry実装は存在しない。[Cabal][R7] [Main][R8] [テスト入口][R9]

具体的なpackage version、module構成、型、関数、公開APIは、正本が意図的に実装時の判断へ残している。したがって関数レコードか型クラスかが未決定であることは、設計の矛盾を意味しない。[Observability設計 第2・5章][R1]

本調査で、上記の抽象化方針を決めるうえで両立しないObservability正本定義は確認されなかった。これをリポジトリ全体の無矛盾性の保証とはしない。

## 3. 推奨の全体像

**小さな操作別の関数レコード、処理範囲を囲む高階関数、機能固有の純粋変換、Cabalのcomponent境界を組み合わせる案を推奨する。**

数学的に特に有用なのは、次の構造である。

| 見いだせる構造 | RAGScopeで対応するもの | 実装への使い方 |
|---|---|---|
| 直積 | 一緒に渡すTrace / Logs等の操作 | 小さな関数レコードを必要に応じて組み合わせる |
| 直和 | 成功と失敗、通常ログと名前付きイベントなどの異なる形 | 同時に存在してはいけない項目を型で分ける |
| 関数合成・反変の構造 | 具体的なerror値やイベント値を記録向けの値へ変換して渡す | 変換を入力側へ前置し、元の値を失わない |
| 処理を引数に取る高階操作 | Span、Contextの一時的な適用、SDK資源の使用範囲 | 開始と終了を利用側へばらばらに公開しない |
| 自己写像の合成 | ある処理に外側の観測範囲を重ねる | 結合性は利用できるが、順序交換や分配は仮定しない |
| 同値類への分類 | 詳細の異なる同種エラーを同じ`error.type`へ写す | 分類値から元のerror値へ戻そうとしない |
| 集約のモノイド | Metricの件数・和・固定bucketの集約 | 構造を理解し、集約の実装自体はSDKへ委ねる |

これらが存在するからといって、同名の型クラスや汎用frameworkをすべて新設するわけではない。**数学は、何を安全に合成できるか、どこで情報が失われるか、どの法則をテストすべきかを決めるために使う。**

| 論点 | 初期実装の推奨 | 今は採らないもの |
|---|---|---|
| 実装の差し替え | 明示的に渡す関数レコード | production / testごとにUseCase本体を複製 |
| 実行の型 | まず`IO`上の境界 | 差し替えのためだけに任意の`m`へ一般化 |
| 依存の受け渡し | 引数。依存が増えたらReader環境 | ReaderにSDK Contextの実体を二重保存 |
| Span | 対象処理と最終結果の観測方法を受ける高階操作 | 公開`start` / `end`と自由なStatus更新だけのAPI |
| エラー分類 | 機能固有の純粋関数 | 共通`RAGScopeError` / `ErrorType` / `ErrorClassifier` |
| 型クラス | 現時点では必須にしない | 「Haskellだから」を理由とした導入 |
| 資源管理 | SDKごとの取得・解放を安全に合成するAdapter入口 | 一度に取得した扱いにして部分初期化の解放を失う形 |
| テスト | 利用側は記録用レコード、Adapterは本物のSDKとテスト用Processor / Exporter | no-opだけでSDK接続まで検証したとすること |

追加確認で、これらの推奨を変更する新しい事実は確認されなかった。変わったのは、SDK helperと低水準APIの比較条件、Contextの適用範囲、部分初期化時のcleanup、例外EventRecordの所有範囲、Metric操作を追加する条件を、より具体的に記述できるようになった点である。

## 4. 依存の抽象化はCabal境界まで含める

### 4.1 型の所有者を利用側へ置く

`telemetry-boundary`がSDK非依存の要求と操作の形を定義し、`opentelemetry-adapter`がそれを満たす値を構築する。`application`はその値を受け取る。実行時にAdapterが呼ばれることと、静的にapplicationがAdapterをimportすることは別である。

たとえば記録関数のclosureがSDKのLoggerを内部に保持していても、公開型がSDK非依存の入力から`IO ()`を返す形なら、利用側はLoggerを参照する必要がない。ただし`type`によるSDK型の別名や、そのSDK型のconstructorを公開した`newtype`ではこの分離は成立しない。

constructorを隠した`newtype`でも、`telemetry-boundary`自身がSDK型を保持する定義を書けば、そのlibraryにSDK依存が必要になる。「opaqueなら依存が消える」とは考えず、SDK型を閉じ込める定義・closureの構築はAdapter側へ置く。

| component案 | 参照するRAGScope内の型・操作 | 必要な内向き依存 | SDK依存 |
|---|---|---|---|
| `application` | Telemetry操作、観測要求。自身の具体的なerror type | `ragscope:telemetry-boundary` | 持たない |
| `telemetry-boundary` | 操作のrecord、利用に必要な値の型 | なし | 持たない |
| `opentelemetry-adapter` | 境界recordと要求値。SDKのSpan / Logger / Meter / Context | `ragscope:telemetry-boundary` | 必要なpackageを明示 |
| executable | Application入口、Adapterの構成・使用入口 | `ragscope:application`、`ragscope:telemetry-boundary`、`ragscope:opentelemetry-adapter` | マップの案では直接持たない |

これは別々の配布packageを増やす案ではない。1つの`ragscope` package内にprivateなnamed sublibraryを作る案である。`cabal-version: 3.4`では同一package内も`ragscope:telemetry-boundary`のように明示する。[Cabal仕様変更][E1]

### 4.2 公開範囲と参照禁止は別の仕組み

`visibility: private`は他packageからの利用を制限する。`exposed-modules`は、そのlibraryへ依存する別componentがimportできるmoduleを決める。private sublibraryだからすべて`other-modules`でよいわけではない。[Cabalのlibrary仕様][E2]

同じcomponentの中では、module名を`Internal`にしても、公開型を隠しても、Cabalはmoduleごとの依存禁止を指定しない。SDKを`application`の`build-depends`へ入れてから「UseCaseだけはimport禁止」と文章で運用する方法より、componentを分けて依存を与えない方法を優先する。

### 4.3 機能固有error型の位置

マップの`UseCase.*.Error`と`UseCase.*.Telemetry`の分離には根拠がある。後者が具体的なerror型から観測値へ変換し、UseCase本体が両者を呼ぶので、本体とTelemetry定義の相互importを避けられる。

ただしSDK Adapterから`UseCase.*.Error`をimportして分類する案は採らない。その場合Adapterがapplicationに依存する。分類済みのSDK非依存な観測値、または機能固有の純粋な分類関数を受け取ることで、依存を逆転させずに結果を記録できる。

`.Error`が`other-modules`でも、UseCaseの公開moduleから必要な型・constructorまたは用途に合った参照関数を再公開できる。API / CLIがエラーを区別する必要を満たす公開範囲は実装時に確認する。

## 5. 関数レコード・型クラス・効果の表現を比較する

### 5.1 関数レコードは「操作をまとめた値」

提案するrecordはログやSpanの履歴そのものではなく、実行可能な操作の集まりである。productionではSDKを呼ぶ関数、利用側テストでは呼び出し内容を保持する関数、記録不要ならno-opを入れる。同じUseCaseへ異なるrecord値を渡せる。

Trace・Logs・Metrics・Contextを各々小さなrecordとし、全体recordはそれらの直積としてまとめられる。ただしLogsだけを使う補助関数へSDKの寿命まで含む巨大な環境を渡す必要はない。最小の必要な操作を渡し、アプリケーションの組み立て箇所で必要な束を作る。

この直積に対し、`Monoid Telemetry`を当然に定義してはいけない。2つのLogs操作へ同じ入力を送ると二重出力になり、2つのSpan操作を合成するとSpanが入れ子になる。recordであることは、同じ意味の結合演算を持つことを意味しない。

### 5.2 型クラスが変えるもの

型クラス案では、たとえば「この実行の型はTrace操作を利用できる」という制約を関数へ付け、そのinstanceが実装を提供する。recordが明示的に渡す操作の辞書を、型クラスでは型に応じて選ぶ、と理解すると比較しやすい。

型クラスでもproduction / testの切り替えは可能である。別の実行型を用意するか、同じ実行型のReader環境にrecordを置き、instanceから読む方法がある。後者はrecordと型クラスを併用する案であり、完全に別の設計ではない。

型クラスにしただけでは、同じ`IO`型について設定の異なるinstanceを実行ごとに直接選べるわけではない。また、任意の型クラスに結合法則や例外安全性が自動で与えられるわけでもない。どの法則を持つ操作かは別に定義する。

### 5.3 同じ基準での比較

| 候補 | 責務・静的依存 | 境界で渡すもの・型による制約 | テスト | 実装量・変更影響 | 今回の評価 |
|---|---|---|---|---|---|
| 関数レコード＋`IO` | 境界が操作の型、Adapterが実装。SDK依存をcomponentで隔離 | SDK非依存の値と`IO`処理。ADTで入力制約を表現 | 同じ実行型へ別recordを渡せる。SDKテストも自然 | 小。フィールド追加の影響はrecord生成箇所 | 第一候補 |
| 関数レコード＋任意の`m` | 依存方向は同じ | 処理を囲む操作では`m`の内外を扱う能力が必要 | 純粋な解釈も可能だが、例外・Contextの再現に差が出る | 中。高階操作の持ち上げ・制約が増える | 具体的な複数実行型の必要が出たら |
| 独自型クラス | classを境界、instanceをAdapterまたは組み立て側へ置ける | class辞書を型制約として渡す。法則は別途必要 | test用実行型、またはrecordを読むinstance | 中。instance、newtype、派生・制約の管理 | 利用箇所が増えて効果が明確なら再評価 |
| SDK APIへ直接依存 | SDK本体とAPIは分かれるが、RAGScope独自の利用境界が薄くなる | `Tracer`等のSDK ecosystemの型 | SDKを使うテストが中心 | 変換は減るが外部API変更が利用側へ届く | 指定マップのSDK型を隠す目的には不適合 |
| Free / 効果handler方式 | 操作の記述と解釈を分離できる | Spanは内部処理を含む高階操作。通常の単純な命令列だけでは不足 | 記述を調べるテストに向くがSDKの実挙動は別 | 大。scope・例外・他IOとの接続が必要 | 今回の要求では利益不足 |
| `WriterT`で記録を蓄積 | 純粋な記録列の生成には適する | 履歴を返す形。現在Context、処理中のemit、終了処理とは異なる | 純粋変換の確認には有用 | 配送まで担わせると独自Runtime化 | 本番Telemetry境界には採らない |

`Free`は不可能、`WriterT`は常に悪い、という判断ではない。今回要求される処理範囲・例外・SDK資源管理に対し、それらを導入する追加理由が確認できないという評価である。

### 5.4 `IO`から始めてよい理由

SDKを呼ぶproduction実装と記録内容をメモリへ保持するテスト実装は、どちらも`IO`で表現できる。実装の差し替えと、実行の型を変えることは別問題である。error分類・属性生成・最終結果の観測値への変換を純粋に保てば、全体を任意の`m`へ一般化しなくてもHaskellの利点を得られる。

将来、Reader環境が有用なら`ReaderT Env IO`またはそのnewtypeを検討できる。これは依存の受け渡しを簡潔にする仕組みであり、Contextの保持方式を変更する話ではない。

この推奨は実測で変更し得る提案である。次のいずれかが実装・実測で確認された場合は再評価する。

1. Application入口が安定した独自monadへ統一され、Telemetryの`IO`操作を都度出し入れすることで例外・Context semanticsが壊れる、または責務が著しく読みにくくなる。
2. 採用する安全なSpan実装が`MonadUnliftIO`のscopeを利用側へ露出させないと成立せず、Adapter内部の`IO` closureへ閉じ込める方が不自然になる。
3. Telemetry以外も含む依存が増え、関数recordの明示受け渡しより`ReaderT Env IO`等へまとめる方が、具体的な呼び出し側・テスト・変更影響で有利になる。
4. 型クラスを使うことで実際の複数実装選択が簡潔になり、record injectionより静的制約・テスト容易性で明確な利益が出る。

「Haskellらしいから」「将来effectを変えるかもしれないから」だけでは推奨を変更しない。

## 6. Spanは高階操作として捉える

### 6.1 記録命令ではなく、処理の範囲を受け取る

Logsへのemitは「値を渡して記録する」操作だが、Spanは「ある処理の間、親子関係と寿命を持つ」操作である。そのため、処理を引数に取り、その前後でSpanを開始・終了する高階関数が適する。

説明のため、Spanの定義を固定した処理の囲み方を`W`と呼ぶ。単純化した形は`IO a → IO a`であり、利用側の結果型`a`を変えない。recordの中に任意の`a`を受ける操作を持つ場合は、`forall a`によるrank-2のフィールドが候補となる。

ただし`forall a`は「本体を必ず1回だけ実行する」「キャンセルを握りつぶさない」「例外を変えない」を型だけで証明しない。本体を繰り返す実装や停止しない実装も書ける。これらは操作の契約とテストで守る。

### 6.2 最終結果をどう受け取るか

| 候補 | 受け取るもの | 長所 | 制約・危険 | 評価 |
|---|---|---|---|---|
| 自由なSpan handle | 開始要求。利用側が後からStatus更新・終了 | SDKに近い自由度 | 終了漏れ、別Span更新、途中失敗のStatus残留を利用側へ露出 | 利用側の基本APIには非推奨 |
| 任意結果と観測関数 | Span要求、対象処理、返された結果から最終観測値へ写す純粋関数 | `Either`以外の具体的結果にも対応。元の結果を返せる | 観測関数の全域性・評価範囲を守る必要 | 基本形の第一候補 |
| `Either err a`に特化 | Span要求、対象処理、`err`から必要な属性値への変換 | `Left` / `Right`と設計の成功・失敗が対応しやすい | すべてのAPIをこの結果形式に固定すると過剰 | 実際のUseCaseに応じた補助形 |
| 結果と観測値の組 | 対象処理から、業務結果と最終観測値を一緒に返す | 分類済みなのでAdapterが業務型を知らない | 2つの値の矛盾を作れる。利用側が毎回組を返す負担 | 分類が独立関数にしづらい場合の候補 |

推奨は、**結果を分類する純粋関数を渡せる囲み操作**と、必要な結果形式に合わせた薄い補助関数である。Adapterは結果の具体的な型を知らず、分類後の観測値だけをSDKへ変換する。UseCaseのretry / fallbackの外側に親Spanを置き、その全体の返り値を分類する。

### 6.3 自己写像と合成から分かること

結果型を固定すると`W`は処理から処理への自己写像である。関数合成には結合性があり、何もしない囲み方は恒等写像になる。この意味では`Endo`に対応する見方ができる。[Data.Monoid][E3]

ただし、次を区別する。

- `W₁ (W₂ action)`と`W₂ (W₁ action)`では親子関係が逆になる。可換ではない。
- `W (action₁ >> action₂)`は1つの範囲だが、`W action₁ >> W action₂`は2つの範囲になる。同じ観測ではない。
- `W (pure value)`でもSpanを作るので、`pure`を保存するMonadの準同型とは一般にいえない。
- 結果の値に依存する分類関数まで含めると、任意の`fmap`と自由に交換できる自然変換だとは主張できない。

したがって`Endo`を公開APIへ必須にするのではなく、**囲む順序が意味を持つこと、処理を分割・統合する最適化がTraceの意味を変えること**を実装判断に使う。

### 6.4 効果の型を一般化する際の非対称性

Logsのような`入力 → m ()`は、`m x → n x`という変換があれば、出力側にその変換を適用しやすい。一方、Spanの`m a → m a`は入力側にも`m`を持つ。`m → n`の変換1つだけでは、外から渡された`n a`を内部の`m a`へ戻せない。

これが「record全体を一律にhoistすればよい」としない理由である。任意の効果の型への一般化は、単純な型変数追加だけでは終わらない。

候補SDKの`inSpan`系列は`MonadUnliftIO`を要求する。これは現在の実行環境を保って処理を`IO`で実行するための能力であり、単に`IO`を持ち上げる`MonadIO`より強い。[SDK Trace][S3]

`unliftio-core`の確認ソースはReaderTのinstanceを提供し、状態を持つ変換子では法則を満たす必要を明記している。`ExceptT err IO`についても、失敗時に任意の`a`を返す`IO a`を一般的に得られないので、通常のunliftを当然には使えない。`runExceptT`した後の`IO (Either err a)`を囲み、返り値を分類する方が今回の目的に合う。[unliftio-coreの型と法則][E4]

### 6.5 遅延評価による範囲の違い

`IO a`が値を返したことは、`a`の内部がすべて評価済みであることを意味しない。返した遅延値をSpan終了後に評価して例外が出ても、その例外は既に終了したSpanの内部で発生したとは扱えない。

最終分類に必要な`Either`のconstructorや観測値はSpan内で評価する。一方、任意の結果に`NFData`を課して全体を深く評価する案は、計算量・処理範囲・公開型の要求を変えるため採らない。遅延した結果をどこまで実行結果に含めるかは、その機能の責務に合わせる。`evaluate`による評価と例外の扱いはGHCの説明を参照する。[Control.Exception][E5]

## 7. エラー分類は情報を保った純粋な写像にする

### 7.1 元のerror型と観測表現は異なる

ある機能の具体的なerror型を`E`、その機能のSpanに必要な分類値の集合を`K`とする。`c : E → K`という分類を考えればよい。ここで`K`は説明上の記号であり、共通`ErrorType`という新しいHaskell型を作る提案ではない。

元の`E`から、API / CLIの表現、実験結果の失敗表現、Telemetry表現へ、それぞれ直接変換する。Telemetry表現を経由してほかの表現へ変換すると、そこで失われた詳細を復元できない。正本は、この元のerror値の保持を既に要求している。[Observability設計 第3章][R1]

### 7.2 同値類への分類として考える

`c(e₁) = c(e₂)`となるerror値同士を同じ分類と見なすと、分類は詳細なerror値を同値類へまとめる操作に対応する。ファイル名やメッセージが異なっても、同じ失敗の種類であれば同じ分類値になる。

この見方から、次の実装方針が導かれる。

- 分類は通常、多対一である。逆変換を期待しない。
- 詳細なerror値を分類値で置き換えず、元の機能結果をそのまま返す。
- 「同じ種類」の基準は、その機能のerror型と適用するSemantic Conventionから決める。
- 型が`Text`であるだけでは値の種類が少ないことを保証しない。限定されたconstructorから定数へ分岐するなど、生成経路を限定する。
- `Show`や例外メッセージを分類へ流し込む方法は、安定性と値の種類の制限を保証しない。

数学的な同値関係があること自体は、low cardinalityの証明ではない。分類値の集合がどこまで限定されるかは、具体的な生成規則を見て確認する。

### 7.3 反変の構造を利用する

記録操作が観測用の値`T`を消費し、機能値`E`から`T`への純粋変換があるとき、変換を記録操作の前へ置けば`E`を記録できる。この「入力の前処理で、消費する値の型を変える」向きが反変の構造である。[Data.Functor.Contravariant][E6]

恒等変換を前置しても意味は変わらず、2段階の変換を前置することと合成済みの変換を1回前置することは同じ意味になる。ただし変換が純粋で全域的な範囲で考える。

RAGScopeでは、`UseCase.*.Telemetry`にこの入力変換を置く。機能固有のerror型を知るのはそのmoduleであり、SDK Adapterは変換後の値だけを知ればよい。

この構造が1〜2箇所しかなければ、通常の関数合成で十分である。`Contravariant` instanceや汎用の消費者型を必ず導入する必要はない。複数の記録先へ分配するための型クラスも、現時点では用途がなく、独自Sinkを増やす方向へ使わない。

### 7.4 成功と失敗の直和を、Span全体の万能型にしない

RAGScope独自Spanの最終結果については、「成功」と「必要な`error.type`を伴う失敗」を直和として表す候補がある。成功側に`error.type`を持たせなければ、「成功なのにerror属性が必須」という不正な組み合わせを作りにくい。

ただし、これは観測上の最終結果の型であり、UseCaseの共通エラー型ではない。さらに、標準HTTP / DB / GenAIのStatus規則や、キャンセルの扱いまでこの二択に押し込まない。適用する規則が異なる処理は、その標準計装・Adapterで扱う。

汎用属性mapから自由に`error.type`を書き込めるなら、直和で排除した不正状態を迂回できる。成功・失敗を表す管理対象の属性と、追加属性の生成経路を分け、予約済みのキーを上書きさせない設計も必要になる。

### 7.5 親子のStatusをモノイド化しない

子のStatusを「1つでもErrorなら全体Error」という演算でまとめると、fallbackに成功した親まで失敗になる。これは現在設計と合わない。

集約すべきものは「子SpanのStatus一覧」ではなく、その親処理の機能上の返り値である。Spanの木構造と業務結果の合成規則は一致するとは限らない。`All` / `Any`、最大Severity、例外件数などから親Statusを決める案は採らない。

## 8. Logsと属性は、意味の違いを型へ反映する

### 8.1 通常ログと名前付きイベント

通常の診断メッセージと、名前を持つ出来事の記録には共通項目がある。一方、EventRecordでは名前と発生条件が意味を持つ。SDKのLogRecord全項目を多数の`Maybe`で模写するより、用途を分けた入力型または別操作にする案が適する。

| 候補 | 型で表現できること | 増えるもの | 推奨 |
|---|---|---|---|
| 通常ログとイベントを直和の2分岐にする | イベント側でEventNameを必須にできる | 両方を共通emitで扱う分岐 | 共通項目が多く、利用が自然なら |
| 通常ログ用・イベント用の別recordと別操作 | 呼び出し箇所で用途が明確 | 共通項目の小さな共有が必要 | 第一候補。実際の項目数で判断 |
| 単一recordに任意のEventNameを持つ | SDKに近い | 名前付きイベントの制約が生成時検証へ寄る | Adapter内部なら自然。利用側へそのまま広げない |

EventRecordはOTelのLogRecordにEventNameを持たせた表現であり、別の配送Signalではない。通常ログとイベントの分離は利用時の制約を表すためで、二つの独自ログ基盤を作る話ではない。[OTel Events][E7]

### 8.2 時刻とSeverityを混同しない

イベントのtimestampは「何が起きた時点か」を表す。SDKが受け取った時点のobserved timestampと同じとは限らない。後からまとめてイベントを作ると、必要な時刻を失う場合がある。発生時刻を明示する必要がある操作では入力に含め、SDKが持つ観測時刻と区別する。

SeverityはSeverityNumberの意味を維持する。旧設計の独自5段階へ縮約しない。全数値域のどこまでを初期公開型で扱うかは実装時に選べるが、変換不能な値を黙って別のSeverityへ置き換えない。[Logs Data Model][E8] [ADR-0006][R6]

SeverityとSpan Statusは直交する。エラーレベルの診断ログを出しても、機能が回復して成功したなら、それだけで親SpanをErrorへ変更しない。

### 8.3 属性のmapには、自明な「正しい結合」はない

属性はキーと値の有限な対応である。固定した優先規則による上書き結合は結合的にでき、空mapを単位元にできる。しかし一般に可換ではなく、左右のどちらが勝つかで意味が変わる。

| 方法 | 性質 | RAGScopeでの扱い |
|---|---|---|
| 右または左を優先して結合 | 結合的にできるが順序依存 | 明確な優先順位がある局所的な組み立てに限る |
| キーの重複を拒否 | 重複時は失敗するため、成功するmap上の全域なモノイドとは異なる | 定義・設定の検証に向く |
| 所有者ごとに生成経路を分ける | 合成前に不正な上書きを減らせる | `error.type`等の管理対象を保護する第一候補 |

単なる`Map Text Text`では、数値・真偽値・配列等を適切に渡せない。反対に、すべてを汎用JSON値へ変換すると、SDKの受け入れる型との差や、数値の意味を境界で失う可能性がある。

推奨は、**今回必要なOTelの値の意味を保つSDK非依存の小さな型**である。Span / Metric属性とLogsのBody・属性について、同じ値の範囲を使えるとは先に決めない。候補SDKのLogsは`AnyValue`を使用しており、Traceの属性型とは別moduleになっている。SDK型を丸ごと再公開する代わりに、実際に必要な入力と変換可能性を対にして確認する。[SDK Logs引数][S5]

### 8.4 型で名前を付ける価値を選別する

EventName、Span名、Metric名、単位、timestampは、基礎型が同じでも意味が違う。取り違えが起きる公開境界には`newtype`が有効である。ただしconstructorを隠さず生の文字列を自由に包めるなら、名前の形式やlow cardinalityは保証しない。

`newtype`を増やす基準は、「違う意味の値を誤って渡すことを防げるか」「生成時の不変条件を一箇所で守れるか」である。すべての文字列に機械的にwrapperを付けることではない。

## 9. ContextはReader環境とは分け、必要な操作を公開する

### 9.1 依存を読むことと、現在のSpanを読むこと

Reader環境へ入れるものは、Telemetry操作、DBやHTTP操作、設定など、実行に必要な依存である。現在のSpanを表すSDK ContextはSDKが保持する。両者を同じ環境として扱うと、SDKが更新した現在SpanとRAGScopeが保存したSpanがずれる可能性を作る。

したがって「recordをReaderTで渡す」は候補だが、「ReaderTをOTel Contextの代替にする」は採らない。

### 9.2 一時的な環境の適用と復元

Contextには、ある処理の間だけ値を適用し、終了後は以前の状態へ戻す構造がある。成功だけでなく例外・キャンセルでも復元される必要がある。これは動的な実行範囲の管理であり、Context値を自由に合成するモノイドと捉えるより、範囲を囲む操作として捉える方が適切である。

OTelのContext仕様ではContext自体は不変で、attachのTokenをdetachへ渡して以前のContextへ戻す。候補SDKも`getContext`、`attachContext`、`detachContext`を提供する。[OTel Context][E9] [SDK ThreadLocal][S6]

### 9.3 同一スレッド、子スレッド、通信を分ける

| 境界 | 必要なこと | 推奨する公開範囲 |
|---|---|---|
| 同一スレッドの子Span | 現在Contextから親を得て、範囲内だけ子を有効化し、復元 | Trace操作内部で完結 |
| 別スレッドへ処理を渡す | 親側でContextを取得し、子側の処理範囲へ適用 | 必要な伝播操作だけ。SDK Context値を業務値にしない |
| HTTP等へ送信 | 送信時点のContextをPropagatorでcarrierへinject | 通信実装に合うSDK非依存の入口 |
| RAGScope APIの外部入力 | 外部ContextをInvocationのparent / Span Linkへ使わない | 入力境界固有の規則。通常の子Span作成と分ける |

外部入力を親にしない一方、AI推論サービスへの呼び出しには現在Contextを引き継ぐ。この違いを「Contextを受け取ったら常にextractして親にする」という汎用関数で消してはいけない。[実行追跡設計 第2・3章][R2]

### 9.4 値を公開せずに引き継ぐ候補

Contextを捕捉した処理を後で実行する形なら、SDK Contextはclosureの内部へ閉じ込められる。SDK非依存な操作として、対象の処理を渡し、「現在Contextを取得済みの実行処理」を返す形が候補になる。

大切なのは、**親スレッドで捕捉する段階と、子スレッドで実行する段階を分けること**である。子が始まってから`getContext`しても親のContextは得られない。

候補SDKの`OpenTelemetry.Context.ThreadLocal.Propagation`は、green threadがthread-local Contextを継承しないため、子threadへ現在Contextを持ち込む目的のmoduleとして実装されている。`propagateContext :: IO a → IO (IO a)`は、親側で`getContext`し、返す処理の先頭で`attachContext`してから本体を実行する。同じ処理内では`attachContext`が返すTokenを保持せず、`detachContext`も呼ばない。[SDK Propagation][S7]

したがって`propagateContext`、`tracedAsync`、`tracedForkIO`等は、**新しく作る子thread向けの補助関数**として扱う。すでに別Contextがあるthread、thread pool worker、同一thread上の一時scopeへそのまま使うと、処理終了後に以前のContextへ戻らない。

既存threadへ一時的にContextを適用する必要がある場合は、SDKのToken付き`attachContext` / `detachContext`を例外安全に対にする囲み操作をAdapter内部へ置く案を比較する。[SDK ThreadLocal][S6]

```text
source thread:
  captured <- getContext

target thread:
  attachContext captured
  ├─ action
  └─ detachContext token
```

ここでの囲み方は説明用であり、実装では成功・同期例外・キャンセルの全経路で復元するよう`bracket` / `mask`相当の配置を確認する。

Contextを捕捉しても、そのSpanやSDK Providerの寿命が延長されるとは限らない。子処理の完了を待つ責務は呼び出し側の実行制御にあり、Telemetry Adapterに業務スレッドの実行順序を決めさせない。

### 9.5 Propagatorには既存の合成がある

候補SDKの`Propagator`は、carrierからContextを取り出す関数と、Contextをcarrierへ書く関数を持つ。`Semigroup` / `Monoid` instanceも提供される。[SDK Propagator][S8]

これをRAGScope独自の伝播frameworkへ置き換える必要はない。使用するPropagatorをSDK構成で選ぶ。ただし複数Propagatorの合成は同じcarrierやContextへ順に作用するので、順序独立とは仮定しない。HTTP headerの具体形は通信実装時の契約へ置く。

## 10. SDKの寿命は取得・使用・解放の構造として扱う

### 10.1 初期化済みの値を返すだけでは不足する

TracerProvider、LoggerProvider、MeterProviderには利用期間があり、その期間にProcessor / Exporterも動く。関数レコードがこれらをclosureに保持している場合、recordが生成できたことと、その背後の資源をいつ解放するかは別の問題である。

推奨するAdapter入口は、構成を受け取り、初期化済みのTelemetry操作をcallbackへ渡し、callback終了後に必要なflush / shutdownを行う形である。明示的なhandleを返す形は、開始・終了を異なる箇所で制御する実需要がある場合の候補にする。

callback形式も、通常の`IO`上では操作recordを外へ保存したり、子スレッドを残したりすることを型だけで完全には禁止しない。rank-2の寿命パラメータを付けても、それを捕捉した`IO`処理の持ち出しまで自動で防げるとは限らない。線形型などを先行導入せず、callback終了前に利用処理を完了させる契約と、終了後の利用を発生させない組み立てを基本とする。

### 10.2 取得の合成は、結果recordの直積と同じではない

3つのProviderが揃った状態は直積で表せるが、3つを順に取得する途中では失敗し得る。第1の取得後に第2が失敗した場合、第1を解放する必要がある。

確認commitの`initializeOpenTelemetry`は、TracerProvider、MeterProvider、LoggerProviderを順に取得した後で、3つをまとめて終了する`otelShutdown`を組み立てる。[SDK入口][S12]

この統合helper自身には、第2または第3Providerの初期化が例外で失敗した場合に、それ以前に取得済みのProviderをrollbackする明示的なcleanup経路がない。`withOpenTelemetry = bracket initializeOpenTelemetry otelShutdown`の外側`bracket`も、acquireである`initializeOpenTelemetry`が値を返す前に例外になった場合は`otelShutdown`を呼べない。

したがって、ここは単なる「cleanupを証明できない」という確認不足ではなく、**統合helperのソース上、部分取得失敗に対する明示的rollbackが存在しないことを確認済み**とする。ただし、どの実設定で後段初期化が例外になり、thread / socket / queueやglobal stateが具体的にどう残るかは未実測である。

各取得段階で解放責務を登録できる構造、またはその保証を持つSDK APIを使う必要がある。固定個数のProviderを組み立てる今回の候補では、段階的な資源管理を第一比較候補とする。資源の数や取得順が動的になった場合は`ResourceT`等を再評価できるが、それだけのために新たな独自資源管理frameworkを作らない。

### 10.3 どの失敗でどの結果を返すか

| 発生箇所 | 決定済みの意味 | 実装時に定めること |
|---|---|---|
| 起動時の構成・初期化 | 具体的な扱いは正本で固定されていない | 起動失敗にするか、明示的な縮退を許すか。部分取得済み資源の解放 |
| 本体実行中の記録・export | 機能上の成功を失敗へ変えない | SDKが返す失敗値・例外をどこで処理するか |
| 本体の通常失敗 | 元の具体的なerror値を保つ | 最終観測値の生成と記録 |
| 本体の同期例外 | Statusを反映し、元の例外を再throw | 記録処理の失敗で元の例外を置き換えない |
| キャンセル・中断 | cleanup後に再throw | 採用runtimeでの判別、cleanupの時間上限 |
| 終了時のflush / shutdown | 詳細はコンポーネント実装で定める | timeout、残るProviderの解放、終了結果の表現 |

OTel仕様も起動時の構成失敗と実行中のSDK失敗を区別する。「SDK失敗は機能結果を変えない」という規則を根拠に、初期化失敗まで無条件に隠す提案はしない。[OTel Error handling][E10]

### 10.4 逆順に解放すれば常に正しい、とはしない

依存する資源は利用される側を先に破棄しない。さらに終了中のTrace処理がLogsを利用するなどの関係があれば、それに合った順序が必要になる。実際の依存とSDK APIの意味を確認して順序を選ぶ。

flushとshutdownの両方を無条件に二重実行することも避ける。SDKのshutdownが何をflushし、どの失敗値を返し、繰り返し呼び出しをどう扱うかを調べる。公開handle方式なら解放済みへの二度目の操作の扱いも必要である。

ここで必要なのはSDK APIの安全な組み立てであり、RAGScope独自のqueue・再送・Exporterではない。

## 11. 例外の記録と失敗の隔離は、別の責務に分ける

### 11.1 まず4種類を分ける

1. 機能が返す具体的な通常の失敗値。
2. 機能処理から逃げる想定外の同期例外。
3. キャンセル・中断。
4. Telemetryの記録・変換・export・cleanup自体の失敗。

`SomeException`を捕捉できることは、この区別ができることを意味しない。Haskellでは`throwTo`等による例外配送と、例外型による同期・非同期の分類も完全には同一でない。採用する例外・並行処理libraryが、キャンセルをどの型・規約で表すかを確認する。

### 11.2 本体全体に「失敗しても無視」を掛けない

Telemetry操作を無害化するために「Span開始、本体、ログ記録、Span終了」の全体を広いcatchで包み、例外を握りつぶすと、本体の失敗まで消す。さらに本体をno-op経路で再実行すると、DB更新やHTTP要求を二重実行する可能性を作る。

推奨は、SDK呼び出しと本体の実行位置を分け、どの段階で本体が既に実行されたかを区別することである。

| 状態 | 守るべきこと |
|---|---|
| Spanの準備が失敗し、本体は未実行 | 契約に従い記録を省略して本体を実行する候補。ただし汚したContextの処理を先に行う |
| 本体が結果を返した | 記録失敗で結果を置き換えない。本体を再実行しない |
| 本体が同期例外を投げた | 記録を試みた後、元の例外を伝播する。記録の失敗で上書きしない |
| キャンセルが来た | 通常の成功や機能上の失敗へ変換せず、cleanup後に伝播する |

「no-op化すれば安全」とは限らない。Span開始後にContextが残っているなら、記録を省略するだけでは次の処理へ誤った相関が漏れる。失敗を注入した各段階でContextを観測する必要がある。

### 11.3 Status更新と例外EventRecordの担当を分ける

例外が子Spanと親Spanの両方から未処理のまま逃げる場合、それぞれの処理が失敗として終わるので、各SpanのStatus更新が必要になる。一方、同じ例外のLogs EventRecordは1件である。

したがって「各Spanの終了結果を反映する責務」と「例外の出来事を1件記録する責務」は同じ操作ではない。Trace Adapter内部で例外を検出し、Logs Adapterの記録処理を呼ぶ接続は必要になり得るが、両moduleを相互importする必要はない。Adapterの構築入口で、Trace側へ必要なLogs操作を渡す形が候補となる。

この接続はSDK Adapter内部で閉じる。UseCaseがSDK例外イベントの重複確認やLoggerの取得を担当する形にはしない。

### 11.4 「1件だけ」を実現する候補と限界

正本は1件だけ記録することを決めているが、例外の同一性判定や記録済み通知のHaskell APIを定義していない。[ログ・イベント設計 第4章][R3]

| 候補 | 仕組み | 利点 | 成立条件・残る問題 |
|---|---|---|---|
| 記録担当の範囲を明示する | 観測する範囲のうち1箇所が例外Logsを所有し、内外のSpanはStatus更新のみ | 元の例外を包み直さず、比較用の全体台帳も不要 | root / UseCase / 入出力の各経路を漏れ・重複なく割り当てる必要 |
| 伝播範囲内で記録済み状態を共有 | 同じ例外が上へ伝わる間、既記録である情報を扱う | より汎用的な入れ子に対応する余地 | 新たな例外、回復後の再実行、並行処理での区別と寿命が必要。単一Boolでは足りない |
| 例外を独自wrapperで包む | 元の例外と記録済み情報を伝える | 通知を明示できる | `fromException`等のcatch契約を変える。元の例外をそのまま再throwする要件に反するおそれ |
| 文字列・型名・アドレスで重複排除 | 比較キーを蓄積する | 表面的には共通化しやすい | 同じ種類の別発生を潰す、同一性を保証できない、状態保持が増える |

**初期候補は、例外Logsを記録する担当範囲を明示する方式**とする。さらに、各SpanのStatus更新と例外EventRecordの所有を構造上分ける案を第一候補として実測する。

概念上は次の形である。

```text
withSpan root $
  withUnhandledExceptionEventOwner $
    withSpan useCase $
      withSpan internal $
        action
```

ここで`withSpan`は、自身の外へ逃げる同期例外について自分のSpanを`Error`にし、`error.type`を設定し、Logs EventRecordは作らず、元の例外を再throwする。internal、UseCase、rootの各Spanから同じ例外が未処理で逃げるなら、各Spanがそれぞれ自身の失敗として`Error`になる。

`withUnhandledExceptionEventOwner`は、内側から逃げる例外についてLogs EventRecordを1件だけemitし、Span Statusは担当せず、元の例外を再throwする。これによりwrapper例外や文字列・アドレスによるglobal dedupを導入せず、EventRecord生成箇所を構造上1箇所にできる。

owner scopeをroot Spanの内側、UseCase Spanの外側へ置けば、inner Span終了後でもroot Spanがcurrent Contextとして残るため、そのEventRecordはrootへ相関し得る。ただし正本は「必ず最内側Spanへ関連付ける」とは定めていない。ownerの最終配置と、どのSpanへの相関が診断上適切かは実測後に決める。

UseCaseを呼ばないInvocation、UseCaseを呼ぶ前後の例外、複数の観測範囲が入れ子になる場合も列挙し、担当範囲に漏れ・重複がないことを確認する。

標準計装が同じ例外EventRecordを既に記録した場合の重複も、任意のlibraryについて自動検出できるとは確認できていない。利用する計装ごとに、自動記録を止める設定または担当の分担を確認する。制御も既記録の把握もできない計装については、そのままで完了条件を満たしたとしない。

これは意味の再設計が必要という結論ではなく、**採用SDK・計装を決めた後に成立を実測すべき、実装方式の選択**である。

### 11.5 SDK helperを選ぶ条件

確認したSDKの`inSpan`系列では、例外分類が`ErrorException`なら`setStatus`と`recordException`、`RecordedException`なら`recordException`、`IgnoredException`ならどちらも行わない。`recordException`はSpan Eventを作る。[SDK Trace][S3] [ExceptionHandler][S4]

つまり「Errorだけ付けて例外Span Eventを作らない」というRAGScopeの組み合わせは、この分類設定だけではそのまま得られない。これは候補SDKソースから確認済みの事実である。

ただし、ここから`inSpan`系列を直ちに不採用とする必要はない。最小実測では次の2案を比較する。

| 実装候補 | 具体的な形 | 選ぶ条件 |
|---|---|---|
| helperの自動例外処理を抑制 | `inSpan'`等の例外分類を`IgnoredException`相当にし、callback内部でRAGScopeが`setStatus`、`error.type`、Logs EventRecordを明示して元例外を再throw | helperがContext復元・Span終了・キャンセルを必要どおり保証し、抑制後に自動Span Eventが0件になる |
| 低水準APIをAdapter内で合成 | `createSpan`、`getContext`、`insertSpan`、`attachContext` / `detachContext`、`setStatus`、`endSpan`を組み合わせる | helperの副作用が要件に合わず、低水準APIで本体1回・元例外保存・Context復元を安全に実装できる |

低水準案の概念的な処理順は次のとおりである。これは採用済みAPIではなく、実測用の候補である。

```text
parentContext <- getContext
span <- createSpan tracer parentContext spanName spanArguments
token <- attachContext (insertSpan span parentContext)

bodyを1回だけ実行
  ├─ 成功: 必要な最終観測を反映
  ├─ 通常の返り値による最終失敗: Error + error.type
  ├─ 未処理同期例外: Error + canonical exception class name
  │                    + ownerならLogs EventRecord 1件
  │                    + 元例外を再throw
  └─ cancellation / interruption: 通常失敗と分けてcleanup後に再throw

endSpan span
detachContext token
```

実装ではこの字面の順序をそのまま採るのではなく、`mask` / `restore` / `bracket`相当の配置を決める。特に、本体が1回しか実行されないこと、Telemetry cleanup失敗が元例外を置き換えないこと、成功・同期例外・キャンセルの各経路でContextが復元されることを確認する。

後者はSDKを置き換える独自Trace実装ではない。SpanとContextの実体はSDKへ委ね、RAGScopeの終了規則をSDK APIの呼び分けで実現する。安全性の検証範囲は広がるため、第14章の例外・Context・cleanup検証が選択条件になる。

## 12. Metricsの数学的構造はSDKへ委ねる理由にもなる

### 12.1 三つのSignalは同じ演算を持たない

Traceは処理範囲と親子関係、Logsは時点の記録、Metricsは測定値の集約である。Logsに単純な逐次emitがあるからといって、SpanやMetricも「汎用イベントを送る」APIへ揃えると、終了・Context・instrument・単位の意味を失う。

全体recordで一緒に渡すことはできるが、一つの汎用`emit`や共通の`Monoid`へ統合する必要はない。

### 12.2 集約で成り立つ法則と、その前提

同じinstrument・単位・属性の組み合わせ・互いに重ならない測定集合という前提で、次の構造を考えられる。

| 集約 | 数学的な形 | 前提・注意 |
|---|---|---|
| 件数 | 自然数の加算、単位元0 | 同じ測定を二重に含めない |
| 和 | 数値の加算 | 機械の浮動小数点では丸めにより厳密な結合性が崩れる |
| 平均 | 「和、件数」の直積を成分ごとに結合し、最後に割る | 平均値だけを再平均しても一般には正しい平均にならない |
| 固定bucketのHistogram | 同じbucket境界の件数ベクトルを成分ごとに加算 | 境界が違うものをそのまま足さない |
| 最新値 | 時刻等で最後の測定を選ぶ | 単純な加算ではない。同時刻時の規則も必要 |

ここで数学的に合成できることと、SDKのexport済み点を自由に足せることは別である。累積値の重複期間、delta / cumulative、instrumentの違い、属性集合を考慮する必要がある。[Metrics Data Model][E11]

この複雑さは独自集約の導入理由ではなく、既存SDKへ委ねる理由になる。

### 12.3 境界の候補

| 候補 | 利点 | 問題 | 評価 |
|---|---|---|---|
| 任意のMetric名・値・属性を受ける万能操作 | 一見拡張しやすい | CounterとHistogram、単位、許可属性を区別しにくい | 非推奨 |
| instrument種別と値の意味を区別する小さな操作 | `add`と`record`を区別でき、SDK型を隠せる | 初期の公開範囲を実需要から選ぶ必要 | 具体的な明示Metric操作が必要になった箇所の候補 |
| 標準計装が持つMetricをそのまま使う | Semantic Conventionとの整合を保ちやすい | 使用componentとProviderの共有を確認する必要 | 標準計装が適用できる機能で優先 |

RS-0024ではMetricsのSDK初期化・終了と後続から利用可能な構成が必要である。これは「いま使う業務MetricがないからMetricsを未接続にしてよい」という意味ではない。一方、完了条件を満たすために新しい`ragscope.*` Metricを作る必要もない。

現在の正本には、applicationから手動で記録するRAGScope独自Metricや、特定の標準Metric用の具体的な記録操作は定義されていない。したがって、**RS-0024の初期application-facing boundaryへ、`addMetric`、`recordMetric`、汎用Counter / Histogram生成などの万能操作を先行追加する根拠はない**。

初期実装では、Adapter側にMeterProvider、Reader / Exporterの差し替え、flush / shutdown、後続の標準計装が同じSDK構成を利用できる接続を用意する。後続で具体的な標準Metricを手動記録する必要が生じた時点で、そのMetricに必要な狭い操作だけを境界へ追加する。

テストでは、選択した標準Metricまたはテスト限定の測定定義でProvider / Reader / Exporterの接続を確認し、検証用定義を本番の共通Metricとして公開しない。

### 12.4 属性の数は型と生成箇所で抑える

MetricにTraceId / SpanIdや文書IDを自動付与すると、値の組み合わせが実行ごとに増える。TraceとLogsの相関用情報を、そのままMetrics共通属性として再利用しない。[Metrics設計 第2章][R4]

将来、標準Metricごとの属性が決まった段階で、許可された属性だけを生成する型や関数を検討する。まだMetric定義がない段階で、大きな型レベルの属性Schemaや汎用instrument registryを先行実装しない。

## 13. Haskell libraryとの具体的な接続候補

### 13.1 SDKの確認範囲

以下は候補SDK commitのソース確認結果である。APIが存在すること、呼び出すと何を実行するコードか、RAGScopeの契約を満たすことは、それぞれ別段階として扱う。

| 必要な能力 | 確認したSDK module / API | 抽象化への影響 |
|---|---|---|
| Spanの作成と終了 | `OpenTelemetry.Trace.Core`の`createSpan`、`endSpan` | SDK SpanはAdapter内部に保持可能 |
| Spanの範囲 | 同moduleの`inSpan`、`inSpan'`、`inSpan''` | `MonadUnliftIO`制約と例外自動記録を考慮 |
| 例外設定 | `OpenTelemetry.Trace.ExceptionHandler`の分類・handler | StatusのみとSpan Eventのみを独立に組み合わせる設定ではない |
| Logs | `OpenTelemetry.Log.Core`の`emitLogRecord`、`LogRecordArguments` | EventNameを含むSDK非依存入力から変換する |
| LogsのContext相関 | 実装`OpenTelemetry.Internal.Log.Core`の`emitLogRecord` / `createImmutableLogRecord` | `context`未指定時は現在Contextを読み、Spanから相関情報を得る |
| Metrics | `OpenTelemetry.Metric.Core`の`getMeter`、Counter / Histogram等 | SDKのMeterやinstrumentを利用側の型へ漏らさず接続できる |
| Metrics構成 | `OpenTelemetry.MeterProvider`の`createMeterProvider` | Reader / Exporter等はAdapterの構成へ閉じる |
| Context保持 | `OpenTelemetry.Context.ThreadLocal` | attach / detachの組と復元範囲が必要 |
| Context伝播 | `OpenTelemetry.Context.ThreadLocal.Propagation`、`OpenTelemetry.Propagator` | 子スレッドと通信の処理を区別する |
| 全Signal初期化 | `OpenTelemetry.SDK`の`initializeOpenTelemetry`、`withOpenTelemetry` | 設定・部分取得・解放の要件に合わせて採否を判断 |
| Traceテスト | `OpenTelemetry.Exporter.InMemory.Span`の`inMemoryListExporter` | 戻り値は`SpanProcessor`と記録参照 |
| Logsテスト | `OpenTelemetry.Exporter.InMemory.LogRecord`の`inMemoryLogRecordExporter` | 戻り値は`LogRecordExporter`と記録参照。Processorへの接続も必要 |
| Metricsテスト | `OpenTelemetry.Exporter.InMemory.Metric`の`inMemoryMetricExporter` | collection / exportの段階を通して検査する |

根拠は[SDK Trace][S3]、[ExceptionHandler][S4]、[Logs実装][S9]、[Metric API][S10]、[MeterProvider][S11]、[SDK入口][S12]、[Spanテスト出力][S13]、[Logsテスト出力][S14]、[Metricテスト出力][S15]。

READMEやHaddockの例をコピーする前に、実際の型定義を確認する。たとえば確認commitの`LogRecordArguments`は`context :: Maybe Context`、`eventName :: Maybe Text`、`body :: AnyValue`等を持つ。公開module冒頭の説明例には異なる項目名があるため、本レポートは型定義と実装を根拠にした。[Logs公開module][S16] [Logs引数の実定義][S5]

### 13.2 初期化helperを無条件採用しない根拠

確認commitの`initializeOpenTelemetry`は、TracerProvider、MeterProvider、LoggerProviderを順に初期化し、その後にまとめたshutdown処理を作る。`withOpenTelemetry`はその全体を`bracket`で囲む。[SDK入口][S12]

追加確認により、統合helper自身には、第2または第3Providerの初期化が例外で失敗した場合に、先に取得済みのProviderをrollbackする明示的なcleanup経路がないことを確認した。外側の`bracket`も、acquireである`initializeOpenTelemetry`が返る前の例外にはreleaseを実行できない。

さらに`initializeGlobalTracerProvider`はTracerProviderを初期化した後、globalへ設定して返す。後続Providerの初期化で失敗した場合、取得済みProviderだけでなくglobal stateが既に変更済みである可能性も考慮する必要がある。[SDK Trace][S3]

同じ`initializeOpenTelemetry`のshutdown処理は各Providerの終了を`SomeException`で捕捉して捨てる形で、返す`otelPropagators`は`mempty`である。これらを確認せずに「終了失敗を呼び出し側が観測できる」「このhandleから目的のPropagatorが得られる」とは主張できない。

ここで確認済みなのは**統合helperに部分取得失敗の明示的rollbackがないというソース上の構造**である。実際にRAGScopeの設定でどの初期化が失敗し、thread / socket / queue、global Provider等がどう残るかは未実測である。

これはSDK全体が要件を満たさないという結論ではない。RAGScope Adapterが使用する入口を選ぶための観測項目である。**段階的にProviderを取得して取得済み資源のcleanupを登録できる構成と、採用するPropagatorを明示する構成を第一候補として比較する。**

### 13.3 本番とテストを切り替える場所は二つある

| 切り替え | 変えるもの | 同じに保つもの | 確かめる対象 |
|---|---|---|---|
| applicationのテスト | SDK非依存なTelemetry record値 | UseCase本体、機能固有の変換 | 何を、どの条件で、何回記録しようとしたか |
| Adapterのテスト | SDKのProcessor / Exporter / Reader等の構成 | Adapter本体、SDKへの変換・操作 | Context、Status、EventName、実際の記録、終了処理 |

production用Adapterとtest用Adapterを別々に実装すると、後者だけ正しく動く可能性を残す。Adapter本体は同じにし、SDK構成を差し替える。

候補SDKには、Adapterテストで利用できる次のin-memory実装がある。

- Span: `inMemoryListExporter`が`SpanProcessor`と記録参照を返す。[Spanテスト出力][S13]
- Logs: `inMemoryLogRecordExporter`が`LogRecordExporter`と記録参照を返す。LoggerProviderへ接続するProcessorは別途構築する。[Logsテスト出力][S14]
- Metrics: `inMemoryMetricExporter`が`MetricExporter`と記録参照を返す。Reader / collection / exportの段階も含めて接続する。[Metricテスト出力][S15]

これらを使い、productionと同じAdapter実装へテスト用SDK構成を差し込む。

ただしテスト用実装が常に例外を投げる場合、それは「記録失敗を外へ漏らさない」という境界契約に適合しない可能性がある。UseCaseテストで安易に契約違反のrecordを渡して失敗を握りつぶす実装を要求しない。**SDK呼び出しの失敗をAdapterの内側へ注入し、境界の外へどう現れるかを確認するテスト**と分ける。

### 13.4 MainへSDK型を渡さない構成の候補

マップはMainからSDKへ直接依存しない構成を提案している。この前提で`[SpanProcessor]`等をMainが組み立ててAdapterへ渡す案は整合しない。

第一候補は、Adapterが所有するSDK非依存の構成値・構成生成関数をMainが選び、内部でProcessor / Exporterを構築する方法である。必要な送信先、標準環境変数の利用、テスト構成への切り替え等を表す。OTel設定全体を独自型へ網羅的に複製しない。

Adapterテストから任意のSDK Processor / Exporter / Readerを差し込む必要があるため、production向け高水準入口とは別に、SDK型を受ける狭い低水準構築入口をAdapter library内の限定moduleへ置く案を第一候補とする。その入口はapplicationへ渡す境界には含めない。

概念上は次の分離である。module名は未決定である。

```text
RAGScope.Telemetry.OpenTelemetry
  -> Main / production向けのSDK非依存な高水準入口

RAGScope.Telemetry.OpenTelemetry.Construction
  -> Adapter test等が使う低水準入口
     Processor / Exporter / Reader等のSDK型を受ける
```

ここには公開範囲の判断が伴う。`other-modules`の内部関数は別test-suiteからそのままimportできない。必要な場合だけprivate Adapter sublibraryの`exposed-modules`へ狭い構築入口を置くか、テスト支援componentを設ける。

避けるのは次である。

- テストのためだけにAdapter内部moduleをすべて公開する。
- production用Adapterとtest用Adapterを別実装にする。
- applicationのtest-suiteへSDK依存を入れる。
- 同じAdapterソースをtest-suiteの`hs-source-dirs`から二重コンパイルすることを既定案にする。

現在の`ragscope.cabal`はまだ無名library、executable、test-suiteのみであり、named sublibraryやOpenTelemetry依存は実装されていない。[Cabal][R7] したがって、ここで述べるcomponent構成は実装提案である。

### 13.5 追加libraryの採否

| library / 標準機能 | 用途 | 初期判断 |
|---|---|---|
| `base`のADT・関数・`Control.Exception` | 境界型、純粋変換、`IO`、取得と解放 | 中核として利用 |
| `text`等の値を表すlibrary | 名前・属性・単位等をSDK非依存に表現 | 実際に使う型に応じて直接依存を明記 |
| `transformers` / `mtl` | Reader環境、機能固有の失敗処理 | 依存の受け渡しや既存関数の形で必要になったら |
| `unliftio-core` | Reader等の実行環境を保つ高階IO操作 | 任意の`m`を公開するなら候補。`IO`固定なら境界のための直接依存は必須でない |
| `exceptions`等 | 例外・資源管理を実行型について一般化 | 使用する実行型と必要な保証を確認して選択 |
| `ResourceT`を提供するlibrary | 動的な資源取得と解放登録 | 固定Providerの組み立てだけでは先行導入しない |
| `hs-opentelemetry-api` / `hs-opentelemetry-sdk` | OTelの型・記録・資源構成 | Adapterの候補。固定versionで依存解決を確認 |
| `hs-opentelemetry-exporter-in-memory` | SDKを使う観測テスト | 必要なテストcomponentへ限定 |
| OTelの標準計装・Propagator | 後続のHTTP / DB / GenAI等との接続 | 実際の機能とAPIからcomponentを選ぶ |
| `co-log` / `katip` / `monad-logger`等 | 既存ログ利用をOTelへ接続 | 現在の最小構成に導入理由はない。Logs Adapterが直接Bridge APIへ接続する候補を優先 |
| Free / 効果library | 記述と解釈の分離 | 今回は導入を推奨しない |

SDKに間接依存があることと、RAGScopeの各componentが直接依存を宣言する必要があることを区別する。importするmoduleの提供packageを確認し、必要なcomponentの`build-depends`へ置く。

## 14. 数学的な性質を実装の検証へ落とす

本章は将来の実装で行う検証の提案であり、今回実行済みのテスト一覧ではない。

### 14.1 三段階に分ける

| 段階 | 使用する実装 | 主な確認 |
|---|---|---|
| 純粋な型・変換 | SDKなし | 分類、属性、結果の意味、不正な組み合わせの排除 |
| UseCaseと境界の接続 | SDKなしの記録用record | 呼び出しの条件・回数、親子の結果を混同しないこと |
| AdapterとSDKの接続 | 本物のSDK＋制御可能なProcessor / Exporter等 | 実際のContext、出力、失敗の隔離、キャンセル、終了 |

型で排除した状態を、無理に不正constructorや部分関数で作るテストは不要である。代わりに公開constructor・生成関数の制約を確認する。Cabalの依存を検査することと、実行テストの役割も分ける。

### 14.2 検証すべき性質

| 性質 | 具体的に見るもの | 見落としを防ぐ条件 |
|---|---|---|
| 結果保存 | no-op / 記録あり / SDK記録失敗で本体の返り値が変わらない | 元の具体的error値の詳細も残る |
| 本体の実行回数 | 本体内の制御可能な副作用の回数 | 開始・終了・ログ記録の失敗で再実行しない |
| 成功の観測 | RAGScope独自Spanの`Unset`と`error.type`不在 | SDKの`Ok`を慣習的に設定しない |
| 回復の観測 | 失敗した子Spanと、回復して成功した親Span | 親へ子Statusを合成しない |
| エラー分類の安定性 | 同じ種類でID・パス・詳細だけを変えた入力 | 分類値を詳細文字列から作っていない |
| イベントの必要条件 | 通常の`Left`、Span開始・終了だけではEventRecordが増えない | 名前付きの状態遷移を別に定義した場合と分ける |
| 現在Context | 子のSpanIdと親ID、Logsの相関 | Context復元後の兄弟が直前の子を親にしない |
| 別スレッドの伝播 | 親で捕捉して子で使うContext | 同時に動く別Invocationと混ざらない |
| 入力と出力の伝播規則 | 外部callerを親にせず、AI推論サービスへの送信では継続 | rootを常に既存Contextの子として作らない |
| 例外の保存 | 捕捉側が元の例外型・値を受け取る | 記録・cleanup失敗で別例外にしない |
| 例外EventRecordの個数 | 子・親・rootを通る同じ伝播経路で1件 | 同じ型・メッセージの別発生は別件として残る |
| Span Eventの抑制 | Logs側で記録した例外のSpan Eventが増えない | 選んだSDK helperと標準計装の両方を確認 |
| キャンセル | 外側でキャンセルを観測できる。Contextと資源が片付く | 単純な`SomeException`の無視で成功扱いにしない |
| 部分初期化の解放 | 第2・第3Providerの取得失敗後、取得済み資源が解放される | 成功経路だけでlifecycleを確認しない |
| 終了処理 | flush / shutdownの呼び出し、失敗値、timeout、残り資源の解放 | 最初の終了失敗で後続を放置しない |
| Metricの接続 | 測定が選択したReader / Exporter経由で得られる | Providerを作っただけで接続完了としない |
| Metric属性 | 実行識別子が勝手に追加されない | Trace / Logs用共通属性の流用を検出 |

### 14.3 数学的な法則をテストする範囲

分類関数の入力変換については、恒等変換と合成済み変換が同じ出力を生む性質を確認できる。属性の結合にモノイドを採る場合は、選んだ衝突規則のもとで結合性と単位元を確認する。Spanについては、合成順序を入れ替えても同じTraceになるというテストを作らない。

観測を無効にした場合の「同じ結果」は、主に機能結果と本体の実行・失敗の保存を意味する。実時間、割り当てメモリ、スケジューリングまで完全に同じとは主張しない。Telemetryによる遅延が業務timeoutへ及ぼす影響も、必要な実測なしに無影響と断定しない。

### 14.4 実測なしに確定しない項目

| 項目 | 今回の状態 | 次に確認する根拠 |
|---|---|---|
| package versionの採用 | 未決定 | RAGScopeのCabal条件での依存解決・build |
| 調査commitと配布版の同一性 | 確認不能 | 選択した配布ソースまたは固定git revision |
| 対象GHC / OSでの動作 | 確認不能 | 実際の開発・CI環境での最小実行 |
| helperと低水準APIの選択 | 提案まで | `inSpan'`抑制案と低水準API案で、例外・Context復元・Span Event・本体実行回数を比較 |
| キャンセルの具体的な判別 | 未決定 | 採用するruntime・並行処理libraryの型と実行結果 |
| 例外記録担当の最終APIと配置 | 提案まで | root / UseCase / 内部処理の入れ子と標準計装でowner scopeを実測 |
| 初期化失敗・終了timeoutの運用 | 未決定 | Adapter構成と機能結果・終了結果の実装方針 |
| 部分初期化時の具体的な残存資源 | 確認不能 | 第2・第3Providerの制御された初期化失敗 |
| 必要なMetricの明示操作 | 現時点では追加しない提案 | 後続の標準Metric利用で手動記録が必要になった具体的箇所 |

`initializeOpenTelemetry`に部分取得失敗時の明示的rollbackがないこと自体は、実測待ちではなく第10.2・13.2節のソース確認済み事実である。実測待ちなのは、その失敗をRAGScope環境でどう起こし、何が残り、どのcleanup構成が十分かである。

### 14.5 境界APIを決める前の最小実測

最初の実装では、広い検証項目を一度に実装せず、次の5件をこの順で行うことを推奨する。

#### 1. RAGScope環境での依存解決・import smoke test

最低限、候補となる`hs-opentelemetry-api`、`hs-opentelemetry-sdk`、`hs-opentelemetry-exporter-in-memory`と、実際に必要なPropagator / Exporter packageをRAGScopeのGHC / base条件で解決・buildできるか確認する。

ここで失敗する場合、境界APIを先に詳細化しない。採用package / version / revisionの判断へ戻る。

#### 2. Span scope・最終結果・例外

同じケースを次の2方式で比較する。

- `inSpan'` + 自動例外記録抑制 + callback内の明示処理
- `createSpan`等の低水準API

確認するのは、親子関係、Span内current Context、終了後のContext復元、成功時`Unset`、通常失敗時`Error + error.type`、同期例外時`Error + canonical exception class name`、例外Span Eventが0件、元例外がそのまま外へ出ること、本体実行回数が1回であること。

この結果でSpan boundaryの基本形を決める。

#### 3. nested exceptionとLogs EventRecord exactly-once

```text
root
└─ UseCase
   └─ internal
      └─ 同期例外
```

例外が外へ逃げた各Spanの`Error`と`error.type`、Logsの例外EventRecordが1件だけであること、例外Span Eventが0件であること、EventRecordのTraceId / SpanId、owner scopeの位置との相関、最終的に同じ元例外が外へ出ることを確認する。

この結果で例外EventRecord ownerのAPIと配置を決める。

#### 4. Contextのthread間伝播と復元

新しく作るchild threadと、すでに別Contextを持つ既存worker相当を分ける。親Contextの捕捉、子/worker内のcurrent Span、成功・同期例外・キャンセル後の元Context復元、outbound propagatorのinjectでcurrent Trace Contextをcarrierへ書けることを確認する。

この結果でContext boundaryに必要な操作を決める。

#### 5. SDK lifecycle・失敗隔離

Trace / Logs / Metricsを制御可能なProcessor / Exporter / Readerで構成し、Provider取得・終了、flush / shutdown結果、第2・第3Provider取得失敗時のcleanup、終了の一部失敗後も残りを終了すること、controlled exporter failureで成功した機能結果が変わらないこと、Telemetry失敗を同じ経路へ再帰記録しないこと、MetricsのProvider / Reader / Exporter接続を確認する。

この結果でLifecycle入口とAdapter testの低水準構築入口を決める。

```text
実測1 -> 採用package / revision候補
実測2 -> Span boundaryの基本形
実測3 -> 例外EventRecord ownerのAPIと配置
実測4 -> Context伝播の公開操作
実測5 -> Adapter lifecycle / test構築入口
```

関数レコード + `IO`という大枠は実測1〜4を通して再評価する。細かなrecord fieldや公開moduleは、これらの実測前に固定しない。

## 15. モジュールマップへの評価と具体化候補

### 15.1 維持する案

| マップの案 | 評価の理由 |
|---|---|
| applicationとAdapterがboundaryへ依存する | 利用側がSDK型を知らず、同じ操作形へ別実装を渡せる |
| 機能固有のTelemetry定義を機能側へ置く | error型と観測の意味を知る場所で純粋変換を定義できる |
| SDK lifecycleをAdapterへ置く | MainとUseCaseからProvider / Processor / Exporterを隠せる |
| Context値より操作の公開を先に検討する | SDKの実体管理を二重化せず、伝播の必要に限定できる |
| Adapterを環境別に複製しない | テストがproductionと同じ変換・例外処理を通る |

### 15.2 実装で具体化する内容

| module案 | 入力と出力・責務の提案 |
|---|---|
| `RAGScope.Telemetry` | 必要なSignal操作recordをまとめる。Providerの寿命や機能結果の意味を所有しない |
| `RAGScope.Telemetry.Trace` | Span要求・対象処理・最終結果の観測方法を受け、元の結果を返す囲み操作 |
| `RAGScope.Telemetry.Logs` | 通常ログと名前付きイベントの入力、記録操作。SDKが現在Contextを読むための接続先 |
| `RAGScope.Telemetry.Metrics` | 初期段階では汎用emitを前提にしない。具体的な標準Metricの手動操作が必要になった場合だけ、その最小の型と操作を置く候補 |
| `RAGScope.Telemetry.Context` | 子処理・通信へ引き継ぐための必要な操作。独自Context値の貯蔵場所にしない |
| `RAGScope.UseCase.*.Telemetry` | 機能固有の定義と純粋変換。Spanの対象範囲・EventRecordの記録条件を機能本体と接続 |
| `RAGScope.Telemetry.OpenTelemetry` | 構成からSDK資源と操作を組み立て、使用期間を囲む高水準入口 |
| `RAGScope.Telemetry.OpenTelemetry.Lifecycle` | 段階的取得、部分失敗の解放、終了処理。SDKの実際の戻り値を処理 |
| Adapter内のTrace / Logs | 各SpanのStatus更新と例外EventRecord ownerを分離し、重複を避ける |
| Adapter内の限定構築入口 | Processor / Exporter / Reader等を受けるAdapterテスト用の低水準入口。applicationへは公開しない |

この表はmoduleを必ずすべて独立した大きさで作る命令ではない。型も処理も存在しない空moduleを増やす必要はない。実際のexportと責務ができた時点で、マップの境界を保つ最小構成へ落とす。

### 15.3 増やさない抽象化

- Trace / Logs / Metricsを一律に扱う汎用イベントbus。
- SDK Contextの複製と独自TraceId / SpanId生成。
- すべてのUseCaseが返す共通エラー型・共通エラー分類class。
- Spanの全階層でSeverityまたは子Statusを合成する仕組み。
- SDKと同じqueue、batching、filtering、配送、再送のRuntime。
- 実際の必要がない自由モナド、効果framework、型レベルの汎用属性Schema。
- 配送先の切り替えだけを目的とした複数の本番Adapter実装。
- 現在要求のない汎用Metric名・値・属性emit API。

独自型を一切持たないという意味ではない。**必要な利用操作と不変条件を表す型は持ち、外部SDKの機構を再実装する型・処理は持たない**という区別である。

## 16. 後続の実装で判断する順序

1. **本レポートの基準commitからの変更を確認する。** 正本設計・Ticket・実装が変わっていれば、関係する結論を再評価する。Workbenchの案を正本として上書きしない。
2. **RAGScope環境でSDK候補の依存解決・import smoke testを行う。** package / revision候補とin-memory exporterを実際にbuildできることを先に確認する。
3. **Spanの最小実測でhelper抑制案と低水準API案を比較する。** Status、`error.type`、Span Event、Context復元、本体1回、元例外保存を確認してSpan boundaryの基本形を決める。
4. **nested exceptionでEventRecord ownerを実測する。** root / UseCase / internalのStatusとLogs 1件の両立、相関するSpan、標準計装との重複を確認する。
5. **Contextのthread間伝播と復元を実測する。** fresh childと既存workerを分け、outbound injectまで確認して公開操作を決める。
6. **SDK lifecycleと失敗隔離を実測する。** 部分初期化、flush / shutdown、controlled exporter failure、Metrics接続を確認してAdapter入口を決める。
7. **Cabalの依存境界と最小moduleを具体化する。** applicationとboundaryからSDKが参照できず、Adapterがapplicationへ依存しないことを確認する。
8. **純粋な入力型・結果分類と、必要な関数レコードを決める。** 成功・失敗、名前付きイベント、管理対象属性の不正な組み合わせを減らす。現時点で根拠のないMetric emit操作は追加しない。
9. **同じAdapterを本番構成とテスト構成へつなぐ。** in-memoryのSpan / Logs / Metrics出力を使い、戻り値・Context・出力内容・終了結果を検査する。利用側の記録用recordテストとは分ける。
10. **採用した判断だけを正本のコード・設定・テストへ反映する。** 必要な設計判断は正本へ内容そのものを記録し、Workbenchへの必須参照を作らない。

最初の実装で必要なのは、高度な抽象化の網羅ではない。操作の差し替え、結果と例外の保存、範囲と資源の安全な終了、SDK依存の隔離という、今回の契約を具体的に守る構造である。

## 17. 参照資料

本文中のリンクは下表の資料へ対応する。RAGScopeの現在仕様の根拠はR系の正本であり、W系のWorkbenchマップと本レポートの提案はその代わりにしない。

| 区分 | 参照した資料 |
|---|---|
| R1〜R4 | Observability設計、実行追跡設計、ログ・イベント設計、Metrics設計 |
| R5〜R6 | RS-0024 Ticket、ADR-0006 |
| R7〜R9 | 現在のCabal、Main、test入口 |
| R10〜R12 | Haskellコーディング規約、システムアーキテクチャ、ユースケース設計 |
| W1 | 実装前のHaskellライブラリ・モジュールマップ |
| S1〜S16 | 固定commitのhs-opentelemetry依存定義・公開API・内部実装・テスト用出力先 |
| E1〜E11 | Cabal仕様、Haskell標準library・unliftio-coreの説明、OpenTelemetry仕様 |

追加で参照した正本：[Haskellコーディング規約][R10]、[システムアーキテクチャ][R11]、[ユースケース設計][R12]。Haskell標準libraryの法則・例外の参考資料はAPIの一般的な意味を確認するために使用しており、RAGScopeがその資料の古いbase versionを採用することを意味しない。

[R1]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/observability/Observability%E8%A8%AD%E8%A8%88.md
[R2]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/observability/%E5%AE%9F%E8%A1%8C%E8%BF%BD%E8%B7%A1%E8%A8%AD%E8%A8%88.md
[R3]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/observability/%E3%83%AD%E3%82%B0%E3%83%BB%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E8%A8%AD%E8%A8%88.md
[R4]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/observability/Metrics%E8%A8%AD%E8%A8%88.md
[R5]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%B8OpenTelemetry%20Observability%E6%9C%80%E5%B0%8F%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md
[R6]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/adr/ADR-0006%20OpenTelemetry%E3%82%92Observability%E3%81%AE%E5%85%B1%E9%80%9A%E5%9F%BA%E7%9B%A4%E3%81%A8%E3%81%97%E3%80%81Trace%E3%83%BBLogs%E3%83%BBMetrics%E3%81%AE%E8%B2%AC%E5%8B%99%E3%82%92%E5%88%86%E3%81%91%E3%82%8B.md
[R7]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/ragscope-app/ragscope.cabal
[R8]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/ragscope-app/app/Main.hs
[R9]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/ragscope-app/test/Main.hs
[R10]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/rules/Haskell%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0%E8%A6%8F%E7%B4%84.md
[R11]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3.md
[R12]: https://github.com/takashit16833/RAGScope/blob/a829713bca576b01278351bf30cac20d06f2b94a/project-docs/design/%E3%83%A6%E3%83%BC%E3%82%B9%E3%82%B1%E3%83%BC%E3%82%B9%E8%A8%AD%E8%A8%88.md
[W1]: https://github.com/takashit16833/Workbench/blob/17e8403be6835c4bf1e910c371c75bc1d62b75cc/Notes/RAGScope/RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3/RS-0024%20Haskell%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA%E3%83%BB%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%9E%E3%83%83%E3%83%97.md
[E1]: https://cabal.readthedocs.io/en/latest/file-format-changelog.html#cabal-version-3-4
[E2]: https://cabal.readthedocs.io/en/3.12/cabal-package-description-file.html
[E3]: https://downloads.haskell.org/ghc/9.0.1/docs/html/libraries/base-4.15.0.0/Data-Monoid.html
[E4]: https://github.com/fpco/unliftio/blob/d3a6da7b70d45bd350cdf62823bbe8ff9c0efc22/unliftio-core/src/Control/Monad/IO/Unlift.hs
[E5]: https://downloads.haskell.org/ghc/9.0.1/docs/html/libraries/base-4.15.0.0/Control-Exception.html
[E6]: https://downloads.haskell.org/ghc/9.0.1/docs/html/libraries/base-4.15.0.0/Data-Functor-Contravariant.html
[E7]: https://opentelemetry.io/docs/specs/semconv/general/events/
[E8]: https://opentelemetry.io/docs/specs/otel/logs/data-model/
[E9]: https://opentelemetry.io/docs/specs/otel/context/
[E10]: https://opentelemetry.io/docs/specs/otel/error-handling/
[E11]: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
[S1]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/sdk/hs-opentelemetry-sdk.cabal
[S2]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/hs-opentelemetry-api.cabal
[S3]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Trace/Core.hs
[S4]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Trace/ExceptionHandler.hs
[S5]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Internal/Log/Types.hs
[S6]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Context/ThreadLocal.hs
[S7]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Context/ThreadLocal/Propagation.hs
[S8]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Propagator.hs
[S9]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Internal/Log/Core.hs
[S10]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Metric/Core.hs
[S11]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/sdk/src/OpenTelemetry/MeterProvider.hs
[S12]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/sdk/src/OpenTelemetry/SDK.hs
[S13]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/exporters/in-memory/src/OpenTelemetry/Exporter/InMemory/Span.hs
[S14]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/exporters/in-memory/src/OpenTelemetry/Exporter/InMemory/LogRecord.hs
[S15]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/exporters/in-memory/src/OpenTelemetry/Exporter/InMemory/Metric.hs
[S16]: https://github.com/iand675/hs-opentelemetry/blob/5a267e690941bc3817b1de8dbd496cb35bb4788c/api/src/OpenTelemetry/Log/Core.hs
