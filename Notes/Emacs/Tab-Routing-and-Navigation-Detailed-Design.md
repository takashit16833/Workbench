# タブルーティング / Navigation 新詳細設計

## このノートの読み方

基本設計の「どういう考え方で作るか」を、実装できるところまで具体化したノート。

ここに書いた関数名は候補。API 名を守ることより、**観測 → 純粋な判断 → 副作用** の境界が分かりやすいことを優先する。

実装前に Emacs 31.1 / Better Jumper / Bufferlo の実際の挙動を確認し、もっと単純な形があれば変えてよい。

## 実装前にやる小さな実験

まず Navigation の履歴方式だけを小さく試す。

```text
A. Emacs標準 xref の global history
B. Better Jumper
```

確認したい動作はこれ。

```text
Project A / a.el : 10
        ↓
Project B / b.el : 20
        ↓
戻る
        ↓
Project A / a.el : 10

進む
        ↓
Project B / b.el : 20
```

file / point / tab が全部正しいかを見る。

さらに、buffer を kill した後の戻り方と、タブをまたいだ時の履歴保存先も確認する。

この実験で xref / Better Jumper のどちらを使うか決めてから、本実装へ進む。

## 1. モジュール構成

初期案は3ファイル。

```text
elisp/
├── my-tab-routing.el
├── my-project-context.el
└── my-navigation.el
```

責務:

```text
my-tab-routing.el
  File / Buffer → Destination
  Destination + Tabs → Plan
  Plan → Tab 操作

my-project-context.el
  Current Tab → Project root
  Project root → project-current の文脈

my-navigation.el
  Before / After Location → record?
  移動の観測
  採用した履歴機能への記録
```

タブの色・表示・キー操作などは、必要に応じて `config/` 側で設定する。

Bufferlo は Routing 本体へ入れず、hook で接続する。

## 2. 命名方針

内部関数は `--` を使う。

ただし「純粋関数だから内部」という意味ではない。

例:

```elisp
my/tab-routing-destination
my/tab-routing-plan
```

はテスト対象となる中心ロジックなので、名前上も明確にしてよい。

Emacs 状態を読む・変更する境界には、役割が分かる名前を付ける。

例:

```elisp
my/tab-routing--project-root
my/tab-routing--tab-snapshot
my/tab-routing--execute-plan
my/navigation--capture
my/navigation--record
```

## 3. Destination の表現

Destination は plist とする案を第一候補にする。

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

Misc:

```elisp
(:id misc
 :name "Misc")
```

cons の、

```elisp
(ID . NAME)
```

でも表現できるが、今後フィールドを1つ増やすだけで構造を変える必要がある。

一方、plist は Emacs Lisp では自然で、過度な型定義も不要。

現時点では `cl-defstruct` までは導入しない。

## 4. Routing Facts

Destination 判定へ渡す事実。

初期案:

```elisp
(:file "/work/foo/src/Main.hs"
 :project-root "/work/foo/"
 :kind file)
```

xref のような場合:

```elisp
(:file nil
 :project-root "/work/foo/"
 :kind xref)
```

特殊バッファ:

```elisp
(:file nil
 :project-root nil
 :kind special)
```

ただし実装時、引数が少ないままで済むなら plist を作らず、

```elisp
(my/tab-routing-destination file project-root kind)
```

でもよい。

「将来増えるかもしれない」という理由だけでデータ型を作らない。

## 5. Destination 判定

純粋関数:

```elisp
my/tab-routing-destination
```

責務:

```text
Routing Facts
    ↓
Destination or nil
```

この関数の中では次を呼ばない。

- `project-current`
- `project-root`
- `current-buffer`
- `buffer-file-name`
- `default-directory`
- `tab-bar-tabs`

これらはすべて外側で観測する。

### Project の例

入力:

```elisp
file         = "/work/foo/src/Main.hs"
project-root = "/work/foo/"
kind         = file
```

出力:

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

### Misc

どのルールにも該当しないファイルを Misc にする場合:

```elisp
(:id misc
 :name "Misc")
```

ファイルを持たない普通の特殊バッファは、ルーティングしないなら `nil`。

## 6. ルールの実装方法

最初は単純な `cond` を候補とする。

概念:

```elisp
(cond
 ((...)
  ...)
 ((and file project-root)
  ...)
 (file
  ...)
 (t nil))
```

旧実装の `my/tab-routing-filters` のようなプラグイン型ルール一覧は、次の要件が出たときに検討する。

- config 側からルールを追加したい
- パッケージごとにルールを登録したい
- ルール数が増えて `cond` が読みにくくなった

それまでは導入しない。

## 7. Project root の観測

