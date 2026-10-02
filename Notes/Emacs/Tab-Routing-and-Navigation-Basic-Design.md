# タブルーティング / Navigation 新基本設計

## このノートについて

これは厳密な仕様書というより、あとで自分たちが読み返して、

> 何を作ろうとしていたんだっけ？

をすぐ思い出すための設計ノート。

細かい API 名よりも、**責務・データの流れ・採用理由**が分かることを優先する。

## まず結論

新しい `.emacs.d` では、Tab Routing / Project Context / Navigation を別々の機能として作る。

```text
Tab Routing
  ファイル / バッファを適切なタブへ送る

Project Context
  現在のタブが表す Project を project.el に伝える

Navigation
  「ここに戻りたい」という移動履歴を記録する
```

Tab Routing と Navigation は同じ移動コマンドに関わるけれど、**お互いを直接呼ばない**。

共通の考え方はこれ。

```text
Emacs の状態を観測
        ↓
小さな純粋関数で判断
        ↓
Emacs の状態を変更
```

Functional Core / Imperative Shell に近い形にする。ただし、関数型っぽく見せるための抽象化はしない。

## 全体構造

概念的には次の3段階に分ける。

```text
Emacs の状態を観測
        ↓
純粋な判断
        ↓
Emacs の状態を変更
```

タブルーティングでは、

```text
File / Buffer
    ↓
事実を観測
    ↓
Destination を決定
    ↓
Tab 操作 Plan を決定
    ↓
Plan を実行
```

Navigation では、

```text
移動前の Location を観測
        ↓
コマンドを実行
        ↓
移動後の Location を観測
        ↓
履歴へ記録すべきか判断
        ↓
必要なら履歴へ記録
```

となる。

## 機能の分離

### Tab Routing

責務は「このファイル・バッファをどのタブへ表示するか」。

知ってよいもの:

- ファイルパス
- バッファ種別
- プロジェクトルート
- タブ一覧
- タブの内部ID

知らないもの:

- Navigation の履歴保存先（xref / Better Jumper）
- ジャンプ履歴
- Navigation の記録方針

### Project Context

責務は「現在のプロジェクトタブが表すプロジェクトを project.el に伝えること」。

Tab Routing とは別機能だが、Tab ID の project 情報を読み取る。

### Tab UI

責務は「タブをどう見せ、どう手動操作するか」。

例:

- Misc を表示するか
- 次・前のタブへどう移動するか
- タブの並べ替え

Routing の判定ロジックとは分離する。

### Navigation

責務は「意味のある移動をジャンプ履歴へ記録すること」。

知ってよいもの:

- 移動前後のバッファ
- point
- window
- 採用した履歴機能の公開 API

知らないもの:

- Destination の決め方
- Tab ID の構造
- Routing の内部関数

### 履歴機能

履歴の保存・戻る・進むは、最小実験で選んだ xref または Better Jumper に任せる。

自作 Navigation 層は履歴機能そのものを再実装せず、「どの移動を履歴へ記録するか」だけを担当する。

## Tab Routing のデータフロー

基本形は次の通り。

```text
File / Buffer
    ↓
Routing Facts
    ↓
Destination
    ↓
Tab Snapshot
    ↓
Tab Plan
    ↓
Plan 実行
```

### Routing Facts

Emacs から読み取った事実。

例:

```text
file path
project root
buffer kind
```

この段階だけが `project-current` や現在バッファなど Emacs の状態へ依存する。

### Destination

純粋な分類結果。

例:

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

Destination は「どこへ行くべきか」だけを表す。

### Tab Snapshot

現在のタブ状態を、判断に必要な最小限のデータへ変換したもの。

例:

```elisp
((:index 1 :current t   :id misc :name "Misc")
 (:index 2 :current nil :id (project . "/work/bar/") :name "bar"))
```

純粋関数は `tab-bar` の生の内部構造ではなく、この小さな値を扱う。

### Tab Plan

Destination と Tab Snapshot から生成する操作計画。

例:

```elisp
(:action stay)
```

```elisp
(:action select
 :index 2)
```

```elisp
(:action create
 :id (project . "/work/foo/")
 :name "foo")
```

「何をするか」を決めるところまでを純粋にし、実際の `tab-bar-select-tab` や `tab-bar-new-tab` は外側で行う。

## Navigation のデータフロー

Navigation も同じ形に揃える。

