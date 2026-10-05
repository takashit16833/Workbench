# Debian での動作確認

## 現場の Debian コンテナでセットアップする最短手順

ここだけ見ればセットアップできるようにする。

以下は **Debian 13 (trixie) で実際に確認した手順**。
コンテナ内で root として実行する前提。

### 1. 必要なパッケージを入れる

```sh
apt update

apt install -y \
  build-essential \
  ca-certificates \
  curl \
  gh \
  git \
  pkg-config \
  ripgrep \
  texinfo \
  xz-utils \
  zlib1g-dev \
  libgccjit-14-dev \
  libgmp-dev \
  libgnutls28-dev \
  libncurses-dev \
  libsqlite3-dev \
  libtree-sitter-dev \
  libxml2-dev
```

### 2. GNU Emacs 31.1 をビルドしてインストールする

```sh
cd /tmp

curl -LO https://ftp.gnu.org/gnu/emacs/emacs-31.1.tar.xz
tar -xf emacs-31.1.tar.xz
cd emacs-31.1

./configure \
  --without-x \
  --with-native-compilation=aot \
  --with-tree-sitter \
  --with-sqlite3 \
  --with-gnutls \
  --with-modules

make -j"$(nproc)"
make install
```

確認する。

```sh
hash -r
command -v emacs
emacs --version | head -1
```

期待値:

```text
/usr/local/bin/emacs
GNU Emacs 31.1
```

### 3. GitHub にログインする

現在の設定は private GitHub リポジトリからテーマや自作パッケージを取得するため、GitHub 認証が必要。

```sh
gh auth login
gh auth setup-git
```

`gh auth login` では次を選ぶ。

```text
GitHub.com
HTTPS
Authenticate Git with your GitHub credentials? Yes
Login with a web browser
```

コンテナ内でブラウザを開けなくても問題ない。
表示された URL をホスト側のブラウザで開き、表示されたワンタイムコードを入力する。

確認:

```sh
gh auth status
```

### 4. .emacs.d を取得する

新規構築なら GitHub から clone するのが簡単。

```sh
git clone https://github.com/takashit16833/.emacs.d.git ~/.emacs.d
```

すでに `~/.emacs.d` がある場合は clone し直さず、その環境に合わせて更新する。

macOS の `.emacs.d` をファイルコピーする場合は、少なくとも次の生成物は持ち込まない。

```text
elpa/
eln-cache/
tree-sitter/
*.elc
```

これらは Debian 側で作り直す。

### 5. UTF-8 と true color を設定する

今回、何も設定しない状態では次だった。

```text
LANG=
TERM=xterm
COLORTERM=
```

その結果、日本語が `?????` になり、色も8色相当になった。

Emacs を起動する前に設定する。

```sh
export LANG=C.UTF-8
export TERM=xterm-256color
export COLORTERM=truecolor
```

確認:

```sh
printf 'LANG=%s\nTERM=%s\nCOLORTERM=%s\n' \
  "$LANG" "$TERM" "$COLORTERM"

infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

少なくとも `TERM=xterm-256color` で `colors#256` 相当になっていることを確認する。

### 6. Emacs を起動する

初回はエラーを確認しやすいように `--debug-init` を付ける。

```sh
emacs -nw --debug-init
```

正常に起動できたら、普段は次でよい。

```sh
emacs -nw
```

---

## この手順で確認している範囲

今回の検証目的は、専用の検証コンテナが動くことではない。

**現場ですでに存在している Debian 系コンテナに入り、現在の Emacs 31.1 + `.emacs.d` 環境を構築するために何が必要か確認すること**。

Debian 13 (trixie) 上で、少なくとも次を実測した。

- GNU Emacs 31.1 のソースビルド
- native compilation
- Tree-sitter
- GnuTLS
- SQLite
- dynamic modules
- inotify
- 現在の `.emacs.d` の起動
- 日本語表示
- true color
- private GitHub リポジトリからの `package-vc` インストール