Routing 用の Project 判定では、**対象ファイル側の directory を必ず明示する**。

概念:

```elisp
(project-current nil target-directory)
```

流れ:

```text
target file
  ↓
target directory
  ↓
project-current nil TARGET-DIRECTORY
  ↓
project-root
```

現在タブの Project Context に引っ張られないことが重要。

Project root は `project-root` が返す表記を基本にし、末尾 `/` を揃える程度にする。

`file-truename` は最初から使わない。symlink / TRAMP で実際に困ってから考える。

## 8. Buffer から Facts を作る境界

候補:

```elisp
my/tab-routing--buffer-facts
```

責務:

- `buffer-file-name` を読む
- major mode / derived mode を見る
- `default-directory` を読む
- 必要なら Project root を問い合わせる

出力だけを純粋な `my/tab-routing-destination` へ渡す。

ここは Emacs 依存の境界なので、ERT を大量に書く対象にはしない。

必要なら少数の統合テストだけにする。

## 9. Tab Snapshot

`tab-bar-tabs` の生データを純粋ロジックへ渡さない。

境界で必要情報へ変換する。

例:

```elisp
((:index 1
  :current t
  :id misc
  :name "Misc")
 (:index 2
  :current nil
  :id (project . "/work/bar/")
  :name "bar"))
```

関数候補:

```elisp
my/tab-routing--tab-snapshot
```

この関数は `tab-bar-tabs` を読む境界。

Snapshot から先は純粋にする。

## 10. Tab Plan

純粋関数:

```elisp
my/tab-routing-plan
```

入力:

```text
Destination
Tab Snapshot
```

出力:

### 現在のタブが目的地

```elisp
(:action stay)
```

### 別の既存タブ

```elisp
(:action select
 :index 2)
```

### 存在しない

```elisp
(:action create
 :id (project . "/work/foo/")
 :name "foo")
```

この関数では tab-bar API を呼ばない。

## 11. Plan の決定規則

順序:

```text
1. 現在タブの ID == Destination ID
      → stay

2. 既存タブに同じ ID がある
      → select

3. それ以外
      → create
```

旧互換の、

```text
IDなし + 同名
```

による再利用は採用しない。

理由:

- 新規構築なので移行互換が不要
- 偶然同名の手動タブを乗っ取らない
- Plan が単純になる
- テスト条件が減る

## 12. Tab ID

プロジェクト:

```elisp
(project . "/work/foo/")
```

Misc:

```elisp
misc
```

将来特別用途が必要なら:

```elisp
tasks
docs
```

などを追加できる。

Project root は末尾 `/` 付きに正規化して比較する。

TRAMP パスは文字列のまま保持し、ローカルパスへ変換しない。

## 13. Plan 実行境界

関数候補:

```elisp
my/tab-routing--execute-plan
```

入力:

```elisp
(:action ...)
```

副作用:

- `tab-bar-select-tab`
- `tab-bar-new-tab`
- `tab-bar-rename-tab`
- Tab ID の反映

戻り値には必要最小限の結果を返す。

例:

```elisp
(:created t)
```

または単純に `created-p` の boolean でもよい。

後続処理が増えないなら boolean を優先する。

## 14. Tab ID の保存

ここは無理に「非破壊更新」へ寄せない。

`tab-bar-tabs` から現在タブを取得し、そのタブの独自 ID だけを境界内で更新する。

```text
純粋:
  どの ID にするか

境界:
  実タブへ ID を書き込む
```

これで十分。

Snapshot からタブ alist 全体を作り直さない。window configuration、履歴、Bufferlo や将来の独自情報を落とす危険があるため。

`tab-bar--current-tab-find` を使わず `tab-bar-tabs` から current tab を取れるならそちらを優先する。

ただし内部 API を避けるためだけにコードが複雑になるなら、その複雑さの方を避ける。

## 15. Misc 初期化

Misc を採用する場合、起動時の最初の scratch タブを再利用する考え方は残せる。

ただし Misc の要否自体を先に決める。

初期化条件は旧実装と同様に慎重にする。

候補:

```text
tab が1つ
current buffer == *scratch*
routing ID がない
ユーザーが明示的に名前を付けていない
```

初期化ロジックの「条件判定」は純粋関数へ切り出す余地がある。

例:

```elisp
my/tab-routing-initial-misc-p
```

入力を単純値にできるなら ERT 対象にする。

## 16. Routing の入口で対象を先に確定する

相対パスをそのまま持ってタブを切り替えない。

たとえば、

```elisp
(find-file "src/foo.el")
```

なら、タブ変更前の `default-directory` を基準に絶対パスへしておく。

