# Zellij

Zellij 0.45.0。現在の dotfiles のキー設定を前提にする。

## モード

| キー | モード | 用途 |
|---|---|---|
| `Option + T` | Tab | タブ操作。標準の `Ctrl + T` から変更済み |
| `Ctrl + P` | Pane | ペイン作成・移動・全画面など |
| `Ctrl + N` | Resize | ペインサイズ変更 |
| `Ctrl + H` | Move | ペイン自体を移動 |
| `Option + S` | Scroll | 過去の出力を見る。標準の `Ctrl + S` から変更済み |
| `Ctrl + O` | Session | セッション操作 |
| `Ctrl + G` | Locked | Zellij のキー操作を無効化 / 復帰 |
| `Ctrl + B` | Tmux | tmux 風キー操作 |
| `Ctrl + Q` | - | Zellij を終了 |

多くのモードは `Esc` または `Enter` で Normal に戻る。

## 直接操作

モードに入らず使える。

| キー | 操作 |
|---|---|
| `Cmd + Option + ← / →` | 前 / 次のタブ |
| `Option + N` | 新しいペイン |
| `Option + H/J/K/L` | ペインフォーカス移動 |
| `Option + = / -` | ペインを拡大 / 縮小 |
| `Option + [ / ]` | 前 / 次のレイアウト |

## Pane — `Ctrl + P`

| キー | 操作 |
|---|---|
| `h/j/k/l` | フォーカス移動 |
| `;` | 直前のペインへ戻る |
| `n` | 新しいペイン |
| `d` | 下に分割 |
| `r` | 右に分割 |
| `s` | stacked pane を作成 |
| `x` | ペインを閉じる |
| `f` | 全画面 |
| `Shift + f` | UIも隠して全画面 |
| `w` | floating pane の表示 / 非表示 |
| `e` | tiled / floating を切り替え |
| `z` | ペイン枠の表示 / 非表示 |
| `c` | ペイン名変更 |
| `i` | floating pane の固定 / 解除 |

## Tab — `Option + T`

| キー | 操作 |
|---|---|
| `h/k` | 前のタブ |
| `j/l` | 次のタブ |
| `1`〜`9` | 指定番号のタブ |
| `Tab` | 直前のタブ |
| `n` | 新しいタブ |
| `x` | タブを閉じる |
| `r` | タブ名変更 |
| `s` | 全ペインへ同じ入力を送る ON/OFF |
| `b` | 現在のペインを新しいタブへ分離 |
| `[` / `]` | ペインを左 / 右の新しいタブへ分離 |

## Scroll — `Option + S`

| キー | 操作 |
|---|---|
| `j/k` | 1行下 / 上 |
| `Ctrl + f/b` | 1ページ下 / 上 |
| `d/u` | 半ページ下 / 上 |
| `[` / `]` | 前 / 次のコマンド位置へ移動 |
| `c` | 直前のコマンド出力をクリップボードへコピー |
| `m` | 現在位置のコマンド + 出力を選択 |
| `s` | 検索 |
| `e` | scrollback 全体を `$EDITOR` で開く |
| `Ctrl + c` | 一番下へ戻って Normal |

`[` / `]`、`c`、`m` は shell が OSC 133 を出力している場合に使える。

### コマンド出力をコピー

直前のコマンド出力だけなら:

`Option + S` → `c`

もっと前のコマンドを探すなら:

`Option + S` → `[` を必要な回数 → `m`

Zellij には tmux の copy-mode のような「キーボードだけで任意範囲を選択するモード」はない。任意範囲をキーボードで選びたい場合は `e` で scrollback をエディタに開く。

## Resize — `Ctrl + N`

| キー | 操作 |
|---|---|
| `h/j/k/l` | その方向へ広げる |
| `H/J/K/L` | その方向を狭める |
| `+` / `=` | 全体的に広げる |
| `-` | 全体的に狭める |

## Move — `Ctrl + H`

| キー | 操作 |
|---|---|
| `h/j/k/l` | ペインをその方向へ移動 |
| `n` / `Tab` | 次の位置へ移動 |
| `p` | 前の位置へ移動 |

## Session — `Ctrl + O`

| キー | 操作 |
|---|---|
| `d` | detach。セッションは残す |
| `w` | Session Manager |
| `c` | Configuration |
| `p` | Plugin Manager |
| `l` | Layout Manager |

再接続:

```bash
zellij attach
```

セッション一覧:

```bash
zellij list-sessions
```

### 溜まったセッションを掃除する

動作中のセッションをすべて終了する:

```bash
zellij kill-all-sessions
```

実行中のプロセスも終了するため、溜まったセッションによるメモリ使用を解放したい場合はこちら。現在接続中のセッションも対象になる。

終了済みで復元可能なセッション情報をすべて削除する:

```bash
zellij delete-all-sessions
```

こちらはセッション復元用に保存された情報の削除が中心で、主にディスク上の掃除になる。

すべて掃除する場合:

```bash
zellij kill-all-sessions
zellij delete-all-sessions
```
