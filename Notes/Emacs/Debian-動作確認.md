# Debian コンテナで Emacs 開発環境を構築する

```toc
minLevel: 2
maxLevel: 3
```

## 目的

業務ですでに存在している Debian 系コンテナの中で、現在の `.emacs.d` を使って `emacs -nw` を開発環境として使える状態にする。

単に Emacs が起動するだけではなく、次まで確認する。

- GNU Emacs 31.1
- UTF-8 / 日本語
- true color
- Git / ripgrep
- private GitHub リポジトリ
- Kitty Keyboard Protocol
- Cmd / Option / Shift / Ctrl の修飾キー
- 現在の `.emacs.d`
- 開発時に必要な外部ツール

以下の手順は **Debian 13 (trixie) のコンテナで実測済み**。

---

## 現場コンテナで使う

### 1. TTY と端末環境を付けてコンテナに入る

Docker の場合:

```sh
docker exec -it \
  -e LANG=C.UTF-8 \
  -e TERM=xterm-256color \
  -e COLORTERM=truecolor \
  <container> bash
```

Docker Compose の場合:

```sh
docker compose exec \
  -e LANG=C.UTF-8 \
  -e TERM=xterm-256color \
  -e COLORTERM=truecolor \
  <service> bash
```

すでにコンテナ内にいる場合は、Emacs を起動する前に次を設定する。

```sh
export LANG=C.UTF-8
export TERM=xterm-256color
export COLORTERM=truecolor
```

確認:

```sh
printf 'LANG=%s\nTERM=%s\nCOLORTERM=%s\n' \
  "$LANG" "$TERM" "$COLORTERM"
```

期待値:

```text
LANG=C.UTF-8
TERM=xterm-256color
COLORTERM=truecolor
```

### 2. 必要なパッケージを入れる

以下は root で実行する。

```sh
apt update

apt install -y \
  build-essential \
  ca-certificates \
  cmake \
  curl \
  gh \
  git \
  libgccjit-14-dev \
  libgmp-dev \
  libgnutls28-dev \
  libncurses-dev \
  libsqlite3-dev \
  libtool-bin \
  libtree-sitter-dev \
  libvterm-dev \
  libxml2-dev \
  ncurses-bin \
  pkg-config \
  ripgrep \
  texinfo \
  xz-utils \
  zlib1g-dev
```

このパッケージ名は Debian 13 (trixie) で確認したもの。

別バージョンの Debian / Ubuntu で `libgccjit-14-dev` などが見つからない場合は、その環境で確認する。

```sh
apt-cache search '^libgccjit-[0-9].*-dev$'
```

推測で別バージョン名に置き換えない。

#### vterm のビルド依存

`vterm` は Emacs Lisp だけで完結するパッケージではなく、初回利用時に C の動的モジュールをビルドする。

検証コンテナで `vterm` を起動した際、次のエラーを確認した。

```text
Vterm needs CMake to be compiled.  Please, install CMake
```

直接の原因はコンテナに `cmake` が入っていなかったこと。

そのため Debian 検証環境では次を追加する。

```text
cmake
libtool-bin
libvterm-dev
```

役割は次の通り。

- `cmake`: vterm のネイティブモジュールをビルドするために必要
- `libtool-bin`: ビルド用ツール。内蔵 libvterm を使う場合にも備えて入れる
- `libvterm-dev`: Debian が提供する libvterm の開発用ファイル。必須ではないが、外部から libvterm のソースを取得してビルドする必要を減らせるため、検証環境の再現性を上げる目的で入れる

Emacs 自体は後述のとおり `--with-modules` を付けてビルドしているため、この問題に対して Emacs の configure オプションを変更する必要はない。

### 3. GNU Emacs 31.1 をビルドする

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

確認:

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

`./configure` の最後では少なくとも次が `yes` であることを確認する。

```text
-lgnutls
-ltree-sitter
dynamic modules
native lisp compiler
```

### 4. GitHub にログインする

現在の設定は private GitHub リポジトリからテーマや自作 Emacs パッケージを取得するため、GitHub 認証が必要。

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

コンテナ内でブラウザを開けなくてもよい。

表示された URL をホスト側のブラウザで開き、ワンタイムコードを入力する。

確認:

```sh
gh auth status
```

### 5. `.emacs.d` を取得する

新規構築:

```sh
git clone https://github.com/takashit16833/.emacs.d.git ~/.emacs.d
```

すでに `~/.emacs.d` がある場合は clone し直さず更新する。

macOS 側からファイルコピーする場合は、次の生成物は持ち込まない。

```text
elpa/
eln-cache/
tree-sitter/
*.elc
```

Debian 側で作り直す。

### 6. 端末環境を確認する

