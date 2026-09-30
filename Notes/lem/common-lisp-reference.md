# Common Lisp リファレンス

## パッケージ

| 名前 | 概要 |
| --- | --- |
| `defpackage` | パッケージを定義する。 |
| `:foo` | キーワードシンボル。`:` で始まるシンボルは `KEYWORD` パッケージに属し、自分自身を値として持つ。 |
| `:lem-ncurses/kitty-keyboard` | パッケージ名を表すために使っているキーワードシンボル。ここでは `LEM-NCURSES/KITTY-KEYBOARD` という名前のパッケージを定義する。 |
| `:use` | `defpackage` のオプション。他パッケージの外部シンボルを修飾なしで使えるようにする。 |
| `:cl` | `COMMON-LISP` パッケージを表すために使っているキーワードシンボル。 |
| `:export` | `defpackage` のオプション。このパッケージから外部公開するシンボル名を指定する。 |
| `:enable` | `ENABLE` というシンボル名を export する指定。 |
| `:disable` | `DISABLE` というシンボル名を export する指定。 |
| `:read-csi-event` | `READ-CSI-EVENT` というシンボル名を export する指定。 |
| `in-package` | 以降のコードをどのパッケージで読むか指定する。 |
| `package:symbol` | パッケージから export されたシンボルを参照する。 |
| `find-package` | 名前から既存のパッケージを探して返す。見つからなければ `nil` を返す。 |

~~~lisp
(defpackage :lem-ncurses/kitty-keyboard
  (:use :cl)
  (:export
   :enable
   :disable
   :read-csi-event))

(in-package :lem-ncurses/kitty-keyboard)
~~~

外部からは export されたシンボルを `パッケージ名:シンボル名` で参照できる。

~~~lisp
lem-ncurses/kitty-keyboard:enable
lem-ncurses/kitty-keyboard:disable
lem-ncurses/kitty-keyboard:read-csi-event
~~~

## 定義

| 名前 | 概要 |
| --- | --- |
| `defconstant` | 定数を定義する。 |
| `defun` | 関数を定義する。 |
| docstring | `defconstant` や `defun` の直後に置く説明文字列。 |

~~~lisp
(defconstant +escape-code+ 27
  "ASCII ESC のコード。")

(defun enable (stream)
  "Kitty keyboard protocol を有効化する。"
  ...)
~~~

`+name+` のように `+` で囲むのは定数名によく使われる慣習。

## 条件分岐

| 名前 | 概要 |
| --- | --- |
| `if` | 真の場合と偽の場合に分岐する。 |
| `when` | 条件が真のときだけ本文を実行する。 |
| `case` | 値に応じて分岐する。 |
| `otherwise` | `case` のどの候補にも一致しなかった場合。 |
| `and` | 左から評価し、すべて真なら最後の値を返す。 |
| `or` | 左から評価し、最初に真になった値を返す。 |
| `nil` | 偽、または値がないことを表す。 |

