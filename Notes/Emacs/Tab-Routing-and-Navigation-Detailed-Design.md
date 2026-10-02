# タブルーティング / Navigation 新詳細設計

## このノートの読み方

基本設計の「どういう考え方で作るか」を、実装できるところまで具体化したノート。

ここに書いた関数名は候補。API 名を守ることより、**観測 → 純粋な判断 → 副作用** の境界が分かりやすいことを優先する。

## 設計用語について

正式な設計用語は [Tab-Routing-and-Navigation-Terminology.md](./Tab-Routing-and-Navigation-Terminology.md) を正本とする。

**用語表にない名前は、正式な設計用語ではない。**

関数名候補や説明のための表現と、設計概念を区別する。新しい設計用語が必要になった場合は、先に用語表へ追加してからこの詳細設計で使う。

実装前に Emacs 31.1 / Better Jumper / Bufferlo の実際の挙動を確認し、もっと単純な形があれば変えてよい。

## 実装前にやる小さな実験

Navigation History は **Tab-local で1本**という仕様にする。

まず Emacs 標準 xref だけでこれを作れるか確認する。

候補は `xref-history-storage` に自前の storage 関数を設定する方法。

```text
current tab
   ↓
my/navigation-xref-tab-history
   ↓
そのTab専用のxref history
```

最初に確認するのは次の4つ。

```text
1. Tab A と Tab B の履歴が混ざらない

2. 同じ Tab の Window 1 / Window 2 は同じ履歴を使う

3. Tab を切り替えて戻っても履歴が残る

4. Tab をまたぐ表示は別 Workspace への移動として扱い、
   Navigation の back / forward で別 Tab へ行かない
```

Tab 複製 / close / undo-close の時に custom history がどう扱われるかも小さく確認する。

xref で要件を満たせない点が出た場合だけ Better Jumper や小さな自作履歴を再検討する。

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
  ordered routing functions
  first-match
  Misc fallback
  Destination + Tabs → Plan
  Plan → Tab 操作

my-project-context.el
  Project型 Tab ID → Project root
  Project root → project-current の文脈

my-navigation.el
  Tab-local xref history storage
  Before / After → record?
  明示的な移動の追跡
```

バッファ集合は Bufferlo、Window Configuration は tab-bar に任せる。

タブの色・見た目・手動操作は `config/ui.el` 側で設定する。

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

Destination は plist を第一候補にする。

例:

```elisp
(:id org
 :name "Org")
```

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

```elisp
(:id misc
 :name "Misc")
```

重要なのは、**Project だけが特別な Destination ではない**こと。

Routing 関数は好きな ID / 表示名の Destination を返せる。

表示名と ID は分ける。

```text
name = 人間向け
id   = Workspace識別用
```

現時点では `cl-defstruct` までは使わない。plist で十分。

## 4. Routing の入力

基本の対象は file path。

旧実装の良さを残し、Routing 関数は小さい関数として自由に並べられるようにする。

基本契約:

```text
FILE
 ↓
Destination または nil
```

多くのルールは、

- path prefix
- extension
- file name

などを見るだけなので純粋関数にできる。

Project のように外部状態が必要なルールは、観測部分だけ小さい境界ヘルパーへ分ける。

例:

```text
route-project
  ↓
project-root-for-file      effect/read
  ↓
project-destination        pure
```

全 Routing 関数を純粋に見せるために、巨大な Facts オブジェクトや lazy resolver は作らない。

## 5. Destination 判定

中心は **first-match**。

候補:

```elisp
my/tab-routing-destination
```

概念:

```text
routing function A → nil
routing function B → nil
routing function C → Destination
                         ↑
                      ここで終了
```

この順序自体が設定。

旧設定で使っていた Tasks / Org / Project は、単なる具体例として扱う。

### no-match

ファイルがあり、すべての Routing 関数が nil なら Misc。

```text
FILE + no match
  → (:id misc :name "Misc")
```

普通のファイルなし buffer は、明示的な特殊ルーティングがない限り `nil`。

```text
no FILE + no explicit route
  → nil
```

## 6. Routing 関数リスト

これは今回の要件そのものなので、最初から用意する。

候補:

```elisp
my/tab-routing-functions
```

上から順に `funcall` し、最初の non-nil Destination を採用する。

設定例はあくまで例。

```elisp
(setq my/tab-routing-functions
      '(my/route-workbench-task
        my/route-org
        my/route-project))
```

この並びを設計の固定仕様とはしない。

利用者は関数を追加・削除・並べ替えられる。

Misc はこのリストへ必須で入れる関数ではなく、file の no-match fallback。

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

## 8. Buffer から Routing 対象を決める境界

buffer を切り替える経路では、まず実際の Routing 対象を決める。

基本:

```text
buffer-file-name あり
  → その file を routing functions へ

buffer-file-name なし
  → 原則 Routing しない