```sh
locale

infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

今回、設定前は、

```text
LANG=
TERM=xterm
COLORTERM=
colors#8
```

だった。

この状態では、

- 日本語が `?????` になる
- Retro Hacker Blue の色が崩れる

ことを確認した。

`LANG=C.UTF-8`、`TERM=xterm-256color`、`COLORTERM=truecolor` にした後は正常に表示できた。

### 7. Emacs を起動する

初回:

```sh
emacs -nw --debug-init
```

正常に起動した後:

```sh
emacs -nw
```

---

## 端末入力を確認する

### Kitty Keyboard Protocol の前提

ホスト側の WezTerm は Kitty Keyboard Protocol を利用できる設定になっている。

現在の dotfiles では、

```lua
config.enable_kitty_keyboard = true
```

を設定している。

コンテナ内では Docker の PTY を通して端末のエスケープシーケンスが Emacs まで届く。

今回、コンテナ内で `Cmd+V` を観測したところ、

```text
ESC [ 118 ; 9 u
```

つまり、

```text
1b 5b 31 31 38 3b 39 75
```

がそのまま届くことを確認した。

したがって、Docker の PTY が CSI-u / KKP の入力を途中で通常文字へ変換しているわけではない。

### Emacs 側で KKP を確認する

Emacs 内で、

```text
M-:
```

から次を評価する。

```elisp
(bound-and-true-p global-kkp-mode)
```

期待値:

```text
t
```

次に、

```text
C-h k
```

を実行してから各キーを押す。

少なくとも次を確認する。

```text
Cmd+S          -> s-s
Cmd+A          -> s-a
Cmd+Z          -> s-z
Cmd+Shift+Z    -> S-s-z
Cmd+Left       -> s-<left>
Cmd+Right      -> s-<right>
Option+...     -> M-...
Ctrl+...       -> C-...
```

ここで期待したキー名になれば、修飾キーはコンテナ越しでも Emacs まで届いている。

### bash 上で KKP の文字列が見えても異常ではない

通常の bash は KKP の `Super+V` などを Emacs のようには解釈しない。

そのため bash 上で、

```text
^[[118;9u
```

のように表示されること自体は、Docker が壊していることを意味しない。

重要なのは、Emacs 起動後に `kkp` がそのシーケンスを `s-v` などとして解釈できること。

---

### Cmd+C / Cmd+V

修飾キーの伝送とは別に、現在の `.emacs.d` のクリップボード実装は macOS 専用になっている。

現在:

```elisp
my/copy-region-to-clipboard
```

は `pbcopy` を呼ぶ。

```elisp
my/paste-from-clipboard
```

は `pbpaste` を呼ぶ。

そのため Debian コンテナ内では、

```text
Cmd+C / Cmd+V のキー自体は Emacs に届く
↓
呼び出されたコマンドが pbcopy / pbpaste を実行する
↓
Debian には存在しない
↓
クリップボード操作としては失敗する
```

という状態になる。

これは **KKP や Docker PTY の問題ではなく、Emacs 側のクリップボード実装が macOS 固有であることが原因**。

Emacs 31.1 の TTY 実装には OSC 52 を使った端末クリップボード連携があり、WezTerm も対象になっているため、今後は `pbcopy / pbpaste` 固定をやめて TTY でも動く方式へ変更する候補がある。

この対応が終わるまでは、**「修飾キー対応は確認できたが、Debian コンテナ内の Cmd+C / Cmd+V は未完了」**として扱う。

---

## 開発環境として確認する

Emacs が起動しただけでは完了にしない。

現場で使うプロジェクトを開いて、必要なものを確認する。

```sh
git --version
rg --version
```

Emacs 側:

- `project-find-file`
- `project-ripgrep`
- Tree-sitter
- tab-router
- browsing-history
- Vertico / Consult / Corfu
- Cmd / Option / Shift / Ctrl
- 日本語入力・表示
- true color
- Git 操作
- プロジェクト固有の LSP

LSP サーバーや言語処理系はプロジェクトごとに異なるので、このノートでは一律に入れない。

必要な言語環境はその現場プロジェクトの Dockerfile / 開発環境に合わせる。

---

## コンテナ再作成時の注意

`docker exec` でコンテナ内に直接 `apt install` や `make install` した内容は、コンテナを作り直すと消える。

したがって流れは、

```text
1. 現場コンテナ内でこの手順を使って動作確認
2. Emacs 開発環境として問題なく使えることを確認
3. 継続利用するなら、必要なパッケージと Emacs 31.1 の導入を
   現場プロジェクトの Dockerfile / devcontainer 等へ反映
```

とする。

いきなり現場の Dockerfile を変更せず、まず既存コンテナ内で実測する。

---

## トラブルシューティング

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

### UTF-8

```sh
printf 'LANG=%s\nLC_ALL=%s\n' "$LANG" "$LC_ALL"
locale
locale -a
```

今回の Debian では `C.utf8` が利用できた。

### 色

```sh
printf 'TERM=%s\nCOLORTERM=%s\n' "$TERM" "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

期待値:

```text
TERM=xterm-256color
COLORTERM=truecolor
```

Emacs 内:

```elisp
(display-color-cells)
```

### GitHub 認証

```sh
gh auth status
```

未認証:

```sh
gh auth login
gh auth setup-git
```

### package-vc で Empty checkout

今回:

```text
Empty checkout for retro-hacker-blue-theme
```

は private リポジトリへの GitHub 認証不足が原因だった。

まず `gh auth status` を確認する。

### TERM を Emacs 内から見たら dumb

Emacs 内で、

```elisp
(getenv "TERM")
```

が `"dumb"` になる場合がある。

端末側の `TERM` 確認には使わず、Emacs 起動前のシェルで、

```sh
echo "$TERM"
infocmp "$TERM"
```

を見る。

---

## 検証用 Docker

### 目的

`.emacs.d` には、まっさらな Debian で再現性を確認するための検証環境がある。

```text
docker/debian/
scripts/debian-test.sh
```

これは現場環境そのものではない。

用途は、`.emacs.d` を変更したときに Debian trixie + Emacs 31.1 の新規環境でも起動・操作できるか確認すること。

検証用イメージには、現在の動作確認に必要な Lua / Haskell の Tree-sitter grammar、Lua Language Server、GHC、Cabal、Haskell Language Server、Fourmolu も含めている。

### 構成

ホスト側の `.emacs.d` はコンテナへ read-only でマウントする。

```text
ホスト: /src/emacs.d
       ↓ rsync
コンテナ: /root/.emacs.d
```

コンテナ内では `/root/.emacs.d` を実際の Emacs 設定として使用する。

GitHub の認証情報はイメージへ保存せず、ホスト側の `gh auth token` から取得した `GH_TOKEN` をコンテナ起動時に渡す。

### 基本操作

`~/.emacs.d` で実行する。

```sh
cd ~/.emacs.d
```

引数を省略した場合は `emacs` と同じ。

```sh
bash scripts/debian-test.sh
```

利用できるコマンドは次の通り。

```text
start    検証用コンテナをバックグラウンドで起動する
shell    検証用コンテナのシェルを開く
emacs    検証用コンテナで Emacs を開く
stop     検証用コンテナを削除する
rebuild  コンテナを削除してイメージを再ビルドし、起動する
```

例:

```sh
bash scripts/debian-test.sh start
bash scripts/debian-test.sh shell
bash scripts/debian-test.sh emacs
bash scripts/debian-test.sh stop
bash scripts/debian-test.sh rebuild
```

従来の `--shell` も `shell` の別名として利用できる。

```sh
bash scripts/debian-test.sh --shell
```

### コンテナのライフサイクル

現在のスクリプトは、Emacs を終了しただけではコンテナを削除しない。

```text
emacs
  ↓
既存コンテナへ接続
  ↓
Emacsを終了
  ↓
コンテナはバックグラウンドで起動したまま
```

そのため、動作確認のたびにコンテナを作り直す必要はない。

次回はそのまま、

```sh
bash scripts/debian-test.sh emacs
```

または、

```sh
bash scripts/debian-test.sh shell
```

で同じコンテナへ再接続できる。

不要になったら明示的に削除する。

```sh
bash scripts/debian-test.sh stop
```

`stop` はコンテナを削除するため、コンテナ内だけに生成された状態は失われる。Docker イメージ自体は削除しない。

### 設定同期の仕組み

`start` でコンテナを新規作成するときと、`shell` / `emacs` を実行するときに、ホスト側の `.emacs.d` を `/root/.emacs.d` へ同期する。

そのため、ホスト側で Emacs 設定を変更した後にイメージやコンテナを作り直す必要はない。

```text
ホストで設定を編集
  ↓
bash scripts/debian-test.sh emacs
  ↓
起動前に設定を同期
  ↓
変更後の設定で Emacs が起動
```

同期時には設定ソースを更新する一方、Debian 側で生成した次のようなものは保持する。

```text
elpa/
eln-cache/
tree-sitter/
transient/
各種履歴・キャッシュ
*.elc
```

これにより、Emacs を閉じて再度起動したときにパッケージを毎回入れ直す必要がない。

### イメージを作り直す

Dockerfile や、イメージ内に入れる外部ツールを変更した場合は `rebuild` を使う。

```sh
bash scripts/debian-test.sh rebuild
```

`rebuild` は、

```text
既存コンテナを削除
↓
Dockerイメージを再ビルド
↓
新しいコンテナをバックグラウンド起動
```

を行う。

通常の `.emacs.d` の Lisp 設定変更だけなら `rebuild` は不要。

### 典型的な使い方

普段の設定変更確認では、

```sh
bash scripts/debian-test.sh emacs
```

だけでよい。

コンテナ内でコマンドを確認したい場合は、

```sh
bash scripts/debian-test.sh shell
```

を使う。

Dockerfile や言語ツールなど、イメージそのものを変更した場合だけ、

```sh
bash scripts/debian-test.sh rebuild
```

を使う。
