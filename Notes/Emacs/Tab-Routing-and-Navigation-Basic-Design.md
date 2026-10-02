# タブルーティング / Navigation 基本設計

## このノートについて

これは厳密な仕様書ではなく、

> 何を作ろうとしていたんだっけ？

をあとからすぐ思い出すためのノート。

細かい API 名より、**何をしたいか / なぜそうするか**を優先する。

設計で名前を付けて使う言葉は、
[Tab-Routing-and-Navigation-Terminology.md](./Tab-Routing-and-Navigation-Terminology.md)
にまとめてある。

## まずやりたいこと

今回やりたいのは、

> **Emacs の Tab を、それぞれ独立した作業スペースのように使う**

こと。

ただし、

```text
Tab ≠ Project
Tab ≠ Repository
```

ここは大事。

どの Tab に入るかはルーティング関数が決める。

たとえば `.org` をまとめるルールなら、

```text
Org Tab
├─ repo-a/docs/foo.org
├─ repo-b/notes/bar.org
└─ ~/memo.org
```

のように、1つの Tab に複数 Repository のファイルが入ってよい。

Project は、ルーティング方法の1つにすぎない。

## Tab ごとに分けたいもの

まず分けたいのはこのあたり。

```text
Tab A
├─ 表示する buffer のまとまり
├─ 戻る / 進むの履歴
└─ Window の並び

Tab B
├─ 表示する buffer のまとまり
├─ 戻る / 進むの履歴
└─ Window の並び
```

使えそうなものはなるべく標準機能や既存パッケージに任せる。

| やりたいこと | 第一候補 |
| --- | --- |
| Tab ごとの buffer | Bufferlo |
| Tab ごとの移動履歴 | Emacs 標準 xref |
| Window の並び | tab-bar |
| Project 判定 | project.el |

足りない接着部分だけ自作する。

## Tab Routing

Tab Routing の仕事はシンプル。

> この file / buffer は、どの Tab で表示する？

を決める。

ルーティング関数は自由に追加・削除・並べ替えできる。

```text
file
 ↓
ルーティング関数 A → マッチしない
 ↓
ルーティング関数 B → マッチした
 ↓
その行き先を使う
```

最初にマッチしたものを採用する。

旧設定では Tasks / Org / Project などのルールを使っていたが、これはあくまで当時の設定例。

今回の仕組みが Tasks / Org / Project に固定されるわけではない。

### Destination

ルーティング関数が返す「行き先」を Destination と呼ぶ。

たとえば、

```elisp
(:id org
 :name "Org")
```

なら Org Tab が行き先。

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

なら、その Project 用 Tab が行き先。

Destination は「どこへ行くか」を表すだけで、実際の Tab 操作は別で行う。

## Misc

file がどのルーティング関数にもマッチしなかったら Misc へ送る。

```text
fileあり
  ↓
どのルーティング関数にもマッチしない
  ↓
Misc
```

Misc は通常のルーティング関数というより、最後の受け皿。

一方で、`*Messages*` などの file を持たない buffer は、何にもマッチしなかったからといって Misc へ送らない。

```text
fileあり + マッチなし  → Misc
fileなし + マッチなし  → 今のTabのまま
```

## Tab ID

Tab の表示名とは別に、プログラム用の ID を持たせる。

```text
表示名: Org
Tab ID: org
```

Project なら、

```elisp
(project . "/work/foo/")
```

のような ID を使える。

同じ ID の Tab があればそこへ移動し、なければ新しく作る。

同じ名前でも ID が違えば別 Tab として扱う。

## Project Context

Project 用の Tab だけ、少し project.el と連携する。

たとえば Project A の Tab にいる時は、

> 今は Project A を作業中

という情報を project.el に補助的に渡せるようにする。

ただし、これをすべての Tab に適用しない。

たとえば Org Tab に、

```text
repo-a/foo.org
repo-b/bar.org
```

が同時にあっても問題ない。

