# Debian での動作確認

## 現場の Debian コンテナで使う最短手順

**普段はここだけ見ればよい。**

前提は、現在の `.emacs.d` が現場のコンテナ内にあることだけ。

例えば `~/.emacs.d` に置いた場合:

```sh
cd ~/.emacs.d
bash scripts/debian-setup.sh
```

これで次をまとめて行う。

- Debian 側に不足しているビルド依存パッケージを `apt` で入れる
- Git / GitHub CLI / ripgrep などを入れる
- GNU Emacs 31.1 がなければソースからビルドして `/usr/local` に入れる
- private GitHub リポジトリを取得できるように認証する
- UTF-8 / 256色 / true color 用の環境を付けて `emacs -nw --debug-init` を起動する

GitHub に未認証なら途中で `gh auth login` が始まる。
ブラウザを自動で開けないコンテナでは、表示された URL とコードをホスト側のブラウザで使う。

2回目以降はセットアップ不要。

```sh
cd ~/.emacs.d
bash scripts/debian-emacs.sh
```

### .emacs.d がまだコンテナ内にない場合

現場の構成に合わせて、ホストからマウント・コピーするか Git で取得する。

重要なのは **macOS 側の生成物をそのまま持ち込まないこと**。

少なくとも次は Debian 側で作り直す。

```text
elpa/
eln-cache/
tree-sitter/
*.elc
```

---

## この検証の目的

今回 Docker で Debian を試した目的は、「専用の検証コンテナなら動く」ことを確認するためではない。

**実際の現場にある Debian 系コンテナへ入ったとき、何を用意すれば現在の Emacs 環境を動かせるかを確認するため**。

検証の結果、必要だったものは大きく次の4つだった。

1. GNU Emacs 31.1
2. Emacs 31.1 のビルドに必要な Debian パッケージ
3. UTF-8 / true color の端末環境
4. private GitHub リポジトリを取得するための認証

これらを現場コンテナ内でまとめて準備するために `scripts/debian-setup.sh` を追加した。

## 現場用スクリプト

### scripts/debian-setup.sh

**既存の Debian 系コンテナ内で実行する。**

検証用コンテナを新しく作るスクリプトではない。

主な処理:

- `apt-get update`
- 必要パッケージのインストール
- Debian のバージョンに合わせて `libgccjit-*-dev` を検出
- GNU Emacs 31.1 のビルド・インストール
- GitHub 認証
- Emacs の起動

root でなければ `sudo` を使う。
root 権限も `sudo` もなければ停止する。

Emacs 31.1 がすでに `/usr/local/bin/emacs` にあれば再ビルドしない。

### scripts/debian-emacs.sh

セットアップ済みの現場コンテナで Emacs を起動するための薄いラッパー。

```sh
bash scripts/debian-emacs.sh
```

次の環境を Emacs プロセスにだけ付けて起動する。

```text
LANG=C.UTF-8
TERM=xterm-256color
COLORTERM=truecolor
```

## 検証で実際に見つかった問題

### Debian 標準の Emacs が古かった

Debian trixie で、

```sh
apt install emacs-nox
```

すると、検証時点では Emacs 30.1 が入った。

現在の設定は Emacs 31.1 前提なので、

```text
Invalid display-table slot name: box-vertical
```

で停止した。

これは Debian 非対応ではなく **Emacs 30.1 と 31.1 の API 差**。

そのため現場でも Debian 標準の Emacs バージョンに設定を合わせず、Emacs 31.1 を用意する。

### private GitHub リポジトリを取得できなかった

`package-vc` がテーマを取得するとき、

```text
Empty checkout for retro-hacker-blue-theme
```

になった。

リポジトリが空だったのではなく、コンテナに GitHub 認証がなかったことが原因。

現場コンテナでは `gh` を入れ、未認証なら、

```sh
gh auth login
gh auth setup-git
```

を行えば取得できる。

`scripts/debian-setup.sh` はこの処理も行う。

### 日本語が ????? になった

初期状態は、

```text
LANG=
LC_ALL=
LC_CTYPE="POSIX"
```

だった。

```sh
export LANG=C.UTF-8
```

で正常になった。

### 色がおかしかった

初期状態は、

```text
TERM=xterm
COLORTERM=
```

で、terminfo 上も、

```text
colors#8
```

だった。

次で正常になった。

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

### UTF-8

```sh
printf 'LANG=%s\nLC_ALL=%s\n' "$LANG" "$LC_ALL"
locale
locale -a
```

少なくとも UTF-8 ロケールが使えることを確認する。

今回の環境では、

```text
C.utf8
```

が利用できた。

### 色

Emacs を起動する前のシェルで確認する。

```sh
printf 'TERM=%s\nCOLORTERM=%s\n' "$TERM" "$COLORTERM"
infocmp "$TERM" | grep -E 'colors#|RGB|setaf|setab'
```

今回正常だった値:

```text
TERM=xterm-256color
COLORTERM=truecolor
```

Emacs 内の色数は、

```elisp
(display-color-cells)
```

で確認できる。

### GitHub 認証

```sh
gh auth status
```

未認証なら、

```sh
gh auth login
gh auth setup-git
```

を行う。

## 検証用 Docker 環境

`.emacs.d` には別途、

```text
docker/debian/
scripts/debian-test.sh
```

も置いている。

こちらは **現場へ導入するためのものではない**。

まっさらな Debian 環境から現在の設定が再現できるかを継続的に確認するための検証用。

```sh
bash scripts/debian-test.sh
```

とすれば、Debian trixie + Emacs 31.1 の使い捨て環境を作って確認できる。

役割を分けると次の通り。

```text
現場に既存の Debian コンテナがある
    → scripts/debian-setup.sh

セットアップ後、普段 Emacs を起動する
    → scripts/debian-emacs.sh

まっさらな Debian で再現性を検証する
    → scripts/debian-test.sh
```

## 現時点で確認済み

Debian trixie 上で次を確認した。

- GNU Emacs 31.1 のソースビルド成功
- native compilation 有効
- Tree-sitter 有効
- GnuTLS 有効
- SQLite 有効
- dynamic modules 有効
- inotify 有効
- 現在の `.emacs.d` が起動
- 日本語表示
- true color
- private repository からの `package-vc` インストール

今後 OS 差の問題が出た場合も、まず現場コンテナ上の実際の値を確認してから設定を変更する。
