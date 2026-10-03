# Lem LSP root 探索問題 - 調査結果と修正案

## このノートの目的

Lem の LSP root 探索で確認された不具合について、2026-10-04 時点の現行コード、実機での再現結果、原因分析、修正案、テスト方針、PR 分割案を記録する。

このノートは AI による設計レビューを主目的とする。

そのため、

- 実測で確認済みの事実
- 現行コードから論理的に導けること
- 修正案
- まだ実装・検証していないこと

をできるだけ明確に分ける。

このノート作成時点では、Lem 本体への修正、commit、push、PR はまだ行っていない。

---

## 調査対象

Lem fork:

```text
https://github.com/takashit16833/lem
```

調査した `main`:

```text
27572e42923a99d1dee0be8b991e0bfd2113b24d
```

確認時点で fork の `main` は upstream の現行コードと同内容だった。

主な対象ファイル:

```text
src/ext/language-mode.lisp
extensions/lsp-mode/lsp-mode.lisp
extensions/lua-mode/lsp-config.lisp
extensions/clojure-mode/lsp-config.lisp
extensions/typst-mode/lsp-config.lisp
extensions/python-mode/lsp-config.lisp
extensions/go-mode/lsp-config.lisp
extensions/js-mode/lsp-config.lisp
extensions/dockerfile-mode/lsp-config.lisp
src/commands/project.lisp
extensions/lisp-mode/ext/package-inferred-system.lisp
lem-tests.asd
tests/legit.lisp
```

関連する別問題である JSON-RPC validation 問題は別ノートに記録済み。

```text
Notes/lem/LSP-JSONRPC-invalid-request調査.md
```

今回扱う root 探索問題は JSON-RPC 問題とは独立している。

---

## 結論

現行の LSP root 探索には、少なくとも次の 2 件の独立した不具合がある。

### 不具合 1: HOME 外から探索するとファイルシステム root で停止できない

`find-root-directory-1` の再帰停止条件が `user-homedir-pathname` への到達しか考慮していない。

そのため `/tmp` など HOME 配下ではないパスから探索を開始し、途中に root marker が存在しない場合、

```text
/tmp/
  ↓
/
  ↓
/
  ↓
...
```

となり終了しない。

実機で `/tmp/` の親を繰り返し取得すると、`/` の親は `/` 自身になることを確認した。

### 不具合 2: string root marker の判定方法が不適切

現行コードはディレクトリ内を列挙し、各 pathname に対して `file-namestring` を取り、その文字列へ `search` している。

このため同時に次の問題が起きる。

1. 普通の Git repository の `.git/` ディレクトリを検出できない
2. `.gitconfig` や `.gitconfig.local` を `".git"` marker と誤認する
3. `package.json.bak` のような名前も `"package.json"` marker と誤認し得る
4. Clojure の `".lsp/config.edn"` のように階層を含む marker を現在の方式では正しく扱えない

今回の Lua LSP で `rootUri = file:///Users/.../` になった直接の経路は、実測により次のように確定した。

```text
Git repository root
  ↓
.git/ directory を file-namestring すると ""
  ↓
".git" marker に一致しない
  ↓
親へ探索
  ↓
HOME に到達
  ↓
.gitconfig / .gitconfig.local を列挙
  ↓
(search ".git" ".gitconfig") が真
  ↓
HOME を project root と誤認
```

---

# 現行実装

## Lua の language spec

`extensions/lua-mode/lsp-config.lisp`:

```lisp
(define-language-spec (lua-spec lem-lua-mode:lua-mode)
  :language-id "lua"
  ;; I have no idea what a correct file may identify a root of a Lua project
  :root-uri-patterns '(".git")
  :command '("lua-language-server")
  :readme-url "https://github.com/luals/lua-language-server"
  :connection-mode :stdio)
```

Lua では `".git"` のみを root marker にしている。

## LSP から root 探索への接続

