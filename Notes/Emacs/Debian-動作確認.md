# Debian での動作確認

## 目的

macOS で作っている CLI 用 Emacs 設定が、Debian 系 Linux でも自然に動くか確認する。

対象は GNU Emacs 31.1 とし、`emacs -nw` で利用する。

単に一度起動できることだけではなく、今後も同じ環境を簡単に作り直せることを目的として、Docker による検証環境を `.emacs.d` 側に用意した。

## 結論

現在の `.emacs.d` は、Debian trixie + GNU Emacs 31.1 の組み合わせで起動できた。

次回からは `.emacs.d` のリポジトリ直下で次の1コマンドを実行する。

```sh
bash scripts/debian-test.sh
```

このコマンドで、

1. Debian trixie の Docker イメージを用意する
2. GNU Emacs 31.1 をソースからビルドする
3. UTF-8 と true color 用の端末環境を設定する
4. ホストの現在の `.emacs.d` を読み取り専用で渡す
5. macOS 由来の生成物を除いて Debian 側の `~/.emacs.d` を作る
6. GitHub の private リポジトリを取得できるように一時的に認証する
7. `emacs -nw --debug-init` を起動する

ところまで行う。

初回だけ Emacs のビルドに時間がかかる。2回目以降は Docker のキャッシュが使われる。

## 前提

ホスト側で次が利用できる必要がある。

- Docker または Colima
- GitHub CLI (`gh`)
- `gh auth login` 済みの GitHub 認証

GitHub の認証が必要なのは、テーマや自作パッケージを `package-vc` から private リポジトリとして取得しているため。

## 検証環境

Docker のベースは次。

```text
debian:trixie
```

Emacs は Debian の `emacs-nox` パッケージを使わず、GNU Emacs 31.1 を公式ソースからビルドする。

現在のビルド設定は次。

```sh
./configure \
  --without-x \
  --with-native-compilation=aot \
  --with-tree-sitter \
  --with-sqlite3 \
  --with-gnutls \
  --with-modules
```

実際の configure 結果では、少なくとも次を確認した。

```text
GnuTLS              yes
Tree-sitter         yes
GMP                 yes
zlib                yes
dynamic modules     yes
native Lisp compiler yes
file notification   yes (inotify)
```

GUI は対象外なので X は無効にしている。

## 自動化ファイル

`.emacs.d` に次を追加した。

```text
docker/
  debian/
    Dockerfile
    entrypoint.sh

scripts/
  debian-test.sh
```

### scripts/debian-test.sh

ホスト側で実行する入口。

主な処理は次。

- Docker イメージをビルド
- `gh auth token` から現在の GitHub 認証を取得
- 認証情報を実行時だけ `GH_TOKEN` としてコンテナへ渡す
- `.emacs.d` を読み取り専用でマウント
- コンテナを対話 TTY 付きで起動

認証トークンは Docker イメージには書き込まない。

コンテナは `--rm` で起動するため、終了後にコンテナ自体も残さない。

### docker/debian/entrypoint.sh

コンテナ起動時に、ホストの `.emacs.d` をそのまま Emacs の設定ディレクトリとして使わない。

一度 `/root/.emacs.d` に設定ソースをコピーしてから Emacs を起動する。

これは、Emacs がパッケージやキャッシュを生成してもホスト側の `.emacs.d` を変更しないため。

また、次のような macOS 側で生成されたものはコピーしない。

```text
.git/
elpa/
eln-cache/
tree-sitter/
transient/
auto-save-list/
history
projects.eld
*.elc
その他の Emacs 生成状態
```

そのため Debian 側ではパッケージやネイティブコンパイル済みファイルを新しく作り直す。

## 今回見つかった問題

### 1. Debian 標準 Emacs のバージョン差

最初に Debian trixie で `apt install emacs-nox` したところ、Emacs 30.1 が入った。

現在の設定は Emacs 31.1 を対象にしており、`config/ui.el` で Emacs 31.1 の display table slot を使用している。

そのため次のエラーになった。

```text
Invalid display-table slot name: box-vertical
```

これは Debian 非対応ではなく、Emacs 30.1 と 31.1 の API 差だった。

今回の設定では Emacs 30 系との互換処理を追加せず、検証環境側を Emacs 31.1 に合わせることにした。

### 2. package-vc から private リポジトリを取得できない

Emacs 31.1 にした後、次のエラーになった。

```text
Empty checkout for retro-hacker-blue-theme
```

対象リポジトリには実際にファイルが存在していた。

