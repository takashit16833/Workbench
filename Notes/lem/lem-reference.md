# Lem リファレンス

## Key

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

## Key symbol

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