`extensions/lsp-mode/lsp-mode.lisp` では、language spec の `root-uri-patterns` を `lem/language-mode:find-root-directory` に渡して root URI を計算している。

概略:

```lisp
(defun compute-root-uri (spec buffer)
  (pathname-to-uri
   (language-mode:find-root-directory
    (buffer-directory buffer)
    (spec-root-uri-patterns spec))))
```

したがって `src/ext/language-mode.lisp` の root 探索結果が、そのまま LSP workspace の root URI に影響する。

## root 探索本体

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

重要な点:

- string pattern は `search` による部分一致
- function pattern は各 entry の `file-namestring` を受け取る
- explicit な `root-uri-patterns` が NIL の場合、function pattern で `.git` を探す
- marker が見つからず `find-root-directory-1` が NIL を返した場合、外側の `find-root-directory` は探索開始時の `directory` を返す
- 再帰停止条件は HOME のみ
- ファイルシステム root の判定はない

---

# 実測 1: `.git` ファイルなら現行実装でも検出できる

最初に作ったテストディレクトリでは `.git` を普通の空ファイルとして作成していた。

shell:

```text
$ ls -ld ~/lem-lua-test/.git
-rw-r--r-- ... /Users/.../lem-lua-test/.git

$ file ~/lem-lua-test/.git
/Users/.../lem-lua-test/.git: empty
```

Lem REPL:

```lisp
(mapcar
 (lambda (p)
   (list
    (namestring p)
    (uiop:directory-pathname-p p)
    (file-namestring p)))
 (lem/buffer/file-utils:list-directory
  #P"/Users/.../lem-lua-test/"))
```

結果:

```lisp
(("/Users/.../lem-lua-test/.git" NIL ".git")
 ("/Users/.../lem-lua-test/test.lua" NIL "test.lua"))
```

この場合、

```lisp
(file-namestring pathname)
;; => ".git"
```

なので、

```lisp
(search ".git" ".git")
```

が成立し、現行コードでも root として検出される。

前回 `~/lem-lua-test` で root が正しくなった理由はこれで説明できる。

これは通常の `git init` が作る `.git/` ディレクトリのケースとは異なる。

---

# 実測 2: 普通の `.git/` ディレクトリは検出できない

通常の Git repository を作成した。

shell:

```sh
testdir="$(mktemp -d "$HOME/lem-lua-git-test.XXXXXX")"
git init "$testdir"
echo "$testdir"
ls -ld "$testdir/.git"
```

結果:

```text
Initialized empty Git repository in /Users/.../lem-lua-git-test.Wrylg0/.git/
/Users/.../lem-lua-git-test.Wrylg0
drwxr-xr-x ... /Users/.../lem-lua-git-test.Wrylg0/.git
```

Lem REPL:

```lisp
(mapcar
 (lambda (p)
   (list
    (namestring p)
    (uiop:directory-pathname-p p)
    (file-namestring p)))
 (lem/buffer/file-utils:list-directory
  #P"/Users/.../lem-lua-git-test.Wrylg0/"))
```

結果:

```lisp
(("/Users/.../lem-lua-git-test.Wrylg0/.git/" T ""))
```

重要なのは、

```lisp
(uiop:directory-pathname-p p)
;; => T

(file-namestring p)
;; => ""
```

であること。

したがって現行処理では、

```lisp
(match-pattern-p ".git" "")
```

相当になり、`.git/` ディレクトリ自体には一致しない。

この結果により、

> 通常の Git repository の `.git/` directory を現行の `file-namestring` ベース探索では検出できない

ことを実測で確認した。

---

# 実測 3: `.git/` を見逃した後、HOME を root と誤認する

同じ通常 Git repository に対して直接 root 探索を実行した。

```lisp
(lem/language-mode:find-root-directory
 #P"/Users/.../lem-lua-git-test.Wrylg0/"
 '(".git"))
```

結果:

```lisp
#P"/Users/.../"
```

期待する結果は、

```lisp
#P"/Users/.../lem-lua-git-test.Wrylg0/"
```

