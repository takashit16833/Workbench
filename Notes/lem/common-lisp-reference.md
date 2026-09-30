# Common Lisp リファレンス

Common Lisp のソースリーディングや実装中に、コードへ現れた名前から直接引くためのリファレンス。
関数・マクロ・特殊形式などは名前順に並べる。

## `1+`

数値に 1 を足す。

~~~lisp
(1+ 10)
;; => 11
~~~

## `1-`

数値から 1 を引く。

~~~lisp
(1- 10)
;; => 9
~~~

## `<=`

小なりイコール。複数の値を連続して比較できる。

~~~lisp
(<= #x40 code #x7e)
~~~

## `and`

左から評価し、すべて真なら最後の値を返す。

## `case`

値に応じて分岐する。

~~~lisp
(case final
  (#\A "Up")
  (#\B "Down")
  (otherwise nil))
~~~

### `otherwise`

`case` のどの候補にも一致しなかった場合を表す。

## `char`

文字列の指定位置の文字を取得する。

## `code-char`

文字コードから文字へ変換する。

## `coerce`

値を指定した型へ変換する。

~~~lisp
(coerce
 (mapcar #'code-char codes)
 'string)
~~~

## `defconstant`

定数を定義する。

~~~lisp
(defconstant +escape-code+ 27
  "ASCII ESC のコード。")
~~~

`+name+` のように `+` で囲むのは、定数名によく使われる慣習。

## `defpackage`

パッケージを定義する。

~~~lisp
(defpackage :my-package
  (:use :cl)
  (:export
   :enable
   :disable
   :read-value))
~~~

主なオプション:

| 名前 | 概要 |
| --- | --- |
| `:use` | 他パッケージの外部シンボルを修飾なしで使えるようにする。 |
| `:export` | このパッケージから外部公開するシンボル名を指定する。 |

`:cl` は `COMMON-LISP` パッケージを表すキーワードシンボル。

`:enable`、`:disable`、`:read-value` のように `:export` に並べた名前は、そのパッケージから外部公開するシンボル名を表す。

## `defun`

関数を定義する。

~~~lisp
(defun enable (stream)
  "機能を有効化する。"
  ...)
~~~

`defun` は関数名と同名のブロックを暗黙に作る。そのため、関数内から `return-from` でその名前を指定して戻れる。

## `find-package`

名前から既存のパッケージを探して返す。
見つからなければ `nil` を返す。

~~~lisp
(find-package :cl)
;; => #<PACKAGE "COMMON-LISP">
~~~

## `force-output`

バッファ中の出力をすぐに stream へ送る。

~~~lisp
(force-output stream)
~~~

## `format`

指定した stream へ、書式文字列に従って値を出力する。

~~~lisp
(format stream
        "~C[>~Du"
        (code-char +escape-code+)
        mode)
~~~

主な制御指定:

| 名前 | 概要 |
| --- | --- |
| `~C` | 次の引数を文字として出力する。 |
| `~D` | 次の引数を10進整数として出力する。 |

## `funcall`

関数オブジェクトを呼び出す。

~~~lisp
(funcall read-code)
~~~

## `if`

真の場合と偽の場合に分岐する。

## `in-package`

以降のコードをどのパッケージで読むか指定する。

~~~lisp
(in-package :my-package)
~~~

## `integerp`

値が整数なら真を返す。

## `length`

シーケンスの長さを返す。

## `let`

ローカル変数を定義する。
各初期値は互いを参照しない。

## `let*`

上から順にローカル変数を定義する。
後ろの初期値から前の変数を参照できる。

~~~lisp
(let* ((bits (1- encoded-modifiers))
       (shift (logbitp 0 bits)))
  ...)
~~~

## `list`

リストを作る。

~~~lisp
(list first-code)
~~~

## `logbitp`

整数の指定 bit が 1 なら真を返す。

~~~lisp
(logbitp 3 bits)
~~~

## `loop`

繰り返し処理を記述する。

~~~lisp
(loop
  until (csi-final-byte-p last-code)
  do
     (setf last-code (funcall read-code)))
~~~

この例で使っている主な LOOP 句:

| 名前 | 概要 |
| --- | --- |
| `until` | 条件が真になるまで繰り返す。 |
| `do` | 各ループで処理を実行する。 |

## `mapcar`

リストの各要素へ関数を適用し、結果のリストを返す。

~~~lisp
(mapcar #'code-char codes)
~~~

## `max`

引数の最大値を返す。

## `nil`

空リストを表す。
真偽値としては偽を表し、「値がない」ことを表すためにもよく使われる。

## `nreverse`

シーケンスを破壊的に逆順にする。

~~~lisp
(nreverse codes)
~~~

## `or`

左から評価し、最初に真になった値を返す。

## `parse-integer`

文字列を整数として読む。

~~~lisp
(parse-integer "115;9"
               :junk-allowed t)
;; => 115
~~~

主なキーワード引数:

| 名前 | 概要 |
| --- | --- |
| `:start` | 読み始める位置を指定する。 |
| `:junk-allowed t` | 数字以外が続いていても、読めた整数部分を返す。 |

## `plusp`

数値が正なら真を返す。

## `position`

シーケンス内で値が現れる位置を探す。

~~~lisp
(position #\; "115;9")
;; => 3
~~~

## `push`

リストの先頭に値を追加する。

~~~lisp
(push last-code codes)
~~~

## `return-from`

指定した名前のブロックから即座に値を返す。

~~~lisp
(return-from read-csi-event nil)
~~~

`defun` は関数名と同名のブロックを暗黙に作るため、関数名を指定して関数から戻れる。

## `setf`

値を設定する汎用的な代入構文。

~~~lisp
(setf last-code (funcall read-code))
~~~

## `string`

値を文字列へ変換する。

## `subseq`

シーケンスの一部分を取り出す。

~~~lisp
(subseq "115;9u" 0 5)
;; => "115;9"
~~~

## `when`

条件が真のときだけ本文を実行する。

# リーダー記法・シンボル

## `#'foo`

関数 `foo` の関数オブジェクトを取得する。

~~~lisp
#'code-char
~~~

## `#\A`

文字リテラル。

~~~lisp
#\A
~~~

## `#x40`

16進数リテラル。

~~~lisp
#x40
~~~

## `'foo`

`foo` を評価せず、そのまま値として扱う。

~~~lisp
'string
~~~

## `:foo`

キーワードシンボル。
`:` で始まるシンボルは `KEYWORD` パッケージに属し、自分自身を値として持つ。

~~~lisp
:foo
~~~

## `package:symbol`

パッケージから export されたシンボルを参照する。

~~~lisp
my-package:enable
my-package:disable
~~~

# docstring

`defconstant` や `defun` などの定義に付ける説明文字列。

~~~lisp
(defun add-one (number)
  "NUMBER に 1 を足す。"
  (1+ number))
~~~

# ASDF

ASDF は Common Lisp のシステム定義・読み込みを行う仕組み。
Common Lisp 標準そのものではないが、ライブラリやアプリケーションの構成管理で広く使われる。

## `asdf:load-system`

指定した ASDF system と、その依存先を読み込む。

~~~lisp
(asdf:load-system "my-system")
~~~

`asdf:` は、`ASDF` パッケージから export された `LOAD-SYSTEM` を参照している。

## `defsystem`

ASDF system を定義する。

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

主なオプション:

| 名前 | 概要 |
| --- | --- |
| `:depends-on` | 先に読み込む必要がある別の ASDF system を指定する。 |
| `:serial t` | `:components` の構成要素に、直前の構成要素への依存関係を順番に設定する。 |
| `:components` | system を構成するファイルやディレクトリを指定する。 |
| `:module` | 複数の構成要素をまとめるディレクトリ単位の構成を表す。 |
| `:file` | 読み込む Common Lisp ソースファイルを指定する。拡張子 `.lisp` は通常省略する。 |
