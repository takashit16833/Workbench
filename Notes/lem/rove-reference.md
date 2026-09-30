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
