# Emacs Lisp Reference

現在の CLI Emacs 設定を読む・書くときに使う、Emacs Lisp の言語要素と汎用関数のリファレンス。

- 対象: `takashit16833/.emacs.d` `main`
- 基準コミット: `afd6fdb032039f3ae3760ce7dadf51fb6e5fff83`
- 対象ファイル: `init.el`, `config/*.el`
- 目的: 学習用の順序立てた解説ではなく、名前からすぐ意味を引くための参照資料

記法は Emacs Lisp の呼び出し形に寄せている。`&optional` は省略可能な引数、`&rest` は残りの引数を表す。

## Reader syntax

### `'FORM`

```elisp
'FORM
```

`quote` の短縮記法。FORM を評価せず、そのままデータとして扱う。

現在の使用例:

```elisp
'package-archives
'(orderless basic)
'((file (styles partial-completion)))
```

### `#'FUNCTION`

```elisp
#'FUNCTION
```

`function` の短縮記法。関数として渡すシンボルやラムダ式を明示する。

現在の使用例:

```elisp
#'save-buffer
#'ignore
#'my/kkp-enable-after-xterm
```

### バッククォートと `,`

```elisp
`FORM
,FORM
```

バッククォートはほぼ引用したリストを作り、その中の `,FORM` だけを評価して値を埋め込む。

現在の使用例:

```elisp
`(("." . ,backup-dir))
```

### `(A . B)`

```elisp
(A . B)
```

cons セルの dotted-pair 記法。連想リストや `use-package :bind` / `:hook` の組で使われる。

現在の使用例:

```elisp
("melpa" . "https://melpa.org/packages/")
(tty-setup . global-kkp-mode)
("C-x g" . magit-status)
```

### `nil`

偽、空リスト、値なしを表す特別なシンボル。

現在の使用例:

```elisp
(setq-default truncate-lines nil)
:ensure nil
```

### `t`

真を表す特別なシンボル。

現在の使用例:

```elisp
(setq inhibit-startup-screen t)
(make-directory backup-dir t)
```

### `&optional`

```elisp
(defun NAME (REQUIRED &optional OPTIONAL) ...)
```

関数定義で、以降の引数を省略可能にする。

現在の使用例:

```elisp
(defun my/kkp-enable-after-xterm (original &optional terminal deadline)
  ...)
```

## Special forms and macros

### `and`

```elisp
(and FORM...)
```

左から評価し、最初の `nil` で終了する。すべて真なら最後の値を返す。

現在の使用箇所: `config/terminal.el`

### `defun`

```elisp
(defun NAME ARGLIST [DOCSTRING] BODY...)
```

関数を定義する。

現在の使用例:

```elisp
(defun my/mood-line-segment-file-icon ()
  ...)
```

### `if`

```elisp
(if CONDITION THEN ELSE...)
```

CONDITION が真なら THEN、偽なら ELSE を評価する。

現在の使用箇所: `config/terminal.el`

### `let`

```elisp
(let ((VAR VALUE) ...) BODY...)
```

BODY の間だけ有効なローカル束縛を作る。各 VALUE は束縛を作る前の環境で評価される。

現在の使用箇所: `config/basic.el`, `config/ui.el`

### `let*`

```elisp
(let* ((VAR VALUE) ...) BODY...)
```

`let` と違い、前で作った束縛を後続の VALUE から参照できる。

現在の使用箇所: `config/terminal.el`

### `or`

```elisp
(or FORM...)
```

左から評価し、最初の非 `nil` 値を返す。すべて `nil` なら `nil`。

現在の使用箇所: `config/terminal.el`, `config/ui.el`

### `setq`

```elisp
(setq SYMBOL VALUE ...)
```

変数へ値を設定する。SYMBOL は評価されない。

現在の使用箇所: `config/basic.el`, `config/ui.el`

### `unless`

```elisp
(unless CONDITION BODY...)
```

CONDITION が `nil` のときだけ BODY を評価する。

現在の使用箇所: `config/basic.el`, `config/terminal.el`

### `when`

```elisp
(when CONDITION BODY...)
```

CONDITION が真のときだけ BODY を評価する。

現在の使用箇所: `config/ui.el`

## Functions

### `car`

```elisp
(car LIST) -> OBJECT
```

cons セルの先頭要素を返す。`nil` に対しては `nil`。

現在の使用例:

```elisp
(car (frames-on-display-list terminal))
```

### `concat`

```elisp
(concat SEQUENCE...) -> STRING
```

文字列や文字列として扱える列を連結して文字列を返す。

現在の使用例:

```elisp
(concat input)
```

### `equal`

```elisp
(equal OBJECT1 OBJECT2) -> BOOLEAN
```

文字列やリストを含め、内容として等しいか比較する。`eq` より構造的な比較に向く。

現在の使用箇所: `config/terminal.el`

### `funcall`

```elisp
(funcall FUNCTION ARG...) -> OBJECT
```

FUNCTION を ARG とともに呼び出す。advice で受け取った元関数を実行するときにも使う。

現在の使用例:

```elisp
(funcall original terminal)
(funcall orig input)
```

### `functionp`

```elisp
(functionp OBJECT) -> BOOLEAN
```

OBJECT が関数として呼び出せる値か判定する。

現在の使用箇所: `config/terminal.el`

## よく出るデータの形

### リスト

```elisp
(a b c)
```

通常は関数呼び出しとして評価される。データとして扱うときは引用する。

```elisp
'(orderless basic)
```

### 連想リスト

```elisp
((KEY . VALUE)
 ...)
```

キーと値の組を並べたリスト。

現在の使用例:

```elisp
'(("melpa" . "https://melpa.org/packages/"))
`(("." . ,backup-dir))
```

### シンボル

```elisp
magit-status
package-archives
retro-hacker-blue
```

名前を持つ Lisp オブジェクト。変数名、関数名、機能名、設定値など複数の役割で使われる。

## このノートに置かないもの

Emacs 本体の編集・表示・フレーム・キー・hook・advice・パッケージ管理などの API は [[Emacs-API-Reference]] に置く。

たとえば次はそちらを参照する。

```text
load
expand-file-name
keymap-global-set
add-hook
advice-add
run-with-timer
set-display-table-slot
use-package
```
