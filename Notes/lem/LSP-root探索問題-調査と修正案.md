# Lem LSP root 探索問題 - 調査結果と修正案

## このノートの位置づけ

Lem の LSP root 探索で確認された不具合について、現行コード、ユーザー環境での実測、追加レビュー結果を統合した調査・設計ノート。

2026-10-04 の初版を、`LSP-root探索問題-修正案レビュー.md` の指摘を反映して改訂した。

このノートでは以下を明確に分ける。

- ユーザー環境で実測済みの事実
- 現行ソースから確認できる事実
- 修正案
- 修正時に維持すべき互換性
- テスト要件
- 未検証事項

このノートの初回改訂時点では Lem 本体への修正は未着手だったが、その後 PR 1（filesystem root で探索を停止する修正）と PR 2（string root marker の判定修正）の両方を実装・push・実機確認・PR 作成まで完了した。現在は upstream review 待ち。

---

# 対象

Lem fork:

```text
https://github.com/takashit16833/lem
```

ユーザー調査時に確認した fork main:

```text
27572e42923a99d1dee0be8b991e0bfd2113b24d
```

レビュー時点の upstream main:

```text
da26ca8443a17b9e681f191491c453dbf24e3dd9
```

レビュー時点では upstream が fork main より 1 commit 先に進んでいた。

差分は今回の root 探索とは無関係な ncurses terminal color palette 修正であり、以下の関連部分は fork と upstream で同じだった。

- `src/ext/language-mode.lisp`
- LSP language spec
- workspace 管理
- test 定義

ただし実装開始時には upstream を再取得し、最新 `main` から branch を作ること。

主な確認対象:

```text
src/ext/language-mode.lisp
src/buffer/file-utils.lisp
src/commands/project.lisp
extensions/lsp-mode/lsp-mode.lisp
extensions/lsp-mode/spec.lisp
extensions/lua-mode/lsp-config.lisp
extensions/clojure-mode/lsp-config.lisp
extensions/typst-mode/lsp-config.lisp
extensions/python-mode/lsp-config.lisp
extensions/go-mode/lsp-config.lisp
extensions/js-mode/lsp-config.lisp
extensions/dockerfile-mode/lsp-config.lisp
extensions/lisp-mode/lisp-mode.lisp
extensions/lisp-mode/v2/lsp-config.lisp
extensions/lisp-mode/lem-lisp-mode.asd
extensions/lisp-mode/ext/package-inferred-system.lisp
extensions/wat-mode/lsp-config.lisp
extensions/tramp/tramp.lisp
lem-tests.asd
tests/legit.lisp
tests/lsp-mode/test-utils.lisp
```

関連する JSON-RPC validation 問題は別件として解決済み。

```text
Notes/lem/LSP-JSONRPC-invalid-request調査.md
```

今回の root 探索問題はその問題とは独立している。

---

# 結論

現行 LSP root 探索には少なくとも 2 件の独立した不具合がある。

## 不具合 1: HOME に到達しない探索経路で filesystem root から先へ停止できない

`find-root-directory-1` の停止条件は HOME だけである。

HOME に到達しない ancestor 探索で marker が見つからない場合、POSIX root では parent が自分自身になるため通常の経路で停止できない。

ユーザー環境では、

```text
/tmp/
→ /
→ /
→ /
...
```

を実測した。

正確には「HOME 外なら必ず無限再帰する」ではない。

途中に marker があれば停止するし、filesystem I/O のエラー等で別の終了をする可能性もある。

不具合の本質は、

> HOME に到達しない経路で marker が見つからない場合、filesystem root で探索を正常終了する条件がない

こと。

## 不具合 2: string root marker の判定方法が不適切

現行実装は candidate directory を列挙し、各 pathname の `file-namestring` に対して string pattern を `search` する。

このため以下が起きる。

1. 普通の Git repository の `.git/` directory を検出できない
2. `.gitconfig` 等を `".git"` と誤認する
3. `package.json.bak` 等を `"package.json"` と誤認し得る
4. `".lsp/config.edn"` のような nested relative path を表現できない

さらに、string pattern の意味を「具体的な相対 path」へ変更する場合、現在 repository 内で利用されている `".asd"` の substring semantics を移行する必要がある。

---

# 現行実装

`src/ext/language-mode.lisp`:

```lisp
(defun match-pattern-p (pattern file)
  (etypecase pattern
    (function (funcall pattern file))
    (string (search pattern file))))

(defun find-root-directory-1 (directory patterns)
  (labels ((matchp (directory)
             (dolist (pathname (list-directory directory))
               (dolist (pattern patterns)
                 (when (match-pattern-p pattern (file-namestring pathname))
                   (return-from matchp t)))))
           (recursive (directory)
             (cond ((matchp directory) directory)
                   ((uiop:pathname-equal directory (user-homedir-pathname)) nil)
                   (t (recursive (uiop:pathname-parent-directory-pathname directory))))))
    (recursive directory)))

(defun find-root-directory (directory root-uri-patterns)
  (or (find-root-directory-1 directory
                             (or root-uri-patterns
                                 (list (lambda (name) (string= name ".git")))))
      directory))
```

重要な性質:

- string pattern は substring 検索
- function pattern は直下 entry の `file-namestring` を受け取る
- directory pathname の `file-namestring` は空文字になり得る
- patterns が NIL の場合の default `.git` も function callback 経由なので directory `.git/` を検出できない
- candidate ごとに `list-directory` を 1 回行い、entry → pattern の順に評価する
- marker が見つからなければ HOME まで上る
- filesystem root の停止条件はない
- `find-root-directory-1` が NIL なら外側の `find-root-directory` は開始 directory へ fallback する

---

# LSP との接続

`extensions/lsp-mode/lsp-mode.lisp` の `compute-root-uri` は、spec の `root-uri-patterns` を `lem/language-mode:find-root-directory` へ渡す。

したがって root finder の結果が LSP initialize の root URI に使われる。

ただし workspace の再利用に注意する。

現行は概略として:

1. language-id に対応する既存 workspace を探す
2. 既存 workspace があれば再利用する
3. なければ server を起動
4. `make-workspace`
5. `compute-root-uri`
6. initialize

つまり、root finder を修正・再定義した後でも、既存の同言語 workspace が残っていれば root URI が再計算されない場合がある。

実機確認は **修正版の新しい Lem プロセスで、その言語のファイルを最初に開く** こと。

`lsp-restart-server` だけで必ず新しい root 計算になるとは現行ソースから保証できない。

これは今回の root finder 修正とは別の workspace 管理上の問題であり、今回の PR へ混ぜない。

---

# ユーザー環境での実測

## 1. `.git` が普通の file の場合

最初のテストでは `.git` は空 file だった。

```text
-rw-r--r-- ... /Users/.../lem-lua-test/.git
/Users/.../lem-lua-test/.git: empty
```

Lem から見ると:

```lisp
(("/Users/.../lem-lua-test/.git" NIL ".git")
 ("/Users/.../lem-lua-test/test.lua" NIL "test.lua"))
```

この場合 `file-namestring` は `".git"` なので現行実装でも一致する。

前回この fixture で root が正しく見えたのはこれで説明できる。

## 2. 普通の `.git/` directory

`git init` した通常 repository:

```text
/Users/.../lem-lua-git-test.Wrylg0/.git/
```

Lem REPL:

```lisp
(("/Users/.../lem-lua-git-test.Wrylg0/.git/" T ""))
```

つまり:

```lisp
(uiop:directory-pathname-p p)
;; => T

(file-namestring p)
;; => ""
```

よって現行コードは `.git/` 自体を `".git"` marker として検出できない。

## 3. HOME 誤認

通常 Git repository に対して:

```lisp
(lem/language-mode:find-root-directory
 #P"/Users/.../lem-lua-git-test.Wrylg0/"
 '(".git"))
```

結果:

```lisp
#P"/Users/.../"
```

HOME 内で `".git"` に substring match するもの:

```lisp
(#P"/Users/.../.gitconfig"
 #P"/Users/.../.gitconfig.local")
```

したがって今回の Lua root 誤判定経路は実測で確定している。

```text
project/.git/
  ↓
file-namestring => ""
  ↓
".git" を見逃す
  ↓
HOME へ上る
  ↓
.gitconfig / .gitconfig.local
  ↓
(search ".git" ...) が成立
  ↓
HOME を root と誤認
```

## 4. filesystem root の parent

```lisp
(loop
  repeat 5
  for directory = #P"/tmp/"
    then (uiop:pathname-parent-directory-pathname directory)
  collect directory)
```

結果:

```lisp
(#P"/tmp/" #P"/" #P"/" #P"/" #P"/")
```

さらに:

```lisp
(uiop:pathname-equal
 #P"/"
 (uiop:pathname-parent-directory-pathname #P"/"))
;; => T
```

以前 `/tmp/lem-lua-test` で Lem が固まり、LuaLS 側では `$/hello` 後に initialize が来なかった現象はこの問題と整合する。

ただし当時 debugger/backtrace で root finder 内停止を直接捕捉したわけではないため、そのログ単独で停止箇所を証明したとは書かない。

---

# 他言語・既存利用者

## Lua

```lisp
:root-uri-patterns '(".git")
```

今回の主要再現対象。

## Typst

```lisp
:root-uri-patterns '("typst.toml" ".git")
```

candidate directory は近いものから順に評価される。

`typst.toml` が patterns の前にあるから ancestor 間でも優先される、という意味ではない。

例えば子に `.git`、親に `typst.toml` があれば、最も近い子 candidate が選ばれ得る。

## Dockerfile / JavaScript / Python / Go

以下のような exact marker 名を substring で評価している。

```text
Dockerfile
package.json
tsconfig.json
pyproject.toml
go.mod
```

そのため `.bak`, `.old` 等を含む別名に誤一致し得る。

## Clojure

```lisp
:root-uri-patterns
'("deps.edn"
  "project.clj"
  "build.boot"
  "shadow-cljs.edn"
  ".lsp/config.edn")
```

`".lsp/config.edn"` は現行の直下 entry の `file-namestring` 方式では扱えない。

## Lisp v2 — 重要な互換性対象

`extensions/lisp-mode/v2/lsp-config.lisp`:

```lisp
:root-uri-patterns '(".asd")
```

この system は標準 `lem` system の通常依存ではないが、reader で無効化されておらず、`lem-lisp-mode/v2` をロードすれば有効になる。

現行の substring semantics では:

```text
sample.asd
```

に `".asd"` が一致する。

string marker を「具体的な relative path」と変更すると:

```text
project/.asd
```

という literal path しか探さなくなり、`sample.asd` を見つけられない。

したがって PR 2 では Lisp v2 の利用者を必ず移行する。

最小の互換移行は function pattern を使うこと。

旧挙動をそのまま維持するなら概念的に:

```lisp
:root-uri-patterns
(list (lambda (name)
        (search ".asd" name)))
```

ただしこれだと `sample.asd.bak` も従来通り一致する。

`.asd` suffix のみに正確化するなら別の挙動変更なので、その変更を同時に行う場合は明示・テストする。

今回の root marker 契約変更だけを目的とするなら、まず旧 semantics の移行を優先する。

通常の `extensions/lisp-mode/lisp-mode.lisp` にも editor variable として:

```lisp
(setf (variable-value 'root-uri-patterns) '(".asd"))
```

が残っている。

現行 `compute-root-uri` は spec slot を読むため、この editor variable が現在の LSP root finder へ直接渡される経路は確認できていない。

ただし残存設定として記録し、PR 2 で共通契約を整理する際に扱いを判断する。

## WAT

無効コード内に:

```lisp
'("*.wat" "*.wast")
```

があるが、reader condition により現行 spec として登録されない。

これを理由に glob support を PR 2 へ追加しない。

---

# 修正案 1: filesystem root で停止する

## 方針

既存の HOME stop と match-first の順序を維持し、filesystem root 判定を追加する。

Lem 内には既に同じ判定方式がある。

`extensions/lisp-mode/ext/package-inferred-system.lisp`:

```lisp
(defun root-directory-p (directory)
  (uiop:pathname-equal
   (uiop:pathname-parent-directory-pathname directory)
   directory))
```

概念:

```lisp
(defun filesystem-root-p (directory)
  (uiop:pathname-equal
   directory
   (uiop:pathname-parent-directory-pathname directory)))
```

探索順:

```text
1. current candidate に marker があるか
2. HOME なら停止
3. parent == current なら filesystem root として停止
4. parent へ
```

match を stop condition より先にする現行順序を維持する。

したがって HOME 自身や filesystem root 自身に marker がある場合はその candidate を採用できる。

marker が見つからず `find-root-directory-1` が NIL なら、外側の `find-root-directory` が開始 directory へ fallback する既存仕様も維持する。

## PR 1 の scope

含める:

- filesystem root 判定
- `find-root-directory-1` の停止条件
- 公開 `find-root-directory` を通る回帰テスト

含めない:

- string pattern semantics
- default `.git` の変更
- workspace 管理
- project finder 統合

branch:

```text
fix/language-mode-root-recursion
```

## PR 1 実装状況

実装・push・PR 作成まで完了。

branch:

```text
fix/language-mode-root-recursion
```

commit:

```text
9ccb930426463f011365c09cf0b166dbfb1715e9
fix: stop language-mode root search at filesystem root
```

upstream PR:

```text
https://github.com/lem-project/lem/pull/2334
```

変更は 1 commit / 3 files。

```text
src/ext/language-mode.lisp
tests/language-mode.lisp
lem-tests.asd
```

### 実装内容

`src/ext/language-mode.lisp` に filesystem root 判定を追加した。

```lisp
(defun filesystem-root-p (directory)
  (uiop:pathname-equal
   directory
   (uiop:pathname-parent-directory-pathname directory)))
```

`find-root-directory-1` の停止条件は次の順序。

```text
1. marker match
2. HOME stop
3. filesystem root stop
4. parent へ再帰
```

既存の match-first、HOME stop、pattern semantics、fallback は変更していない。

### 回帰テスト

`tests/language-mode.lisp` を追加し、`lem-tests.asd` に登録した。

テストは公開 API:

```lisp
lem/language-mode:find-root-directory
```

を直接通す。

旧実装でも test suite 自体が永久に固まらないよう、filesystem root の entry 数を利用して「2回目の root 走査」に入った場合だけ callback が true になる構成にした。

これにより修正前は有限時間で失敗し、修正後は root を 1 回だけ走査して終了する。

また、filesystem root 自身に marker がある場合は stop より marker 判定が優先されることもテストしている。

### 実機確認

macOS 上の Lem REPL で確認。

```lisp
(lem/language-mode:find-root-directory
 #P"/tmp/"
 (list (lambda (name)
         (declare (ignore name))
         nil)))
```

結果:

```lisp
#P"/tmp/"
```

修正前に問題になっていた HOME 外・marker なしの探索が、filesystem root で正常終了して開始 directory へ fallback することを確認した。

### テスト実行状況

`make test` は以下の順で進む。

```text
lem-tests
lem-vi-mode
lem-transient
lem-sdl2/tests
```

ローカル実行では `lem-transient` まで成功し、その後の `lem-sdl2/tests` 付近で従来から停止するため、全 `make test` の完走は確認できていない。

今回追加した regression test を含む `lem-tests` は、それより前段で実行されている。

したがって PR 本文では、

- 今回の regression test / core test は通過
- full `make test` は SDL2 後段の別件で完走未確認

を分けて記載した。

この SDL2 停止問題は今回の PR には含めない。

---

# 修正案 2: string marker の契約を「具体的な relative path」にする

## PR 2 実装状況

実装・push・実機確認・PR 作成まで完了。

branch:

```text
fix/language-mode-root-patterns
```

commit:

```text
f4a946cdaecc6f3cbe95a66fa836220e8b426e6b
fix: match language root strings as relative paths
```

upstream PR:

```text
https://github.com/lem-project/lem/pull/2335
```

PR 2 は PR 1 branch から派生させず、同じ最新 `main`
`da26ca8443a17b9e681f191491c453dbf24e3dd9`
から独立して作成した。PR 1（#2334）への依存はない。

変更は 1 commit / 6 files。

```text
src/ext/language-mode.lisp
tests/language-mode.lisp
lem-tests.asd
extensions/lisp-mode/internal-package.lisp
extensions/lisp-mode/lisp-mode.lisp
extensions/lisp-mode/v2/lsp-config.lisp
```

### 実装内容

string pattern は direct entry の `file-namestring` に対する substring 検索ではなく、candidate directory 配下の具体的な relative path として判定するよう変更した。

概略:

```lisp
(uiop:probe-file*
 (uiop:subpathname directory pattern))
```

これにより以下を扱える。

```text
.git
.git/
package.json
.lsp/config.edn
```

一方で、次のような substring 誤一致は発生しない。

```text
.gitconfig        ; ".git" では match しない
package.json.bak ; "package.json" では match しない
```

default marker も従来の function callback から string `".git"` へ移し、通常の `.git/` directory を検出できるようにした。

