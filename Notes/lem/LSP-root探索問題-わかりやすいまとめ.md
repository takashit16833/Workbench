# Lem LSP root 探索問題 - わかりやすいまとめ

## 何が起きていたのか

Lua の LSP を調べている途中で、Lem が「このファイルはどのプロジェクトに属しているか」を探す処理に問題があることが分かった。

LSP は、たとえば Lua ファイルを開いたときに、

```text
この Lua ファイルは
どのフォルダをプロジェクトの入口として扱えばいいか
```

を知る必要がある。

Lem はその目印として Lua では、

```text
.git
```

を使っている。

つまり、

```text
my-project/
├── .git/
└── main.lua
```

なら、

```text
my-project/
```

をプロジェクトの入口にしたい。

ところが、今の Lem ではここに2つ問題があった。

---

## 問題1: 本物の `.git/` を見つけられない

現在の Lem は、フォルダの中身を調べるときに、

```lisp
(file-namestring pathname)
```

を使っている。

普通のファイルなら、

```text
.gitconfig → ".gitconfig"
main.lua   → "main.lua"
```

のように名前が取れる。

ところがディレクトリは違う。

実際に `git init` で作った `.git/` を Lem から見ると、

```lisp
("/Users/.../project/.git/" T "")
```

になった。

最後の `""` が `file-namestring` の結果。

つまり、

```text
.git/
```

というディレクトリが存在しているのに、今の root 探索から見ると名前が空になってしまう。

そのため、

```lisp
".git"
```

と一致せず、本物の Git プロジェクトを素通りしてしまう。

---

## 問題2: 逆に `.gitconfig` には間違って一致する

今の Lem は文字列比較に、

```lisp
(search pattern file)
```

を使っている。

これは完全一致ではなく、

```text
その文字列が途中に含まれているか
```

を見る。

そのため、

```text
.git
```

を探しているのに、

```text
.gitconfig
.gitconfig.local
```

にも一致する。

実際に通常の Git repository で試したところ、

```lisp
(lem/language-mode:find-root-directory
 #P"/Users/.../lem-lua-git-test.Wrylg0/"
 '(".git"))
```

の結果が、

```lisp
#P"/Users/.../"
```

になった。

つまりプロジェクト自身ではなく HOME を root にしていた。

HOME を調べると、

```lisp
.gitconfig
.gitconfig.local
```

があり、この2つが実際に `".git"` に一致していた。

なので今回の誤判定は、

```text
本物の .git/ は見逃す
        ↓
上のフォルダへ探しに行く
        ↓
HOME にある .gitconfig に間違って一致
        ↓
HOME をプロジェクト root にする
```

という流れだった。

---

## これは Lua だけの問題ではない

Lua では、

```lisp
:root-uri-patterns '(".git")
```

を使っているので特に分かりやすく問題が出た。

でも仕組み自体は他の言語でも共通。

たとえば JavaScript では、

```text
package.json
tsconfig.json
```

を探している。

今の `search` 方式だと、

```text
package.json.bak
```

のようなファイルにも一致する可能性がある。

Clojure にはさらに、

```text
.lsp/config.edn
```

という「フォルダの中のファイル」を目印にする設定もある。

今の「そのフォルダ直下の名前を1個ずつ調べる」方式では、こういう目印はうまく扱えない。

## ただし `.asd` は既存互換として残す必要がある

追加で読み込める `lem-lisp-mode/v2` では、

```lisp
:root-uri-patterns '(".asd")
```

を使っている。

現在は部分一致なので `sample.asd` を見つけられる。

string marker を全部「具体的な相対 path」に変えると、`project/.asd` という名前しか探さなくなって、この既存機能を壊す。

そのため PR 2 では、`.asd` のような「ファイル名の条件」は function pattern へ移行し、Lisp v2 の動作を維持する必要がある。

---

## もう1つの問題: `/tmp` などで Lem が固まる

root 探索は、目印が見つからなければ1つ上のフォルダへ進む。

たとえば、

```text
/project/src/
  ↓
/project/
  ↓
/
```

という感じ。

ところが今の Lem は、

```text
HOME まで来たら終了
```

という条件しか持っていない。

そのため HOME の外、たとえば `/tmp` から始めると、

```text
/tmp/
  ↓
/
  ↓
/
  ↓
/
  ↓
...
```

となる。

実際に Lem の REPL で親フォルダを調べると、

```lisp
(#P"/tmp/" #P"/" #P"/" #P"/" #P"/")
```

になった。

さらに、

```lisp
(uiop:pathname-equal
 #P"/"
 (uiop:pathname-parent-directory-pathname #P"/"))
```

は、

```lisp
T
```

だった。

つまり、

```text
/ の親は /
```

なので、HOME に届かず、途中に marker もなく、別のエラーも起きない経路では、通常の方法では探索を終了できない。

