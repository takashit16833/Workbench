# タブルーティング / Navigation 新詳細設計

## 目的

この文書は `Tab-Routing-and-Navigation-Basic-Design.md` の方針を、実装可能な単位まで具体化する。

ここでは最終コードを固定するのではなく、

- どの処理を純粋にするか
- どこを Emacs 状態との境界にするか
- タブルーティングと Navigation をどう独立させるか
- どの単位で ERT を書くか

を定義する。

実装時には Emacs 31.1 と Better Jumper の現在の公開 API を再確認し、API 名や細部は実測に合わせる。

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
  Better Jumper への記録
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

境界関数候補:

```elisp
my/tab-routing--project-root
```

入力:

```elisp
directory
```

処理:

```text
project-current
    ↓
project-root
    ↓
正規化
```

戻り値:

```text
"/work/foo/"
```

または nil。

この関数自体は副作用を起こさないが、Emacs の project 状態へ問い合わせるため、純粋関数としては扱わない。

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

旧実装では `tab-bar--current-tab-find` と alist の直接変更を使っていた。

新実装では、まず Emacs 31.1 の公開 API で実現できるか確認する。

候補:

- `tab-bar-tabs`
- `tab-bar-tabs-set`

考え方:

```text
tab-bar-tabs
    ↓
現在タブを含む値を取得
    ↓
新しい ID を反映した値を作る
    ↓
tab-bar-tabs-set
```

可能なら「内部リストを破壊的に変更する」のではなく、「新しい状態を作って反映する」形を優先する。

ただし Emacs の tab-bar API がその用途を想定していない場合、無理に関数型へ寄せず、最小限の内部変更に留める。

実装前に Emacs 31.1 の挙動を実測する。

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

## 16. find-file / switch-to-buffer / display-buffer

すべて advice が必要とは最初から決めない。

実装は1つずつ追加し、実測する。

### 第1候補: find-file

ファイルを新規に開く経路。

必要性が高い。

### 第2候補: switch-to-buffer

既存バッファへ切り替える経路。

起動中の内部 `switch-to-buffer` へ干渉する可能性があるため、旧実装と同様に起動後だけ有効化する案を検討する。

### display-buffer

影響範囲が広い。

xref など必要なケースが `display-buffer` なしで処理できるなら、採用しない可能性もある。

まず挙動を観測してから決める。

## 17. Routing advice の役割

advice 関数自体は薄くする。

理想:

```text
入力を観測
    ↓
Destination
    ↓
Snapshot
    ↓
Plan
    ↓
Execute
    ↓
Original command
```

advice の中へルール判定を直接書かない。

## 18. Tab Created Hook

新規タブ作成後に必要な処理は hook で接続する。

候補:

```elisp
my/tab-routing-tab-created-hook
```

Routing 本体:

```text
create tab
    ↓
ID 設定
    ↓
run-hooks
```

Bufferlo 側:

```text
hook
  ↓
bufferlo-clear
```

Routing は Bufferlo の存在を知らない。

## 19. Tab UI

Misc を非表示にする場合、旧実装の `tab-bar--format-tab` 直接利用を避ける。

まず `tab-bar-tabs-function` など公開拡張点で、

```text
all tabs
   ↓
visible tabs
```

を作れるか確認する。

純粋関数候補:

```elisp
my/tab-routing-visible-tabs
```

これは Tab Snapshot またはタブ alist を受けて Misc を除外する。

UI境界はその結果を tab-bar へ渡すだけにする。

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

新設計でも旧設計の良い部分を残す。

```text
1. 呼び出し側の DIRECTORY 明示指定
2. 既存 project-current-directory-override
3. 現在タブの Project root
4. project.el 標準判定
```

Tab Context は「明示指定を上書きしない」。

この規則は純粋関数として分ける必要はない。advice 自体が十分小さいため、過度に抽象化しない。

## 22. Navigation Location

Navigation が扱う移動地点。

初期候補:

```elisp
(:buffer BUFFER
 :point 123
 :window WINDOW)
```

必要にならない限り、

- file name
- tab id
- project root
- line / column

などを追加しない。

Better Jumper へ記録するために必要な最小情報だけ持つ。

## 23. Location の観測

境界関数:

```elisp
my/navigation--capture
```

読むもの:

- `current-buffer`
- `point`
- `selected-window`

この関数は Emacs 状態依存。

戻り値は通常の plist にし、比較ロジックへ渡す。

## 24. 移動判定

純粋関数:

```elisp
my/navigation-transition-p
```

入力:

```text
before
after
```

基本規則候補:

```text
buffer が変わった
    → record

同じ buffer で point が変わった
    → record

何も変わっていない
    → record しない
```

window が変わった場合を「ジャンプ」とみなすかは、旧挙動と実際の使い方を確認して決める。

ここは ERT で簡単に検証できる。

## 25. Navigation advice

薄い組み立て関数にする。

概念:

```elisp
(defun my/navigation--track (original &rest args)
  (let ((before (my/navigation--capture)))
    (prog1
        (apply original args)
      (let ((after (my/navigation--capture)))
        (when (my/navigation-transition-p before after)
          (my/navigation--record before))))))
```

実際には、

- 記録抑制中
- Better Jumper mode が有効か
- source buffer が有効か

などの境界条件が必要。

それらを advice 内へ大量に書かず、必要なら小さい predicate へ分離する。

## 26. Better Jumper への記録

境界関数:

```elisp
my/navigation--record
```

