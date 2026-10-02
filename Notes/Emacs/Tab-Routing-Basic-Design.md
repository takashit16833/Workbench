# .emacs.d-cli タブルーティング 基本設計

## 目的

`.emacs.d-cli` のタブルーティングは、開いたファイルやバッファを用途・所属先ごとの Emacs タブへ自動的に振り分け、**タブを作業コンテキストとして扱う**ための仕組みである。

単なる「ファイル種別ごとのタブ切り替え」ではない。タブには表示名とは別の識別情報を持たせ、必要に応じてプロジェクト情報やタブ内バッファ集合も連動させる。

新しい `.emacs.d` へ再実装する際は、旧コードをそのまま移植するのではなく、この設計意図を理解したうえで必要な部分だけ採用する。

## 調査対象

調査対象は `.emacs.d-cli` の `main` ブランチ。

中心となるファイルは以下。

```text
lisp/
├── my-tab-routing.el
├── my-tab-bar.el
├── my-project-context.el
└── my-navigation.el

test/
├── my-tab-routing-test.el
└── my-project-context-test.el
```

### 各ファイルの責務

| ファイル | 責務 |
| --- | --- |
| `my-tab-routing.el` | バッファの表示先を決め、必要なタブを選択・作成する |
| `my-tab-bar.el` | Misc の非表示、タブ移動、並べ替えなど見た目と手動操作を扱う |
| `my-project-context.el` | 現在のプロジェクトタブを `project.el` の現在プロジェクトとして扱わせる |
| `my-navigation.el` | 旧設定では初期化の入口。Better Jumper とタブルーティングを結びつけている |

## 設計の中心

旧実装の本質は次の構造にある。

```text
Buffer / File
    ↓
Destination
    ↓
Tab ID
    ↓
Tab
```

プロジェクトタブでは、さらに次へつながる。

```text
Tab ID
    ↓
Project root
    ↓
project-current
```

したがって、旧実装におけるタブは単なる表示切り替えではなく、**用途やプロジェクトごとの作業空間**である。

## タブの種類

現在の主なルーティング先は次の通り。

| 種類 | 表示名 | 識別子 |
| --- | --- | --- |
| Workbench task | Tasks | `tasks` |
| Org | Org | `org` |
| Project | プロジェクト名 | `(project . ROOT)` |
| その他 | Misc | `misc` |

プロジェクトだけはルートパスを識別子に含める。

例:

```elisp
((project . "/Users/foo/src/dotfiles/") . "dotfiles")
```

これにより、同じディレクトリ名を持つ別プロジェクトを区別できる。

## 表示名と識別子を分ける理由

タブ名は人間が見るための表示であり、一意とは限らない。

たとえば、

```text
~/work/foo/
~/private/foo/
```

はどちらも表示名が `foo` になる。

そこで内部では、

```text
(project . "/.../work/foo/")
(project . "/.../private/foo/")
```

のようにプロジェクトルート全体を使って区別する。

つまり、

```text
タブ名 = 人間向け
タブID = プログラム向け
```

という役割分担になっている。

## ルーティング規則

ファイルの振り分け規則は順序付きで登録され、**最初に一致したものを採用する**。

現在の順序は次の通り。

```text
1. Workbench Tasks
2. Org
3. Project
4. Misc
```

概念的には以下。

```text
File
 │
 ├─ Workbench/tasks 配下?
 │    └─ Yes → Tasks
 │
 ├─ Org ファイル?
 │    └─ Yes → Org
 │
 ├─ project.el が所属プロジェクトを検出?
 │    └─ Yes → Project
 │
 └─ その他
      └─ Misc
```

この順序自体が仕様である。

たとえば Workbench の task は Org ファイルでもあるが、Tasks 判定が先なので Tasks タブへ送られる。

## ファイルを持たないバッファ

特殊バッファなど、通常の `buffer-file-name` を持たないバッファは原則として自動ルーティングしない。

例:

```text
*Messages*
*Help*
*Completions*
```

これらは現在のタブに残す。

ただし xref の検索結果は例外で、`default-directory` からプロジェクトを判定して、そのプロジェクトタブへ送る。

このことから、旧実装は途中から「ファイルの振り分け」ではなく、**バッファが持つ作業コンテキストの振り分け**へ発展している。

## タブの選択・作成

ルーティング結果を受け取ると、概ね次の順で処理する。

