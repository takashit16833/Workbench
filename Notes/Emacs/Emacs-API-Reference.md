# Emacs API Reference

現在の CLI Emacs 設定で使用している Emacs API、設定変数、`use-package`、外部パッケージ API のリファレンス。

- 対象: `takashit16833/.emacs.d` `main`
- 基準コミット: `afd6fdb032039f3ae3760ce7dadf51fb6e5fff83`
- 対象ファイル: `init.el`, `config/*.el`
- 目的: コードリーディング・設定追加時に、名前から役割と呼び出し形をすぐ確認する
- Emacs Lisp の `let`, `setq`, `if`, `#'` などは [[Emacs-Lisp-Reference]] を参照

各項目の呼び出し形は、現在の設定を読むために必要な引数を中心に記載する。

## File / feature / package

### `add-to-list`

```elisp
(add-to-list LIST-VAR ELEMENT &optional APPEND COMPARE-FN)
```

LIST-VAR が保持するリストへ ELEMENT を追加する。既に同じ要素があれば通常は追加しない。

現在の使用例:

```elisp
(add-to-list
 'package-archives
 '("melpa" . "https://melpa.org/packages/")
 t)
```

場所: `config/packages.el`

### `expand-file-name`

```elisp
(expand-file-name NAME &optional DEFAULT-DIRECTORY) -> STRING
```

`~` や相対パスを展開し、絶対パスとして正規化する。

場所: `init.el`, `config/basic.el`

### `load`

```elisp
(load FILE &optional NOERROR NOMESSAGE NOSUFFIX MUST-SUFFIX)
```

FILE の Emacs Lisp を読み込み、評価する。

現在の使用例:

```elisp
(load (expand-file-name "config/basic.el" user-emacs-directory))
```

場所: `init.el`

### `make-directory`

```elisp
(make-directory DIR &optional PARENTS)
```

ディレクトリを作る。PARENTS が非 `nil` なら必要な親ディレクトリも作る。

場所: `config/basic.el`

### `provide`

```elisp
(provide FEATURE &optional SUBFEATURES)
```

FEATURE を読み込み済み機能として登録する。`require` と対になる。

現在の使用例:

```elisp
(provide 'git)
```

場所: `config/packages.el`, `config/minibuffer.el`, `config/git.el`

### `require`

```elisp
(require FEATURE &optional FILENAME NOERROR)
```

FEATURE がまだ提供されていなければ対応ライブラリを読み込む。

現在の使用例:

```elisp
(require 'package)
(require 'disp-table)
```

場所: `config/packages.el`, `config/ui.el`

### `user-emacs-directory`

```text
Variable :: directory
```

ユーザーの Emacs 設定ディレクトリ。現在は `init.el` から `config/*.el` の絶対パスを作る基準として使用する。

### `package-archives`

```text
Variable :: alist
```

Emacs のパッケージ取得元一覧。

現在は MELPA を追加している。

場所: `config/packages.el`

### `package-selected-packages`

```text
Variable :: list
```

Custom が管理する、選択済みパッケージの一覧。`init.el` の `custom-set-variables` 内に生成されている。

### `package-vc-selected-packages`

```text
Variable :: alist
```

`package-vc` で管理するパッケージ情報。`retro-hacker-blue-theme` の取得元が Custom により記録されている。

## Custom

### `custom-set-variables`

```elisp
(custom-set-variables &rest ARGS)
```

Customize が保存した変数値を適用する。通常は Customize が生成・更新する領域として扱う。

場所: `init.el`

### `custom-set-faces`

```elisp
(custom-set-faces &rest ARGS)
```

Customize が保存した face 設定を適用する。現在は設定項目なし。

場所: `init.el`

## Buffer / editing / keymap

### `buffer-file-name`

```text
Variable :: string | nil
```

現在のバッファが訪問しているファイル名。ファイルに対応しないバッファでは `nil`。

場所: `config/ui.el`

### `comment-line`

```elisp
(comment-line &optional N)
```

現在行、または region がある場合は対象行のコメント状態を切り替える。

現在の割り当て:

```elisp
s-/ -> comment-line
```

場所: `config/editor.el`

### `electric-pair-mode`

```elisp
(electric-pair-mode &optional ARG)
```

括弧や引用符などの対応文字を自動挿入する minor mode。

場所: `config/editor.el`

### `keymap-global-set`

```elisp
(keymap-global-set KEY COMMAND)
```

グローバルキーマップへ KEY と COMMAND の対応を設定する。

現在の使用例:

```elisp
(keymap-global-set "s-s" #'save-buffer)
```

場所: `config/editor.el`