以前 `/tmp/lem-lua-test` を開いたときに Lem が固まった現象とも一致する。ただし当時 debugger/backtrace で root finder 内の停止を直接確認したわけではないため、このログだけで停止箇所を証明したとは扱わない。

---

# どう直すか

修正は2つに分けるのが分かりやすい。

## 修正1: 一番上まで来たら止める

HOME だけでなく、

```text
親フォルダが自分自身
```

になったら終了する。

つまり、

```text
/
```

まで来たことを pathname で判断する。

考え方は、

```lisp
(uiop:pathname-equal
 directory
 (uiop:pathname-parent-directory-pathname directory))
```

。

Lem の別のコードにも、すでに同じ考え方の処理がある。

これで、

```text
/tmp/
  ↓
/
  ↓
終了
```

となる。

---

## 修正2: 目印を「名前の部分一致」ではなく「実際のパス」として探す

今は、

```text
フォルダの中身を全部見る
↓
名前だけ取り出す
↓
文字列が含まれるか調べる
```

となっている。

これを、

```text
このフォルダに
指定された目印が本当に存在するか
```

を見る方式にする。

たとえば、

```text
directory = /project/
marker    = ".git"
```

なら、

```text
/project/.git
```

が本当に存在するかを見る。

JavaScript なら、

```text
/project/package.json
```

を見る。

Clojure なら、

```text
/project/.lsp/config.edn
```

を見る。

この形なら全部同じ仕組みで扱える。

候補としては UIOP の、

```lisp
uiop:subpathname
uiop:probe-file*
```

を使える。

概念的には、

```lisp
(uiop:probe-file*
 (uiop:subpathname directory pattern))
```

という感じ。

これなら、

```text
.git/
.git
package.json
.lsp/config.edn
```

は正しく見つけられて、

```text
.gitconfig
package.json.bak
```

は間違って一致しない。

ただし string marker のルールは明文化する必要がある。少なくとも、

```text
空文字
.
../foo
absolute path
```

のように candidate 自身や外側を指す指定は root marker として許さない方向がよい。glob や正規表現にもせず、「candidate 配下の具体的な相対 path」とする。

また `probe-file*` が NIL を返した場合は「確実に存在しない」とまでは言えず、存在確認中のエラーを内部で吸収した場合もあり得る。この点も実装時の契約として意識する。

---

# PR は2つに分ける予定

## PR 1

```text
HOME外でroot探索が終わらない問題
```

だけ直す。

候補:

```text
fix/language-mode-root-recursion
```

これは単純で、既存の marker の意味を変えない。

## PR 2

```text
root marker の探し方
```

を直す。

候補:

```text
fix/language-mode-root-patterns
```

こちらで、

- `.git/` が見つからない
- `.gitconfig` に間違って一致する
- `package.json.bak` に間違って一致する
- `.lsp/config.edn` のような指定が使えない
- default の `.git` 判定も同じ方式へ移す
- Lisp v2 の `.asd` 利用を function pattern へ移行する

あたりをまとめて直す。

2つを別 branch にすることで、片方の修正をもう片方に依存させない。

---

# テストするときの注意

今回のレビューで特に重要だった点がある。

まず、root marker の検出テストは **開始場所と期待 root を同じにしない**。

たとえば、

```text
project/
├── .git/
└── src/
```

なら `src/` から開始して `project/` が返ることを見る。

project 自身から開始すると、marker を見つけられなくても fallback で project が返り、壊れた実装でもテストが通る可能性がある。

また PR 2 は PR 1 と独立した branch にするので、修正前でもテストが `/` まで行って固まらない fixture にする。上位に修正前でも確実に見つかる file marker や sentinel を置いて、必ず有限時間で失敗させる。

PR 1 の停止テストも helper だけではなく、公開の、

```lisp
lem/language-mode:find-root-directory
```

を実際に呼ぶ。修正前に suite 全体が固まらないよう、timeout や訪問回数制限などで上限を付ける。

---

# 実機 LSP 確認の注意

Lem は同じ language-id の既存 workspace を再利用する。

そのため root finder を修正したあとに既存の Lua workspace をそのまま見ても、古い root URI が残っている可能性がある。

修正確認は、

```text
新しい Lem プロセスを起動
↓
その言語のファイルを最初に開く
```

形で行う。

workspace の複数 project 対応自体は別問題なので、今回の PR には混ぜない。

---

# 今の時点でかなり確実なこと

今回の2つの問題は、もう「たぶんこれ」ではない。

実際の Lem REPL で、

```text
.git file
.git/ directory
HOME の .gitconfig
/tmp → / → /
```

をそれぞれ確認している。

なので、

```text
原因を推測して修正する段階
```

ではなく、

```text
原因は確認できており
レビュー結果を反映した設計からテスト・実装へ進む段階
```

まで来ている。

細かい設計やテスト案は、

```text
Notes/lem/LSP-root探索問題-調査と修正案.md
```

に詳しくまとめている。
