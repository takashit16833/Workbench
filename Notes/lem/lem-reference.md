# Lem リファレンス

Lem の API や仕組みを、エディタの機能領域ごとに整理する。

## Key

### キーの生成

| 名前 | 概要 |
| --- | --- |
| `lem:make-key` | Lem の `Key` オブジェクトを作る。 |
| `:sym` | キー本体を文字列で指定する。 |
| `:shift` | Shift modifier の有無を指定する。 |
| `:ctrl` | Ctrl modifier の有無を指定する。 |
| `:meta` | Meta modifier の有無を指定する。 |
| `:super` | Super modifier の有無を指定する。 |
| `:hyper` | Hyper modifier の有無を指定する。 |

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

### キー名

一部の特殊キーは文字ではなく名前で指定する。

| 値 | キー |
| --- | --- |
| `"Tab"` | Tab |
| `"Return"` | Return |
| `"Escape"` | Escape |
| `"Space"` | Space |
| `"Backspace"` | Backspace |
| `"Up"` | ↑ |
| `"Down"` | ↓ |
| `"Left"` | ← |
| `"Right"` | → |
| `"Home"` | Home |
| `"End"` | End |

~~~lisp
(lem:make-key :sym "Return")

(lem:make-key :super t :sym "s")
~~~

## ASDF / System

Lem は複数の ASDF system に分けて構成されている。
拡張を作るときは、必要な Lem の system を `:depends-on` に指定する。

| 名前 | 概要 |
| --- | --- |
| `lem/core` | Lem の基本機能をまとめた ASDF system。Buffer、Window、Command、Project、frame-multiplexer など、エディタの主要な仕組みを含む。 |

~~~lisp
(defsystem "my-lem-extension"
  :depends-on ("lem/core")
  ...)
~~~

`lem/core` に含まれる機能だけを使う拡張では、Lem 全体や不要な extension system へ依存させる必要はない。