である。

HOME の何に一致しているか確認した。

```lisp
(remove-if-not
 (lambda (p)
   (search ".git" (file-namestring p)))
 (lem/buffer/file-utils:list-directory
  (user-homedir-pathname)))
```

結果:

```lisp
(#P"/Users/.../.gitconfig"
 #P"/Users/.../.gitconfig.local")
```

したがって今回の誤判定経路は推測ではなく実測で確定した。

```text
project/.git/
    │
    │ file-namestring => ""
    │
    └─ marker ".git" に一致しない
          ↓
      parent を探索
          ↓
      HOME
          ↓
      .gitconfig
      .gitconfig.local
          ↓
      search ".git" が一致
          ↓
      HOME を root として返す
```

---

# 実測 4: HOME 外ではファイルシステム root が自己参照する

`/tmp/` から親を 5 回辿った。

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

さらに root の親との比較:

```lisp
(let ((root #P"/"))
  (uiop:pathname-equal
   root
   (uiop:pathname-parent-directory-pathname root)))
```

結果:

```lisp
T
```

したがって HOME 外から marker なしで探索した場合、

```text
/tmp/
  ↓
/
  ↓
/
  ↓
...
```

となる。

現行コードの停止条件は、

```lisp
((uiop:pathname-equal directory (user-homedir-pathname)) nil)
```

しかないため、`/` では停止できない。

実際に `/tmp/lem-lua-test` で Lua ファイルを開いた際、Lem が固まり、LuaLS 側ログは `$/hello` までで Lem から `initialize` が来なかった。

この症状は上記無限再帰と整合する。

今回、Lem を再度固める直接実験は行わず、親 pathname の遷移を有限回観測することで原因を確認した。

---

# 現行コード内にある類似実装

## ファイルシステム root の判定

`extensions/lisp-mode/ext/package-inferred-system.lisp` には既に次の実装がある。

```lisp
(defun root-directory-p (directory)
  (uiop:pathname-equal
   (uiop:pathname-parent-directory-pathname directory)
   directory))
```

これは今回必要な停止判定と同じ考え方である。

特定の `"/"` 文字列を比較するより、

> parent directory が自分自身なら filesystem root

と判定する方が pathname ベースで扱える。

## project 機能では file marker と directory marker を分けている

`src/commands/project.lisp` では、

```lisp
*root-directories*
*root-files*
```

を別管理している。

`*root-directories*` には、

```text
.git
.hg
_FOSSIL_
.bzr
_darcs
```

等がある。

directory marker は `uiop:subdirectories` と pathname 比較で検出し、file marker は `uiop:directory-files` の `file-namestring` を完全一致で比較している。

つまり Lem 内の project root 探索は、LSP root 探索とは別実装だが、少なくとも

- directory marker を `file-namestring` で判定しない
- file marker は完全一致で扱う

という点では今回の問題を避けている。

ただし今回の修正で project root 探索と LSP root 探索を統合することは提案しない。

理由は、LSP 側には言語ごとの relative path marker があり、既存 project API と責務が完全には一致しないため。

---

# 他言語への影響

現行の有効な language spec で確認した例。

## Lua

```lisp
:root-uri-patterns '(".git")
```

通常の `.git/` directory を見逃す。

`.gitconfig` 等への部分一致が起こり得る。

## Typst

```lisp
:root-uri-patterns '("typst.toml" ".git")
```

`typst.toml` があれば先に検出可能だが、`.git` fallback は Lua と同じ問題を持つ。

## Dockerfile

```lisp
:root-uri-patterns '(".git" "Dockerfile" "Containerfile" "dockerfile" "containerfile")
```

`.git` 問題に加え、`Dockerfile.bak` 等も `search` では部分一致する。

## JavaScript

```lisp
:root-uri-patterns '("package.json" "tsconfig.json")
```

`package.json.bak` や `tsconfig.json.old` のような名前も現行 `search` では一致し得る。

## Python

