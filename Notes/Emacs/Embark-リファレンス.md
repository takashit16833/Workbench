# Embark リファレンス & Tips

Embark は、**今選んでいる候補やカーソル位置の対象に対して操作する**ためのパッケージ。

Consult が「探す」、Embark が「見つけたものに何かする」を担当する。

## まず覚えること

```text
C-.      embark-act
```

基本はこれだけでよい。

候補上で `C-.` を押すと、その対象に使える操作を選べる。

例:

```text
consult-ripgrep
↓
候補を絞る
↓
C-.
↓
操作を選ぶ
```

## 現在の設定

```elisp
;; 補完候補やカーソル位置の対象に対して、その場で操作する。
(use-package embark
  :ensure t
  :bind
  (("C-." . embark-act)
   ("C-h B" . embark-bindings))
  :init
  ;; プレフィックスキーのヘルプをEmbarkで表示する。
  (setq prefix-help-command #'embark-prefix-help-command))

;; Consultの検索結果をEmbarkからexportできるようにする。
(use-package embark-consult
  :ensure t
  :defer t)
```

`embark-consult` はインストールしておけば Consult と自動的に連携する。

## `embark-act`

```text
C-.
```

対象に応じた操作メニューを開く。

対象はミニバッファの候補だけではない。

- ファイル
- バッファ
- URL
- シンボル
- リージョン
- Consult の検索結果

などに対して使える。

### 操作が多すぎるとき

`C-.` のあとに、

```text
C-h
```

を押す。

操作名を補完から検索できるので、キー一覧を目で探さなくてよい。

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

普段は **`E` を優先**する。

専用の Major mode に変換できる場合、`collect` より操作しやすい。

## Consult + Export

Embark を採用する一番大きな理由。

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

検索結果を普通の `grep-mode` バッファとして取り出せる。

Emacs 31 では、

```text
e
```

で `grep-edit-mode` に入り、検索結果を直接編集できる。

編集後:

```text
C-c C-c
```

で元ファイルへ反映する。

つまり、

```text
検索
→ 絞り込み
→ 一覧化
→ 複数ファイルをまとめて編集
```

まで繋げられる。

### consult-line → occur-mode

```text
consult-line
↓
C-. E
↓
occur-mode
```

`occur-mode` でも、

```text
e
```

で `occur-edit-mode` に入れる。

編集後:

```text
C-c C-c
```

で確定する。

### ファイル候補 → Dired

ファイル候補を Export すると Dired にできる。

```text
ファイル検索
↓
C-. E
↓
Dired
```

さらに、

```text
C-x C-q
```

で Wdired に入れば、ファイル名を普通のテキストのように編集できる。

Oil.nvim に近い使い方。

## Export した後の `g`

Embark から作った Export / Collect バッファでは、

```text
g
```

で元の補完セッションをやり直せる。

たとえば、

```text
consult-ripgrep
↓
C-. E
↓
grep-mode
↓
やっぱり検索条件を変えたい
↓
g
```

で Consult に戻れる。

## 複数候補を選ぶ

候補上で、

```text
C-. SPC
```

を使うと、その候補を Embark の選択対象に追加できる。

何件か選んだあと、

```text
C-. A
```

で選択した候補すべてに操作できる。

最初から覚える必要はない。

「複数候補へ同じ操作をしたい」ときに思い出せばよい。

## `embark-bindings`

```text
C-h B
```

現在の状況で使えるキー操作を一覧する。

Embark 自体の操作を覚えるというより、

**「この対象に何ができるんだっけ？」**

というときの確認用。

## `embark-dwim`

```elisp
embark-dwim
```

対象に対するデフォルト操作を、メニューを出さず直接実行する。

便利だが、最初はキーを割り当てない。

まず `C-.` を使って Embark の対象と操作の関係を理解する。

頻繁に使うようになってから割り当てればよい。

## `embark-become`

現在の補完入力を残したまま、別のコマンドへ切り替える。

例:

```text
find-file
↓
文字を入力
↓
C-. B
↓
別の検索コマンドへ切り替える
```

便利だが使用頻度は低め。

存在だけ覚えておけばよい。

## Embark の考え方

Embark は、

```text
Target
  対象

Action
  対象に対して行う操作
```

を分離している。

たとえば同じ `C-.` でも、

```text
ファイル
→ 開く / 削除 / 名前変更 ...

URL
→ ブラウザで開く ...

バッファ
→ 切り替える / kill ...

Consultの検索結果
→ Export ...
```

のように、対象によって使える操作が変わる。

そのため最初から全コマンドを覚える必要はない。

## 今の環境で特に使うもの

まずはこの3つで十分。

```text
C-.        対象に対して操作する

C-. E      検索結果・候補を専用バッファへExportする

C-h B      使える操作を確認する
```

特に重要な流れ:

```text
consult-ripgrep
→ C-. E
→ grep-mode
→ e
→ 編集
→ C-c C-c
```

次に覚えるなら:

```text
C-. SPC    候補を選択
C-. A      選択候補すべてに操作
```

## 参考

- Embark: https://github.com/oantolin/embark
- GNU ELPA: https://elpa.gnu.org/packages/embark.html
- Consult: https://github.com/minad/consult