```text
目的の Tab ID を取得
    ↓
現在のタブが同じ ID?
    ├─ Yes → 何もしない
    └─ No
         ↓
同じ ID の既存タブを探す
    ├─ Found → そのタブを選択
    └─ Not found
         ↓
ID のない同名タブを探す
    ├─ Found → 再利用して ID を付与
    └─ Not found → 新規タブを作成
```

同名タブの再利用は、既存タブを自動ルーティング管理下へ移行しやすくするための仕組みでもある。

## Misc の役割

Misc は、どのルーティング条件にも一致しないファイルの受け皿。

起動直後の最初の `*scratch*` タブは、条件が合えば新しいタブを増やさず Misc として再利用する。

ただし Misc は通常の作業対象ではないため、

- タブバーには表示しない
- PageUp / PageDown のタブ移動でも飛ばす
- 並べ替えの対象にも含めない

という扱いになっている。

Misc は削除されているのではなく、**内部には存在するが通常のUIからは隠された裏方タブ**である。

## Project Context

プロジェクトタブでは、現在表示しているバッファが何であるかにかかわらず、そのタブが表すプロジェクトを `project.el` の現在プロジェクトとして扱えるようにする。

通常の `project-current` は主に現在バッファの `default-directory` を基準にする。

旧実装では、現在のタブIDが、

```elisp
(project . ROOT)
```

なら、その `ROOT` を `project-current-directory-override` として一時的に使う。

重要なのは、バッファ自身の `default-directory` を恒久的に変更しないこと。

```text
Buffer state
    ↓ 変更しない

project-current の呼び出し中だけ
    ↓
Tab の Project root を使う
```

という設計になっている。

## Bufferlo との関係

旧設定では `bufferlo` を利用し、タブごとにバッファ集合も分離している。

```text
Project A tab
├── a.hs
├── b.hs
└── README.md

Project B tab
├── main.lua
└── README.md
```

タブルーティング自体と Bufferlo は別機能だが、組み合わせることで「タブ = 作業空間」という感覚を強めている。

新しい `.emacs.d` で Bufferlo を再採用するかは別途検討する。

## 旧実装の良い点

新しい `.emacs.d` でも考え方として価値が高いのは以下。

- タブ名と内部IDを分離している
- ルーティング規則が順序付きの関数リストになっている
- 最初に一致した規則を採用するので優先順位が明確
- Routing と Project Context の責務が分かれている
- 明示的な `project-current` の引数や既存 override を優先する
- バッファの `default-directory` を書き換えない
- TRAMP のプロジェクトルートをそのまま扱える
- ERT で優先順位やプロジェクト判定を確認している

## 新しい .emacs.d で再検討する点

旧実装をそのままコピーせず、次を改めて確認する。

### 初期化場所

旧実装では Better Jumper の設定からタブルーティングを初期化している。

責務としては独立しているため、新構成では分離した方がよい。

### Org / Tasks

現在の `.emacs.d` では Org を中心機能として使わない方針なので、Tasks / Org ルーティングが今も必要か確認する。

### Bufferlo

標準機能だけで十分か、Bufferlo を再採用するかを検討する。

### advice の範囲

旧実装では、

```text
find-file
switch-to-buffer
display-buffer
```

という基本関数を advice している。

影響範囲が広いため、本当に3つすべて必要か、Emacs 標準の `display-buffer` 系の仕組みでより単純にできないか確認する。

### 内部API

旧実装では、

```elisp
tab-bar--current-tab-find
tab-bar--format-tab
```

など `tab-bar--` で始まる内部関数も使用している。

Emacs 31.1 で公開APIだけに寄せられるか確認したい。

## 再設計時の分割単位

新実装では最低でも次の単位に分けて考える。

```text
1. Tab Routing
   File / Buffer → Tab

2. Tab Identity
   Tab → ID

3. Project Context
   Tab → project.el

4. Tab-local Buffers
   Tab → buffer set

5. Tab UI
   表示、移動、並べ替え
```

特に Routing、Project Context、Buffer isolation、UI は独立して採用・不採用を判断できる。

## まとめ

`.emacs.d-cli` のタブルーティングの本質は、

```text
ファイルを分類する
    ↓
対応するタブを見つける
    ↓
タブを作業コンテキストとして使う
```

ことにある。

新しい `.emacs.d` では、この考え方を残しつつ、依存関係・内部API・advice・Bufferlo の必要性を改めて評価してから実装する。