```lisp
:root-uri-patterns '("setup.py" "pyproject.toml" "requirements.txt" "poetry.lock")
```

同様に marker 名を含む別ファイルへ部分一致し得る。

## Go

```lisp
:root-uri-patterns '("go.mod")
```

`go.mod.bak` 等へ部分一致し得る。

## Clojure

```lisp
:root-uri-patterns
'("deps.edn"
  "project.clj"
  "build.boot"
  "shadow-cljs.edn"
  ".lsp/config.edn")
```

特に `".lsp/config.edn"` は current directory の entry を `file-namestring` にして比較する現行方式では構造的に扱えない。

`list-directory` で得るのは current directory 直下の `.lsp/` pathname であり、その directory pathname の `file-namestring` は空になる。

つまり、文字列 marker を単なる「entry 名への部分一致」と解釈する設計では relative path marker を表現できない。

---

# 修正案 1: filesystem root で探索を停止する

## 目的

HOME 外の path から探索した場合でも必ず終了させる。

## 最小修正の考え方

現行の HOME 判定は既存挙動として残す。

それに加えて、

```lisp
(uiop:pathname-equal
 directory
 (uiop:pathname-parent-directory-pathname directory))
```

が真なら filesystem root に到達したとみなし NIL を返す。

概念的には:

```lisp
(defun root-directory-p (directory)
  (uiop:pathname-equal
   directory
   (uiop:pathname-parent-directory-pathname directory)))
```

を用意し、

```lisp
(cond ((matchp directory) directory)
      ((uiop:pathname-equal directory (user-homedir-pathname)) nil)
      ((root-directory-p directory) nil)
      (t
       (recursive
        (uiop:pathname-parent-directory-pathname directory))))
```

とする。

### 順序について

現行コードは `matchp` を HOME 判定より先に行う。

したがって HOME 自身に正しい marker が存在すれば HOME を root として返し得る。

修正 1 ではこの既存順序を変えない方が変更範囲が小さい。

filesystem root についても同様に、root 自身に marker が存在する場合にそれを root として返すかどうかは議論可能だが、既存の「match first」の構造を保つなら、

```text
match
HOME stop
filesystem-root stop
parent
```

となる。

今回の不具合修正だけならこの方が挙動変更が少ない。

## `find-root-directory` の fallback は維持される

`find-root-directory-1` が NIL を返すと、

```lisp
(or (find-root-directory-1 ...)
    directory)
```

により、探索開始時の directory が返る。

したがって filesystem root まで探して marker がなかった場合でも、最終的な外部挙動は既存の「marker が見つからなければ開始 directory」に揃う。

---

# 修正案 2: string pattern を root 候補からの relative path として扱う

## 問題設定

現在の string pattern:

```lisp
".git"
"package.json"
".lsp/config.edn"
```

を「directory entry の file name に対する部分文字列」と解釈すると、

- directory marker を扱えない
- exact file marker を誤認する
- relative path marker を扱えない

という複数の問題が発生する。

これらを個別の特殊ケースで修正するより、string pattern の意味を次のように定義する案が自然である。

> string pattern は、現在調べている root 候補 directory からの relative path を表す。

例:

```text
directory = /project/
pattern   = ".git"

=> /project/.git が存在するか
```

```text
directory = /project/
pattern   = "package.json"

=> /project/package.json が存在するか
```

```text
directory = /project/
pattern   = ".lsp/config.edn"

=> /project/.lsp/config.edn が存在するか
```

## UIOP API

UIOP 公式ドキュメントで次を確認した。

### `uiop:subpathname`

```text
subpathname pathname subpath &key type
```

base pathname に relative subpath を解釈・結合する。

string subpath は relative pathname として解析され、base の directory pathname と merge される。

### `uiop:probe-file*`

```text
probe-file* p &key truename
```

file または directory の存在を確認できる。

存在する場合、デフォルトでは入力 pathname を返し、存在しなければ NIL。

したがって string pattern は概念的に、