Better Jumper の公開関数を使う。

候補:

```elisp
better-jumper-set-jump
```

Navigation の純粋部分は Better Jumper の関数を直接呼ばない。

## 27. Better Jumper の戻る / 進む

Better Jumper 自身のジャンプ操作中に、新しい履歴を記録しない必要がある。

旧実装では `better-jumper--jumping` を見ていた。

新設計では自作の動的変数を候補にする。

```elisp
(defvar my/navigation--recording-disabled nil)
```

Better Jumper のジャンプコマンドを実行している間だけ、

```elisp
(let ((my/navigation--recording-disabled t))
  ...)
```

とする。

接続方法:

- Better Jumper の公開 hook
- 公開 command への advice

のどちらがより自然か、実装前に現行 Better Jumper の API を確認する。

内部変数への直接依存は避ける。

## 28. Better Jumper の Context

旧設定では `better-jumper-context` が `window`。

新設計でも有力候補。

理由:

- タブは window configuration を持つ
- window ごとの履歴と相性が良い
- 「タブ = 作業空間」という設計と自然に組み合わさる可能性が高い

ただし次の操作を実測する。

```text
Project A
  ↓
Project B
  ↓
jump backward
```

期待する仕様が、

```text
A へ戻る
```

なのか、

```text
B タブ内だけの履歴を戻る
```

なのかを先に決める。

この点は推測で実装しない。

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

旧実装では多くのコマンドへ advice していた。

新実装では一度に全部入れない。

候補を段階的に追加する。

最初:

```text
find-file
switch-to-buffer
```

必要に応じて:

```text
project-find-file
xref-find-definitions
lsp-find-definition
consult-buffer
consult-recent-file
consult-line
avy-goto-char-timer
```

ただし下位の `find-file` / `switch-to-buffer` を捕まえれば上位コマンドを個別に捕まえる必要がない場合もある。

実際の呼び出し経路を観測してから追加する。

## 31. 「同じ移動を二重記録」しない

上位コマンドと下位コマンドの両方へ advice すると、

```text
project-find-file
  ↓
find-file
```

のような呼び出しで二重記録する可能性がある。

Navigation には再入防止用の動的状態を持たせる。

候補:

```elisp
my/navigation--tracking
```

外側の最初の Navigation advice だけが before / after を記録し、内側ではそのまま original を呼ぶ。

旧実装の良い考え方なので継続する。

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

純粋関数では確認できない境界だけを少数確認する。

### Routing

```text
find-file Project A/file
  → Project A tab
```

```text
switch-to-buffer Project B buffer
  → Project B tab
```

### Navigation + Routing

```text
A/file1
  ↓
B/file2
  ↓
jump backward
```

確認:

- 正しい履歴へ戻る
- 必要なら正しいタブへ移動する
- jump backward 自体が新しい履歴として記録されない

### 起動

`switch-to-buffer` advice を使う場合:

- 起動途中に不要なタブが作られない
- 起動完了後は通常ルーティングされる

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

Better Jumper は package の autoload / `use-package` を利用できる部分を確認する。

## 39. 実装ステップ

### Step 1

`my-tab-routing.el`

- Destination
- ERT

Emacs のタブはまだ操作しない。

### Step 2

- Tab Snapshot
- Plan
- ERT

まだ advice は入れない。

### Step 3

- Plan Execute
- 手動で関数を呼んで動作確認

### Step 4

- `find-file` へ接続
- 実測

### Step 5

必要なら `switch-to-buffer`。

### Step 6

Project Context。

### Step 7

Misc UI / Bufferlo。

### Step 8

Better Jumper を単体導入。

### Step 9

Navigation の Location / transition。

### Step 10

Navigation advice。

### Step 11

Routing + Navigation の統合確認。

## 40. 実装時に避けること

### 推測による API 採用

Emacs 31.1 の tab-bar API、Better Jumper API は実装時に確認する。

### 一度に複数 advice を追加

まず1経路を実測する。

### 先回りした Rule abstraction

要件が出るまで `defcustom` の rule registry 等は作らない。

### 巨大な Context object

3引数で十分なら3引数を使う。

### 内部APIへの安易な依存

公開APIでできるか先に確認する。

### 境界まで無理に純粋化する

Emacs の状態を操作するコードは必ず存在する。

目的は副作用を消すことではなく、**副作用がある場所を狭く明確にすること**。

## 41. 完成形のイメージ

Tab Routing:

```text
Emacs state
   ↓
facts
   ↓
destination       pure
   ↓
snapshot
   ↓
plan              pure
   ↓
execute           effect
```

Navigation:

```text
capture before    effect/read
   ↓
original command  effect
   ↓
capture after     effect/read
   ↓
transition?       pure
   ↓
record            effect
```

両者:

```text
Navigation advice
        ↓
Routing advice
        ↓
Original command
```

コード上は互いを直接呼ばない。

## まとめ

今回の再設計では、旧実装の良い部分、

- Tab ID
- Project root を使った識別
- `project-current-directory-override`
- Navigation の再入防止
- ERT

を残す。

一方で、

- 判断と状態変更の混在
- Better Jumper 内部変数への依存
- Bufferlo への直接依存
- tab-bar 内部APIへの依存
- 互換用の同名タブ再利用
- Routing / Navigation の初期化混在

を整理する。

最終的には、

```text
小さい純粋関数
+
薄い Emacs 境界
+
少数の統合点
```

という構成を目指す。
