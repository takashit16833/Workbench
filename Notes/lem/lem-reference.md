# Lem リファレンス

Lem のソースリーディングや拡張作成中に、コードへ現れた API 名や値から直接引くためのリファレンス。

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
