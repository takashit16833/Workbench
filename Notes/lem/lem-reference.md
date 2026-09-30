# Lem リファレンス

Lem のソースリーディングや拡張作成中に、コードへ現れた API 名や値から直接引くためのリファレンス。

## `lem:buffer-filename`

Buffer に紐づくファイル名を文字列で返す。
ファイルに紐づいていない Buffer では `NIL` を返す。

~~~lisp
(lem:buffer-filename (lem:get-buffer "routing-context.lisp"))
;; => "/Users/.../routing-context.lisp"
~~~

`*lisp-repl*` や `*Messages*` のようなファイルを持たない Buffer では `NIL` になる。

## `lem:buffer-list`

現在 Lem が管理している Buffer のリストを返す。

~~~lisp
(lem:buffer-list)
~~~

Buffer ごとの名前やファイル名を確認するときは、例えば次のように使える。

~~~lisp
(mapcar
 (lambda (buffer)
   (list
    (lem:buffer-name buffer)
    (lem:buffer-filename buffer)))
 (lem:buffer-list))
~~~

## `lem:current-buffer`

現在の Buffer を返す。
REPL 上で評価した場合は、通常その REPL Buffer が current buffer になる。

~~~lisp
(lem:buffer-name (lem:current-buffer))
;; => "*lisp-repl*"
~~~

そのため、別のファイル Buffer を調べたい場合は `lem:get-buffer` などで対象を明示する。

## `lem:get-buffer`

Buffer オブジェクトまたは Buffer 名から Buffer を取得する。
名前に一致する Buffer がなければ `NIL` を返す。

~~~lisp
(lem:get-buffer "routing-context.lisp")
~~~

## `lem:make-buffer`

Lem の Buffer オブジェクトを作る。

~~~lisp
(lem:make-buffer nil :temporary t)
~~~

`:temporary t` を指定した Buffer は通常の Buffer 一覧へ追加されないため、テスト用の一時 Buffer として使いやすい。

## `(setf lem:buffer-filename)`

Buffer に紐づくファイル名を設定する。

~~~lisp
(setf (lem:buffer-filename buffer)
      "/tmp/example.lisp")
~~~

実ファイルを開かなくても、ファイルに紐づく Buffer の状態をテストするときに利用できる。

## `lem:make-key`

Lem の `Key` オブジェクトを作る。

~~~lisp
(lem:make-key
 :shift nil
 :ctrl nil
 :meta nil
 :super t
 :hyper nil
 :sym "s")
~~~

~~~lisp
(lem:make-key
 :ctrl t
 :sym "Up")
~~~

主なキーワード引数:

| 名前 | 概要 |
| --- | --- |
| `:ctrl` | Ctrl modifier の有無を指定する。 |
| `:hyper` | Hyper modifier の有無を指定する。 |
| `:meta` | Meta modifier の有無を指定する。 |
| `:shift` | Shift modifier の有無を指定する。 |
| `:super` | Super modifier の有無を指定する。 |
| `:sym` | キー本体を文字列で指定する。 |

# Key symbol

`lem:make-key` の `:sym` などで使う特殊キー名。

| 値 | キー |
| --- | --- |
| `"Backspace"` | Backspace |
| `"Down"` | ↓ |
| `"End"` | End |
| `"Escape"` | Escape |
| `"Home"` | Home |
| `"Left"` | ← |
| `"Return"` | Return |
| `"Right"` | → |
| `"Space"` | Space |
| `"Tab"` | Tab |
| `"Up"` | ↑ |

~~~lisp
(lem:make-key :sym "Return")

(lem:make-key :super t :sym "s")
~~~

# ASDF system

## `lem/core`

Lem の基本機能をまとめた ASDF system。
Buffer、Window、Command、Project、frame-multiplexer など、エディタの主要な仕組みを含む。

拡張を作るときは、必要な Lem の system を `:depends-on` に指定する。

~~~lisp
(defsystem "my-lem-extension"
  :depends-on ("lem/core")
  ...)
~~~

`lem/core` に含まれる機能だけを使う拡張では、Lem 全体や不要な extension system へ依存させる必要はない。