```elisp
(expand-file-name file original-default-directory)
```

分類するときと本当に開くときで同じ対象を使う。

wildcard や複数ファイル展開は最初から頑張らない。必要になったら仕様を追加する。

## 17. まず接続する表示経路

最初から `find-file` / `switch-to-buffer` / `display-buffer` 全部へ advice しない。

まず「現在ウィンドウで普通にファイルを開く」1経路だけを観測して接続する。

Emacs 31.1 では `find-file` が `switch-to-buffer` を必ず通るわけではない。逆に汎用 `display-buffer` advice は影響範囲が広い。

だから実際の呼び出し経路を見て1つずつ足す。

`find-file-noselect` のように「読むだけ」でも使われる関数は、自動タブ切替の入口にしない。

## 18. Routing の再入防止

タブ作成・切替の途中で別の表示処理が呼ばれる可能性がある。

Routing 用の動的変数を持ち、同じ Routing 処理の再入だけを止める。

候補:

```elisp
my/tab-routing--routing
```

Navigation の `--tracking` や履歴再生抑制とは別の状態にする。

何でも一律に捨てず、wildcard など別対象の処理まで抑制しない。

## 19. 表示成功後通知

Bufferlo は新規タブ作成直後ではなく、**目的バッファの表示成功後**に接続する。

```text
Plan
 ↓
タブ作成
 ↓
ID設定
 ↓
標準の表示処理
 ↓
表示成功
 ↓
after-display 通知
 ↓
Bufferlo
```

候補:

```elisp
my/tab-routing-after-display-functions
```

引数は実装時に最小化する。`created-p` と実際に表示した window くらいで足りるかを確認する。

表示失敗、または表示されず `nil` が返った場合は通知しない。

作成直後 hook は別用途が出るまで作らない。

## 19.1 失敗時の扱い

表示前にタブを作ったあと、元の表示処理が失敗する可能性はある。

最初から rollback は作らない。

```text
表示失敗
  ↓
成功後通知は出さない
  ↓
空タブが残る可能性はある
```

本当に困ることが確認できてから rollback を考える。

## 19.2 Misc UI

最初は Misc を表示したまま Routing を完成させる。

`tab-bar-tabs-function` で Misc を除外しない。この値は描画だけでなく実際のタブ選択などにも使われるため。

後で隠すなら描画だけを変える。

`tab-bar-format` 側で十分ならそこで処理し、必要なら `tab-bar--format-tab` の内部 API 利用を1か所へ隔離する。

## 20. Project Context

ファイル:

```text
my-project-context.el
```

中心となる純粋部分:

```elisp
my/project-context-root-from-id
```

入力:

```elisp
(project . "/work/foo/")
```

出力:

```text
"/work/foo/"
```

それ以外:

```text
nil
```

現在タブのIDを読むのは境界:

```elisp
my/project-context-root
```

`project-current` advice はこの値を `project-current-directory-override` へ動的束縛する。

バッファの `default-directory` は書き換えない。

## 21. project-current の優先順位

旧実装の良い部分を残す。

```text
1. 呼び出し側が DIRECTORY を明示
2. 既存 project-current-directory-override
3. 現在タブの Project root
4. project.el 標準判定
```

大事なのは Routing の Project 検出と Project Context を混ぜないこと。

```text
Routing
  この対象はどの Project？
  → target-directory を明示

Project Context
  今のタブはどの Project？
  → directory 省略時だけ root を補助
```

古いタブの root が削除・移動された場合の挙動は統合テストで確認する。

現在の新 `.emacs.d` では Magit も採用済みなので、Project Context 完成後に `magit-status` が期待どおり現在タブの Project を使うか確認する。

標準連携だけで十分なら Magit 専用コードは追加しない。

## 22. Navigation で保持するもの

移動元は marker で保持する。

整数 point だけだと、移動処理中に編集が入った時に元位置へ追従できないため。

ただし純粋関数へ marker は渡さない。

```text
境界:
  marker を保持

純粋判定:
  marker-position を整数へ変換

履歴:
  必要なら marker を引き渡す
```

記録しなかった marker は自分たちで解放する。履歴側へ渡した marker は勝手に解放しない。

## 23. Navigation の単純値

純粋判定へ渡す値は小さくする。

例:

```elisp
(:buffer BUFFER-ID
 :point 123
 :window WINDOW-ID
 :eligible t)
```

`eligible` は「この移動元を履歴へ記録してよいか」を境界側で判断した結果。

buffer / marker の生存確認を純粋 predicate の中で行わない。

## 24. 移動判定

純粋関数候補:

```elisp
my/navigation-transition-p
```