```lisp
(uiop:probe-file*
 (uiop:subpathname directory pattern))
```

で判定できる。

この方式なら `.git` が directory でも file でも検出可能。

これは Git worktree 等で `.git` が file になるケースも自然に扱える。

## 期待される改善

### `.git/`

```text
/project/.git/
```

が存在すれば真。

`file-namestring` を経由しないので directory marker を見失わない。

### `.git` file

```text
/project/.git
```

が file でも `probe-file*` は存在を検出できる。

今回最初の手動テストで使った空 `.git` file のケースも維持できる。

### `.gitconfig`

```text
/project/.gitconfig
```

しかなく `/project/.git` が存在しない場合、

```lisp
(uiop:probe-file*
 (uiop:subpathname directory ".git"))
```

は NIL。

したがって誤一致しない。

### `package.json.bak`

`package.json` の exact path を probe するので `package.json.bak` は一致しない。

### `.lsp/config.edn`

relative path を直接 probe するため扱える。

---

# function pattern の互換性

現行 `match-pattern-p` は pattern に function も許している。

```lisp
(function (funcall pattern file))
```

この function は現在、各 `list-directory` entry の `file-namestring` を受け取る。

string pattern の意味を relative path existence に変更しても、function pattern は既存互換のため現在の callback 契約を維持する方が安全。

例えば概念的には、

```lisp
(defun match-pattern-p (pattern directory)
  (etypecase pattern
    (function
     (loop :for pathname :in (list-directory directory)
           :thereis (funcall pattern (file-namestring pathname))))
    (string
     (uiop:probe-file*
      (uiop:subpathname directory pattern)))))
```

のように責務を移せる。

ここでは第 2 引数の意味が `file` から `directory` に変わるが、`match-pattern-p` は package export されていない内部関数である。

ただし実装前に repository 内の直接参照を最終確認すること。

---

# 重要: default `.git` pattern も修正対象

現行 `find-root-directory` は explicit な `root-uri-patterns` が NIL の場合、

```lisp
(list (lambda (name) (string= name ".git")))
```

を使う。

この lambda は function pattern なので、function pattern の既存契約を維持すると普通の `.git/` directory を引き続き検出できない。

したがって修正案 2 では default marker も string pattern に変更する必要がある。

概念的には、

```lisp
(or root-uri-patterns
    '(".git"))
```

または、

```lisp
(or root-uri-patterns
    (list ".git"))
```

とする。

これにより explicit な `(".git")` と default `.git` が同じ判定経路を通る。

この変更を忘れると Lua 等の explicit pattern は直っても、pattern 未指定の language mode では同じ directory marker bug が残る。

---

# 単純な `search` → `string=` 変更を推奨しない理由

一見すると、

```lisp
(search pattern file)
```

を、

```lisp
(string= pattern file)
```

に変えれば `.gitconfig` 誤認は止まる。

しかしそれだけでは不十分。

理由:

1. `.git/` directory の `file-namestring` は `""` なので、完全一致にしても検出できない
2. `.lsp/config.edn` のような relative path を扱えない
3. file と directory の違いを `file-namestring` に潰している根本構造が残る

したがって修正の中心は「比較方法を部分一致から完全一致へ変える」ことではなく、

> string pattern を root candidate からの path として存在確認する

ことに置く方が整合的。

---

# 以前の調査中に出た `".asd"` についての訂正

調査途中で、

> Lisp LSP が `".asd"` を root pattern として使っており、部分一致が必要

という仮説を一度置いた。

最新 `main` を再確認した結果、この `".asd"` を現行有効 language spec の設計根拠として扱うのは不適切と判断した。

少なくとも今回確認した現行有効 spec 群では、root marker は exact file/directory/relative path として解釈できるものだった。

したがって、

> 既存 `search` の部分一致 semantics を string pattern の互換性として維持しなければならない

という根拠には使わない。

この点は AI レビュー時にも過去の仮説と混同しないこと。

---