function pattern は既存契約を維持し、candidate directory の直下 entry の `file-namestring` を callback へ渡す。

string marker の契約外入力は明示的に拒否する。

```text
空文字
.
.. を含む path component
absolute path
* / ? を含む wildcard pattern
```

trailing slash を伴う directory marker（例: `".git/"`）は許可する。

### Lisp `.asd` 互換

string marker の semantics を literal relative path に変更すると、従来の:

```lisp
:root-uri-patterns '(".asd")
```

が `sample.asd` を見つけられなくなる。

そのため旧 `search ".asd"` semantics を明示的な predicate:

```lisp
lem-lisp-mode:asdf-root-file-p
```

へ移し、通常 Lisp mode と `lem-lisp-mode/v2` の両方で利用するよう変更した。

既存 semantics を維持するため、`sample.asd.bak` も従来どおり match する。この suffix 厳格化は今回の scope には含めていない。

### 自動テスト

`tests/language-mode.lisp` を追加し、`lem-tests.asd` に登録した。

ローカル実行結果:

```text
✓ 48 tests completed

Summary:
  All 48 tests passed.
```

末尾に `frontends/fake-interface/fake-interface.lisp` の既存 STYLE-WARNING:

```text
undefined function: LEM-CORE:SCREEN-VIEW
undefined function: LEM-CORE:WINDOW-SCREEN
```

が出るが、test result は `All 48 tests passed.` であり、今回の変更ファイルとも無関係。

PR 2 の regression test では主に以下を確認している。

- `.git/` directory
- `.git` file
- `.gitconfig` の誤一致防止
- `package.json.bak` の誤一致防止
- `.lsp/config.edn` nested marker
- default `.git`
- nearest ancestor
- same candidate の複数 marker
- fallback 維持
- directory string input
- string + function pattern 混在
- function callback の `file-namestring` 契約
- invalid string pattern rejection
- Lisp `.asd` 互換

PR 2 は PR 1 を含まないため、test fixture は HOME 配下や上位 sentinel を利用し、修正前コードでも無制限に filesystem root へ進まない構成にした。

### REPL 実機確認

macOS 上の Lem REPL で以下を確認した。

#### 普通の `.git/` directory

```lisp
#P"/Users/suzukitakashi/lem-root-pattern-test/git-project/"
```

#### `.gitconfig` の誤一致防止

child directory に `.gitconfig`、上位に正しい `.git` marker を置いた状態で:

```lisp
#P"/Users/suzukitakashi/lem-root-pattern-test/"
```

を返した。

#### nested `.lsp/config.edn`

```lisp
#P"/Users/suzukitakashi/lem-root-pattern-test/nested/"
```

を返した。

### LuaLS 実機確認

新しい Lem プロセスで通常の `git init` repository を開き、実際の LuaLS workspace root URI を確認した。

```lisp
(lem-lsp-mode::workspace-root-uri
 (lem-lsp-mode::find-workspace "lua"))
```

結果:

```lisp
"file:///Users/suzukitakashi/lem-lua-lsp-test/"
```

修正前に発生していた HOME 誤認ではなく、Git repository 自身が LSP root として選ばれることを確認した。

## 正式な方向性

string pattern は:

> candidate directory からの、特定の相対 path を表す。

substring、正規表現、glob ではない。

例:

```text
".git"
"package.json"
".lsp/config.edn"
```

はそれぞれ:

```text
candidate/.git
candidate/package.json
candidate/.lsp/config.edn
```

の存在を調べる。

file / directory のどちらでも存在すれば match とする。

language spec 内の separator は `/` を使う。

候補 API:

```lisp
(uiop:probe-file*
 (uiop:subpathname directory pattern))
```

この方向性は UIOP の用途と整合する。

## UIOP で注意する点

`probe-file*` の NIL は「存在しない」だけでなく、内部の `ignore-errors` により「存在確認に失敗した」を含み得る。

一方 `subpathname` は先に評価されるので、不正な relative path 等の parse error は `probe-file*` の `ignore-errors` の外に出る。

したがって:

- probe が NIL → この marker では candidate を採用しない
- marker の形式が契約外 → 設定エラーとして扱う方向
- function callback のエラー → 広い `ignore-errors` で隠さない

と分ける。

permission error の詳細表示まで今回の PR に追加する必要はない。

## string marker に許す path

単に「relative path」とだけ定義すると以下が問題になる。