### `save-buffer`

```elisp
(save-buffer &optional BACKUP-OPTION)
```

現在のバッファを保存する。

現在の割り当て:

```elisp
s-s -> save-buffer
```

場所: `config/editor.el`

## Hook / advice / delayed execution

### `add-hook`

```elisp
(add-hook HOOK FUNCTION &optional DEPTH LOCAL)
```

HOOK に FUNCTION を登録する。

現在の使用例:

```elisp
(add-hook 'marginalia-mode-hook
          #'nerd-icons-completion-marginalia-setup)
```

場所: `config/minibuffer.el`

### `advice-add`

```elisp
(advice-add SYMBOL WHERE FUNCTION &optional PROPS)
```

既存関数 SYMBOL の呼び出しへ FUNCTION を差し込む。

現在使用している WHERE:

```text
:around
```

`:around` では advice 関数の第1引数として元関数を受け取り、必要な位置で `funcall` する。

場所: `config/terminal.el`

### `advice-member-p`

```elisp
(advice-member-p FUNCTION SYMBOL) -> BOOLEAN
```

SYMBOL に FUNCTION が advice として登録済みか判定する。

場所: `config/terminal.el`

### `run-with-timer`

```elisp
(run-with-timer SECS REPEAT FUNCTION &rest ARGS) -> TIMER
```

SECS 秒後に FUNCTION を実行する。REPEAT が `nil` なら1回だけ。

現在は KKP の有効化を 0.02 秒後に再確認するために使用する。

場所: `config/terminal.el`

### `with-eval-after-load`

```elisp
(with-eval-after-load FILE BODY...)
```

FILE / feature が読み込まれた後に BODY を評価する。既に読み込み済みなら直ちに評価する。

現在の使用例:

```elisp
(with-eval-after-load 'kkp
  ...)
```

場所: `config/terminal.el`

## Time

### `current-time`

```elisp
(current-time) -> TIME
```

現在時刻を Emacs の time value として返す。

場所: `config/terminal.el`

### `time-add`

```elisp
(time-add TIME DELTA) -> TIME
```

時刻に時間差を加算する。

現在は KKP 有効化待ちの締切を2秒後に設定するために使用する。

### `time-less-p`

```elisp
(time-less-p T1 T2) -> BOOLEAN
```

T1 が T2 より前なら非 `nil`。

場所: `config/terminal.el`

## Frame / terminal / input

### `display-graphic-p`

```elisp
(display-graphic-p &optional DISPLAY) -> BOOLEAN
```

グラフィカル表示か判定する。

現在は端末版でだけ `xterm-mouse-mode` を有効にする判定に使用する。

場所: `config/basic.el`

### `frame-terminal`

```elisp
(frame-terminal &optional FRAME) -> TERMINAL
```

FRAME が属する terminal オブジェクトを返す。

場所: `config/terminal.el`

### `frames-on-display-list`

```elisp
(frames-on-display-list &optional DISPLAY) -> LIST
```

指定 display / terminal 上の frame 一覧を返す。

場所: `config/terminal.el`

### `input-decode-map`

```text
Variable :: keymap
```

端末から届く入力列を Emacs のイベントへ変換するためのキーマップ。

現在は xterm の端末照会が完了したかを `lookup-key` で観測するために使用する。

### `kbd`

```elisp
(kbd KEYS) -> KEY-SEQUENCE
```

`"M-:"` のような人間向けキー表記を Emacs のキー列へ変換する。

場所: `config/terminal.el`

### `lookup-key`

```elisp
(lookup-key KEYMAP KEY &optional ACCEPT-DEFAULTS) -> OBJECT
```

KEYMAP で KEY がどの定義に対応しているか調べる。

場所: `config/terminal.el`

### `terminal-live-p`

```elisp
(terminal-live-p OBJECT) -> BOOLEAN
```

OBJECT が有効な terminal か判定する。

場所: `config/terminal.el`

### `with-selected-frame`

```elisp
(with-selected-frame FRAME BODY...)
```

BODY の評価中だけ FRAME を選択中 frame として扱う。

場所: `config/terminal.el`

### `xterm-mouse-mode`

```elisp
(xterm-mouse-mode &optional ARG)
```

端末上のマウスイベントを Emacs で扱えるようにする minor mode。

場所: `config/basic.el`

## Display / UI

### `load-theme`

```elisp
(load-theme THEME &optional NO-CONFIRM NO-ENABLE)
```

THEME を読み込む。NO-CONFIRM が非 `nil` なら確認なしで読み込む。

現在の使用例:

```elisp
(load-theme 'retro-hacker-blue t)
```

場所: `config/ui.el`

