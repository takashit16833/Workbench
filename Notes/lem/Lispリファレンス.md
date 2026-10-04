# Lisp リファレンス

現在の Lem 設定で実際に使っている Common Lisp の構文・関数を、調べ物用に簡潔にまとめる。

Lem固有のAPIは [Lem リファレンス](./Lemリファレンス.md) を参照する。

## 目次

- [パッケージ](#パッケージ)
- [変数と代入](#変数と代入)
- [条件分岐](#条件分岐)
- [繰り返し](#繰り返し)
- [シンボルと値](#シンボルと値)
- [ファイルとPathname](#ファイルとpathname)

---

## パッケージ

### `in-package`

以降のコードをどのパッケージで評価するか指定する。

```lisp
(in-package :lem-user)
```

Lemのユーザー設定では現在 `:lem-user` を使っている。

---

## 変数と代入

### `let`

ローカル変数を作る。

```lisp
(let ((point (current-point)))
  ...)
```

複数定義できる。

```lisp
(let ((a 1)
      (b 2))
  ...)
```

`let` の各初期値は、作成中の新しいローカル変数同士を参照せずに評価される。

### `setf`

値を書き換えるための汎用的な代入構文。

```lisp
(setf *automatic-tab-completion* t)
```

単純な変数だけでなく、Common Lispでは多くの「場所」に対して使える。

---

## 条件分岐

### `if`

```text
if TEST THEN [ELSE]
```

条件が真ならTHEN、偽ならELSEを評価する。

```lisp
(if (start-line-p point)
    (delete-previous-char)
    ...)
```

### `unless`

条件が偽のときだけ本体を実行する。

```lisp
(unless (start-buffer-p start)
  (character-offset start -1))
```

おおよそ次と同じ意味。

```lisp
(if (not condition)
    ...)
```

### `and`

左から条件を評価し、すべて真なら真。

```lisp
(and (start-line-p point)
     (not (start-buffer-p point)))
```

途中で偽になった時点で、それ以降は評価しない。

### `not`

真偽を反転する。

```lisp
(not (start-buffer-p point))
```

Common Lispでは `nil` が偽、それ以外が真。

---

## 繰り返し

### `dolist`

リストの各要素について処理する。

```lisp
(dolist (file '("basic.lisp"
                "editor.lisp"
                "appearance.lisp"))
  (load (merge-pathnames file config-directory)))
```

この例ではファイル名を1つずつ `file` に入れて処理している。

---

## シンボルと値

### `nil`

Common Lispの偽値。また空リストでもある。

```lisp
nil
```

### `t`

慣習的に使われる真値。

```lisp
t
```

### Quote: `'`

式を評価せず、そのものとして扱う。

```lisp
'save-current-buffer
```

これは次の短縮形。

```lisp
(quote save-current-buffer)
```

`define-key` では、実行結果ではなく「このコマンドのシンボル」を渡すために使っている。

### Keyword: `:`

`:region` や `:universal` のように先頭にコロンが付くシンボル。

```lisp
:region
:universal
```

Keywordは自分自身を値として持つため、設定値や識別子としてよく使われる。

---

## ファイルとPathname

Common Lispではファイルパスを単なる文字列だけでなく **Pathname** として扱える。

### `*load-pathname*`

現在 `load` されているファイル自身のPathname。

```lisp
*load-pathname*
```

設定ファイルから相対的に別ファイルを読むときに使っている。

### `make-pathname`

Pathnameを作る。

現在は `*load-pathname*` からファイル名部分を取り除き、ディレクトリとして扱うために使っている。

```lisp
(make-pathname
 :name nil
 :type nil
 :defaults *load-pathname*)
```

- `:defaults`: 元にするPathname
- `:name nil`: ファイル名を外す
- `:type nil`: 拡張子を外す

### `merge-pathnames`

相対Pathnameと基準Pathnameを組み合わせる。

```lisp
(merge-pathnames
 "../lisp/my-editing.lisp"
 base-directory)
```

設定ディレクトリを基準にファイルを探す用途で使っている。

### `load`

Lispファイルを読み込み、順番に評価する。

```lisp
(load pathname)
```

現在は:

```text
init.lisp
  -> config/*.lisp
       -> lisp/my-editing.lisp
```

という読み込み構造になっている。