```text
""
"."
"../sentinel"
"/absolute"
```

レビュー実験では:

- `""` は base directory 自体
- `"."` も実質 base 自身
- `"../sentinel"` は candidate 外の parent を参照可能
- absolute path は `subpathname` でエラー

となる。

root marker としては candidate 内の具体的 path を指す必要があるため、PR 2 実装前に最低限次を仕様化する。

推奨:

- 空文字は禁止
- candidate 自身だけを示す `.` は禁止
- absolute path は禁止
- parent traversal `..` は禁止
- string は candidate 配下を指す具体的 relative path
- glob / regex semantics はない

入力検証を `match-pattern-p` 周辺で行うか、spec 定義時に行うかは実装前に決める。

大規模な validation framework は不要。

## default `.git`

現行 default:

```lisp
(list (lambda (name)
        (string= name ".git")))
```

は `.git/` directory を検出できない。

PR 2 では string marker 経路へ合わせる。

概念:

```lisp
(or root-uri-patterns
    '(".git"))
```

これを忘れると explicit `(".git")` は直っても default path は壊れたままになる。

## function pattern

function pattern は既存の引数契約を維持する。

> 直下 entry の `file-namestring` を callback へ渡す。

directory entry では空文字が渡ることも含む。

ただし「完全互換」とは言わない。

実装方式を変えると callback の:

- 呼び出し順
- 呼び出し回数
- 短絡停止位置

が変わり得る。

副作用を持つ callback まで完全互換にすることは保証しない。

最低限、

- 引数の型・内容
- 純粋な predicate としての OR semantics

を維持する。

また string と function を別経路にすることで、function pattern ごとに `list-directory` を繰り返すような不要 I/O は導入しない。

function pattern が 1 つ以上ある candidate では directory entries を 1 回だけ列挙し、必要な callback で再利用する設計を優先する。

---

# virtual filesystem / TRAMP

現行 `list-directory` は UIOP の local directory 列挙を使いつつ、entry の存在確認には Lem の virtual probe の仕組みも関係する。

一方、提案の `uiop:probe-file*` は Lem の virtual handler を経由しない。

ただし現行 root finder 自体が完全な remote filesystem abstraction 上にあるわけではなく、LSP の URI も file URI 前提の部分がある。

そのため:

> 現在 TRAMP LSP root が正常に動いており、新案で壊れる

とまでは実証されていない。

今回の PR 2 は local filesystem の root marker 修正として scope を明確にする。

単純に `virtual-probe-file` へ置き換えれば解決するとも断定しない。remote file / directory の判定方法は別設計として扱う。

---

# project finder との関係

`src/commands/project.lisp` は file marker と directory marker を分けているため参考にはなる。

ただし:

- HOME / root の扱い
- marker 検査順
- path 表現
- file / directory semantics

が LSP finder と異なる。

今回統合しない。

---

# テスト配置

候補:

```text
tests/language-mode.lisp
```

を新設し、`lem-tests.asd` に登録する。

LSP server を起動する integration test ではなく、まず公開:

```lisp
lem/language-mode:find-root-directory
```

を直接通す filesystem regression test にする。

`tests/legit.lisp` の temporary directory + `unwind-protect` + cleanup の考え方は参考にするが、その helper をそのままコピーしない。

root finder test では Git subprocess は不要。

空の file / directory を直接 fixture に作れば十分。

一時 directory 名は衝突しない方式にし、作成した fixture だけを cleanup する。

---

# PR 1 のテスト要件

helper 単体テストだけでは不十分。

root helper を正しく実装しても `find-root-directory` から呼び忘れれば regression を検出できないため、公開関数を実際に呼ぶ。

また修正前コードは停止しないので、テスト自体に実行上限が必要。

候補:

- SBCL timeout を使う
- 別プロセスにして親側 timeout
- テスト用に directory 列挙を制御して candidate visit budget を設ける

本番 API に test 専用の上限値は追加しない。

必須ケース:

| 条件 | 期待 |
|---|---|
| HOME に届かない absolute path、全候補不一致 | 終了し開始 directory へ fallback |
| filesystem root 自身、全候補不一致 | 終了し開始 root を返す |
| filesystem root 自身に match | root を採用 |
| HOME 自身に match | HOME を採用 |
| HOME 自身に不一致 | fallback |
| HOME の子に不一致、HOME より上だけに match | HOME で止まり開始へ fallback |