基本規則:

```text
eligible = false
  → false

buffer が変わった
  → true

同じ buffer で point が変わった
  → true

同じ場所
  → false
```

window だけ変わった場合は、履歴方式の最小実験を見て決める。

旧 Navigation は前後の selected window が同じ時だけ記録していた。そこを変えるなら仕様変更として扱う。

## 25. xref を使う場合

第一候補として試す価値がある。

```text
xref-push-marker-stack
xref-go-back
xref-go-forward
xref-history-storage
xref-global-history
```

global history なら、タブや selected window が変わっても履歴保存先が分かりやすい。

Navigation は「何を積むか」だけ自作し、保存・戻る・進むは xref に任せられる。

ただし xref 自身の定義ジャンプも履歴を記録する。最初は xref 自身のジャンプコマンドを自作追跡対象から外し、二重記録を避ける。

kill 済み buffer への戻りでは、Better Jumper と挙動が違うので最小実験で確認する。

## 26. Better Jumper を使う場合

kill 済み buffer のファイルを開き直して戻れることや履歴件数制限など、必要な利点があるなら採用する。

ただし旧設定の `better-jumper-context 'window` は Tab Routing と組み合わせると履歴保存先が分かりにくくなる可能性がある。

Navigation advice を Routing の外側に置くだけでは十分とは限らない。

```text
A → B → backward → forward
```

を小さい統合試作で確認してから採用する。

自作コードから `better-jumper--jumping` は参照しない。

## 27. Navigation の再入防止

上位と下位の両コマンドへ advice が付いた場合の二重記録を防ぐ。

候補:

```elisp
my/navigation--tracking
```

最外側だけが before / after を観測し、内側は original をそのまま呼ぶ。

## 28. 履歴再生中の記録抑制

back / forward 自身を新しい履歴として記録しない。

これは `--tracking` とは別。

候補:

```elisp
my/navigation--recording-disabled
```

公開 back / forward コマンドを around advice で包み、`let` で動的束縛する。

pre/post hook で手動 `t` / `nil` するより、エラーや中断時にも元へ戻りやすい。

## 29. Advice の順序

Tab Routing と Navigation が同じ関数へ advice を設定する場合:

```text
Navigation
  outer
    ↓
Tab Routing
  inner
    ↓
Original
```

を意図する。

理由:

Navigation は、

```text
Routing によるタブ移動
+
Original command によるバッファ / point 移動
```

を1回の移動として観測したい。

depth を使う場合、値そのものより「どちらが外側か」をコメントで明示する。

不要に極端な値へしない。

例:

```text
Navigation: -50
Routing:     50
```

は候補であり、実際の advice 構成を確認して決める。

## 30. Navigation が対象にするコマンド

旧実装の一覧を一度に移植しない。

候補:

```text
find-file
project-find-file
switch-to-buffer
xref
Consult
Bufferlo
Dired
LSP
Avy
```

ただし上位コマンドが下位コマンドを呼ぶだけなら、両方へ advice を付けない。

Consult の候補プレビューのように「見ただけ」を確定した移動として記録しない。

実際の呼び出し経路を観測して1つずつ追加する。

## 31. Routing と Navigation は別の再入状態を持つ

```text
Routing の再入防止
Navigation の追跡再入防止
Navigation の履歴再生抑制
```

は別の責務。

1つの汎用フラグへまとめない。

## 32. ERT: Destination

純粋関数なので細かくテストする。

例:

```text
project file
  → project destination

project なし file
  → misc

special buffer
  → nil

special rule を追加する場合
  → project より優先されること
```

ルールを `cond` にする場合でも優先順位をテストする。

## 33. ERT: Tab Plan

重要な中心テスト。

### stay

```text
destination ID == current tab ID
```

結果:

```elisp
(:action stay)
```

### select

別タブに同じIDがある。

結果:

```elisp
(:action select :index N)
```

### create

同じIDがない。

結果:

```elisp
(:action create ...)
```

### 同名別ID

同じ name でも ID が違う。

結果:

```text
create
```

ここで旧互換の同名再利用をしないことを明示的に確認する。

## 34. ERT: Project Context

純粋部分:

```text
(project . ROOT)
  → ROOT

misc
  → nil

nil
  → nil
```

advice については必要最小限の統合テストにする。

## 35. ERT: Navigation transition

例:

### 同じ場所

```text
same buffer
same point
same window
```

→ false

### 同一バッファ内ジャンプ

```text
same buffer
different point
```

→ true

### 別バッファ

```text
different buffer
```

→ true

### window のみ変更

仕様を決めた後で期待値を固定する。

## 36. 統合テスト / 実動作確認