その場合は各 buffer の `default-directory` を使って、project.el が普通に Project を判定すればよい。

## Bufferlo

Bufferlo は今回かなり相性がよい。

やりたいのは、

```text
Tab A → Aで使っているbufferだけ見える
Tab B → Bで使っているbufferだけ見える
```

という状態。

新しい Tab を作った時だけ注意が必要で、

```text
新しいTabを作る
 ↓
目的のfileを表示する
 ↓
表示できた
 ↓
Bufferloをそのbufferから始める
```

という順番にする。

Tab を作った直後に `bufferlo-clear` すると、まだ `*scratch*` しか表示されていない可能性があるため。

## Navigation

Navigation は、

> 今いる Tab の中だけで戻る / 進む

ようにしたい。

```text
Tab A
  a.el → b.el → c.el

Tab B
  x.el → y.el
```

Tab A で「戻る」を押したら `b.el` に戻る。

Tab B には行かない。

Window が2つあっても履歴は Tab で1本。

```text
Tab A
├─ Window 1
├─ Window 2
└─ 共有する移動履歴
```

まずは Emacs 標準の xref で実現できるか試す。

Better Jumper を使うこと自体は目的ではない。xref で十分なら追加パッケージは使わない。

## Routing と Navigation の関係

この2つは別機能として考える。

```text
Routing
  → どのTabで表示するか

Navigation
  → 今のTabの中でどこへ戻るか
```

別 Tab へ移動したこと自体は Navigation の履歴に入れない。

A から B の Tab に移動したなら、A に戻る方法は「戻る」ではなく Tab 切り替え。

この方が、

> Tab 同士は独立している

という見え方に合う。

## Misc を隠すのは後で

まず Routing を正しく動かす。

Misc を画面上から隠したくなったら、その時に見た目だけ調整する。

`tab-bar-tabs-function` から Misc を除外する方法は使わない。これは表示だけでなく実際の Tab 操作にも影響するため。

## コードの作り方

基本は、

```text
Emacsの状態を見る
 ↓
小さい関数で判断する
 ↓
必要な操作をする
```

という形にする。

純粋にできる判断は純粋関数にする。

ただし、純粋関数にするためだけに大きなデータ構造や抽象化を増やさない。

個人用 Emacs 設定なので、分かりやすさを優先する。

## テスト

ERT は、壊れた時に原因を見つけやすいところへ置く。

特に確認したいのは、

- ルーティング関数の順番
- 同じ Tab ID の再利用
- マッチしない file が Misc へ行くこと
- file のない buffer は勝手に Misc へ行かないこと
- Bufferlo の buffer が Tab ごとに分かれること
- Navigation の履歴が Tab ごとに分かれること
- 同じ Tab の複数 Window では同じ履歴になること
- 相対パスを開いても、Tab 切り替えのせいで別 file を開かないこと
- 設定を再読込しても advice / hook が二重にならないこと

全部を ERT に押し込まず、UI は実際に触って確認する。

## 実装する順番

一気に作らない。

```text
1. xref で Tab ごとの履歴を作れるか小さく試す
2. ルーティング関数の仕組みを作る
3. Destination と Tab ID を使って Tab を選ぶ
4. 普通の file を開く経路へつなぐ
5. Misc を入れる
6. Bufferlo とつなぐ
7. Project Context を入れる
8. Navigation を入れる
9. 必要な表示経路を少しずつ増やす
10. 最後に必要なら Misc の見た目を調整する
```

## まとめ

今回の中心は、

> **Tab をそれぞれ独立した作業スペースのように見せる**

こと。

でも、

```text
Tab ≠ Project
Tab ≠ Repository
```

どの Tab に入るかは自由なルーティング関数で決める。

Tab ごとの buffer は Bufferlo、移動履歴はまず xref、Window は tab-bar に任せる。

Project は必要な Tab だけ project.el とつなぐ。

なるべく Emacs 標準と既存パッケージを使い、足りないところだけ小さく自作する。
