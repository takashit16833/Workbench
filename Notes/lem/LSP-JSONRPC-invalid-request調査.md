# Lem LSP: JSONRPC-INVALID-REQUEST 調査

## 概要

Lem の ncurses 版で Lua ファイルを開いたとき、Lua Language Server からのメッセージ受信中に

```text
JSONRPC/ERRORS:JSONRPC-INVALID-REQUEST
```

が発生し、SBCL の debugger 出力によって ncurses 画面が崩れる問題を調査した。

直接の原因は Lem 本体ではなく、依存している `cxxxr/jsonrpc` の request validation と Yason の配列表現の不整合だった。

## 環境

- Lem: `takashit16833/lem`
- Lua Language Server: 3.19.1
- `cxxxr/jsonrpc`: `42fa96ec34f6b6be77a6f12f7c4e84f375eff019`
- macOS
- ncurses frontend

Lem の `qlfile.lock` でも、この時点の `cxxxr/jsonrpc` の master HEAD と同じ commit が使われていた。

## 症状

Lua ファイルを開くと、LSP の起動直後に

```text
JSONRPC/ERRORS:JSONRPC-INVALID-REQUEST
```

が発生した。

エラーは LSP の reading thread で発生し、SBCL の debugger 出力が ncurses 画面へ流れ込むため表示も崩れた。

スクロールして再描画すると画面だけは戻るが、LSP の reader は正常に処理を継続できていなかった。

## 原因

Lua Language Server は起動直後に次の notification を送る。

```json
{"jsonrpc":"2.0","method":"$/hello","params":["world"]}
```

Lem の LSP 実装では Yason に対して次の設定を使っている。

```lisp
(yason:*parse-json-arrays-as-vectors* . t)
(jsonrpc/yason:*parse-json-arrays-as-vectors* . t)
```

そのため JSON の

```json
["world"]
```

は Lisp の list ではなく vector として

```lisp
#("world")
```

に変換される。

一方、`cxxxr/jsonrpc` の `valid-request-p` は JSON-RPC 2.0 の `params` を次の型だけ許可していた。

```lisp
(typep (gethash "params" request)
       '(or hash-table list string))
```

このため vector になった正しい JSON Array が reject され、`jsonrpc-invalid-request` が発生していた。

### 最小再現

通常の設定では通る。

```lisp
(jsonrpc:parse-message
 "{\"jsonrpc\":\"2.0\",\"method\":\"$/hello\",\"params\":[\"world\"]}")
```

しかし vector parsing を有効にすると失敗した。

```lisp
(let ((jsonrpc/yason:*parse-json-arrays-as-vectors* t))
  (jsonrpc:parse-message
   "{\"jsonrpc\":\"2.0\",\"method\":\"$/hello\",\"params\":[\"world\"]}"))
```

修正前:

```text
JSONRPC/ERRORS:JSONRPC-INVALID-REQUEST
```

## 修正

`valid-request-p` の `params` 型を次のように変更した。

```lisp
;; before
'(or hash-table list string)

;; after
'(or hash-table list vector)
```

Common Lisp の string は vector の一種なので、既存の string 許容も維持される。

また、Yason の通常設定で JSON Array が list になるケースもあるため、`list` はそのまま残している。

JSON-RPC 2.0 の `params` は Structured value、つまり Array または Object なので、JSON Array を vector として parse する設定でも受理できる必要がある。

## 修正後の確認

最小再現では、同じ入力が正常に request として parse できた。

```text
OK: #S(JSONRPC/REQUEST-RESPONSE:REQUEST
       :VERSION 2.0
       :METHOD "$/hello"
       :PARAMS #("world")
       :ID NIL)
```

さらに Lem + Lua Language Server の実環境でも確認した。

確認できたもの:

- `initialize`
- `initialized`
- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/publishDiagnostics`
- `textDocument/completion`

補完では `string.` に対して `byte`, `char`, `find`, `gsub` などの候補が表示された。

diagnostics でも LuaLS から

```text
<exp> expected.
Unused local `x`.
```

などが返ることを確認した。

画面崩れも発生しなくなった。

## upstream PR

`cxxxr/jsonrpc` に修正と回帰テストを送った。

- PR: https://github.com/cxxxr/jsonrpc/pull/45
- branch: `takashit16833:fix/vector-request-params`
- commit: `d22504d9b3abaabca3941fac97b00230ce8b624d`

変更は意図的に小さくしている。

- `valid-request-p` で vector を許可
- `*parse-json-arrays-as-vectors*` を有効にした回帰テストを追加

reading thread の error handling など、別の問題はこの PR に混ぜていない。

## 関連して見つかった別問題

### 1. JSON-RPC reading thread の error containment

`cxxxr/jsonrpc` の generic な reading loop には、`receive-message-using-transport` から上がる `jsonrpc-error` を抑える handler がない。

そのため invalid request などが発生すると reader thread から condition が外へ抜け、SBCL debugger が起動する。

WebSocket transport 側には parse error を握る処理があるため、挙動が揃っていない。

これは vector validation とは別問題なので、必要なら別 issue / PR とする。

### 2. Lem の LSP root 探索

Lua の LSP spec は root marker に `".git"` を使っている。

現在の root 探索は marker 判定に

```lisp
(search pattern file)
```

を使っているため、`.git` が `.gitconfig` などにも部分一致する。

実際、`~/.config/wezterm-local/local.lua` を開いたとき `rootUri` が

```text
file:///Users/suzukitakashi/
```

になっていた。

一方、ホーム配下に隔離したテストディレクトリへ明示的に `.git` を置くと

```text
file:///Users/suzukitakashi/lem-lua-test/
```

が root になり、diagnostics と completion が正常に動作した。

また `find-root-directory-1` の再帰停止条件が user home を前提にしているため、`/tmp` のような home 外のパスから探索すると root で止まらず再帰し続ける可能性がある。

これは JSON-RPC の問題とは別に Lem 側で修正候補として扱う。

## 今回の切り分けで分かったこと

今回の問題は一見すると ncurses、PTY、stderr 混入、LSP framing などにも見えたが、LuaLS の raw stdout を確認すると出力自体は正常だった。

最終的には、

```text
LuaLS
  ↓
$/hello params = JSON Array
  ↓
Lem の Yason 設定で vector に変換
  ↓
cxxxr/jsonrpc の valid-request-p が vector を reject
  ↓
JSONRPC-INVALID-REQUEST
  ↓
reader thread から condition が外へ出る
  ↓
SBCL debugger が ncurses 画面を崩す
```

という流れだった。

低レイヤーの問題に見えても、raw I/O、parser、validator、LSP initialization を順に分けて確認すると切り分けやすい。
