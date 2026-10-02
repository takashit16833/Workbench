# タブルーティング / Navigation 詳細設計

## このノートについて

基本設計の内容を、実装するときに迷わないくらいまで具体化したノート。

ここでも、厳密さより **「読めばすぐ思い出せる」** ことを優先する。

関数名はまだ候補。実装してみて、もっと素直な名前や形があれば変えてよい。

設計で名前を付けて使う言葉は、
[Tab-Routing-and-Navigation-Terminology.md](./Tab-Routing-and-Navigation-Terminology.md)
にまとめてある。

## まず全体像

今回の中心は、

> **Tab をそれぞれ独立した作業スペースのように見せる**

こと。

ただし、

```text
Tab ≠ Project
Tab ≠ Repository
```

どの Tab に入るかはルーティング関数で決める。

```text
file
 ↓
ルーティング関数を上から試す
 ↓
行き先が決まる
 ↓
そのTabがあれば移動
なければ作る
```

そして Tab ごとに、

```text
buffer
移動履歴
Windowの並び
```

をできるだけ独立して見せる。

## ファイル構成

最初はこのくらいで十分。

```text
elisp/
├── my-tab-routing.el
├── my-project-context.el
└── my-navigation.el
```

それぞれ、

```text
my-tab-routing.el
  → どのTabへ行くか

my-project-context.el
  → Project用Tabとproject.elの橋渡し

my-navigation.el
  → 今のTabの中で戻る / 進む
```

を担当する。

見た目やキー設定は `config/` 側へ置く。

## ルーティング関数

ルーティング関数は、1つの条件だけを見る小さい関数にする。

基本は、

```text
file
 ↓
マッチした → Destination
マッチしない → nil
```

という形。

たとえば `.org` 用なら、

```elisp
(defun my/route-org (file)
  ...)
```

のようなイメージ。

Project 用なら project.el の判定が必要なので、そこだけ Emacs の状態を見る処理を分けてもよい。

### 順番は設定

ルーティング関数はリストで持つ。

候補:

```elisp
my/tab-routing-functions
```

設定例:

```elisp
(setq my/tab-routing-functions
      '(my/route-workbench-task
        my/route-org
        my/route-project))
```

これは例であって、固定ルールではない。

上から順に試して、最初に Destination を返したところで終わる。

```text
A → nil
B → nil
C → Destination
    ↑
  ここで決定
```

ルールは自由に追加・削除・並べ替えできる。

## Destination

Destination は、ルーティング関数が返す「行き先」。

まずは plist で十分。

```elisp
(:id org
 :name "Org")
```

Project なら、

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

Misc なら、

```elisp
(:id misc
 :name "Misc")
```

ここで大事なのは、Project だけが特別ではないこと。

Destination は、

> どの Tab を使いたいか

を表すだけ。

実際に Tab を選ぶ・作る処理はこの後に分ける。

## Misc

file がどのルーティング関数にもマッチしなかったら Misc。

```text
fileあり
 ↓
全部nil
 ↓
Misc
```

一方、file を持たない普通の buffer は、何もマッチしなければ今の Tab のまま。

```text
fileあり + no match → Misc
fileなし + no match → 何もしない
```

xref など、file を持たない buffer を特別にルーティングしたくなった場合だけ、専用の処理を追加する。

最初から特殊 buffer 全般を Routing 対象にしない。

## Tab ID と Tab の選び方

Tab には表示名とは別に ID を持たせる。

```text
表示名: Org
ID:     org
```

Project なら、

```elisp
(project . "/work/foo/")
```

のようにできる。

Destination が決まったら、現在の Tab 一覧を見て、

```text
1. 今のTabが同じID
   → そのまま

2. 別のTabに同じIDがある
   → そこへ移動

3. 同じIDがない
   → 新しいTabを作る
```

とする。

表示名が同じでも ID が違えば別 Tab。

旧設定にあった「ID のない同名 Tab を自動で拾う」互換処理は、新構築では入れない。

### Tab の状態を丸ごと作り直さない

Tab ID を保存するために Tab 一覧全体を作り直すようなことはしない。

現在の Tab に、自分たちの ID だけを追加・更新する。

tab-bar が持っている Window 状態や Bufferlo の情報などを壊さないため。

## file を開く前に行き先を確定する

`find-file "src/foo.el"` のような相対パスは少し注意が必要。

Tab を先に切り替えると `default-directory` が変わり、別の `src/foo.el` を開く可能性がある。

なので、

