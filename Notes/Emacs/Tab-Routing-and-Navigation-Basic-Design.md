# タブルーティング / Navigation 新基本設計

## 目的

新しい `.emacs.d` では、タブルーティングと Better Jumper を別々の機能として実装する。

ただし両者は `find-file` や `switch-to-buffer` など同じ移動経路に関わるため、完全に無関係な機能ではない。コード上の依存は持たせず、最後に統合動作だけ確認する。

設計の中心は次の方針。

- 小さな純粋関数を組み合わせる
- Emacs の状態を読む処理と変更する処理を外側へ寄せる
- 判断と副作用を分離する
- タブルーティングと Navigation は互いを知らない
- 必要な接点だけ hook / advice / 統合テストで結ぶ
- 拡張性のためだけの抽象化は作らない

Functional Core / Imperative Shell に近い構成を目指す。

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
必要なら Better Jumper へ記録
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

- Better Jumper
- ジャンプ履歴
- Better Jumper の内部変数
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
- Better Jumper の公開機能

知らないもの:

- Destination の決め方
- Tab ID の構造
- Routing の内部関数

### Better Jumper

外部パッケージとしてジャンプ履歴の保存・戻る・進むを担当する。

自作 Navigation 層は Better Jumper そのものを再実装せず、「どの移動を履歴へ記録するか」だけを担当する。

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

## Better Jumper と Routing の関係

両者は同じコマンドへ advice を付ける可能性がある。

意図する順序は、

```text
Navigation advice
    ↓
Tab Routing advice
    ↓
Original command
```

Navigation は移動全体の前後を観測する。

Routing は実際の移動処理の内側で、必要なら先にタブを選択する。

この順序だけを明示的な統合点とし、双方の実装は互いを呼ばない。

## Better Jumper のジャンプ中

旧実装では Better Jumper の内部変数 `better-jumper--jumping` を参照していた。

新設計では、可能な限り外部パッケージの内部変数へ依存しない。

自作 Navigation 側で「現在は Navigation 自身による履歴移動中」という状態を動的変数で管理する。

概念:

```elisp
(let ((my/navigation--recording-disabled t))
  (better-jumper-jump-backward))
```

これにより、Better Jumper の内部実装変更への依存を減らす。

詳細な接続方法は実装前に Better Jumper の公開 API を再確認して決める。

## Bufferlo

Tab Routing 本体から Bufferlo を直接呼ばない。

Routing が新しいタブを作成した事実を、必要なら hook で通知する。

概念:

```text
Tab Routing
   ↓
tab-created-hook
   ↓
Bufferlo
```

これにより、

```text
Routing → Bufferlo
```

という直接依存を避ける。

Bufferlo を採用しない場合も Routing の実装を変更しなくてよい。

## 公開API優先

旧実装で使用していた `tab-bar--...` のような内部APIは、可能な限り避ける。

新実装時には Emacs 31.1 の公開 API を確認し、

- `tab-bar-tabs`
- `tab-bar-tabs-set`
- `tab-bar-tabs-function`

などで構成できる部分はそちらを優先する。

内部APIが本当に必要な場合だけ、理由を設計書とコードコメントへ残す。

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

テストは純粋関数を中心にする。

### Tab Routing

優先して ERT にするもの:

- Facts から Destination を決める
- Destination と Tab Snapshot から Plan を作る
- 同じIDなら stay
- 既存IDなら select
- IDがなければ create
- 同名でもIDが違えば別タブとして扱う

### Navigation

優先して ERT にするもの:

- before / after が同じなら記録しない
- point が変われば記録する
- buffer が変われば記録する
- 必要なら window が変わった場合の扱い

### 統合確認

少数だけ用意する。

例:

```text
Project A
  ↓
Project B
  ↓
jump backward
```

このとき、

- Navigation の履歴が正しい
- Routing が正しいタブへ戻す
- 戻る操作自体が新しい履歴として増殖しない

ことを確認する。

## 実装順

1. Tab Routing の純粋な Destination 判定
2. Tab Plan
3. Tab Plan の実行境界
4. Project Context
5. Tab UI / Bufferlo 接続
6. Better Jumper 本体の設定
7. Navigation の純粋な transition 判定
8. Navigation の advice
9. 両者の統合確認

Tab Routing を先に完成させ、Navigation はその最終的な移動挙動を観測する形にする。

## 旧実装から変更する主な点

| 旧実装 | 新設計 |
| --- | --- |
| Destination 判定中に `project-current` | 外側で Project root を観測し、純粋関数へ渡す |
| `my/tab-routing--select` が判断と状態変更を両方担当 | Plan と Execute に分離 |
| `tab-bar--...` 内部APIを利用 | 公開APIを優先 |
| IDなし同名タブを自動採用 | 新構築では原則削除 |
| Routing が Bufferlo を直接知る | hook で接続 |
| Navigation が Better Jumper 内部変数を見る | 自分たちの記録抑制状態を持つ |
| 移動判定と履歴記録が一体 | Location / transition 判定 / record に分離 |
| Routing と Navigation の初期化が混在 | 独立して初期化 |
| advice 順序が構成依存 | Navigation 外側 / Routing 内側を明示 |

## まとめ

新設計では、タブルーティングと Better Jumper を別機能として維持しながら、両方に同じ設計原則を適用する。

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
- Better Jumper / Bufferlo / tab-bar の変更へ追従しやすくなる

という構成を目指す。
