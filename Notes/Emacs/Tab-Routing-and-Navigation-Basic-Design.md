# タブルーティング / Navigation 新基本設計

## このノートについて

これは厳密な仕様書というより、あとで自分たちが読み返して、

> 何を作ろうとしていたんだっけ？

をすぐ思い出すための設計ノート。

細かい API 名よりも、**責務・データの流れ・採用理由**が分かることを優先する。

## まず結論

今回の中心は **「Tab を独立した Workspace に見せる」** こと。

ただし、

```text
Tab ≠ Project
Tab ≠ Repository
```

である。

Tab は **Routing が決めた作業文脈**。同じ Tab に複数 Repository のファイルが入ってもよい。

たとえば Routing 関数が `.org` を同じ Destination へ送るなら、

```text
Org Tab
├─ repo-a/docs/foo.org
├─ repo-b/notes/bar.org
└─ ~/memo.org
```

のような状態は普通にあり得る。

Workspace ごとに独立させたい状態は、まず次の3つ。

```text
Tab Workspace
├─ Buffer Set          → Bufferlo が有力
├─ Navigation History → Emacs標準 xref を第一候補
└─ Window Configuration → tab-bar 標準
```

Project は Destination の一種類にすぎない。Project 型の Tab だけ、必要に応じて `project.el` と連携する。

Tab Routing / Project Context / Navigation は別々の機能として作り、直接依存させない。

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

観測:

- `buffer-file-name`
- `default-directory`
- Routing 関数が必要とする最小限の Emacs 状態
- `tab-bar-tabs`

変更:

- `tab-bar-select-tab`
- `tab-bar-new-tab`
- `tab-bar-rename-tab`
- Tab ID の反映

### Project Context

責務は、**Project 型の Destination を持つ Tab** にいるとき、その Project root を `project.el` へ補助的に伝えること。

Routing 全体が Project 前提になるわけではない。

Org / Misc / 任意の独自 Destination では、通常の `project.el` の判定に任せる。

### Tab UI

責務は「タブをどう見せ、どう手動操作するか」。

例:

- Misc を表示するか
- 次・前のタブへどう移動するか
- タブの並べ替え

Routing の判定ロジックとは分離する。

### Navigation

観測:

- `current-buffer`
- `point` / marker
- 現在の Tab

変更:

- xref の marker stack
- 現在 Tab の Navigation History

履歴 storage の具体的な Tab パラメータ名などは、最小実験で決める。

純粋関数の内部からこれらを直接触らない。

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

## Routing Functions

旧実装の `my/tab-routing-filters` に近い **順序付きの関数リスト** を基本にする。

これは過度な抽象化ではなく、今回の要件そのもの。

```text
routing-functions
  ├─ function A
  ├─ function B
  ├─ function C
  └─ ...
```

上から評価し、最初に non-nil の Destination を返したところで終了する。

具体的な Routing 関数は固定しない。

旧設定の Tasks / Org / Project は参考例であって、設計上の必須ルールではない。

そして、どの関数にもマッチしなかった **ファイル** だけ Misc へ送る。

## Navigation History は Tab-local

ここは仕様として固定する。

```text
Tab A
  a.el → b.el → c.el

Tab B
  x.el → y.el
```

Tab A で戻ると `b.el`。Tab B には行かない。

Window が2つあっても、その Tab の履歴は1本。

実装手段の第一候補は Emacs 標準 xref。

`xref-history-storage` に現在 Tab の履歴を返す関数を設定できるか、小さく試す。

```text
current tab
   ↓
my/xref-tab-history
   ↓
そのTab専用の history
```

確認すること:

- Tab A / Tab B の履歴が混ざらない
- 同一 Tab の Window 1 / Window 2 では同じ履歴を使う
- Tab を切り替えて戻っても履歴が残る
- Tab 複製時に履歴が意図せず共有されない
- Tab close / undo-close で状態が破綻しない

xref で要件を満たせない点が見つかった場合だけ Better Jumper や小さな自作履歴を再検討する。

## Routing と Navigation の関係

両者は直接依存しない。

```text
Routing
  どの Workspace で表示するか

Navigation
  現在 Workspace 内の移動履歴
```

Navigation は移動前後の Tab を観測し、**Tab が変わった移動は自作履歴へ記録しない**。

同じコマンドへ advice が必要になった場合だけ、実際の呼び出し経路を見て順序を決める。

