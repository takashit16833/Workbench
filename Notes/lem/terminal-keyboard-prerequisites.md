# Lem / Kitty keyboard 実装の前提知識

Lem の ncurses frontend で Kitty keyboard protocol を扱うために、先に知っておくと読みやすい用語のまとめ。

細かい規格を暗記する必要はない。
「どこで何が起きているか」が分かればよい。

## 全体像

キー入力は、だいたい次の経路で Lem に届く。

~~~text
キーボード
  ↓
macOS
  ↓
Terminal emulator
  例: WezTerm / kitty / Ghostty
  ↓
PTY / TTY
  ↓
Lem ncurses frontend
  ↓
Lem Key
~~~

逆方向の通信もある。

たとえば Lem が Terminal に、

> Kitty keyboard protocol のこの機能を有効にして

と依頼するときは、

~~~text
Lem
  ↓
PTY / TTY
  ↓
Terminal emulator
~~~

の向きに制御シーケンスを送る。

Kitty keyboard protocol は主に、

**Terminal emulator と Terminal 上で動くアプリケーションの間で、キー入力をどう表現するか**

を決めるプロトコル。

---

## Terminal emulator

| 用語 | 概要 |
| --- | --- |
| Terminal emulator | 文字を表示し、キーボード入力を Terminal application へ渡すアプリ。WezTerm、kitty、Ghostty など。 |
| Terminal application | Terminal 上で動くアプリ。shell、Lem、lazygit など。 |
| shell | コマンドを入力・実行するアプリ。zsh、bash など。 |

Terminal emulator と shell は別物。

~~~text
WezTerm
  └─ zsh
      └─ lem
~~~

のように動く。

---

## TTY / PTY

| 用語 | 概要 |
| --- | --- |
| TTY | Unix で Terminal 入出力を扱う仕組み。 |
| PTY | Pseudo Terminal。Terminal emulator と shell / Lem などを接続する仮想的な Terminal。 |

普段は、

> Terminal emulator と CLI アプリの間にある入出力経路

くらいの理解で十分。

---

## byte / ASCII / Unicode code point

Terminal との通信では、最終的には byte 列が流れる。

| 用語 | 概要 |
| --- | --- |
| byte | 0〜255 の値。Terminal との通信の基本単位。 |
| ASCII | 英数字や制御文字などに数値を割り当てた文字コード。 |
| Unicode code point | Unicode の文字を表す番号。例: `s` は U+0073、10進数では 115。 |
| UTF-8 | Unicode の文字を byte 列として表現する方式。 |

Kitty keyboard protocol では、通常の文字キーに Unicode code point を使う。

~~~text
s
↓
Unicode code point 115
~~~

---

## 制御文字

画面に表示する文字ではなく、機器や Terminal に特別な意味を伝える文字。

代表例:

| 名前 | 値 | 概要 |
| --- | ---: | --- |
| ESC | 27 / 0x1B | Escape。後続の byte と組み合わせて制御シーケンスを始めるためによく使われる。 |
| TAB | 9 / 0x09 | Tab。 |
| LF | 10 / 0x0A | 改行に使われる制御文字。 |
| CR | 13 / 0x0D | Carriage Return。 |

`ESC` は画面に `E` `S` `C` と表示される3文字ではない。

**1 byte の制御文字**。

---

## Escape sequence

ESC から始まる複数の byte を、Terminal が特別な命令として解釈するもの。

たとえば普通の文字列:

~~~text
hello
~~~

を Terminal へ送ると画面に表示される。

一方、