### `menu-bar-mode`

```elisp
(menu-bar-mode &optional ARG)
```

メニューバーの有効・無効を切り替える。

現在は `-1` で無効化している。

### `set-display-table-slot`

```elisp
(set-display-table-slot TABLE SLOT VALUE)
```

display table の指定 SLOT に表示文字を設定する。

現在使用している slot:

```text
wrap            行折り返し位置
vertical-border ウィンドウ境界
```

場所: `config/ui.el`

### `standard-display-table`

```text
Variable :: display-table
```

標準の文字表示変換テーブル。

場所: `config/ui.el`

### `setq-default`

```elisp
(setq-default SYMBOL VALUE ...)
```

buffer-local になり得る変数の既定値を設定する。既存バッファのローカル値を直接上書きするものではない。

現在の使用例:

```elisp
(setq-default truncate-lines nil)
```

場所: `config/ui.el`

## Core configuration variables

### `auto-save-file-name-transforms`

自動保存ファイル名の変換規則。現在は `~/.cache/emacs/auto-save/` へ集約する。

### `auto-save-list-file-prefix`

自動保存セッション一覧ファイルの接頭辞。現在は auto-save 用キャッシュ配下へ置く。

### `backup-directory-alist`

バックアップファイルの保存先対応表。現在はすべて `~/.cache/emacs/backups/` へ送る。

### `inhibit-startup-screen`

非 `nil` なら起動時の案内画面を表示しない。

### `make-backup-files`

非 `nil` ならバックアップファイルを作る。

### `ring-bell-function`

ベルを鳴らすときに呼ぶ関数。現在は `ignore` を指定して無音化している。

### `scroll-conservatively`

ポイントが画面外へ出たときの再配置の積極度。現在は大きな値 `101` を指定し、スクロール時の大きなジャンプを避ける。

### `scroll-margin`

ウィンドウ上下端から確保するスクロール余白の行数。現在は `5`。

### `truncate-lines`

非 `nil` なら長い行を折り返さず切り詰めて表示する。現在の既定値は `nil`。

### `truncate-partial-width-windows`

部分幅ウィンドウで長い行を切り詰めるか制御する。現在は `nil`。

## `use-package`

### `use-package`

```elisp
(use-package NAME KEYWORD...)
```

パッケージのインストール、遅延読み込み、キー設定、hook、初期化などを宣言的にまとめるマクロ。

現在使用しているキーワードだけを以下に記載する。

### `:after`

```elisp
:after FEATURE
```

FEATURE の読み込み後に対象パッケージを読み込む依存関係を指定する。

現在: `nerd-icons-completion` を `marginalia` の後に読み込む。

### `:bind`

```elisp
:bind (KEY . COMMAND)
:bind ((KEY . COMMAND) ...)
```

キー割り当てを定義する。コマンドの autoload にも利用される。

### `:commands`

```elisp
:commands COMMAND
```

COMMAND を autoload 対象として宣言し、コマンドが必要になるまでパッケージ本体を読み込まない。

現在: `nerd-icons-icon-for-file`

### `:config`

```elisp
:config FORM...
```

パッケージ読み込み後に評価する設定。

### `:custom`

```elisp
:custom
(VARIABLE VALUE)
```

Customize 変数を `use-package` から設定する。

### `:ensure`

```elisp
:ensure t
:ensure nil
```

`t` なら不足時にパッケージを用意する。`nil` は外部インストールを要求しない。

現在 `savehist` は Emacs 組み込みなので `:ensure nil`。

### `:hook`

```elisp
:hook (HOOK . FUNCTION)
```

hook と実行関数を関連付ける。

現在: `tty-setup -> global-kkp-mode`, `magit-mode -> magit-delta-mode`

### `:init`

```elisp
:init FORM...
```

パッケージ本体を読み込む前に評価する設定。

### `:no-require`

```elisp
:no-require t
```

`use-package` 自身による `require` を行わない。

現在: `retro-hacker-blue-theme`

### `:vc`

```elisp
:vc (:url URL :rev REV)
```

Version Control のリポジトリからパッケージを取得する設定。

現在:

```elisp
:vc (:url "https://github.com/takashit16833/emacs-retro-hacker-blue-theme.git"
     :rev :newest)
```

## External package API

ここは外部パッケージ側の名前を、現在の設定を読むために必要な範囲だけ記載する。

### Consult

#### `consult-buffer`

バッファをミニバッファから検索・選択する Consult コマンド。

現在の割り当て: `C-x b`

#### `consult-line`

現在のバッファ内の行を検索する Consult コマンド。

現在の割り当て: `s-f`