```text
今のdefault-directory
 ↓
開くfileを絶対パスへ確定
 ↓
Routing
 ↓
Tab切り替え
 ↓
そのfileを表示
```

という順番にする。

Routing の判定と、実際に開く file が同じものを見るようにする。

## まず1つの表示経路だけつなぐ

最初から `display-buffer` 全体へ広く advice しない。

Emacs では file を開く処理の中で、

```text
find-file
find-file-noselect
pop-to-buffer
display-buffer
```

など、いろいろな関数が関わる。

しかも `display-buffer` は「ユーザーが今見たいもの」以外にも使われる。

なので最初は、

> 普通に current window へ file を開く

という1経路だけつないで実動作を見る。

必要な経路は後から1つずつ増やす。

## Routing の再入を防ぐ

Routing の中から file 表示が呼ばれ、その中でまた Routing が走る可能性がある。

そのため Routing 専用の再入防止フラグを持つ。

ただし、

> Routing 中だから全部無視

のような大きすぎる抑制にはしない。

別 file を正当に開いているケースまで止めないよう、実際の呼び出し経路を見ながら最小限にする。

## Bufferlo とつなぐタイミング

新しい Tab を作った時は、

```text
Tabを作る
 ↓
目的のfileを表示する
 ↓
表示できた
 ↓
Bufferloをそのbufferから始める
```

の順番にする。

Tab 作成直後に `bufferlo-clear` しない。

その時点ではまだ `*scratch*` が current buffer の可能性があるため。

Routing は Bufferlo を直接呼ばず、

> 新しい Tab で目的の表示が成功した

ことだけ通知する。

Bufferlo 側がその通知を受けて初期化する形が分かりやすい。

表示に失敗した時は、成功通知を出さない。

最初から複雑な rollback は作らない。空 Tab が実際に困ると分かってから考える。

## Project Context

Project 用の Tab では、Tab ID から Project root を取り出せるようにする。

```elisp
(project . "/work/foo/")
```

なら、

```text
/work/foo/
```

を返す。

Org / Misc / その他の ID なら Project root は返さない。

### Routing 用の Project 判定とは分ける

これは重要。

Routing で、

> この file はどの Project？

を調べる時は、対象 file の directory を明示して project.el に問い合わせる。

概念的には、

```elisp
(project-current nil target-directory)
```

の形。

現在いる Tab の Project Context に引っ張られないようにする。

一方で、通常の `project-current` が directory を指定されずに呼ばれた時だけ、

> 今の Tab が Project 用なら、その root を使ってみる

という補助をする。

### Org Tab では Project を固定しない

たとえば、

```text
Org Tab
├─ repo-a/foo.org
└─ repo-b/bar.org
```

なら、Tab 全体を repo-a や repo-b のどちらかに決めない。

各 buffer の `default-directory` から project.el が普通に判定すればよい。

## Navigation

履歴は Tab ごとに1本。

```text
Tab A
├─ Window 1
├─ Window 2
└─ History A

Tab B
└─ History B
```

Window 単位には分けない。

同じ Tab なら、複数 Repository の file 間を移動しても同じ履歴。

別 Tab の履歴とは混ぜない。

## まず xref で試す

第一候補は Emacs 標準の xref。

`xref-history-storage` は、どの履歴を使うかを関数で返せる。

なので、

```text
今のTab
 ↓
そのTab専用のxref履歴
```

を返す小さい関数を作れるか試す。

確認したいのは、

- Tab A と Tab B の履歴が混ざらない
- 同じ Tab の Window 1 / Window 2 は同じ履歴
- Tab を切り替えて戻っても履歴が残る
- Tab 複製で同じ履歴オブジェクトを意図せず共有しない
- close / undo-close で壊れない

こと。

これで十分なら Better Jumper は使わない。

## どの移動を履歴に入れるか

基本は、

```text
移動前
 ↓
コマンド実行
 ↓
移動後
 ↓
同じTab？
```

を見る。

別 Tab に移動したなら記録しない。

同じ Tab なら、

```text
別bufferへ移動した
same bufferでpointが変わった
```

ような時に記録する。

単に Window を選び直しただけなら記録しない。

移動元は marker で持つ。

point の整数だけより、処理中に編集が入っても位置へ追従できるため。

ただし比較ロジックには marker そのものを持ち込まず、必要な値だけ渡す。

## xref 自身との二重記録

xref のジャンプは、xref 自身でも履歴を積む。

その上から自作 Navigation まで同じ移動を記録すると二重になる。