```text
Emacs
  ↓
Location(before)
  ↓
original command
  ↓
Location(after)
  ↓
transition?
  ↓
Better Jumper へ記録
```

Location は判断に必要な最小情報だけ持つ。

例:

```elisp
(:buffer BUFFER
 :point 123
 :window WINDOW)
```

移動前後の Location を比較する純粋関数を用意する。

## IO境界

「IO」はファイル入出力だけではなく、ここでは Emacs の可変状態へ触る処理全般を指す。

主な境界は以下。

### Tab Routing

観測:

- `buffer-file-name`
- `default-directory`
- `project-current`
- `project-root`
- `tab-bar-tabs`

変更:

- `tab-bar-select-tab`
- `tab-bar-new-tab`
- `tab-bar-rename-tab`
- タブIDの反映

### Project Context

観測:

- 現在タブのID

変更ではなく一時的な環境設定:

- `project-current-directory-override` の動的束縛

### Navigation

観測:

- `current-buffer`
- `point`
- `selected-window`

変更:

- `better-jumper-set-jump`

純粋関数の内部からこれらを直接呼ばない。

## Tab ID

表示名とは別に、タブを一意に識別する値を持つ設計は継続する。

例:

```elisp
misc
```

```elisp
(project . "/work/foo/")
```

表示名と識別子は別物とする。

```text
表示名 = 人間向け
Tab ID = プログラム向け
```

新構築では「IDを持たない同名タブを自動的に取り込む」旧互換処理は基本的に採用しない。

同じIDのタブがあれば再利用し、なければ作成する。

## Routing Rule

旧実装の `my/tab-routing-filters` のような拡張用リストは、最初から必須とはしない。

ルール数が少なく固定的なら、単純な `cond` の方が読みやすい。

例:

```text
特別な用途
  ↓
Project
  ↓
Misc
```

外部からルールを追加する必要が生じた時点で、初めてルール一覧への抽象化を検討する。

## Navigation の履歴方式は先に小さく試す

ここは実装前に決める。

旧設定は Better Jumper を使っていたが、`window` 単位の履歴と Tab Routing の組み合わせは少し複雑。

一方、Emacs 標準の xref には global history があり、タブをまたぐ「戻る / 進む」と相性がよさそう。

なので、まだどちらかに決め打ちしない。

```text
Project A / a.el
    ↓
Project B / b.el
    ↓
戻る
    ↓
Project A / a.el

進む
    ↓
Project B / b.el
```

この最小実験で、file / point / tab が全部正しいことを確認してから xref か Better Jumper を採用する。

Better Jumper を使う場合でも、自作コードから `better-jumper--jumping` のような内部変数は参照しない。

## Routing と Navigation の advice の関係

同じコマンドへ両方の advice が付く場合は、Navigation を外側、Routing を内側にする。

```text
Navigation advice
        ↓
Routing advice
        ↓
Original command
```

ただし、この順序だけで Better Jumper の履歴保存先問題が解決するわけではない。だから履歴方式の最小実験を先に行う。

## Bufferlo

現在の新 `.emacs.d` では Bufferlo はすでに採用済み。

大事なのは `bufferlo-clear` を呼ぶタイミング。

やりたいのはこれ。

```text
新しいタブを作る
    ↓
目的のファイルを表示
    ↓
表示成功
    ↓
Bufferlo をそのバッファだけに初期化
```

タブ作成直後はまだ `*scratch*` の可能性があるので、その時点では clear しない。

Routing は Bufferlo を直接知らず、**表示成功後の通知**だけ出す。

```text
Routing
  ↓
after-display
  ↓
Bufferlo
```

作成直後専用 hook は、別の用途が出るまで作らない。

## Misc の非表示は最後に考える

最初の実装では Misc を普通に表示したまま Routing を完成させる。

Misc を隠す場合も、内部の全タブ一覧から消してはいけない。表示だけを変える。

`tab-bar-tabs-function` はタブの描画だけでなく選択・作成・移動にも使われるため、Misc 除外には使わない。

必要になったら `tab-bar-format` 側の描画だけを調整する。

公開 API だけにこだわって実装が大きくなるなら、内部 API を1か所へ隔離して使う方が分かりやすい場合もある。

## Project の2つの文脈を混ぜない

Routing と Project Context は同じ `project-current` を使うが、意味が違う。

