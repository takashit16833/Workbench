# Kitty keyboard 実装で使った Common Lisp リファレンス

Lem の kitty-keyboard.lisp を読むための簡易リファレンス。

Hoogle のように「この名前は何をするものか」をすぐ確認する用途を想定する。

## パッケージ

| 名前 | 概要 |
| --- | --- |
| defpackage | パッケージを定義する。 |
| :use | 他パッケージの外部シンボルを修飾なしで使えるようにする。:cl は Common Lisp 標準。 |
| :export | 他パッケージから公開するシンボルを指定する。 |
| in-package | 以降のコードをどのパッケージで読むか指定する。 |
| lem:make-key | Lem の Key オブジェクトを作る。lem: は LEM パッケージの外部シンボルを参照する記法。 |

~~~lisp
(defpackage :lem-ncurses/kitty-keyboard
  (:use :cl)
  (:export :enable :disable))

(in-package :lem-ncurses/kitty-keyboard)
~~~

## 定義

| 名前 | 概要 |
| --- | --- |
| defconstant | 定数を定義する。 |
| defun | 関数を定義する。 |
| docstring | defun や defconstant の直後に置く説明文字列。 |

~~~lisp
(defconstant +escape-code+ 27
  "ASCII ESC のコード。")

(defun enable (stream)
  "Kitty keyboard protocol を有効化する。"
  ...)
~~~

+name+ のように + で囲むのは定数名によく使われる慣習。

## 条件分岐

| 名前 | 概要 |
| --- | --- |
| if | 真の場合と偽の場合の2分岐。 |
| when | 条件が真のときだけ本文を実行する。 |
| case | 値に応じて分岐する。 |
| otherwise | case のどの候補にも一致しなかった場合。 |
| and | 左から評価し、すべて真なら最後の値を返す。 |
| or | 左から評価し、最初に真になった値を返す。 |
| nil | 偽、または「値なし」を表す。 |

~~~lisp
(case final
  (#\A "Up")
  (#\B "Down")
  (otherwise nil))
~~~

## ローカル変数と代入

| 名前 | 概要 |
| --- | --- |
| let | ローカル変数を定義する。各初期値は互いを参照できない。 |
| let* | 上から順に変数を定義する。後ろの初期値から前の変数を参照できる。 |
| setf | 場所に値を設定する汎用代入。 |

~~~lisp
(let* ((bits (1- encoded-modifiers))
       (shift (logbitp 0 bits)))
  ...)
~~~

## 数値・ビット演算

| 名前 | 概要 |
| --- | --- |
| 1+ | 1を足す。 |
| 1- | 1を引く。 |
| max | 最大値を返す。 |
| plusp | 数値が正なら真。 |
| integerp | 整数なら真。 |
| <= | 小なりイコール。複数引数を連続比較できる。 |
| logbitp | 整数の指定bitが1か調べる。 |

~~~lisp
(logbitp 3 bits)
~~~

bits の bit 3 が立っているかを調べる。

## 文字・文字列

| 名前 | 概要 |
| --- | --- |
| code-char | Unicode code point から文字へ変換する。 |
| char | 文字列の指定位置の文字を取得する。 |
| string | 値を文字列へ変換する。文字なら1文字の文字列になる。 |
| length | シーケンスの長さを返す。 |
| subseq | シーケンスの一部分を取り出す。 |
| position | シーケンス内で値が現れる位置を探す。 |
| parse-integer | 文字列を整数として読む。 |
| :start | 読み始める位置を指定するキーワード引数。 |
| :junk-allowed t | 数字の後ろに別の文字があっても、読めた整数部分を返す。 |

~~~lisp
(parse-integer "115;9"
               :junk-allowed t)
;; => 115

(position #\; "115;9")
;; => 3
~~~

## リテラル

| 記法 | 概要 |
| --- | --- |
| #\A | 文字 A。 |
| #\; | 文字 ;。 |
| #x40 | 16進数リテラル。#x40 は10進数の64。 |
| 'string | シンボル string を評価せず、そのまま値として使う。 |
| #'foo | 関数 foo 自体を値として取得する。(function foo) の短縮形。 |

## リスト

| 名前 | 概要 |
| --- | --- |
| list | リストを作る。 |
| push | リストの先頭へ値を追加し、変数も更新する。 |
| nreverse | リストを破壊的に逆順にする。 |
| mapcar | リストの各要素へ関数を適用し、結果のリストを返す。 |

~~~lisp
(mapcar #'code-char (nreverse codes))
~~~

## 関数を値として扱う

| 名前 | 概要 |
| --- | --- |
| #'foo | 関数オブジェクトを取得する。 |
| funcall | 関数オブジェクトを呼び出す。 |
| callback | Common Lisp の構文名ではなく、関数を引数として渡す設計。 |

~~~lisp
(defun read-csi-event (first-code read-code)
  ...
  (funcall read-code))
~~~

このコードでは ncurses の getch に直接依存せず、次のbyteを読む関数を read-code として受け取っている。

## LOOP

loop は Common Lisp の繰り返し構文。

今回使っている形:

~~~lisp
(loop
  until (csi-final-byte-p last-code)
  do
     ...)
~~~

| キーワード | 概要 |
| --- | --- |
| until | 条件が真になるまで繰り返す。 |
| do | 各ループで実行する処理。 |

## 関数から途中で戻る

| 名前 | 概要 |
| --- | --- |
| return-from | 名前付きブロックから即座に戻る。defun は関数名と同名のブロックを暗黙に作る。 |

~~~lisp
(return-from read-csi-event nil)
~~~

read-csi-event の残りを実行せず、その場で nil を返す。

## シーケンス変換

| 名前 | 概要 |
| --- | --- |
| coerce | 値を指定した型へ変換する。 |

~~~lisp
(coerce
 (mapcar #'code-char codes)
 'string)
~~~

文字のリストを文字列へ変換する。

## 出力

| 名前 | 概要 |
| --- | --- |
| format | 書式付き出力。第1引数にstreamを渡すと、そのstreamへ出力する。 |
| force-output | バッファ中の出力をすぐにstreamへ送る。 |

今回使っている format 指示:

| 指示 | 意味 |
| --- | --- |
| ~C | 文字を出力する。 |
| ~D | 10進整数を出力する。 |

~~~lisp
(format stream
        "~C[>~Du"
        (code-char +escape-code+)
        +disambiguate-escape-codes+)
~~~

## Kitty modifier の読み方

Kitty keyboard protocol の modifier は次の形で送られる。

~~~text
1 + bit field
~~~

そのため最初に1を引く。

~~~lisp
(let ((bits (1- encoded-modifiers)))
  ...)
~~~

各bitは logbitp で読む。

~~~lisp
(logbitp 0 bits) ; Shift
(logbitp 1 bits) ; Alt
(logbitp 2 bits) ; Ctrl
(logbitp 3 bits) ; Super
(logbitp 4 bits) ; Hyper
(logbitp 5 bits) ; Meta
~~~

## 今回の処理を Lisp 的に読む

~~~text
Terminal
  ↓
CSI の byte を list に蓄積
  ↓
mapcar / code-char
  ↓
coerce で string 化
  ↓
case で CSI の種類を判定
  ↓
parse-integer で key code / modifier を読む
  ↓
logbitp で modifier の bit field を展開
  ↓
lem:make-key
  ↓
Lem Key
~~~

特に覚えておくと読みやすくなるもの:

~~~text
let / let*
case
when
loop
mapcar
funcall
return-from
parse-integer
logbitp
coerce
~~~
