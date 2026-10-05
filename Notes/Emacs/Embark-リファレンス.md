# Embark リファレンス & Tips

```toc
minLevel: 2
```

Embark は、**今選んでいる候補やカーソル位置の対象に対して操作する**ためのパッケージ。

Consult が「探す」、Embark が「見つけたものに何かする」を担当する。

## まず覚えること

```text
C-.      embark-act
```

基本はこれだけでよい。

候補上で `C-.` を押すと、その対象に使える操作を選べる。

```text
consult-ripgrep
↓
候補を絞る
↓
C-.
↓
操作を選ぶ
```

## `embark-act`

```text
C-.
```

対象に応じた操作メニューを開く。

対象の例:

- ファイル
- バッファ
- URL
- シンボル
- リージョン
- Consult の検索結果

### 操作が多すぎるとき

`C-.` のあとに `C-h` を押す。

操作名を補完から検索できる。

## よく使う Embark 操作

`C-.` のあとに使う。

| キー | 操作 | 用途 |
|---|---|---|
| `RET` | デフォルト操作 | 普通にその候補を開くなど |
| `E` | `embark-export` | 候補一覧を専用バッファへ書き出す |
| `S` | `embark-collect` | 候補一覧を Embark の一覧バッファにする |
| `A` | `embark-act-all` | 複数候補へまとめて操作する |
| `B` | `embark-become` | 今の補完を別のコマンドへ切り替える |
| `SPC` | `embark-select` | 候補を選択・選択解除する |

迷ったら **`E` を優先**する。

専用の Major mode に変換できる場合、`collect` より操作しやすい。

## Consult + Export

### ripgrep → grep-mode

```text
consult-ripgrep
↓
検索結果を絞る
↓
C-. E
↓
grep-mode
```

Emacs 31 では `e` で `grep-edit-mode` に入れる。

編集後:

```text
C-c C-c
```

で元ファイルへ反映する。

```text
検索
→ 絞り込み
→ 一覧化
→ 複数ファイルをまとめて編集
```

### consult-line → occur-mode

```text
consult-line
↓
C-. E
↓
occur-mode
```

`e` で `occur-edit-mode` に入れる。

編集後は `C-c C-c` で確定する。

### ファイル候補 → Dired

```text
ファイル検索
↓
C-. E
↓
Dired
```

さらに `C-x C-q` で Wdired に入れば、ファイル名をテキストのように編集できる。

## Export した後の `g`

Export / Collect バッファで:

```text
g
```

元の補完セッションをやり直す。

検索条件を変えたいときに使う。

## 複数候補を選ぶ

候補上で:

```text
C-. SPC
```

候補を選択・選択解除する。

選択後:

```text
C-. A
```

選択した候補すべてに操作する。

## `embark-bindings`

```text
C-h B
```

現在の対象で使える操作を一覧する。

「この対象に何ができる？」を確認するときに使う。

## `embark-dwim`

対象に対するデフォルト操作を、メニューを出さず直接実行する。

最初は `C-.` を使い、必要になってから使えばよい。

## `embark-become`

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

## Embark の考え方

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

全部のキーを覚える必要はない。

## Tips

### まず覚える3つ

```text
C-.        対象に対して操作する
C-. E      候補を Export する
C-h B      使える操作を確認する
```

### ripgrep の結果を一括編集する

```text
consult-ripgrep
→ C-. E
→ grep-mode
→ e
→ 編集
→ C-c C-c
```

### 複数候補へ同じ操作をする

```text
C-. SPC    候補を選択
C-. A      選択候補すべてに操作
```

## 参考

- Embark: https://github.com/oantolin/embark
- GNU ELPA: https://elpa.gnu.org/packages/embark.html
- Consult: https://github.com/minad/consult
