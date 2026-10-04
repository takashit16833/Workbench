# Lem リファレンス

現在の `lem-config` で実際に使っている Lem API を、調べ物用に簡潔にまとめる。

- 対象: `takashit16833/lem-config` の現行 `main`
- Lem実装の確認先: `takashit16833/lem` の現行コード
- 網羅的なAPI一覧ではなく、使ったものを追加していくリファレンス
- 例は原則として `:lem-user` パッケージ内で使う前提

## 目次

- [補完](#補完)
- [キーバインド](#キーバインド)
- [コマンド定義](#コマンド定義)
- [Pointと位置](#pointと位置)
- [削除・コピー](#削除コピー)
- [Kill ringとClipboard](#kill-ringとclipboard)
- [標準コマンド](#標準コマンド)

---

## 補完

### `*automatic-tab-completion*`

Promptを開いた直後から補完候補を表示するかどうか。

```lisp
(setf *automatic-tab-completion* t)
```

- `t`: 最初から候補を表示
- `nil`: Tabを押したときに候補を表示

実装: `src/prompt.lisp`

---

## キーバインド

### `*global-keymap*`

Lem全体で使われるグローバルキーマップ。

```lisp
(define-key *global-keymap* "S-s" 'save-current-buffer)
```

### `define-key`

```text
define-key KEYMAP KEYSPEC COMMAND
```

キーマップにコマンドを割り当てる。

```lisp
(define-key *global-keymap* "C-w" 'my/kill-region)
```

現在よく使う修飾キー:

| 表記 | 意味 | macOSでの用途 |
|---|---|---|
| `C-` | Control | Control |
| `M-` | Meta | Option |
| `S-` | Super | Command |
| `Shift-` | Shift | Shift |

例:

```text
S-s         Command+s
S-Shift-k   Command+Shift+k
M-Backspace Option+Backspace
```

実装: `src/keymap.lisp`

---

## コマンド定義

### `define-command`

Lemから実行できるコマンドを定義する。

```lisp
(define-command my/delete-to-line-end () ()
  ...)
```

基本形:

```text
define-command NAME PARAMETERS ARGUMENT-DESCRIPTORS
  BODY...
```

現在使っている引数指定:

| 指定 | 意味 |
|---|---|
| `()` | 対話引数なし |
| `(:region)` | 選択範囲の `start` と `end` を受け取る |
| `(:universal)` | 数値引数を受け取る。通常は1 |

例:

```lisp
(define-command my/copy-region (start end) (:region)
  ...)
```

```lisp
(define-command my/delete-word-forward (n) (:universal)
  ...)
```

実装: `src/defcommand.lisp`

---

## Pointと位置

Lemではカーソル位置や一時的な位置を **Point** オブジェクトで扱う。

### `current-point`

現在のカーソル位置のPointを返す。

```lisp
(current-point)
```

### `with-point`

Pointをコピーして、一時的な位置として使う。

```lisp
(with-point ((start (current-point)))
  (line-start start)
  ...)
```

`start` を動かしても、本物のカーソルは移動しない。

### `start-line-p`

```text
start-line-p POINT -> boolean
```

Pointが行頭にいるか調べる。

```lisp
(start-line-p (current-point))
```

### `start-buffer-p`

```text
start-buffer-p POINT -> boolean
```

Pointがバッファ先頭にいるか調べる。

### `line-start`

```text
line-start POINT -> POINT
```

Pointを現在行の行頭へ移動する。

### `line-end`

```text
line-end POINT -> POINT
```

Pointを現在行の行末へ移動する。

### `buffer-end`

```text
buffer-end POINT -> POINT
```

Pointをバッファ末尾へ移動する。

### `line-offset`

```text
line-offset POINT N [&optional CHARPOS] -> POINT | NIL
```

PointをN行移動する。

```lisp
(line-offset end 1)
```

移動先の行がなければ `nil` を返し、Pointは元の位置に残る。

### `character-offset`

```text
character-offset POINT N -> POINT | NIL
```

Pointを文字単位で移動する。

```lisp
(character-offset start -1)
```

### `point-column`

現在のPointの表示上の列位置を取得する。

```lisp
(point-column (current-point))
```

### `move-to-column`

```text
move-to-column POINT COLUMN [&optional FORCE]
```

Pointを指定列へ移動する。

```lisp
(move-to-column (current-point) column)
```

行が短い場合、通常は行末まで移動する。

主な実装: `src/buffer/internal/basic.lisp`

---

## 削除・コピー

### `delete-between-points`

2つのPointの間を削除する。

```lisp
(delete-between-points start end)
```

Kill ringやOSクリップボードへコピーしない削除に使う。

### `delete-previous-char`

カーソル直前の文字を削除する。

```lisp
(delete-previous-char)
```

現在は、行頭でCommand+Backspaceを押したときに直前の改行を消す用途でも使っている。

### `delete-word`

```text
delete-word N
```

前方の単語を削除する。

標準実装では内部で `kill-region` を使うため、そのままではKill ringに入る。

### `backward-delete-word`

```text
backward-delete-word N
```

後方の単語を削除する。

標準実装では `delete-word` を利用するため、そのままではKill ringに入る。

### `copy-region`

選択範囲をKill ringへコピーする。

```lisp
(copy-region start end)
```

Clipboardが有効ならOSクリップボードにも送る。

### `kill-region`

選択範囲を削除し、Kill ringへ保存する。

```lisp
(kill-region start end)
```

Clipboardが有効ならOSクリップボードにも反映する。

主な実装:

- `src/commands/edit.lisp`
- `src/commands/word.lisp`

---

## Kill ringとClipboard

### `with-enable-clipboard`

囲んだ処理の間だけOSクリップボードの有効・無効を切り替える。

```lisp
(with-enable-clipboard nil
  (copy-region start end))
```

この例では:

```text
Kill ring  ○
Clipboard  ×
```

### `with-disable-killring`

囲んだ処理の間だけKill ringを無効にする。

```lisp
(with-disable-killring ()
  (with-enable-clipboard nil
    (delete-word n)))
```

この例では:

```text
Kill ring  ×
Clipboard  ×
```

標準の編集処理を再利用しつつ、保存先だけ制御したいときに便利。

実装:

- `src/clipboard.lisp`
- `src/killring.lisp`

---

## 標準コマンド

現在 `config/editor.lisp` から直接キーバインドしている標準コマンド。

| コマンド | 用途 |
|---|---|
| `save-current-buffer` | 現在のバッファを保存 |
| `undo` | Undo |
| `redo` | Redo |
| `move-to-beginning-of-line` | インデント先頭 / 行頭へ移動 |
| `move-to-end-of-line` | 行末へ移動 |
| `move-to-beginning-of-buffer` | バッファ先頭へ移動 |
| `move-to-end-of-buffer` | バッファ末尾へ移動 |

`move-to-beginning-of-line` は単純な行頭移動ではなく、通常のテキストでは **インデント先頭と本当の行頭を切り替える**動作をする。

主な実装: `src/commands/move.lisp`