Ubuntu や別バージョンの Debian では、特に `libgccjit-14-dev` などのパッケージ名が異なる可能性がある。
その場合はパッケージ名を推測して変更せず、その環境の `apt-cache search` などで確認する。

## 今回見つかった問題

### Debian 標準 Emacs のバージョン差

最初に Debian trixie で、

```sh
apt install emacs-nox
```

したところ、Emacs 30.1 が入った。

現在の設定は Emacs 31.1 前提で、`config/ui.el` では Emacs 31.1 の display table slot を使用している。

そのため、

```text
Invalid display-table slot name: box-vertical
```

で停止した。

これは Debian 非対応ではなく、Emacs 30.1 と 31.1 の API 差。

このプロジェクトでは Emacs 31.1 を対象にしているため、Emacs 30 系向けの互換処理は追加せず、Debian 側にも Emacs 31.1 を入れる。

### package-vc から private リポジトリを取得できない

Emacs 31.1 にした後、

```text
Empty checkout for retro-hacker-blue-theme
```

になった。

リポジトリが空なのではなく、コンテナに GitHub 認証がなかったことが原因だった。

```sh
gh auth login
gh auth setup-git
```

後は正常に取得できた。

### 日本語が ????? になる

初期状態:

```text
LANG=
LC_ALL=
LC_CTYPE="POSIX"
```

```sh
export LANG=C.UTF-8
```

後は正常に日本語を表示できた。

### 色がおかしい

初期状態:

```text
TERM=xterm
COLORTERM=
```

`infocmp` では、

```text
colors#8
```

だった。

次を設定すると正常になった。

```sh
export TERM=xterm-256color
export COLORTERM=truecolor
```

## うまくいかないとき

### Emacs のバージョン

```sh
command -v emacs
emacs --version | head -1
```

期待値:

```text
/usr/local/bin/emacs
GNU Emacs 31.1
```

### configure の機能確認

`./configure` の最後で、少なくとも次を確認する。

```text
Does Emacs use -lgnutls?                 yes
Does Emacs use -ltree-sitter?            yes
Does Emacs have dynamic modules support? yes
Does Emacs have native lisp compiler?    yes
```

### UTF-8

```sh
printf 'LANG=%s\nLC_ALL=%s\n' "$LANG" "$LC_ALL"
locale
locale -a
```

今回の Debian では `C.utf8` が存在し、`LANG=C.UTF-8` で正常に動作した。

### 色

Emacs 起動前のシェルで確認する。

```sh
printf 'TERM=%s\nCOLORTERM=%s\n' "$TERM" "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

今回正常だった値:

```text
TERM=xterm-256color
COLORTERM=truecolor
```

Emacs 側の色数は、

```elisp
(display-color-cells)
```

で確認できる。

### GitHub 認証

```sh
gh auth status
```

認証されていなければ、

```sh
gh auth login
gh auth setup-git
```

を行う。

## TERM を Emacs 内から確認するときの注意

今回 Emacs 内で、

```elisp
(getenv "TERM")
```

を評価すると `"dumb"` が返った。

Emacs は起動後、子プロセス向けの環境として `TERM=dumb` を設定する場合があるため、この値だけで Emacs 自身が現在の端末をどう認識しているか判断しない。

端末側の `TERM` は Emacs 起動前のシェルで確認する。

## 検証用 Docker 環境

`.emacs.d` には、今回の手順をまっさらな Debian で再確認するための検証環境も置いている。

```text
docker/debian/
scripts/debian-test.sh
```

これは **現場コンテナに Emacs を導入するための手順ではない**。

用途は、今後 `.emacs.d` を変更したときに、Debian trixie + Emacs 31.1 の新規環境でも引き続き起動できるか確認すること。

```sh
cd ~/.emacs.d
bash scripts/debian-test.sh
```

コンテナ内のシェルで調査したい場合:

```sh
bash scripts/debian-test.sh --shell
```