修正前にも suite 全体を hang させず、有限時間で失敗すること。

---

# PR 2 のテスト要件

PR 2 は PR 1 未マージの最新 main から独立 branch にする予定。

そのため、修正前・部分 regression 時にも fixture 外へ無制限に探索しないように設計する。

単に「上位に `.git/` directory を置く」だけでは、directory marker 検出が壊れた実装では止まらない。

修正前でも確実に認識できる **file 型 sentinel** や function callback を上位に用意する。

また開始 directory と期待 root は必ず分ける。

例えば `project/.git/` の検出試験は:

```text
fixture/
├── .git          ; 修正前も検出できる停止用 file
└── project/
    ├── .git/     ; 本当に検証したい marker
    └── src/      ; start
```

期待:

```text
project/
```

修正前:

```text
fixture/
```

となり、fallback と marker 検出を混同しない。

必須ケース:

| 条件 | 期待 |
|---|---|
| project/.git/、start project/src/ | project/ |
| project/.git file、start project/src/ | project/ |
| child/.gitconfig、上位に正しい停止 marker | child を誤認せず上位 |
| child/package.json.bak、上位 package.json | child を誤認せず上位 |
| project/.lsp/config.edn、start project/src/ | project/ |
| NIL patterns、project/.git/、start project/src/ | project/ |
| 複数 ancestor に marker | 最も近い candidate |
| string + function 混在 | どちらか成立した最も近い candidate |
| callback に通常 file 名と directory の空文字 | 既存引数契約 |
| Lisp v2 相当、sample.asd | 移行後も project/ |
| 同じ candidate に複数 marker | candidate 自体を返す |

特に default `.git` テストでは:

- start を project root 自身にしない
- 期待値と fallback を同じにしない
- 上位に修正前でも止まれる sentinel を置く

こと。

---

# Lisp v2 の移行テスト

PR 2 の string semantics 変更を入れる場合、`.asd` 互換を必須テストにする。

fixture:

```text
fixture/
└── project/
    ├── sample.asd
    └── src/
```

Lisp v2 の移行後 pattern で `src/` から探索し、`project/` を返すこと。

PR 2 では:

- default `.git` の変更を戻すと該当 test が失敗する
- Lisp v2 migration を外すと `.asd` test が失敗する

ことも確認する。

---

# LSP 接続確認

core unit test に加え、必要なら `compute-root-uri` を実 buffer + spec で 1 ケース確認する。

既存 mock workspace helper は root URI を固定して workspace を作るため、root finder の計算を自動的にはカバーしない。

LuaLS を unit test に持ち込む必要はない。

実機受け入れ確認では **新しい Lem プロセス**を使う。

確認対象:

- HOME 内の普通の Git repository
- HOME 外
- marker なし
- LuaLS initialize の rootUri
- diagnostics
- completion

JSON-RPC vector params 問題とは切り分けて記録する。

---

# PR 分割

## PR 1 — filesystem root 終端

候補 branch:

```text
fix/language-mode-root-recursion
```

目的:

> HOME に到達しない LSP root 探索でも filesystem root で正常終了できるようにする。

## PR 2 — string marker の正確な relative path 判定

候補 branch:

```text
fix/language-mode-root-patterns
```

含める:

- string marker の relative path semantics
- `.git/` / `.git file`
- substring 誤認防止
- nested relative path
- default `.git`
- function callback 引数契約維持
- 不要な繰り返し directory 列挙の回避
- Lisp v2 `.asd` 利用者の移行
- docstring / 契約の明文化
- regression tests

含めない:

- glob support
- URI encoding 全般
- canonicalize / truename 全面導入
- project finder 統合
- multi-project workspace
- remote LSP / TRAMP の全面対応

両 PR は最新 `main` から独立して作る。

PR 2 の test fixture 自体を有限終了にすれば、PR 1 branch から派生させる必要はない。

---

# 概念コード

以下は方向性説明用であり、そのまま実装する最終コードではない。

特に marker validation、function callback の列挙順、I/O 回数は実装前に詰める。

```lisp
(defun filesystem-root-p (directory)
  (uiop:pathname-equal
   directory
   (uiop:pathname-parent-directory-pathname directory)))

(defun string-root-marker-p (directory pattern)
  ;; 実装時には pattern の契約検証を入れる。
  (uiop:probe-file*
   (uiop:subpathname directory pattern)))

(defun find-root-directory (directory root-uri-patterns)
  ;; default は function ではなく string ".git" へ移行する。
  ...)
```