```

xref result のように file を持たない buffer を特別に扱いたい場合だけ、明示的な buffer routing を追加する。

「ファイルなし = Misc」にはしない。

この境界は Emacs 状態を読むため純粋ではないが、ルール判定そのものとは分離する。

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

Tab ID は Workspace の識別子。

例:

```elisp
org
misc
(project . "/work/foo/")
(my-custom-kind . "something")
```

Project は1種類の ID にすぎない。

同じ ID なら同じ Tab を再利用する。

同じ表示名でも ID が違えば別 Tab。

Project root を ID に使う場合は `project-root` の返す表記を基本にし、末尾 `/` を揃える程度にする。

TRAMP パスは文字列のまま保持する。

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

Project Context は **Project 型 Destination だけの追加機能**。

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

Org / Misc / その他の ID なら `nil`。

つまり、Org Tab に repo-a と repo-b の `.org` が混在していても、Tab 全体へ Project override は設定しない。

各 buffer の `default-directory` による通常の `project.el` 判定はそのまま使える。

現在 Tab の ID を読む処理は境界に置く。

## 21. project-current の優先順位

Project 型 Tab に限って、旧実装の良い部分を残す。

```text
1. 呼び出し側が DIRECTORY を明示
2. 既存 project-current-directory-override
3. 現在 Tab が Project型なら、その root
4. project.el 標準判定
```

Routing 用の Project 判定では target directory を必ず明示し、現在 Tab の override に引っ張られないようにする。

現在の新 `.emacs.d` では Magit も採用済みなので、Project 型 Tab で `magit-status` が期待どおり動くかだけ確認する。

標準連携で十分なら Magit 専用コードは追加しない。

## 22. Navigation History の単位

履歴は **Tab ごとに1本**。

```text
Tab A
├─ Window 1
├─ Window 2
└─ History A

Tab B
├─ Window 1
└─ History B
```

Window 単位には分けない。

同じ Tab なら、複数 Repository のファイル間移動でも同じ履歴。

Tab が違えば履歴は混ざらない。

## 23. xref storage を Tab-local にする

第一候補は Emacs 標準 xref。

`xref-history-storage` には履歴を返す関数を指定できるので、現在 Tab の custom history を返す関数を作る。

候補:

```elisp
my/navigation-xref-tab-history
```

概念:

```text
tab-bar-tabs
   ↓
current-tab
   ↓
my/navigation-history
   ↓
(BACKWARD-STACK . FORWARD-STACK)
```

履歴がなければ `(cons nil nil)` を作り、現在 Tab の custom entry として保持する案を第一候補にする。

Tab 切替後にも custom entry が保持されるか、Tab duplicate で同じ cons を共有しないかは統合テストで確認する。

必要なら duplicate 時だけ履歴をコピーする。最初から専用の履歴管理テーブルは作らない。

## 24. 移動元の保持

移動元は marker で保持する。

整数 point だけだと、移動処理中に編集が入った時に元位置へ追従できないため。

純粋判定へ渡す時だけ marker-position を整数へ変換する。

```text
境界: marker
  ↓
純粋判定: buffer-id / point / tab-id
  ↓
記録: xref marker stack
```

## 25. 移動判定

純粋関数候補:

```elisp
my/navigation-transition-p
```

重要なのは Tab。

```text
before-tab != after-tab
  → 記録しない

same tab + buffer changed
  → 記録する

same tab + same buffer + point changed
  → 記録する

same place
  → 記録しない
```

Window が変わっても Tab が同じなら、履歴は同じ1本を使う。

## 26. xref 自身の履歴との重複

xref の定義ジャンプは xref 自身でも履歴を積む。

自作 Navigation が同じ移動を二重記録しないよう、最初は xref 自身のジャンプコマンドを自作追跡対象から外す。

実際の LSP / Consult 連携でどこが履歴を積むかは実測してから追加する。

## 27. Navigation の再入防止

上位・下位コマンドの両方を追跡した時の二重記録を防ぐ。

候補:

```elisp
my/navigation--tracking
```

最外側だけが before / after を観測する。

## 28. 履歴再生中の記録抑制

`xref-go-back` / `xref-go-forward` 自身は新しい Navigation 記録として扱わない。

候補:

```elisp
my/navigation--recording-disabled
```

必要なら公開コマンドを around advice で包み、`let` で動的束縛する。

ただし xref 自身の back / forward が history を正しく更新するので、自作処理は最小限にする。

## 29. Routing と Navigation の関係

直接依存させない。

```text
Routing
  どの Workspace で表示するか

Navigation
  現在 Workspace の履歴
