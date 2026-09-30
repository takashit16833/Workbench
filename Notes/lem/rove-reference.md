# Rove リファレンス

Common Lisp のテストフレームワーク Rove の、lem-project-workspace で実際に使った機能を記録する。

Lem 本体のテストも Rove を使用している。

## `deftest`

テストを定義する。

~~~lisp
(deftest buffer-pathname-test
  ...)
~~~

## `testing`

1つのテスト内で、確認内容を名前付きでまとめる。

~~~lisp
(testing "ファイルを持たない Buffer"
  ...)
~~~

## `ok`

式が真になることを確認する。

~~~lisp
(ok (null result))
~~~

値そのものを比較する場合も、比較式を `ok` に渡す。

~~~lisp
(ok (equal "/tmp/example.lisp"
           (namestring result)))
~~~

## 実行

ASDF の test system に Rove を組み込めば、REPL から次のように実行できる。

~~~lisp
(asdf:test-system "lem-project-workspace/tests")
~~~

Lem 本体では `lem-tests.asd` が `rove` に依存し、ASDF の `test-op` から `rove:run` を呼び出している。

## ASDF との接続

テスト専用 system を定義し、本体 system の `test-op` から呼び出せる。

~~~lisp
(defsystem "my-system"
  :in-order-to ((test-op (test-op "my-system/tests")))
  ...)

(defsystem "my-system/tests"
  :depends-on ("my-system" "rove")
  ...
  :perform (test-op (o c)
             (symbol-call :rove :run c)))
~~~

### `:in-order-to`

ある ASDF operation を実行するとき、先に別の operation を実行する関係を定義する。
ここでは本体に対する `test-op` を、テスト system の `test-op` へつないでいる。

### `test-op`

ASDF のテスト実行 operation。

~~~lisp
(asdf:test-system "lem-project-workspace")
~~~

### `symbol-call`

UIOP が提供する関数。
パッケージ名とシンボル名を指定して関数を呼び出す。
ここでは Rove の `run` を呼び出すために使っている。
