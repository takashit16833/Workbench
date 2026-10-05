# Embark リファレンス & Tips

```toc
minLevel: 2
maxLevel: 3
```

## Overview

### Embark とは

Embark は、**今選んでいる対象に対して操作する**ためのパッケージ。

Consult が「探す」、Embark が「見つけたものに何かする」を担当する。

### Target / Action

Embark は **Target** と **Action** を分けて考える。

```text
Target
  操作対象

Action
  対象に対して行う操作
```

同じ `C-.` でも、対象によって使える操作が変わる。

```text
ファイル
→ 開く / 削除 / 名前変更 ...

URL
→ ブラウザで開く ...

バッファ
→ 切り替える / kill ...

Consult の検索結果
→ Export ...
```

### Consult との役割分担

```text
Consult
  探す・絞り込む

Embark
  候補に対して操作する

embark-consult
  Consult の候補を Export する
```

## Basic

### `embark-act`

```text
C-.
```

対象に使える操作を選ぶ。

まず覚えるのはこれだけでよい。

```text
consult-ripgrep
↓
候補を絞る
↓
C-.
↓
操作を選ぶ
```

### `embark-bindings`

```text
C-h B
```

現在の対象で使える操作を一覧する。

「この対象に何ができる？」を確認するときに使う。

### `embark-export`

```text
C-. E
```

現在の候補一覧を、その対象に適した専用バッファへ書き出す。

例:

```text
consult-ripgrep → grep-mode
consult-line    → occur-mode
ファイル候補   → Dired
```

### `embark-collect`

```text
C-. S
```

候補一覧を Embark の一覧バッファとして残す。

専用の Major mode に Export できる場合は、基本的に `embark-export` を優先する。

## Workflows

### ripgrep の結果を一括編集する

```text
consult-ripgrep
→ C-. E
→ grep-mode
→ e
→ 編集
→ C-c C-c
```

`e` で `grep-edit-mode` に入り、検索結果から複数ファイルをまとめて編集できる。

### consult-line の結果を編集する

```text
consult-line
→ C-. E
→ occur-mode
→ e
→ 編集
→ C-c C-c
```

`e` で `occur-edit-mode` に入る。

### ファイル候補を Dired にする

```text
ファイル検索
→ C-. E
→ Dired
```

さらに、

```text
C-x C-q
```

で Wdired に入り、ファイル名をテキストのように編集できる。

### 複数候補へ同じ操作をする

候補を選択:

```text
C-. SPC
```

複数選択後:

```text
C-. A
```

選択した候補すべてに同じ操作を実行する。

## Advanced

### `embark-select`

```text
C-. SPC
```

候補を Embark の選択対象に追加・解除する。

### `embark-act-all`

```text
C-. A
```

選択した複数候補へ同じ Action を実行する。

### `embark-become`

```text
C-. B
```

現在の入力を残したまま、別の補完コマンドへ切り替える。

```text
find-file
↓
文字を入力
↓
C-. B
↓
別のコマンドへ切り替える
```

### `embark-dwim`

対象に対するデフォルト操作を、メニューを出さず直接実行する。

最初は `embark-act` を使い、必要になってから使えばよい。

## Tips

### 操作が多すぎるとき

`C-.` のあとに `C-h` を押す。

操作名を補完から検索できる。

### Export と Collect の使い分け

専用の Major mode に変換できるなら **Export**。

```text
grep-mode
occur-mode
Dired
```

専用モードがなく、候補一覧だけ残したいなら **Collect**。

### Export 後に検索をやり直す

Export / Collect バッファで:

```text
g
```

元の補完セッションをやり直す。

検索条件を変えたいときに使う。

### 最初に覚えるキー

```text
C-.        対象に対して操作する
C-. E      候補を Export する
C-h B      使える操作を確認する
```

## Command Reference

| キー | コマンド | 用途 |
|---|---|---|
| `C-.` | `embark-act` | 対象に対して操作する |
| `C-h B` | `embark-bindings` | 使える操作を一覧する |
| `C-. E` | `embark-export` | 候補を専用バッファへ書き出す |
| `C-. S` | `embark-collect` | 候補を Embark の一覧にする |
| `C-. SPC` | `embark-select` | 候補を選択・解除する |
| `C-. A` | `embark-act-all` | 複数候補へ同じ操作をする |
| `C-. B` | `embark-become` | 別の補完コマンドへ切り替える |

## 参考

- Embark: https://github.com/oantolin/embark
- GNU ELPA: https://elpa.gnu.org/packages/embark.html
- Consult: https://github.com/minad/consult