```text
Routing
  このファイルはどの Project？
  → 対象 directory を明示して調べる

Project Context
  今いるタブはどの Project？
  → directory が省略された時だけタブの root を補う
```

この2つを混ぜると、現在タブの Project に別 Project のファイル判定が引っ張られる可能性がある。

## 過度な抽象化を避ける

今回の目的は「関数型風に見せること」ではなく、状態依存を狭くして理解・テストしやすくすること。

そのため、次のような構造は作らない。

```text
domain/
ports/
adapters/
services/
repositories/
```

個人用 Emacs 設定として必要以上に層を増やさない。

初期案は次の程度に留める。

```text
elisp/
├── my-tab-routing.el
├── my-project-context.el
└── my-navigation.el
```

必要なら Tab UI は `config/` 側へ置く。

## テスト方針

純粋関数を中心に ERT を書く。ただし、今回壊れやすいのは Emacs 状態との境界なので、統合 ERT も少数は必須にする。

### 純粋関数

- Facts → Destination
- Destination + Tab Snapshot → Plan
- Project ID → root
- Navigation の before / after → record?

### 統合 ERT

- タブ往復後も Tab ID が残る
- 同名 Project を分離できる
- 相対パスを開いてもタブ切替で対象ファイルが変わらない
- Bufferlo は目的バッファの表示成功後に初期化される
- 戻る / 進むで file + point + tab が正しく戻る
- 履歴再生自身が新しい履歴を作らない
- 設定再読込で advice / hook が重複しない

全部を自動化する必要はないが、状態境界を「手動確認だけ」にはしない。

## 相対パスと再入も境界の仕様

`find-file "src/foo.el"` のような相対パスは、タブを切り替える前の `default-directory` を基準に対象を確定する。

また、Routing / Navigation / 履歴再生の再入防止は別々の動的状態として持つ。1つのフラグへまとめない。

表示失敗時は最初から複雑な rollback を作らず、成功後通知を出さないところから始める。

## 実装順

レビュー後は、Navigation の履歴方式だけ Routing 完成後まで先送りしない。

```text
0. xref / Better Jumper の最小実験
        ↓
1. Destination + ERT
        ↓
2. Tab Snapshot / Plan + ERT
        ↓
3. Tab 操作 / ID 保存 + 統合ERT
        ↓
4. 普通のファイル表示1経路へ接続
   相対パス / 再入 / 失敗を確認
        ↓
5. Bufferlo を表示成功後へ接続
        ↓
6. Project Context
   必要なら Magit の挙動も確認
        ↓
7. Navigation
        ↓
8. Routing + Navigation の統合確認
        ↓
9. 実際に使う表示経路を1つずつ追加
        ↓
10. 必要なら Misc 非表示
```

## 旧実装から変える主なところ

| 旧実装 / 旧案 | 新しい方針 |
| --- | --- |
| Destination 判定と Emacs 状態取得が近い | 観測と純粋な判定を分ける |
| `my/tab-routing--select` が判断と状態変更を担当 | Plan と Execute に分ける |
| IDなし同名タブを自動採用 | 新構築ではやめる |
| タブ一覧全体を作り直す案 | Tab ID だけを境界で局所更新 |
| `tab-bar-tabs-function` で Misc を除外する案 | やめる。必要なら描画だけ変える |
| Routing が Bufferlo を直接呼ぶ | 表示成功後通知で接続 |
| Bufferlo をタブ作成直後に clear | 目的バッファ表示成功後に clear |
| Better Jumper 前提 | xref と最小実験で比較して決める |
| Better Jumper 内部変数へ依存 | しない |
| point を整数だけで保持する案 | marker は境界で保持し、純粋判定は整数で行う |
| Routing 完成後に履歴統合を確認 | 履歴方式だけ先に最小実験 |
| 境界テストは薄め | 壊れやすい境界は少数の統合 ERT を必須にする |

## まとめ

新設計では、Tab Routing と Navigation を別機能として維持しながら、両方に同じ設計原則を適用する。

```text
観測
 ↓
純粋な判断
 ↓
副作用
```

タブルーティングは、

```text
Facts → Destination → Plan → Execute
```

Navigation は、

```text
Location(before/after) → transition? → Record
```

とする。

これにより、

- 変更理由が局所化する
- ERT を小さく書ける
- 問題発生時の切り分けが容易になる
- 履歴機能 / Bufferlo / tab-bar の変更へ追従しやすくなる

という構成を目指す。