# テスト方針

root 探索は LSP から利用されるが、実装本体は `src/ext/language-mode.lisp` にある。

そのためテストは LSP server を起動する integration test ではなく、まず `lem/language-mode:find-root-directory` の filesystem unit/regression test として追加するのが適切と考える。

候補:

```text
tests/language-mode.lisp
```

を追加し、`lem-tests.asd` に component を登録する。

既存 `tests/legit.lisp` には、

- `uiop:temporary-directory`
- `ensure-directories-exist`
- `unwind-protect`
- `uiop:delete-directory-tree`

を使う temporary repository helper の実例がある。

その流儀を参考にする。

---

# 修正 1 のテスト候補

## filesystem root 判定

最低限、

```lisp
(let ((root ...filesystem-root...))
  (ok
   (uiop:pathname-equal
    root
    (uiop:pathname-parent-directory-pathname root))))
```

という基礎確認ではなく、可能なら `find-root-directory` の挙動として、

> HOME 外、marker なしでも終了し、開始 directory に fallback する

ことを確認したい。

ただし修正前コードでこの regression test を実行すると無限ループになるため、テスト suite 自体が停止する問題がある。

選択肢:

1. root 判定 helper を分離し、その helper を直接テストする
2. SBCL の timeout をテスト限定で使う
3. 修正後の `find-root-directory` を直接テストし、回帰時の hang リスクは許容する
4. recursion 自体を loop 化し、root 判定を独立してテストする

portable test を優先するなら 1 が最小。

Lem 内に既に `root-directory-p` 相当実装があるため、同じ考え方の helper を `language-mode` 側へ置く案は不自然ではない。

---

# 修正 2 のテスト候補

PR 2 を PR 1 に依存させない場合、marker が見つからないテストで filesystem root まで到達させると現行 bug で hang する。

したがって「誤一致しない」テストは、さらに上位の directory に正しい marker を置き、必ず有限範囲で探索を終了させると独立性を保てる。

## 1. `.git/` directory を検出する

構造:

```text
temp/
└── project/
    ├── .git/
    └── src/
```

`src/` から `(".git")` で探索し、`project/` を返すこと。

## 2. `.git` file を検出する

構造:

```text
temp/
└── project/
    ├── .git
    └── src/
```

`project/` を返すこと。

Git worktree 形式との互換性を担保する意味もある。

## 3. `.gitconfig` を `.git` と誤認しない

PR 1 に依存しない構造:

```text
temp/
├── .git/
└── child/
    ├── .gitconfig
    └── src/
```

`child/src/` から `(".git")` で探索する。

期待:

```text
temp/
```

修正前:

```text
child/
```

になり得る。

これなら `child/` の `.gitconfig` を誤認しなかった場合も、親 `temp/` の本物の `.git/` で探索が止まるため、filesystem root bug に依存しない。

## 4. `package.json.bak` を誤認しない

構造:

```text
temp/
├── package.json
└── child/
    ├── package.json.bak
    └── src/
```

`child/src/` から `("package.json")` で探索。

期待:

```text
temp/
```

修正前は `child/` を返す。

## 5. nested relative path marker を検出する

構造:

```text
temp/
└── project/
    ├── .lsp/
    │   └── config.edn
    └── src/
```

`src/` から `(".lsp/config.edn")` で探索し、`project/` を返す。

これは Clojure の現行 language spec を直接カバーする。

## 6. NIL patterns の default `.git` を検出する

`root-uri-patterns` に NIL を渡し、普通の `.git/` directory を持つ project root を検出できること。

このテストは default lambda を string marker へ変更し忘れる回帰を防ぐ。

---

# PR 分割案

2 PR に分けるのが妥当と考える。

## PR 1: filesystem root で root 探索を停止する

目的:

> HOME 外から LSP root を探索したとき、filesystem root で無限再帰しないようにする。

含める変更:

- filesystem root 判定
- `find-root-directory-1` の停止条件
- regression test

含めない:

- string marker semantics
- `.git` directory 検出
- `.gitconfig` 部分一致
- Clojure relative path marker

候補 branch:

```text
fix/language-mode-root-recursion
```

この PR は既存 root pattern の意味を変えないため、変更範囲が小さい。

## PR 2: root string marker を relative path として判定する

目的:

> LSP root marker を、候補 directory からの path として正確に判定する。

含める変更:

- string pattern を path existence で判定
- `.git/` directory 対応
- `.git` file 対応維持
- `.gitconfig` 等への誤一致防止
- exact file marker の誤一致防止
- nested relative path marker 対応
- default `.git` lambda の string marker 化
- regression tests

候補 branch:

```text
fix/language-mode-root-patterns
```

function pattern の callback semantics はできるだけ維持する。

---

# PR 同士の依存について

Lem 本体の運用方針では PR branch 同士を不用意に依存させず、最新 `main` から独立して作る。

PR 2 の誤一致テストを「上位に本物 marker を置いて必ず有限範囲で終了する」構成にすれば、PR 1 の root recursion fix がなくてもテスト可能。

したがって原則として、

```text
main
├── fix/language-mode-root-recursion
└── fix/language-mode-root-patterns
```

と独立させられる。

upstream で片方が先に merge された場合は、必要に応じてもう一方を最新 main へ rebase / 作り直す。

日常利用では `local` に両方を統合する。

---

# 修正案の概念コード

以下は設計説明用であり、まだ実装していない。

```lisp
(defun filesystem-root-p (directory)
  (uiop:pathname-equal
   directory
   (uiop:pathname-parent-directory-pathname directory)))

(defun match-pattern-p (pattern directory)
  (etypecase pattern
    (function
     (loop :for pathname :in (list-directory directory)
           :thereis (funcall pattern (file-namestring pathname))))
    (string
     (uiop:probe-file*
      (uiop:subpathname directory pattern)))))

(defun find-root-directory-1 (directory patterns)
  (labels ((matchp (directory)
             (dolist (pattern patterns)
               (when (match-pattern-p pattern directory)
                 (return-from matchp t))))
           (recursive (directory)
             (cond ((matchp directory)
                    directory)
                   ((uiop:pathname-equal directory
                                         (user-homedir-pathname))
                    nil)
                   ((filesystem-root-p directory)
                    nil)
                   (t
                    (recursive
                     (uiop:pathname-parent-directory-pathname
                      directory))))))
    (recursive directory)))

(defun find-root-directory (directory root-uri-patterns)
  (or (find-root-directory-1
       directory
       (or root-uri-patterns '(".git")))
      directory))
```

このコードをそのまま採用することはまだ決定していない。

AI レビューでは特に次を確認したい。

- `uiop:subpathname` を language spec の marker semantics に使うことの妥当性
- Windows pathname / separator への影響
- symlink を含む project path への影響
- `probe-file*` の portability
- function pattern 互換性
- HOME stop を残すことの妥当性
- match を stop condition より先に行う現行順序を維持すべきか
- recursive implementation を loop に変える価値
- root marker の存在確認で permission error 等が起きる可能性と扱い
- LSP workspace sharing / root URI cache への副作用
- tests の配置
- 2 PR 分割が妥当か
- `src/commands/project.lisp` の root finder と将来的に共有すべきか

---

# 既存挙動への影響評価

## 変わるべき挙動

```text
.gitconfig
```

しかない directory は `".git"` root と判定されなくなる。

```text
package.json.bak
```

しかない directory は `"package.json"` root と判定されなくなる。

これは bug fix と考える。

## 維持したい挙動

marker が正しく存在する最も近い ancestor を返す。

marker がどこにもなければ最終的に探索開始 directory を返す。

function pattern を使う場合、callback へ entry の `file-namestring` を渡す既存 semantics は可能な限り維持する。

`.git` が file の repository/worktree も root として扱う。

## 新しく正しく動くべき挙動