~~~lisp
(case final
  (#\A "Up")
  (#\B "Down")
  (otherwise nil))
~~~

## ローカル変数・代入

| 名前 | 概要 |
| --- | --- |
| `let` | ローカル変数を定義する。各初期値は互いを参照しない。 |
| `let*` | 上から順にローカル変数を定義する。後ろから前の変数を参照できる。 |
| `setf` | 値を設定する汎用的な代入構文。 |

~~~lisp
(let* ((bits (1- encoded-modifiers))
       (shift (logbitp 0 bits)))
  ...)

(setf last-code (funcall read-code))
~~~

## 数値・ビット演算

| 名前 | 概要 |
| --- | --- |
| `1+` | 1を足す。 |
| `1-` | 1を引く。 |
| `max` | 最大値を返す。 |
| `plusp` | 数値が正なら真を返す。 |
| `integerp` | 整数なら真を返す。 |
| `<=` | 小なりイコール。複数の値を連続して比較できる。 |
| `logbitp` | 整数の指定bitが1なら真を返す。 |

~~~lisp
(<= #x40 code #x7e)

(logbitp 3 bits)
~~~

## 文字・文字列

| 名前 | 概要 |
| --- | --- |
| `code-char` | 文字コードから文字へ変換する。 |
| `char` | 文字列の指定位置の文字を取得する。 |
| `string` | 値を文字列へ変換する。 |
| `length` | シーケンスの長さを返す。 |
| `subseq` | シーケンスの一部分を取り出す。 |
| `position` | シーケンス内で値が現れる位置を探す。 |
| `parse-integer` | 文字列を整数として読む。 |
| `:start` | 読み始める位置を指定するキーワード引数。 |
| `:junk-allowed t` | 数字以外が続いていても、読めた整数部分を返す。 |

~~~lisp
(position #\; "115;9")
;; => 3

(parse-integer "115;9"
               :junk-allowed t)
;; => 115

(subseq "115;9u" 0 5)
;; => "115;9"
~~~

## リテラル・リーダー記法

| 記法 | 概要 |
| --- | --- |
| `#\A` | 文字リテラル。 |
| `#x40` | 16進数リテラル。 |
| `'foo` | `foo` を評価せず、そのまま値として扱う。 |
| `#'foo` | 関数 `foo` を値として取得する。 |

~~~lisp
#\A
#x40
'string
#'code-char
~~~

## リスト

| 名前 | 概要 |
| --- | --- |
| `list` | リストを作る。 |
| `push` | リストの先頭に値を追加する。 |
| `nreverse` | リストを破壊的に逆順にする。 |
| `mapcar` | 各要素へ関数を適用し、結果のリストを返す。 |

~~~lisp
(let ((codes (list first-code)))
  (push last-code codes)
  (nreverse codes))

(mapcar #'code-char codes)
~~~

## 関数を値として扱う

| 名前 | 概要 |
| --- | --- |
| `#'foo` | 関数オブジェクトを取得する。 |
| `funcall` | 関数オブジェクトを呼び出す。 |

~~~lisp
(funcall read-code)

(mapcar #'code-char codes)
~~~

## LOOP

| 名前 | 概要 |
| --- | --- |
| `loop` | 繰り返し処理を記述する。 |
| `until` | 条件が真になるまで繰り返す。 |
| `do` | 各ループで処理を実行する。 |

~~~lisp
(loop
  until (csi-final-byte-p last-code)
  do
     (setf last-code (funcall read-code)))
~~~

## 関数から戻る

| 名前 | 概要 |
| --- | --- |
| `return-from` | 指定した名前のブロックから即座に値を返す。 |

~~~lisp
(return-from read-csi-event nil)
~~~

`defun` は関数名と同名のブロックを暗黙に作る。

## 型変換

| 名前 | 概要 |
| --- | --- |
| `coerce` | 値を指定した型へ変換する。 |

~~~lisp
(coerce
 (mapcar #'code-char codes)
 'string)
~~~

## 出力

| **名前**         | **概要** |
| ---------------- | -------- |
| `format` | 指定した stream へ、書式文字列に従って値を出力する。 |
| `force-output` | バッファ中の出力をすぐに stream へ送る。 |
| `~C` | `format` の次の引数を文字として出力する。 |
| `~D` | `format` の次の引数を10進整数として出力する。 |

```lisp
(format stream
        "~C[>~Du"
        (code-char +escape-code+)
        +disambiguate-escape-codes+)

(force-output stream)
```

## ASDF

ASDF は Common Lisp のシステム定義・読み込みを行う仕組み。
Common Lisp 標準そのものではないが、ライブラリやアプリケーションの構成管理で広く使われる。

| 名前 | 概要 |
| --- | --- |
| `defsystem` | ASDF のシステムを定義する。システム名、依存関係、構成ファイルなどを記述する。 |
| `:depends-on` | 先に読み込む必要がある別の ASDF システムを指定する。 |
| `:serial t` | `:components` に書かれた順番で構成要素を読み込む。 |
| `:components` | システムを構成するファイルやディレクトリを指定する。 |
| `:module` | 複数の構成要素をまとめるディレクトリ単位の構成を表す。 |
| `:file` | 読み込む Common Lisp ソースファイルを指定する。拡張子 `.lisp` は通常省略する。 |
| `asdf:load-system` | 指定した ASDF システムと、その依存先を読み込む。 |

~~~lisp
(defsystem "my-system"
  :depends-on ("some-library")
  :serial t
  :components
  ((:module "src"
    :components
    ((:file "package")
     (:file "main")))))
~~~

上の定義では、`some-library` を先に読み込み、その後 `src/package.lisp`、`src/main.lisp` の順に読み込む。

~~~lisp
(asdf:load-system "my-system")
~~~

`asdf:load-system` の `asdf:` は、`ASDF` パッケージから export された `LOAD-SYSTEM` を参照している。