原因は、まっさらなコンテナに GitHub の認証情報がなく、private リポジトリを Git が取得できなかったこと。

手動検証ではコンテナ内で `gh auth login` と `gh auth setup-git` を行うと解消した。

自動化後は、ホストの `gh auth token` から得た認証を実行時だけコンテナへ渡し、コンテナ内で `gh auth setup-git` する。

### 3. 日本語が ????? になる

コンテナ内を確認すると次の状態だった。

```text
LANG=
LC_ALL=
LC_CTYPE="POSIX"
```

UTF-8 ロケールとして起動していなかったため、日本語コメントが `?????` のように表示されていた。

次を設定すると正常に表示された。

```sh
export LANG=C.UTF-8
```

自動化環境では最初から `LANG=C.UTF-8` を設定する。

### 4. Retro Hacker Blue の色がおかしい

最初のコンテナでは次だった。

```text
TERM=xterm
COLORTERM=
```

さらに、

```sh
infocmp "$TERM"
```

では、

```text
colors#8
```

となっており、8色端末として扱われていた。

次を設定すると正常な色で表示できた。

```sh
export TERM=xterm-256color
export COLORTERM=truecolor
```

自動化環境でも次を固定している。

```text
LANG=C.UTF-8
TERM=xterm-256color
COLORTERM=truecolor
```

## TERM を Emacs 内から調べるときの注意

今回 Emacs 内で、

```elisp
(getenv "TERM")
```

を評価すると `"dumb"` が返った。

Emacs は起動後、子プロセス向けの環境として `TERM=dumb` を設定する場合があるため、この値だけで Emacs 自身が現在の端末をどう認識しているか判断しない。

端末側は Emacs 起動前のシェルで、

```sh
echo "$TERM"
infocmp "$TERM"
```

を確認する。

Emacs 側で色数を確認するときは、

```elisp
(display-color-cells)
```

などを使う。

## 使い方

### 通常の Debian 動作確認

```sh
cd ~/.emacs.d
bash scripts/debian-test.sh
```

正常なら Debian コンテナ内で、

```text
GNU Emacs 31.1
```

の `emacs -nw --debug-init` が起動する。

### コンテナ内のシェルで調査する

Emacs をすぐ起動せず、Debian 内部を調べたい場合は、

```sh
bash scripts/debian-test.sh --shell
```

を使う。

例えば、

```sh
emacs --version
locale
echo "$TERM"
echo "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

などを確認できる。

## トラブル時の切り分け

### GitHub の取得で止まる

ホスト側で確認する。

```sh
gh auth status
gh auth token -h github.com >/dev/null && echo OK
```

認証されていなければ、

```sh
gh auth login
```

を行う。

### 日本語が化ける

```sh
echo "$LANG"
locale
```

を見る。

期待値は少なくとも UTF-8 ロケールで、現在の検証環境では、

```text
LANG=C.UTF-8
```

を使用する。

### 色がおかしい

コンテナ内で、

```sh
echo "$TERM"
echo "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

を確認する。

現在の期待値は、

```text
TERM=xterm-256color
COLORTERM=truecolor
```

。

## 設計上の判断

### Debian 標準の Emacs に合わせない

このプロジェクトの対象は Emacs 31.1。

Debian 側がまだ Emacs 30 系を配布している場合でも、設定を古い API に合わせるのではなく、検証環境側で Emacs 31.1 を用意する。

これにより、

```text
macOS / Emacs 31.1
Debian / Emacs 31.1
```

を比較でき、OS 差と Emacs バージョン差を混ぜずに調べられる。

### ホストの生成物を使い回さない

`elpa/`、`eln-cache/`、`tree-sitter/` などを macOS から Debian へコピーしない。

特にネイティブコンパイル済みファイルや共有ライブラリは OS・CPU・ビルド環境に依存しうるため、Debian 側で作り直す。

### ホストの設定ソースは読み取り専用

コンテナからホストの `.emacs.d` を直接書き換えない。

これにより、Debian 検証中に package.el、Custom、キャッシュなどがホスト環境へ混入するのを防ぐ。

## 今後確認する項目

起動確認の次は、必要に応じて次を Debian 側で確認する。

- Kitty Keyboard Protocol
- Cmd / Super 系キーバインド
- project.el / project-ripgrep
- Tree-sitter
- LSP
- tab-router
- browsing-history
- Corfu / Vertico
- 外部コマンド依存
- ERT 全テスト

問題が出た場合は、macOS と Debian の設定を同時に変えず、Debian 内で実際の値を観測してから原因を切り分ける。