普通の `.git/` directory を root marker として扱う。

nested relative path marker を扱う。

HOME 外でも探索が終了する。

---

# 未確定・レビューしてほしい点

## 1. HOME で探索を止める仕様そのもの

現行実装は HOME を探索上限にしている。

今回の無限再帰修正では、この仕様自体は変更せず filesystem root stop を追加する案にしている。

しかし例えば、

```text
~/work/project/src/
```

から上へ探す場合に HOME より上を検索しないのは意図的仕様なのか、歴史的実装なのかは未確認。

今回の PR 1 では scope を広げないため残すのが安全と考えている。

## 2. string pattern の正式な契約

現行 API 名は `root-uri-patterns` であり、docstring に string の意味が明確に定義されていない。

今回の案では string を relative path と定義する。

これは現行 spec 群とよく整合するが、upstream が本来 substring / glob semantics を意図していた可能性は履歴レビュー対象。

## 3. wildcard

過去または無効コードに wildcard 的な marker が存在する可能性は別途確認対象。

今回の案の `subpathname + probe-file*` は glob matcher ではない。

現行有効 spec の修正に wildcard が必要でないなら、曖昧な glob support を同 PR に追加しない方がよい。

## 4. function pattern

repository 外部の user config / extension が internal function `match-pattern-p` を直接呼ぶ可能性はゼロではないが、package export はされていない。

一方、`root-uri-patterns` に function を設定すること自体は型として許されている。

callback argument の互換性は維持する方針が安全。

---

# 調査結果から見た優先度

## 不具合 1

発生条件:

- HOME 外
- ancestor に root marker がない

頻度は環境依存。

`/tmp`, `/var`, `/opt`, external volume 等で踏み得る。

影響:

- Lem が固まる

発生頻度より影響が大きい。

## 不具合 2

発生条件:

- `.git` marker を使う language
- 普通の Git repository
- または marker 名を部分文字列として含む別 entry が存在する

日常利用で踏みやすい。

影響:

- LSP root URI が誤る
- workspace の範囲が広がる/狭まる
- language server が project config を正しく認識しない可能性
- diagnostics / completion / indexing 等の動作が不自然になる可能性

Lua では実際に HOME が root URI になった。

---

# 今回確定した事実の一覧

- Lua spec は `(".git")` を root marker にしている
- 通常の `git init` は `.git/` directory を作る
- Lem の `list-directory` はその `.git/` を pathname として返す
- その pathname は `uiop:directory-pathname-p => T`
- その pathname の `file-namestring => ""`
- よって現行 `search ".git"` 判定では `.git/` 自体を検出できない
- 実際に通常 Git repository で `find-root-directory` は project root ではなく HOME を返した
- HOME には `.gitconfig` と `.gitconfig.local` が存在した
- それらは現行 `search ".git"` に一致した
- よって HOME 誤認の経路は実測で確定した
- `/tmp/` の親は `/`
- `/` の親は `/` 自身
- `uiop:pathname-equal` でも root とその parent は等しい
- 現行再帰には filesystem root stop がない
- したがって HOME 外で marker が見つからない探索は終了できない
- Lem 内には parent == self で root を判定する既存コードがある
- Clojure spec には `".lsp/config.edn"` という nested relative path marker がある
- 現行 file-namestring + search 方式ではこれを正しく表現できない
- UIOP `subpathname` は base pathname と relative subpath を扱える
- UIOP `probe-file*` は file / directory の存在確認に使える

---

# 次の作業

AI レビュー後、指摘を反映してから実装へ進む。

想定順:

1. この調査・修正案をレビュー
2. 必要なら設計修正
3. PR 1 用 regression test を先に作成
4. PR 1 実装
5. テスト
6. PR 2 用 regression tests を作成
7. PR 2 実装
8. 全体テスト
9. 実機 Lua LSP で root URI / diagnostics / completion を再確認
10. upstream PR は依頼・判断後に行う

このノート作成時点では 3 以降は未着手。