### expand-region

#### `er/expand-region`

選択範囲を意味のある構文単位へ段階的に広げる。

現在の割り当て: `s-x`

### KKP

#### `global-kkp-mode`

Kitty keyboard protocol 対応を全体で有効にする。

現在は `tty-setup` hook から起動する。

#### `kkp-enable-in-terminal`

KKP を terminal ごとに有効化する関数。

現在は `:around` advice で xterm の端末照会完了を待ってから元関数を呼ぶ。

#### `kkp--translate-terminal-input`

KKP の端末入力列を Emacs イベントへ変換する内部関数。

> 名前に `--` があるため KKP の内部 API。公開 API と同じ安定性を期待しない。KKP 更新時に優先して互換性を確認する。

現在は WezTerm + JIS 配列の Option+`:` 補正のため advice している。

### Magit

#### `magit-status`

Git リポジトリの状態を表示する Magit の中心コマンド。

現在の割り当て: `C-x g`

#### `magit-delta-mode`

Magit の差分表示へ delta を適用する minor mode。

現在は `magit-mode` hook で有効化する。

### Marginalia

#### `marginalia-mode`

ミニバッファ候補へ補足情報を付加する mode。

### move-text

#### `move-text-up`

現在行または region を上へ移動する。

現在の割り当て: `M-<up>`

#### `move-text-down`

現在行または region を下へ移動する。

現在の割り当て: `M-<down>`

### Nerd Icons

#### `nerd-icons-icon-for-file`

```elisp
(nerd-icons-icon-for-file FILE ...)
```

FILE に対応する Nerd Font アイコン文字列を返す。

場所: `config/ui.el`

#### `nerd-icons-color-icons`

アイコン固有色を使うか制御する変数。モードラインでは一時的に `nil` へ束縛し、モードラインの文字色を継承させている。

### nerd-icons-completion

#### `nerd-icons-completion-mode`

補完候補へ Nerd Font アイコンを付ける mode。

#### `nerd-icons-completion-marginalia-setup`

Marginalia と nerd-icons-completion を連携させる設定関数。

### Orderless / completion

#### `completion-styles`

Emacs 補完で使用する照合方式の一覧。

現在:

```elisp
'(orderless basic)
```

#### `completion-category-overrides`

補完カテゴリごとに照合方式を上書きする。

現在は `file` カテゴリだけ `partial-completion` を指定している。

#### `completion-pcm-leading-wildcard`

`partial-completion` の先頭ワイルドカード動作を制御する。現在は `t`。

### savehist

#### `savehist-mode`

ミニバッファなどの履歴を Emacs 終了後も保存する mode。

### Vertico

#### `vertico-mode`

ミニバッファ候補を縦型 UI で表示する mode。

### undo-fu

#### `undo-fu-only-undo`

undo-fu の Undo コマンド。

現在の割り当て: `s-z`, `M-z`

#### `undo-fu-only-redo`

undo-fu の Redo コマンド。

現在の割り当て: `s-Z`, `S-s-z`, `M-Z`

### Retro Hacker Blue Theme

#### `retro-hacker-blue-transparent-background`

テーマの背景透過を指定する設定変数。現在は `t`。

#### `retro-hacker-blue-apply-background`

テーマ読み込み後に背景設定を現在の frame へ適用する関数。

### mood-line

#### `mood-line-mode`

mood-line を有効にする mode。

#### `mood-line-defformat`

mood-line の表示構成を作るためのマクロ。

現在は `mood-line-format` の左右セグメント構成を定義している。

#### `mood-line-format`

実際に表示する mood-line の構成を保持する変数。

#### `mood-line-glyph-alist`

mood-line で使うグリフ集合を指定する変数。

現在:

```elisp
mood-line-glyphs-fira-code
```

#### 使用中の segment

```text
mood-line-segment-modal
mood-line-segment-buffer-status
my/mood-line-segment-file-icon
mood-line-segment-buffer-name
mood-line-segment-anzu
mood-line-segment-multiple-cursors
mood-line-segment-cursor-position
mood-line-segment-scroll
mood-line-segment-vc
mood-line-segment-major-mode
mood-line-segment-misc-info
mood-line-segment-checker
mood-line-segment-process
```

各関数はモードラインの一部分を生成する。`my/mood-line-segment-file-icon` だけ現在の設定側で定義した独自 segment。

## 参照元ファイル

```text
init.el
config/basic.el
config/development.el
config/editor.el
config/git.el
config/minibuffer.el
config/org.el
config/packages.el
config/terminal.el
config/ui.el
```

`development.el` と `org.el` は現時点では実行する設定を持たない。