~~~text
ESC [ ...
~~~

のような byte 列は、Terminal が制御用の命令として解釈することがある。

用途の例:

- カーソルを移動する
- 色を変更する
- 画面を消去する
- alternate screen に切り替える
- keyboard mode を変更する

---

## 制御シーケンス

Terminal に何らかの動作を指示するための byte 列。

Escape sequence はその代表的な形式。

「制御命令」という言い方をする場合もあるが、

**Terminal に表示文字ではなく操作を伝えるデータ**

と考えればよい。

---

## CSI

`CSI` は **Control Sequence Introducer** の略。

制御シーケンスの開始を表す。

Terminal でよく使われる表現では、

~~~text
CSI = ESC [
~~~

byte で書くと、

~~~text
0x1B 0x5B
~~~

つまり、

~~~text
ESC [
~~~

を受け取った Terminal は、

> この後ろは制御シーケンスとして解釈する可能性がある

と判断する。

CSI の後ろには、パラメータや「どの命令か」を表す文字が続く。

---

## CSI sequence の基本形

細かい規格を覚える必要はないが、概念としては次の形。

~~~text
CSI  パラメータなど  最後の文字
~~~

例:

~~~text
CSI > 1 u
~~~

Kitty keyboard protocol では、この並び全体に意味がある。

| 部分 | 概要 |
| --- | --- |
| `CSI` | 制御シーケンス開始。通常は `ESC [`。 |
| `>` | Kitty protocol で keyboard mode を stack に push する形式を示す部分。 |
| `1` | 有効にする flag。ここでは Disambiguate escape codes。 |
| `u` | この制御シーケンスの終端。Kitty keyboard protocol で使われる final byte。 |

したがって、

~~~text
CSI > 1 u
~~~

は普通の表示文字列ではなく、

> 現在の keyboard mode を保存し、flag 1 を有効にする

という Terminal への命令。

---

## Terminal の入力モード

Terminal は常に同じ形式でキー入力をアプリへ送るとは限らない。

モードによって、

~~~text
↑
~~~

が、

~~~text
ESC [ A
~~~

になったり、別の sequence になったりする。

そのため Terminal application は、

- 現在どのモードか
- どの sequence が送られてくるか

を意識する必要がある。

---

## legacy keyboard encoding

昔から Terminal で使われてきたキー入力形式。

互換性は高いが、異なるキー操作が同じ byte になることがある。

代表例:

~~~text
Ctrl+i  → 0x09
Tab     → 0x09
~~~

~~~text
Ctrl+m  → 0x0D
Enter   → 0x0D
~~~

アプリ側から見ると区別できない。

これが Kitty keyboard protocol が解決しようとしている問題の一つ。

---

## Kitty keyboard protocol

Terminal emulator から Terminal application へ、キー入力をより曖昧なく送るためのプロトコル。

対応 Terminal の例:

- kitty
- WezTerm
- Ghostty

通常の Terminal 入力との互換性を保ちながら、アプリが必要な機能だけ有効にできる。

---

## CSI-u

Kitty keyboard protocol でキーイベントを表す中心的な形式。

例:

~~~text
CSI 115 ; 9 u
~~~

大まかには、

~~~text
CSI key-code ; modifiers u
~~~

という形。

上の例では:

| 値 | 意味 |
| --- | --- |
| `115` | `s` の Unicode code point。 |
| `9` | Super が押されていることを含む modifier 値。 |
| `u` | sequence の終端。 |

macOS では Super が Command に対応するため、

~~~text
Cmd+s
↓
CSI 115;9u
~~~

のように表現できる。

---

## modifier

Shift、Ctrl、Option、Command など、他のキーと組み合わせて使うキー。

Kitty keyboard protocol では主に次を扱う。

| modifier | macOS での代表 |
| --- | --- |
| Shift | Shift |
| Alt | Option |
| Ctrl | Control |
| Super | Command |
| Hyper | 通常は使わない |
| Meta | 通常のmacOSキーボードでは直接対応しない |

---

## bit field

複数の ON / OFF を、一つの整数にまとめて表す方法。

Kitty keyboard protocol の modifier は bit field を使う。

| modifier | bit の値 |
| --- | ---: |
| Shift | 1 |
| Alt | 2 |
| Ctrl | 4 |
| Super | 8 |
| Hyper | 16 |
| Meta | 32 |

たとえば Super だけなら、

~~~text
8
~~~

Kitty protocol の modifier 値は、

~~~text
1 + bit field
~~~

なので、

~~~text
Super
↓
1 + 8
↓
9
~~~

となる。

そのため Cmd+s は、

~~~text
CSI 115;9u
~~~

になる。

---

## Disambiguate escape codes

Kitty keyboard protocol の機能の一つ。

legacy encoding では区別できなかったキーを、区別できる形式で送る。

flag の値は:

~~~text
1
~~~

有効にすると、Esc、Alt+key、Ctrl+key などの多くが CSI-u 形式で表現される。

アプリから Terminal へ、

~~~text
CSI > 1 u
~~~

を送ることで有効にできる。

---

## keyboard mode stack

Kitty keyboard protocol では、現在の keyboard mode を Terminal 側の stack に保存できる。

~~~text
元の mode
   ↓ push
[ 元の mode ]
   ↓
Lem 用の mode を使用
   ↓ pop
元の mode に戻る
~~~

有効化:

~~~text
CSI > 1 u
~~~

終了時に元へ戻す:

~~~text
CSI < u
~~~

これにより、Lem が終了した後まで Lem 用の keyboard mode を残さずに済む。

---

## ncurses

Terminal UI を作るためのライブラリ。

Lem の CLI frontend は ncurses を利用している。

ncurses は、

- キー入力
- カーソル移動
- 画面描画
- Terminal の各種モード

などを扱う。

Lem から Terminal の違いをある程度隠してくれる。

ただし Kitty keyboard protocol のような新しい入力形式を ncurses がそのまま扱えない場合は、Lem 側で追加処理が必要になる。

---

## getch / wgetch

ncurses で入力を一つ取得するための関数。

概念的には、

~~~text
Terminal から次の入力を1つ読む
~~~

ためのもの。

ncurses の keypad mode が認識できる特殊キーなら、矢印キーなどを専用の key code に変換することもある。

認識できない escape sequence は、アプリ側で複数の byte を読んで解釈する必要がある場合がある。

---

## keypad mode

ncurses が矢印キーやFunction keyなどの escape sequence を解釈して、専用の key code として返すためのモード。

たとえば Terminal から、

~~~text
ESC [ A
~~~

が届いたとき、ncurses がこれを認識すれば、

~~~text
KEY_UP
~~~

のような値としてアプリへ渡せる。

---

## terminfo

Terminal ごとの機能や制御シーケンスの違いを記録したデータベース。

ncurses は terminfo を使って、

> この Terminal では矢印キーや画面制御をどう扱うか

を判断する。

通常のアプリ開発では直接触らないことも多いが、Terminal 入力の問題を調査するときによく出てくる。

---

## raw mode / cbreak mode

TTY の入力処理方法。

通常の shell では、OS がある程度入力をまとめてからアプリへ渡す。

Editor のようなアプリでは、キーを押したらすぐ反応したいため、より直接的に入力を受け取るモードを使う。

| 用語 | 概要 |
| --- | --- |
| raw mode | 入力をできるだけ加工せずアプリへ渡す。 |
| cbreak mode | 1文字ずつすぐアプリへ渡す。raw より一部の Terminal 処理を残す。 |

ncurses アプリではこの辺りの Terminal 状態を変更することがある。

---

## stream

Common Lisp の入出力先を表すオブジェクト。

たとえば、

~~~lisp
(format stream "hello")
~~~

なら、

> `stream` へ `hello` を書き込む

という意味。

今回の Kitty keyboard 実装では、Terminal へ制御シーケンスを書き出すために使う。

~~~lisp
(format stream
        "~C[>~Du"
        (code-char +escape-code+)
        +disambiguate-escape-codes+)
~~~

これは `stream` を変換しているのではなく、

~~~text
ESC[>1u
~~~

を組み立てて `stream` へ書き込んでいる。

---

## Lem Key

Terminal から届いた byte 列をそのまま Editor 全体で扱うのではなく、Lem 内部のキー表現へ変換する。

例:

~~~text
CSI 115;9u
↓
Cmd+s
↓
(lem:make-key :super t :sym "s")
~~~

この変換によって、Lem Core は Terminal 固有の byte 列を意識せずに、

~~~text
Super + s
~~~

というキーとして扱える。

---

## 最低限ここまで分かればよい

最初から規格全体を覚える必要はない。

今回の実装を読むうえでは、まず次を押さえれば十分。

| 用語 | 一言でいうと |
| --- | --- |
| Terminal emulator | WezTerm など。CLIアプリとユーザーの間にいる。 |
| PTY / TTY | Terminal とCLIアプリをつなぐ入出力経路。 |
| ESC | 制御シーケンスでよく使う特殊な1 byte。 |
| escape sequence | Terminal に特別な意味を伝える byte 列。 |
| CSI | `ESC [`。制御シーケンス開始の代表的な形式。 |
| ncurses | Terminal UI / 入力を扱うライブラリ。 |
| terminfo | Terminal ごとの差を記録したデータベース。 |
| Kitty keyboard protocol | Terminal からアプリへキーを曖昧なく伝える仕組み。 |
| CSI-u | Kitty protocol でキーイベントを表す形式。 |
| modifier | Shift / Ctrl / Option / Command など。 |
| bit field | 複数のON/OFFを整数一つで表す方法。 |
| stream | Common Lisp の入出力先。 |
| Lem Key | Lem 内部で使うキー表現。 |