最初から advice の順序を機能間の契約にしない。

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

## Project は Destination の一種類

Routing は Project を特別扱いしない。

Project 用 Routing 関数が、たとえば

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

を返すだけ。

Project Context は、この **Project 型 ID の Tab にいる時だけ** project root を解釈する。

Org / Misc / その他の Tab では Tab 由来の Project override を入れない。

そのため、同じ Org Tab に複数 Repository の `.org` が混在しても問題ない。

各 buffer の `default-directory` を使った通常の `project.el` 判定はそのまま利用できる。

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

- Routing 関数のうち純粋に書けるもの
- Routing 関数群の first-match
- Destination + Tab Snapshot → Plan
- Project ID → root
- Navigation の before / after / tab → record?

### 統合 ERT

- 任意の Routing 関数順序が守られる
- ファイルの no-match は Misc へ行く
- ファイルなし no-match は Tab を動かさない
- 同じ Destination ID は同じ Tab を再利用する
- 同名・別 ID の Tab を分離できる
- Bufferlo の buffer set が Tab ごとに分離される
- Navigation History が Tab ごとに分離される
- 同一 Tab の複数 Window では同じ Navigation History を使う
- Tab をまたぐ移動は Navigation History に混ざらない
- 相対パスを開いてもタブ切替で対象ファイルが変わらない
- 設定再読込で advice / hook が重複しない

全部を自動化する必要はないが、状態境界を「手動確認だけ」にはしない。

全部を自動化する必要はないが、状態境界を「手動確認だけ」にはしない。

## 相対パスと再入も境界の仕様

`find-file "src/foo.el"` のような相対パスは、タブを切り替える前の `default-directory` を基準に対象を確定する。

また、Routing / Navigation / 履歴再生の再入防止は別々の動的状態として持つ。1つのフラグへまとめない。

表示失敗時は最初から複雑な rollback を作らず、成功後通知を出さないところから始める。

## 実装順

```text
0. xref の Tab-local history 最小実験
        ↓
1. Routing function contract / first-match + ERT
        ↓
2. Destination + Tab Snapshot / Plan + ERT
        ↓
3. Tab 操作 / ID 保存 + 統合ERT
        ↓
4. 普通のファイル表示1経路へ接続
   相対パス / 再入 / 失敗を確認
        ↓
5. Misc fallback
        ↓
6. Bufferlo を表示成功後へ接続
        ↓
7. Project Context
        ↓
8. Tab-local Navigation
        ↓
9. 実際に使う表示経路を1つずつ追加
        ↓
10. 必要なら Misc 非表示
```

## 旧実装から変える主なところ

| 旧実装 / 旧案 | 新しい方針 |
| --- | --- |
| Tab を Project Workspace 寄りに説明 | Tab = Routing が決める独立 Workspace |
| 具体的な Routing ルールを設計の中心に置く | 順序付き Routing 関数群 + first-match を中心にする |
| Misc を通常ルールのように扱う | file の no-match fallback として扱う |
| `my/tab-routing--select` が判断と状態変更を担当 | Plan と Execute に分ける |
| IDなし同名タブを自動採用 | 新構築ではやめる |
| Routing が Bufferlo を直接呼ぶ | 表示成功後通知で接続 |
| Navigation を global / window 単位で検討 | Tab-local の1本の履歴にする |
| Better Jumper 前提 | Emacs標準 xref を第一候補にする |
| Project Context を Tab 全体の前提に見せる | Project 型 Destination だけの追加機能にする |
| 境界テストは薄め | 壊れやすい境界は少数の統合 ERT を必須にする |

## まとめ

今回の中心は **Tab-local Workspace**。

```text
Tab Workspace
├─ Routing Destination ID
├─ Buffer Set
├─ Navigation History
└─ Window Configuration
```

Project はその一種類にすぎない。

Routing は、

```text
順序付きの任意の Routing 関数群
        ↓
first match
        ↓
Destination
        ↓
no match + file → Misc
```

Navigation は、

```text
現在 Tab の中だけで戻る / 進む
```

Buffer は Bufferlo、Navigation History は標準 xref、Window Configuration は tab-bar をまず使い、足りないところだけ薄く自作する。

**小さい純粋関数 + 薄い Emacs 境界 + Tab-local な状態**

このバランスを目指す。



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
