# Debian / Docker リファレンス & Tips

```toc
minLevel: 2
maxLevel: 3
```

Debian 13 (trixie) + GNU Emacs 31.1 で確認。

## 現場コンテナ

### 端末環境

Docker:

```sh
docker exec -it \
  -e LANG=C.UTF-8 \
  -e TERM=xterm-256color \
  -e COLORTERM=truecolor \
  <container> bash
```

Docker Compose:

```sh
docker compose exec \
  -e LANG=C.UTF-8 \
  -e TERM=xterm-256color \
  -e COLORTERM=truecolor \
  <service> bash
```

コンテナ内ですでにシェルを開いている場合:

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

### 必要なパッケージ

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

`libgccjit-14-dev` が存在しない Debian / Ubuntu では、その環境で確認する。

```sh
apt-cache search '^libgccjit-[0-9].*-dev$'
```

### Emacs 31.1

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

### GitHub 認証

private リポジトリを `package-vc` から取得する場合:

```sh
gh auth login
gh auth setup-git
gh auth status
```

`Empty checkout for ...` が出たら、まず `gh auth status` を確認する。

### .emacs.d

新規:

```sh
git clone https://github.com/takashit16833/.emacs.d.git ~/.emacs.d
```

macOS 側からコピーする場合、次は持ち込まず Debian 側で作り直す。

```text
elpa/
eln-cache/
tree-sitter/
*.elc
```

### 起動

初回:

```sh
emacs -nw --debug-init
```

通常:

```sh
emacs -nw
```

## 端末 / KKP

### WezTerm

ホスト側:

```lua
config.enable_kitty_keyboard = true
```

Docker PTY 越しでも KKP / CSI-u のシーケンスは Emacs まで届くことを確認済み。

### Emacs で確認

```elisp
(bound-and-true-p global-kkp-mode)
```

期待値:

```text
t
```

`C-h k` で確認する。

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

bash 上で `^[[118;9u` のような文字列が見えても異常ではない。通常の bash が KKP を解釈しないため。

### クリップボード

現在の Emacs 設定では、コピーは `gui-set-selection`、TTY の貼り付けは `xterm-paste` を使用する。

`pbcopy` / `pbpaste` 固定ではないため、macOS 専用実装として扱う必要はない。

## 検証用 Docker

対象:

```text
docker/debian/
scripts/debian-test.sh
```

現場コンテナとは別の、`.emacs.d` の Debian 再現確認用環境。

### コマンド

```text
start    コンテナをバックグラウンドで起動
shell    コンテナのシェルを開く
emacs    コンテナで Emacs を開く
stop     コンテナを削除
rebuild  コンテナを削除 → イメージ再ビルド → 起動
```

普段はこれだけでよい。

```sh
bash scripts/debian-test.sh emacs
```

引数なしも `emacs` と同じ。

```sh
bash scripts/debian-test.sh
```

シェル:

```sh
bash scripts/debian-test.sh shell
```

`--shell` も利用できる。

```sh
bash scripts/debian-test.sh --shell
```

停止・削除:

```sh
bash scripts/debian-test.sh stop
```

Dockerfile やイメージ内のツールを変更した場合:

```sh
bash scripts/debian-test.sh rebuild
```

### コンテナは再利用する

Emacs を終了してもコンテナは削除されない。

```text
emacs
↓
既存コンテナへ接続
↓
Emacs終了
↓
コンテナは起動したまま
```

次回の `emacs` / `shell` は同じコンテナを再利用する。

### 設定は起動前に同期する

ホスト側:

```text
/src/emacs.d
```

からコンテナ側:

```text
/root/.emacs.d
```

へ `rsync` する。

`shell` / `emacs` のたびに同期されるため、Emacs Lisp の設定変更だけなら `rebuild` は不要。

Debian 側で生成された次のものは保持する。

```text
elpa/
eln-cache/
tree-sitter/
transient/
各種履歴・キャッシュ
*.elc
```

### イメージに入っている開発環境

現在の検証イメージには次を含む。

- GNU Emacs 31.1
- Lua Tree-sitter grammar
- Haskell Tree-sitter grammar
- Lua Language Server
- GHC
- Cabal
- Haskell Language Server
- Fourmolu
- Git / ripgrep / gh
- vterm のビルド依存

## 動作確認

最低限:

```sh
git --version
rg --version
emacs --version | head -1
```

Emacs:

- 日本語表示
- true color
- KKP / 修飾キー
- `project-find-file`
- `project-ripgrep`
- Tree-sitter
- Vertico / Consult / Corfu
- tab-router
- browsing-history
- Git
- 使用言語の LSP

## トラブルシューティング

### Emacs のバージョン

```sh
command -v emacs
emacs --version | head -1
```

### UTF-8 / 色

```sh
locale

printf 'TERM=%s\nCOLORTERM=%s\n' "$TERM" "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

Emacs:

```elisp
(display-color-cells)
```

### vterm がビルドできない

検証時に確認したエラー:

```text
Vterm needs CMake to be compiled. Please, install CMake
```

必要なもの:

```text
cmake
libtool-bin
libvterm-dev
```

Emacs 自体は `--with-modules` でビルドする。

### Emacs 内の TERM が dumb

Emacs 内の `(getenv "TERM")` ではなく、Emacs 起動前のシェルで確認する。

```sh
echo "$TERM"
infocmp "$TERM"
```