純粋関数が正しくても、壊れやすいのは境界なので、少数の統合 ERT を必須候補にする。

### Tab ID

```text
A → B → A
```

で ID が残る。同名 Project を分離し、IDなし同名の手動タブを奪わない。

### 相対パス

`default-directory = A` で `(find-file "src/foo.el")` した時、途中のタブ切替に影響されず A/src/foo.el を開く。

### Bufferlo

新規タブでは目的 buffer の表示成功後、その buffer だけを残す。既存タブでは一覧を消さない。

### Navigation

```text
A:10
↓
B:20
↓
back
↓
A:10
↓
forward
↓
B:20
```

file / point / tab を全部確認する。

### 履歴再生

back / forward が新しい履歴を作らない。途中でエラーや中断があっても、その後の通常記録が復活する。

### 初期化

設定再読込で advice / hook が重複しない。

### 実動作で1つずつ見るもの

`tab-line` / Bufferlo / Consult / Dired / xref / 別 window / 背景 `display-buffer` / 専用 window / 起動時ファイル / TRAMP。

全部を ERT に押し込まず、UI は実際に触って確認してよい。

## 37. 性能

毎回のファイル切り替えに関わるため、処理は小さく保つ。

純粋ロジック自体は、

- 小さいリスト走査
- 文字列比較
- ID比較

程度にする。

特に注意するもの:

- `project-current`
- ファイルシステム探索
- TRAMP
- 大量の tab 一覧処理

Project root の取得が遅い場合は、推測でキャッシュせず profiler / benchmark で確認する。

キャッシュは必要性が実測できてから導入する。

## 38. 起動速度

Tab Routing と Navigation を必要以上に起動時ロードしない。

ただし基本コマンドへ advice を設定するなら、最終的には早期ロードが必要になる可能性がある。

数十行程度の自作 Elisp を遅延ロードするために複雑な仕組みを作るのは避ける。

実測して、単純な `require` のコストが無視できるなら単純さを優先する。

Better Jumper を採用する場合だけ、package の autoload / `use-package` を利用できる部分を確認する。xref 採用なら追加パッケージは不要。

## 39. 実装ステップ

```text
Step 0
xref / Better Jumper の最小実験

Step 1
Destination + ERT

Step 2
Tab Snapshot / Plan + ERT

Step 3
Tab 操作 / ID 保存 + 統合 ERT

Step 4
普通のファイル表示1経路へ接続
相対パス / 再入 / 失敗を確認

Step 5
Bufferlo を表示成功後へ接続

Step 6
Project Context
必要なら Magit の挙動確認

Step 7
Navigation
marker / transition / record

Step 8
Routing + Navigation 統合

Step 9
実際に使う表示経路を1つずつ追加

Step 10
必要なら Misc 非表示
```

## 40. 実装時に避けること

きれいにするために、逆に複雑にしない。

最初から作らないもの:

```text
汎用 Rule Registry
汎用 History Backend interface
巨大な Context object
Tab Identity 専用モジュール
高度な rollback
早すぎる cache
```

xref と Better Jumper を切り替えられる汎用バックエンドも作らない。比較して、どちらかを採用する。

公開 API だけにこだわって実装が大きくなるのも避ける。

目的は副作用を消すことではなく、**副作用がある場所を短く、分かりやすくすること**。

## 41. 完成形のイメージ

### Routing

```text
対象を確定
 ↓
Projectなどを観測
 ↓
Destination        pure
 ↓
Tab Snapshot
 ↓
Plan               pure
 ↓
Tab操作             effect
 ↓
標準の表示処理      effect
 ↓
成功後通知           effect
```

### Navigation

```text
markerで移動元保持   effect/read
 ↓
original command     effect
 ↓
移動後を観測         effect/read
 ↓
単純値へ変換
 ↓
record?             pure
 ↓
履歴へ保存           effect
```

### 両者

```text
Navigation advice
        ↓
Routing advice
        ↓
Original
```

直接依存はさせない。

## まとめ

今回の軸はシンプル。

**純粋にできる判断だけ純粋にする。**

**Emacs を触るところは、無理に隠さず短くまとめる。**

旧実装の Tab ID / Project Context / 再入防止という良い部分は残しつつ、

- Misc 非表示を Routing 本体から切り離す
- Bufferlo は表示成功後に接続する
- marker は境界で扱う
- xref / Better Jumper は先に最小実験する
- 相対パス・再入・失敗を境界の仕様として扱う
- 統合 ERT を軽視しない

という形に直す。

**小さい純粋関数 + 薄い Emacs 境界 + 少数の統合点**

このくらいのバランスを目指す。
