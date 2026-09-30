# Lem リファレンス

Lem のソースリーディングや拡張作成中に、コードへ現れた API 名や値を直接引くためのリファレンス。

## API

API 名順に追加する。

### `lem:make-key`

Lem の `Key` オブジェクトを作る。

| 引数 | 概要 |
| --- | --- |
| `:ctrl` | Ctrl modifier の有無を指定する。 |
| `:hyper` | Hyper modifier の有無を指定する。 |
| `:meta` | Meta modifier の有無を指定する。 |
| `:shift` | Shift modifier の有無を指定する。 |
| `:super` | Super modifier の有無を指定する。 |
| `:sym` | キー本体を文字列で指定する。 |

~~~lisp
(lem:make-key
 :shift nil
 :ctrl nil
 :meta nil
 :super t
 :hyper nil
 :sym "s")

(lem:make-key
 :ctrl t
 :sym "Up")
~~~

## Key symbol

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

## ASDF system

Lem が提供する ASDF system。system 名順に追加する。

### `lem/core`

Lem の基本機能をまとめた ASDF system。
Buffer、Window、Command、Project、frame-multiplexer など、エディタの主要な仕組みを含む。

~~~lisp
(defsystem "my-lem-extension"
  :depends-on ("lem/core")
  ...)
~~~
