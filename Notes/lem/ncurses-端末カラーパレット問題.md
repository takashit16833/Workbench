# Lem ncurses 端末カラーパレット問題と PR #2332

## 概要

Lem の ncurses 版を WezTerm で起動して終了したあと、端末の色が変わったまま戻らない問題を調査した。

症状としては、Lem を終了したあとに lazygit や starship など別のアプリの色まで変わる。

WezTerm では次の OSC 104 で色が元に戻った。

```sh
printf '\e]104\a'
```

このことから、Lem が画面表示だけでなく、端末が持つカラーパレット自体を書き換えている可能性を調べた。

## 原因

対象は `frontends/ncurses/term.lisp` の `init-colors`。

変更前は、色番号 8 以降について次のように `term-set-color` を呼んでいた。

```lisp
(term-set-color counter r g b (<= 8 counter))
```

`term-set-color` は第5引数が true の場合、ncurses の `init_color` を呼ぶ。

```lisp
(defun term-set-color (index r g b &optional (call-init-color t))
  (when call-init-color
    (charms/ll:init-color index
                          (round (* r 1000/255))
                          (round (* g 1000/255))
                          (round (* b 1000/255))))
  (setf (aref *colors* index) (lem:make-color r g b)))
```

そのため Lem の起動時に、端末側の色番号 8〜255 の定義を書き換えていた。

Lem 終了時にはこのパレットを元へ戻していないため、WezTerm では変更がそのまま残り、Lem の外にあるアプリの色にも影響していた。

## 過去の関連 Issue

同じ種類の問題は過去にも報告されている。

- Issue #218: Running lem resets iTerm2's color theme
- https://github.com/lem-project/lem/issues/218

当時の修正では色番号 0〜7 を `init_color` の対象から外したが、8〜255 は引き続き変更する実装になっていた。

今回の WezTerm の問題は、その残っていた処理で再現したと考えられる。

## 修正

`init-colors` から `term-set-color` を呼ぶとき、`init_color` を実行しないようにした。

```diff
- (term-set-color counter r g b (<= 8 counter))
+ (term-set-color counter r g b nil)
```

この変更でも `term-set-color` 内の、

```lisp
(setf (aref *colors* index) (lem:make-color r g b))
```

は実行される。

つまり、

```text
Lem 内部の色テーブル
  → 今まで通り作る

端末自身のカラーパレット
  → 書き換えない
```

という形になる。

`term-set-color` 自体から `init_color` の機能を削除してはいない。
今回問題だったのは `init-colors` が起動時に端末パレットを一括変更することなので、修正範囲はそこだけにした。

## 確認

### WezTerm

修正前:

- Lem 起動・終了後に端末の色が変わったまま残る
- `printf '\e]104\a'` で元へ戻る

修正後:

- Lem の表示に問題なし
- Lem 終了後も端末の色が崩れない

### Kitty

修正後に起動・終了を確認。

- Lem の表示に問題なし
- 終了後も端末の色が崩れない

### ビルド

```sh
make ncurses
```

成功。

### 既存テスト

`lem-vi-mode` は 11 / 11 PASS。

`lem-tests` は 47 件中 1 件だけ失敗した。

失敗したのは、

```text
lem-language-server/micros-tests
  SIMPLE-EVAL-TEST
```

で、ローカルの Micros サーバーへ接続できないエラー。

```text
GIVE-UP-CONNECTION-TO-SERVER
Give Up connection to server localhost:60767
```

今回の修正を stash して変更前の `main` でも同じテストを実行し、同じ 1 件だけが失敗することを確認した。

したがって、この失敗は今回の ncurses 色修正とは無関係。

upstream の公式 CI では同系統のテストが成功している。

## PR

upstream へ PR を作成した。

- PR #2332: Avoid changing terminal color palette in ncurses frontend
- https://github.com/lem-project/lem/pull/2332
- branch: `fix/ncurses-terminal-colors`
- commit: `6371b46377ad5783067fe624dfc6aec02335f03b`

変更量は 1 ファイル、1 行追加、1 行削除。

作成直後の Code Contractor Validation は PASS。

## 今回のポイント

最初は「終了時にパレットを復元する」方法も考えられたが、今回はそもそも端末パレットを変更しない方針にした。

Lem が使っている 256 色テーブルは内部で色番号を選ぶためにも使われているため、そのデータは残す。
一方で ncurses の `init_color` による端末側の書き換えだけを止める。

その結果、修正を 1 行に限定しつつ、WezTerm と Kitty の両方で問題なく動作することを確認できた。