function pattern は従来どおり直下 entry の `file-namestring` を受け取る。

ただし candidate ごとの directory 列挙は可能な限り 1 回にする。

---

# 既存挙動の扱い

## 意図的に変える

```text
.gitconfig
package.json.bak
```

のような「marker 名を含むだけ」の path を marker として扱わなくする。

普通の `.git/` directory を正しく扱う。

nested path marker を扱う。

HOME に到達しない探索でも filesystem root で終わる。

## 維持する

最も近い matching ancestor を返す。

HOME stop を残す。

match → stop の順序を残す。

marker が見つからなければ開始 directory へ fallback。

function callback へ直下 entry の `file-namestring` を渡す。

`.git` が file のケースも root marker とする。

Lisp v2 の `.asd` root 探索を移行後も成立させる。

---

# 未検証・断定しない事項

以下はまだ未検証、または今回の scope 外。

- CI 相当の全環境
- Windows pathname
- symlink を含む project
- permission error
- virtual filesystem / TRAMP
- 実際にロードされている全環境の UIOP version 差異
- workspace 再利用問題そのものの修正

一方、macOS 実機では PR 1 / PR 2 の root finder、PR 2 の `.git/`・誤一致防止・nested marker、および実 LuaLS の root URI まで確認済み。

`probe-file*` の NIL を「確実に不存在」とは表現しない。

filesystem root stop を入れても、filesystem I/O error や symlink 等を含む全 path で必ず安全になるとは断定しない。

---

# local への統合

upstream review を待つ間も日常利用できるよう、PR 1 / PR 2 の両 branch を `local` へ統合した。

merge commits:

```text
5a471e3b Merge branch 'fix/language-mode-root-recursion' into local
ba6167e1 Merge branch 'fix/language-mode-root-patterns' into local
```

両 PR は引き続き独立したままで、PR branch 同士は依存していない。未マージ修正を組み合わせて使う責務は `local` のみに持たせている。

`tests/language-mode.lisp` は両 PR が新規追加していたため add/add conflict になったが、PR 2 側をベースに PR 1 の filesystem-root 用 helper と 2 test を統合して解消した。

統合後に `lem-tests` を再実行し:

```text
✓ 48 tests completed

Summary:
  All 48 tests passed.
```

を確認した。

現在の運用状態は:

```text
main   = upstream 追従用
PR 1   = upstream #2334 review 待ち
PR 2   = upstream #2335 review 待ち
local  = PR 1 + PR 2 を統合した日常利用 branch
```

upstream への追加操作は不要。レビューコメントや merge が発生した時点で各 PR branch / `main` / `local` を更新する。

---

# 次の作業

PR 1 / PR 2 とも実装・実機確認・PR 作成まで完了。

```text
PR 1: https://github.com/lem-project/lem/pull/2334
PR 2: https://github.com/lem-project/lem/pull/2335
```

現在は両 PR の upstream review / merge 待ち。

merge 後は fork の `main` を upstream `main` へ追従させ、必要に応じて `local` を更新する。

追加の修正要求がレビューで出た場合は、それぞれの PR branch 上で scope を広げすぎないよう対応する。

---

# レビュー反映で訂正した主な点

初版から以下を訂正した。

- 「現行に `.asd` 利用者はない」という扱いを撤回
- `lem-lisp-mode/v2` の `.asd` spec を互換性対象として追加
- upstream と fork の SHA がレビュー時点では同一ではないことを明記
- HOME 外の問題を「常に無限再帰」と過度に一般化しないよう修正
- Typst の pattern 順序を ancestor 優先と誤解し得る表現を修正
- helper 単体ではなく公開 `find-root-directory` を通す停止テストを要求
- PR 2 の各 test が修正前でも有限終了する fixture を要求
- start directory と expected root を分け、fallback で偽陽性にならないよう修正
- workspace 再利用により root URI が再計算されない場合があることを追加
- function callback の「完全互換」ではなく引数契約と predicate semantics の維持に限定
- `probe-file*` の NIL と `subpathname` error の境界を追加
- string marker の空文字、`.`、`..`、absolute path の契約を未定のままにしない方針へ変更
- virtual filesystem / TRAMP は local filesystem 修正とは別 scope と明記