```

同じコマンドへ advice が必要になった場合は、その時点で実際の呼び出し経路を観測して順序を決める。

最初から `Navigation outer / Routing inner` を固定契約にはしない。

Navigation は before / after の Tab ID を比較するので、Routing によって別 Tab へ移動した場合は履歴へ積まない。

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

## 32. ERT: Routing / Destination

### first-match

先に non-nil を返した Routing 関数を採用し、後続を使わない。

### 任意の順序

関数リストの並びを変えれば結果も変わる。

### file no-match

すべて nil なら Misc。

### no-file no-match

普通の file-less buffer は nil。

### 具体的な Routing 関数

採用した関数ごとに小さいテストを書く。

例として Org / Project を使ってもよいが、それらを設計の固定ルールとしてテストしない。

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

```text
(project . ROOT)
  → ROOT

org / misc / custom ID
  → nil
```

Org Tab に複数 Repository の buffer があっても Tab-wide override を入れないことを確認する。

Project Tab だけ、明示 DIRECTORY / 既存 override の優先順位を保つ。

## 35. ERT: Navigation transition

### 同じ Tab / 同じ場所

→ false

### 同じ Tab / 同じ buffer / point変化

→ true

### 同じ Tab / 別 buffer

→ true

### 別 Tab

→ false

### 同じ Tab / Windowだけ変更

履歴 storage は同じ1本。単なる Window 選択だけなら移動履歴へ積まない。

## 36. 統合テスト / 実動作確認

### Routing functions

任意の関数順序で first-match が守られる。

### Misc

file no-match は Misc。file-less no-match は現在 Tab のまま。

### 同じ Destination

別 Repository の `.org` でも同じ Destination ID を返せば同じ Tab / Bufferlo list に入る。

### Bufferlo

Tab A / Tab B の buffer set が混ざらない。

### Navigation History

```text
Tab A
  a.el:10 → b.el:20

Tab B
  x.el:30 → y.el:40
```

Tab A の back / forward は A の中だけ、Tab B は B の中だけ。

### 同一 Tab / 複数 Window

Window 1 と Window 2 の移動が同じ Tab history を使う。

### 同一 Tab / 複数 Repository

同じ Destination に属するなら Repository が違っても履歴は同じ1本。

### Tab duplicate / close / undo-close

履歴の共有・消失が意図どおりか確認する。

### Project Context

Project 型 Tab だけ Tab root を補助し、Org / Misc は buffer 自身の `default-directory` に任せる。

### 相対パス

タブ切替で `default-directory` が変わっても、元の基準 directory のファイルを開く。

### 初期化

設定再読込で advice / hook が重複しない。

UIはすべて ERT に押し込まず、実際に触る確認も併用する。

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
xref の Tab-local history 最小実験

Step 1
Routing function contract / ordered first-match + ERT

Step 2
Destination / Misc fallback + ERT

Step 3
Tab Snapshot / Plan + ERT

Step 4
Tab 操作 / ID 保存 + 統合ERT

Step 5
普通のファイル表示1経路へ接続

Step 6
Bufferlo を表示成功後へ接続

Step 7
Project Context

Step 8
Tab-local Navigation

Step 9
実際に使う表示経路を1つずつ追加

Step 10
必要なら Misc 非表示
```

## 40. 実装時に避けること

きれいにするために、逆に複雑にしない。

最初から作らないもの:

```text
巨大な Routing Context
汎用 History Backend interface
Project前提のWorkspace abstraction
別管理のTab台帳
高度な rollback
早すぎる cache
```

Routing 関数リストは今回の要件なので作る。

一方、xref / Better Jumper を交換可能にする汎用バックエンドまでは作らない。

標準 xref が合えばそのまま使う。

目的は副作用を消すことではなく、**副作用がある場所を短く、分かりやすくすること**。

## 41. 完成形のイメージ

### Tab Workspace

```text
Tab
├─ Destination ID
├─ Buffer Set            Bufferlo
├─ Navigation History    xref + Tab-local storage
└─ Window Configuration  tab-bar
```

Project 型 Destination の時だけ Project Context を追加する。

### Routing

```text
file
 ↓
ordered routing functions
 ↓
first match
 ↓
Destination
 ↓
no match + file → Misc
 ↓
Tab Plan
 ↓
Tab操作
```

### Navigation

```text
before marker + before tab
 ↓
original command
 ↓
after position + after tab
 ↓
same tab ?
 ↓ yes
record?             pure
 ↓
current Tab の xref history
```

Routing と Navigation は直接依存しない。

## まとめ

設計の主語は Project ではなく **Tab Workspace**。

```text
Tab ≠ Project
Tab ≠ Repository
```

Routing 関数が同じ Destination を返したファイルは、Repository が違っても同じ Tab に入る。

どの Routing 関数にもマッチしなかった **ファイル** は Misc。

普通の file-less buffer は、明示的なルーティングがなければ現在 Tab のまま。

Workspace 内では、

- Buffer Set は Bufferlo
- Navigation History は xref の Tab-local storage
- Window Configuration は tab-bar
- Project Context は Project 型 Destination の時だけ

を第一候補にする。

標準機能や既存パッケージで自然に賄えるところは任せ、足りない接着部分だけ小さく自作する。

**自由な Routing + Tab-local な状態 + 薄い境界**

この形を目指す。