なので最初は xref 自身のジャンプコマンドを、自作追跡の対象から外す。

LSP / Consult / Avy などは、実際にどのコマンドが何を呼ぶか確認してから追加する。

Consult のプレビューのような、

> 候補をちょっと見ただけ

の動作は履歴に入れない。

## Navigation の再入と「戻る / 進む」

Navigation にも再入防止が必要。

上位コマンドと下位コマンドの両方を追跡してしまった時に、同じ移動を二重記録しないため。

また `xref-go-back` / `xref-go-forward` 自身を、新しい移動として記録しない。

Routing の再入防止とは別の状態にする。

```text
Routingの再入防止
Navigationの追跡中
Navigationの履歴再生中
```

を1つの汎用フラグにまとめない。

## Routing と Navigation は直接つながない

Routing は、

> どの Tab で表示するか

だけを考える。

Navigation は、

> 今の Tab の中でどこへ戻るか

だけを考える。

同じコマンドへ両方の advice が必要になった時だけ、実際の呼び出し順を見て調整する。

最初から advice の順番を設計上の決まりにしない。

## Misc の見た目

最初は Misc を普通に表示する。

Routing が正しく動いてから、必要なら隠す。

`tab-bar-tabs-function` で Misc を除外しない。

これは描画専用ではなく、Tab の選択など実際の操作にも使われるため。

隠すなら `tab-bar-format` 側など、表示だけを変える。

必要なら内部 API を1か所だけ使う方が、無理に大きな独自描画を作るより分かりやすい場合もある。

## テスト

### 小さい関数

ERT でまず確認しやすいのは、

- ルーティング関数の順番
- 最初にマッチしたものを採用すること
- file の no-match → Misc
- file なしの no-match → 何もしない
- Project ID → root
- 同じ / 別 Tab を含む Navigation の記録判定

あたり。

### Emacs の状態を使うところ

ここは少数の統合 ERT も書く。

特に、

- 同じ Tab ID を再利用できる
- ID が違えば同名 Tab でも分かれる
- Bufferlo の buffer が Tab ごとに混ざらない
- 表示成功後に Bufferlo が初期化される
- Tab A / Tab B の Navigation 履歴が混ざらない
- 同じ Tab の複数 Window では同じ履歴になる
- 同じ Tab なら別 Repository の file も同じ履歴になる
- 相対パスで正しい file を開く
- 設定再読込で advice / hook が二重にならない

ことを見たい。

UI の見た目まで全部 ERT にしようとはしない。

## 性能

Routing は file を開いたり buffer を切り替えたりするたびに通るので、普段の操作を重くしない。

純粋な判定部分は、

```text
小さいリスト走査
文字列比較
ID比較
```

くらいに留める。

気を付けるのは、

- project.el の探索
- ファイルシステム
- TRAMP
- Tab 一覧
- 外部プロセス

など。

遅く感じたら、先に profiler / benchmark で確認する。

推測でキャッシュを増やさない。

## 起動時の読み込み

数十行程度の自作 Elisp を遅延ロードするために、かえって複雑になるなら普通に `require` してよい。

advice を基本コマンドへ付ける機能は、結局早い段階で必要になる可能性がある。

起動速度は実測して判断する。

xref で済めば追加パッケージも増えない。

## 実装する順番

一気に全部つながない。

```text
1. xrefでTabごとの履歴を作れるか小さく試す
2. ルーティング関数リストと順番を実装 + ERT
3. Destination / Misc を実装 + ERT
4. Tab ID を使って stay / select / create
5. 普通のfile表示1経路へつなぐ
6. 相対パス / 再入 / 失敗を確認
7. Bufferloを表示成功後につなぐ
8. Project Contextを入れる
9. TabごとのNavigationを入れる
10. 必要な表示経路を少しずつ追加
11. 最後に必要ならMiscの見た目を調整
```

各段階で一度使ってみてから次へ進む。

## まとめ

実装の軸はシンプル。

```text
file / buffer
 ↓
自由に並べたルーティング関数
 ↓
Destination
 ↓
Tabを選ぶ / 作る
```

その Tab の中では、

```text
buffer     → Bufferlo
履歴       → まずxref
Window     → tab-bar
Project    → 必要なTabだけproject.elと連携
```

とする。

全部を自作しない。

全部を抽象化しない。

**標準機能や既存パッケージに任せられるところは任せて、必要な接着部分だけ小さく書く。**

このくらいの軽さを保つ。
