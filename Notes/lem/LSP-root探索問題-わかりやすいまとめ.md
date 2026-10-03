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

なので、何も止めなければ永遠に同じ場所を調べ続ける。

以前 `/tmp/lem-lua-test` を開いたときに Lem が固まった現象とも一致する。

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

あたりをまとめて直す。

2つを別 branch にすることで、片方の修正をもう片方に依存させない。

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
原因は確認できたので
修正設計をレビューしてから実装する段階
```

まで来ている。

細かい設計やテスト案は、

```text
Notes/lem/LSP-root探索問題-調査と修正案.md
```

に詳しくまとめている。
