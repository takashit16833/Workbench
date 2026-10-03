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

このノートの改訂時点では、Lem 本体への修正、commit、push、PR はまだ行っていない。

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

候補 branch:

```text
fix/language-mode-root-recursion
```

---

# 修正案 2: string marker の契約を「具体的な relative path」にする

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

以下はまだ Lem 本体で検証していない。

- 全 Rove suite
- CI 相当
- 修正後の macOS 実機
- Windows pathname
- symlink を含む project
- permission error
- virtual filesystem / TRAMP
- 実際にロードされている UIOP version
- LuaLS の修正後 initialize
- workspace 再利用問題そのものの修正

`probe-file*` の NIL を「確実に不存在」とは表現しない。

filesystem root stop を入れても、filesystem I/O error や symlink 等を含む全 path で必ず安全になるとは断定しない。

---

# 次の作業

1. upstream 最新を fork `main` へ取り込む
2. PR 1 branch を最新 `main` から作る
3. PR 1 の公開関数を通る、停止保証付き regression test を先に作る
4. PR 1 実装
5. Rove / 全体 test
6. PR 2 branch を最新 `main` から独立して作る
7. string marker の契約と validation を実装前に最終決定
8. PR 2 の有限終了する regression tests を作る
9. Lisp v2 `.asd` を移行
10. PR 2 実装
11. 全体 test
12. 新しい Lem プロセスで LuaLS rootUri / diagnostics / completion を確認
13. upstream PR は依頼・判断後に行う

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
