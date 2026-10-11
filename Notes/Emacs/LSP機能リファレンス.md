# LSP 機能リファレンス

```toc
minLevel: 2
maxLevel: 2
```

対象: GNU Emacs 31.1 / Eglot（標準）と、現在の `.emacs.d` の設定。

- コマンドは `M-x` から実行できる。キーは Emacs 標準または現在の設定で割り当てられたもの。
- LSP サーバーによって対応機能が異なる。コマンドが存在しても、サーバーが対応していなければ使用できない。
- Eglot は LSP と通信し、移動・診断・説明・補完などの表示には Emacs の Xref / Flymake / ElDoc / Corfu などを使用する。

## 1. コードの移動・検索

| コマンド | キー | できること |
|---|---|---|
| `xref-find-definitions` | `M-.` | カーソル位置の関数・型・変数などの定義へ移動 |
| `xref-find-references` | `M-?` | カーソル位置のシンボルが参照されている箇所を一覧 |
| `xref-find-apropos` | `C-M-.` | プロジェクト全体のシンボルを名前で検索 |
| `xref-go-back` | `M-,` | 移動する前の位置へ戻る |
| `xref-go-forward` | `C-M-,` | 戻った履歴を進める |

これらは Emacs 標準の Xref コマンド。Eglot 接続中は、LSP サーバーの対応機能を使って検索できる。

- **定義を探す**: `M-.`
- **使われている箇所を探す**: `M-?`
- **名前からシンボルを探す**: `C-M-.`
- **文字列そのものを検索する**: `consult-ripgrep`（LSP ではなく ripgrep）

## 2. シンボルの操作・コード修正

| コマンド | できること |
|---|---|
| `eglot-rename` | シンボルを参照箇所も含めて名前変更 |
| `my/eglot-code-actions` | カーソル位置などで利用可能なコードアクションを選択 |
| `eglot-code-action-quickfix` | エラー・警告に対する修正候補を実行 |
| `eglot-code-action-organize-imports` | import 文などを整理 |
| `eglot-code-action-extract` | 選択したコードの関数化など、抽出候補を実行 |
| `eglot-code-action-inline` | 関数や変数のインライン展開候補を実行 |
| `eglot-code-action-rewrite` | 書き換え・リファクタリング候補を実行 |

**独自キー**: `C-c l a` → `my/eglot-code-actions`

`my/eglot-code-actions` は独自コマンド。Eglot の提案表示経由で候補が1件だけの場合も即時実行せず、候補選択画面を表示するために用意されている。

個別のコードアクションは、LSP サーバーがその種類を提供しているときに使える。

## 3. 型・関数の関係を調べる

| コマンド | できること |
|---|---|
| `eglot-find-declaration` | 宣言位置へ移動 |
| `eglot-find-implementation` | 実装位置へ移動 |
| `eglot-find-typeDefinition` | 型の定義位置へ移動 |
| `eglot-show-call-hierarchy` | 呼び出し元・呼び出し先の関係を階層表示 |
| `eglot-show-type-hierarchy` | 型の親子関係などを階層表示 |

`eglot-show-call-hierarchy` は、関数を「誰が呼び出しているか」「何を呼び出しているか」という両方向から調べられる。`xref-find-references` は参照箇所の一覧、こちらは呼び出し関係の構造を見るための機能。

## 4. エラー・説明・整形

| コマンド | キー | できること |
|---|---|---|
| `my/flymake-problems` | `S-s-m` | 独自のエラー・警告一覧画面を表示 |
| `flymake-show-buffer-diagnostics` | — | 現在のバッファの診断結果を表示 |
| `flymake-show-project-diagnostics` | — | プロジェクトで収集済みの診断結果を表示 |
| `eldoc-box-help-at-point` | `C-c h` | カーソル位置の説明や型などをポップアップ表示 |
| `eglot-format` | — | 選択範囲、またはバッファ全体の整形をサーバーへ依頼 |
| `eglot-format-buffer` | — | バッファ全体の整形をサーバーへ依頼 |
| `eglot-inlay-hints-mode` | — | 推論された型や引数名などの補助表示を切り替え |

- Flymake は Eglot などから受け取った診断を表示する。`flymake-show-project-diagnostics` は未解析の全ファイルを自動検査する機能ではない。
- ElDoc / eldoc-box は型情報や説明などを表示する。内容はサーバーの提供情報に依存する。
- 現在の設定では、普段の保存時整形は **Apheleia** が担当。`eglot-format` は別の整形経路なので、同じ処理とは限らない。
- `eglot-inlay-hints-mode` はサーバーが Inlay Hints を提供する場合に利用できる。

## 5. LSPサーバーの管理

| コマンド | できること |
|---|---|
| `eglot` | LSP サーバーに接続 |
| `eglot-reconnect` | LSP サーバーに再接続 |
| `eglot-shutdown` | 接続を終了 |
| `eglot-list-connections` | 現在の接続一覧を表示 |
| `eglot-describe-connection` | 接続先・対応機能などの情報を確認 |
| `eglot-events-buffer` | サーバーとの通信記録を表示 |
| `eglot-stderr-buffer` | サーバーの標準エラー出力を表示 |

現在の `config/development.el` では、Lua / Haskell / PHP / Python / TypeScript / TSX の各モードで `eglot-ensure` をフックに登録し、自動接続する構成。

問題を調べるときは、まず `eglot-describe-connection` で接続状況を確認し、必要に応じて `eglot-events-buffer` と `eglot-stderr-buffer` を見る。

## 6. 現在の環境での使い方

### Eglot のメニューを表示

`M-:`（`eval-expression`）で次を評価する。

```elisp
(tmm-prompt eglot-menu)
```

Eglot のメニューから、定義・参照検索、名前変更、コードアクション、型階層、呼び出し階層などを選べる。サーバーの対応機能に応じて項目が有効・無効になる。

### 接続中サーバーの対応機能を確認

```text
M-x eglot-describe-connection
```

「コマンドがあるのに動かない」場合は、まず LSP サーバーが該当機能に対応しているかを確認する。

### 現在のキー設定

| キー | コマンド |
|---|---|
| `C-c l a` | `my/eglot-code-actions` |
| `C-c h` | `eldoc-box-help-at-point` |
| `S-s-m` | `my/flymake-problems` |
| `M-.` / `M-?` / `C-M-.` / `M-,` | Xref の標準操作 |

※ `C-c l` 全体を Eglot のプレフィックスとして登録しているわけではない。

### Consult との関係

- `consult-imenu`: 現在ファイルのシンボル一覧（現在は `M-g i`）
- `xref-find-apropos`: LSP を使ったプロジェクト全体のシンボル検索
- `consult-ripgrep`: ソースコードの文字列検索（現在は `S-s-f`）
- `consult-eglot-symbols`: Consult の画面で LSP のワークスペースシンボルを検索する追加パッケージ `consult-eglot` のコマンド。**現在の設定には未導入**。

### 参照

- [Eglot 公式マニュアル](https://www.gnu.org/software/emacs/manual/html_node/eglot/)
- [Emacs 31.1 の eglot.el](https://github.com/emacs-mirror/emacs/blob/emacs-31.1/lisp/progmodes/eglot.el)
- [現在の Eglot 設定](https://github.com/takashit16833/.emacs.d/blob/main/config/development.el)
- [独自 Eglot コマンド](https://github.com/takashit16833/.emacs.d/blob/main/elisp/my-eglot.el)
