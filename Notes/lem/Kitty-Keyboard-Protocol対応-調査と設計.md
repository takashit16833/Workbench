# Lem ncurses Kitty Keyboard Protocol 対応 - 調査と設計

## このノートの位置づけ

Lem の ncurses フロントエンドへ Kitty Keyboard Protocol（以下 KKP）対応を追加するための調査・設計ノート。

2026-10-03 に一度作成した設計案を、Lem 現行コードと KKP / ncurses 仕様を使ったレビュー結果を踏まえて改訂した。

このノートを、今後の実装と追加レビューの基準にする。

設計上の判断と、仕様・コードから確認できる事実はできるだけ分けて書く。

## 結論

初回実装では次の方針を採る。

1. **KKP parser を先に実装し、現在の ncurses 入力経路へ統合する。**
2. **parser が flag 1 で変化する入力を安全に扱える状態になるまで、実端末へ `CSI > 1 u` を送らない。**
3. **CSI-u の認識は KKP 有効状態に依存させない。** legacy mode でも CSI-u が届く場合があるため。
4. **初回は KKP support detection / query negotiation を実装しない。**
5. **KKP の有効化は Lem ncurses の明示設定で opt-in にする。**
6. 設定が ON のとき、ncurses screen 準備後に `CSI > 1 u` を送り、終了前に `CSI < u` を送る。
7. KKP 非使用時は、現在成功している legacy / ncurses 入力を壊さない。
8. `wgetch` は生バイトだけでなく ncurses の `KEY_*` 相当値も返すため、raw byte parser として作らない。
9. Unicode codepoint と ncurses key number を混同しない。
10. `C-]` の abort、mouse、resize、UTF-8、既存修飾キーを回帰対象にする。

初回の中心は **「KKP を検出すること」ではなく、「KKP flag 1 を安全に受けられる ncurses input path を作ること」**。

## 調査時点

- 調査日: 2026-10-03
- Lem fork: `takashit16833/lem`
- 調査した `main`: `27572e42923a99d1dee0be8b991e0bfd2113b24d`
- 対象: `frontends/ncurses`

主に確認したファイル:

- `frontends/ncurses/config.lisp`
- `frontends/ncurses/input.lisp`
- `frontends/ncurses/key.lisp`
- `frontends/ncurses/mainloop.lisp`
- `frontends/ncurses/term.lisp`
- `frontends/ncurses/lem-ncurses.asd`
- `frontends/ncurses/ncurses.lisp`
- `src/key.lisp`
- `src/input.lisp`
- `src/keymap.lisp`
- `src/event-queue.lisp`
- `contrib/mouse-sgr1006/main.lisp`

## 主な参照資料

### KKP 公式仕様

https://sw.kovidgoyal.net/kitty/keyboard-protocol/

主に確認した箇所:

- Quickstart
- Progressive enhancement
- Detection of support for this protocol
- Legacy key event encoding
- Modifiers
- Functional key definitions

### WezTerm

https://wezterm.org/config/lua/config/enable_kitty_keyboard.html

`enable_kitty_keyboard = true` の場合、WezTerm はアプリケーションからの KKP keyboard encoding 変更要求を受け付ける。

## 用語

### CSI

Control Sequence Introducer。

今回扱う 7-bit 形式では実体は:

```text
ESC [
0x1b 0x5b
```

### CSI-u

`CSI ... u` で終わるキーイベント形式。

例:

```text
ESC[115;9u
```

今回の実機では `Cmd+s` を表した。

**CSI-u と「KKP enhancement が現在有効」は同じ意味ではない。**

公式仕様では legacy mode でも、従来形式では表現できないキーを CSI-u で送る場合がある。

したがって CSI-u parser 自体は KKP enable state に依存させない。

### flag 1

KKP progressive enhancement の:

```text
Disambiguate escape codes = 0b1
```

今回の初回実装で要求する flag。

## KKP 仕様で確定していること

### Quickstart

公式 Quickstart は、アプリケーション側の基本的な利用方法として次を示している。

起動時、または alternate screen に入った後:

```text
CSI > 1 u
```

終了時、または alternate screen を抜ける前:

```text
CSI < u
```

`CSI > 1 u` は現在の keyboard mode を端末側 stack に push して flag 1 を適用する。

`CSI < u` は stack を 1 段 pop し、以前の状態へ戻す。

main screen と alternate screen の stack は別。

そのため、Lem では screen の準備後に push し、screen を破棄する前に pop する必要がある。

### support detection は別機能

公式仕様には KKP support detection の方法もある。

```text
CSI ? u
Primary Device Attributes query
```

を送り、Primary DA の返答より前に KKP flags reply が来たかで判定する方法。

ただし Quickstart は support detection を必須にはしておらず、基本利用は push / pop だけで説明されている。

初回実装では detection を入れない。

理由:

- query reply と通常キーボード入力を同じ input path で安全に分類する必要がある。
- Primary DA の遅延返答を通常入力へ漏らさない処理が必要。
- timeout、partial response、古い reply、入力保全など設計範囲が大きくなる。
- 今回まず必要なのは Cmd / Super を含む flag 1 の安全な入力処理。

自動 detection は、必要性が確認できた場合に別段階で追加する。

### flag 1 で変わる入力

flag 1 を有効にすると、従来曖昧だった非テキストキーが CSI-u 系へ変わる。

例:

- Escape
- Ctrl + ASCII key
- Alt + key
- Ctrl + Alt + key
- Shift + Alt + key
- non-text keypad key

通常のテキスト入力は UTF-8 のまま。

Enter / Tab / Backspace は、flag 1 だけなら legacy byte を維持する。

したがって `Cmd+s` だけを対応して flag 1 を ON にする実装は不可。

### 基本形式

flag 1 で中心になる形式:

```text
CSI number ; modifiers [u~]
CSI 1 ; modifiers [ABCDEFHPQS]
```

modifier がない場合、省略可能な field がある。

例:

```text
27u       → Escape
115u      → s
115;9u    → Super+s
1;9A      → Super+Up
3;9~      → Super+Delete
```

### modifier

KKP の modifier bit:

```text
shift = 1
alt   = 2
ctrl  = 4
super = 8
hyper = 16
meta  = 32
caps  = 64
num   = 128
```

escape sequence 上の modifier 値は:

```text
1 + bit field
```

なので Super のみは:

```text
8 + 1 = 9
```

### functional key

KKP は F13 以降や keypad 等、一部の非 Unicode key を Unicode Private Use Area の codepoint で表す。

例:

```text
F13      = 57376u
KP_Enter = 57414u
KP_Up    = 57419u
```

これらを普通の Unicode 文字として挿入してはいけない。

## 実機で確認したこと

環境:

- macOS
- WezTerm
- `TERM=xterm-256color`

### flag 0

```sh
printf '\033[?u'; xxd
```

返答:

```text
^[[?0u
```

今回の環境では enhancement flags は 0。

この状態で `Cmd+s` を `xxd -g 1` へ入力すると通常の `s` として見えた。

### flag 1 を手動 push

```sh
printf '\033[>1u'
```

`Cmd+s`:

```text
^[[115;9u
```

実バイト:

```text
1b 5b 31 31 35 3b 39 75
```

つまり:

```text
ESC[115;9u
```

が届いた。

この shell 実験では Ctrl+C / Ctrl+D / Ctrl+Z の扱いも変化した。

ただし Lem 自身は `raw` mode を使うため、shell / xxd での signal 挙動をそのまま Lem の挙動として扱わない。

## 現行 Lem ncurses の入力構造

概略:

```text
keyboard
  ↓
terminal emulator
  ↓
PTY
  ↓
ncurses
  ↓
wgetch
  ↓
frontends/ncurses/input.lisp
  ↓
Lem Key / resize / abort / mouse
```

### `wgetch` は生バイト reader ではない

`input.lisp` の `getch` は `charms/ll:wgetch` を使う。

pad に `keypad` が有効なので、ncurses / terminfo が認識した escape sequence は、文字列のままではなく `KEY_*` 相当の整数へ変換される場合がある。

つまり返り値には混在する。

```text
0..255      → byte 相当
>255        → ncurses key number の可能性
-1          → ERR
KEY_RESIZE  → resize
```

KKP 対応のためにこれを「バイト列を読む関数」と見なしてはいけない。

既存の keypad 処理は維持し、ncurses が変換しなかった CSI を追加 parser で扱う。

### 現在の CSI 処理

現行は概略:

```lisp
(case (getch)
  (#.(char-code #\<)
   ;; mouse
   ...)
  (#.(char-code #\1)
   (csi\[1))
  (t
   (get-key-from-name "escape")))
```

`ESC [` の後が:

```text
<  → SGR mouse
1  → csi[1
その他 → Escape
```

という狭い処理になっている。

`ESC[115;9u` は:

```text
ESC [ 1 1 5 ; 9 u
      ↑
```

最初の `1` で `csi\[1` に入るが、その次の `1` は現行関数が期待する `;` ではない。

結果として sequence の途中だけ消費し、残りが後続入力として漏れる可能性がある。

したがって case の枝を単純に1つ増やすだけでは不十分。

### `csi\[1`

現在は主に:

```text
1;2A → Shift+Up
1;3A → Meta+Up
1;5A → Ctrl+Up
```

等を処理する。

KKP 専用にこの関数を拡張する方針は採らない。

理由:

- KKP codepoint は `97`、`115` 等、`1` 以外でも始まる。
- modifier は 9 以上もある。
- `u` / `~` / letter final を扱う必要がある。
- legacy CSI も同じ collector で扱った方が境界を管理しやすい。

## Lem Key との接続で注意すること

### core Key は Super / Hyper をすでに持つ

`src/key.lisp` の Key は:

```lisp
ctrl
meta
super
hyper
shift
sym
```

を持つ。

そのため Super / Hyper のために Key struct を拡張する必要はない。

### Unicode codepoint を `char-to-key` に流さない

`frontends/ncurses/key.lisp` の `char-to-key` は、文字 codepoint で `*keycode-table*` を引く。

この table には ASCII だけでなく ncurses key number も登録されている。

例:

```text
259 → Up
```

一方、Unicode U+0103 も decimal 259。

KKP の `CSI 259;9u` を単純に:

```lisp
(char-to-key (code-char 259))
```

へ流すと、Unicode 文字ではなく Up と解釈する可能性がある。

KKP codepoint → Lem Key は独立経路にする。

基本:

- KKP functional key code → 明示 table
- ASCII special key → 明示処理
- 一般 Unicode scalar → `(make-key :sym (string ...))` 相当
- ncurses key number → 既存 `key.lisp` の経路

を分ける。

### core の既存 key conversion

`src/key.lisp` は:

```text
C-m → Return
C-i → Tab
C-[ → Escape
```

へ変換する。

KKP はこれらを区別できるが、現行 core の `make-key` を通すと再び同一視される。

初回 KKP 対応では既存 core 互換を優先し、この変換は変更しない。

C-i と Tab 等を本当に別キーとして bind したくなった場合は core / keyspec / 他 frontend を含む別案件にする。

### Shift と大文字

KKP の main key codepoint は基本的に unshifted key。

`Cmd+Shift+z` は例えば:

```text
codepoint = z
shift = t
super = t
```

となる。

Lem では:

```text
Super=t Shift=t sym="z"
```

と:

```text
Super=t Shift=nil sym="Z"
```

は別 Key。

既存 Meta+大文字との互換にも影響する。

初回実装では **KKP の modifier 情報を正しく保持する**ことを優先し、必要な keybind は `Shift-` を含む keyspec で定義する案を基本にする。

ただし既存 Meta+大文字の互換性は実装前に実機で baseline を取り、意図せず壊さない。

通常文字 `A` の UTF-8 入力まで `shift=t, sym="a"` に正規化してはいけない。通常文字入力は現在どおり挿入可能な `sym="A"` とする。

### Alt / Meta

KKP は Alt と Meta を別 bit として持つが、Lem Key は `meta` のみ。

初回方針:

```text
KKP alt  → Lem meta
KKP meta → Lem meta
```

Alt + Meta も Lem では1つの Metaへ畳み込む。

情報が失われることは仕様として明記する。

Super / Hyper はそのまま対応 slot へ入れる。

Caps Lock / Num Lock modifier bit は shortcut 照合から除外する。

未知 modifier bit があるイベントは、既知 shortcut として誤実行せず安全側に倒す。

## `C-]` abort

現行 `get-event` は raw code 29、つまり `C-]` を通常 Key にせず `:abort` として扱う。

flag 1 では `Ctrl+]` が CSI-u になるため、raw 29 の分岐だけでは abort が効かなくなる。

方針:

1. parser は `(make-key :ctrl t :sym "]")` 相当の Key を返す。
2. `get-event` がその Key を raw `C-]` と同じ `:abort` へ変換する。

Super / Shift 等の追加 modifier が付いた `Ctrl+]` まで一律 abort にしない。

parser 自身に Lem の abort semantics を持たせない。

## parser / collector の設計

### 責務を分ける

```text
wgetch read
  ↓
sequence collector
  ↓
pure parser
  ↓
KKP / legacy key data
  ↓
Lem Key conversion
  ↓
get-event
```

### sequence collector

役割:

- CSI の開始から final byte までを1イベントとして集める。
- partial sequence を管理する。
- `ERR` / timeout を文字として扱わない。
- resize 等の ncurses event を失わない。
- 長さ / 数値桁数に上限を持つ。
- 完全な sequence を読んだ後に、古い `csi\[1` をもう一度 stream から読ませない。

ECMA-48 の CSI parameter / intermediate / final byte の境界を利用する。

### pure parser

端末 I/O をしない。

完全な sequence を受け取り、少なくとも次を区別する。

```text
known key
known terminal response
unsupported complete event
malformed sequence
```

初回では query negotiation を行わないが、`CSI ? ... u` や DA / CPR のような明らかな terminal response を普通の Key として誤解釈しない。

未知 KKP event を修飾なしの通常文字へ downgrade しない。

未知 PUA codepoint を文字として挿入しない。

### legacy fallback

「新 parser が失敗したら既存 parser に stream を戻して再実行」という fallback は採らない。

一度 collector が sequence を消費した後では、旧 parser は次の入力を読むことになるため。

代わりに、現在 `csi\[1` が担当している既知 legacy CSI を新 parser 側でも扱い、既存成功ケースをテストで固定する。

## 初回 parser の対応範囲

flag 1 を有効化するため、少なくとも次を扱う。

### Unicode / control

```text
CSI number u
CSI number ; modifiers u
```

例:

```text
27u       → Escape
115;9u    → Super+s
99;5u     → Ctrl+c
93;5u     → Ctrl+]
```

modifier 省略は合法。省略時は modifier 1 相当。

### cursor / Home / End / F1-F4 系

```text
CSI A
CSI H
CSI F
CSI P
CSI Q
CSI S
CSI 1 ; modifiers [ABCDEFHPQS]
```

F3 の `CSI R` は CPR と衝突するため採用しない。

F3 は公式の `13~` 等を扱う。

### tilde functional keys

```text
CSI number ~
CSI number ; modifiers ~
```

Insert / Delete / Home / End / PageUp / PageDown / F1-F12 等、公式表と Lem named key の対応を作る。

### PUA functional keys

少なくとも:

- F13-F24
- non-text keypad key

を安全に分類する。

初回は Lem core のキー名を増やさず、keypad は既存等価キーへ正規化する案。

例:

```text
KP_Enter → Return
KP_Up    → Up
KP_Down  → Down
KP_Left  → Left
KP_Right → Right
```

対応できない PUA key はイベント全体を安全に無視し、文字として挿入しない。

### event type / advanced fields

初回に要求する flag は 1 のみ。

Report event types / alternate keys / all keys / associated text は要求しない。

ただし開始前から別の mode が設定されている等で高度な形式が届く可能性はあるため、collector は colon /追加 field を壊さず1イベントとして消費できる必要がある。

release event を key press としてコマンド実行しない。

## ncurses event との共存

collector は `wgetch` の返り値が常に byte だと仮定しない。

扱いを分ける。

```text
byte / ASCII
UTF-8 byte sequence
ncurses KEY_*
KEY_RESIZE
ERR
mouse related input
```

KKP のために `keypad` を無効化しない。

既存 terminfo / SS3 / function key 処理を全面再実装する変更へ広げない。

## mouse

現在 SGR1006 mouse parser は `ESC [ <` が生入力として来る経路を持つ一方、ncurses / terminfo の条件によっては `KEY_MOUSE` 相当へ先に変換される可能性がある。

KKP 変更で既存 mouse 問題までまとめて作り直さない。

ただし同じ環境で変更前後の mouse click / drag / scroll を必ず回帰確認する。

collector 中に mouse / resize が来た場合、捨てたり文字扱いしない。

## timeout

現行には少なくとも別の timeout 層がある。

- ESC 後: `escape-delay`
- CSI / UTF-8 追加 read: `with-getch-input-timeout`
- ncurses 自身の `ESCDELAY`

KKP 導入時に値を一括変更しない。

まず existing behavior を維持する。

ただし新 collector では:

- partial sequence
- `ERR`
- timeout 後の残り
- resize

を安全に処理するテストを作る。

`with-getch-input-timeout` を入れ子にすると timeout 復元が単純ではない点にも注意する。

## KKP の有効化

### 初回は明示設定

自動 support detection をしない代わりに、既存ユーザーの端末状態を勝手に変更しない。

`config.lisp` に boolean editor variable を追加する案。

名前案:

```lisp
enable-kitty-keyboard-protocol
```

初期値案:

```lisp
nil
```

ユーザーが有効にした場合のみ flag 1 を push する。

ユーザー側では WezTerm の `enable_kitty_keyboard = true` 等、端末側も KKP request を受け付ける設定である必要がある。

将来自動 detection を追加する場合でも、この明示設定を fallback / troubleshooting 用に残すかはその時点で検討する。

### なぜ自動 detection を初回から入れないか

support detection 自体は公式仕様にあるが、Lem の ncurses input path では次が追加で必要になる。

- query reply / DA reply の分類
- probe 中の通常入力保全
- delayed response の回収
- timeout / unknown 状態
- verification response と古い response の識別

今回の目的に対して変更範囲が大きい。

初回は公式 Quickstart の push/pop と明示 opt-in を組み合わせて安全性を確保する。

## lifecycle

目標:

```text
term-init
  ↓
KKP push（設定ONの場合）
  ↓
input-loop
  ↓
KKP pop（pushした場合）
  ↓
term-finalize
```

### push 所有権

`enabled` という結果だけで pop の要否を判断しない。

こちらが `CSI > 1 u` の送信を開始したか、少なくとも push を所有していると判断した時点から cleanup 対象にする。

二重 pop は開始前の stack entry を消す可能性があるため禁止。

状態は session 単位で持つ。

初回の明示 opt-in / no-query 設計なら、複雑な support state machine は不要だが:

```text
push attempted / owned
pop done
```

程度の cleanup ownership は必要。

### cleanup は二段にする

単純に cleanup へ:

```lisp
(teardown-kkp)
(term-finalize)
```

と並べるだけでは、`teardown-kkp` がエラーになった場合 `term-finalize` が実行されない可能性がある。

KKP teardown が失敗しても `term-finalize` が必ず走る保護構造にする。

### SIGKILL 等

`unwind-protect` で戻せない強制終了は存在する。

これは一般的な terminal mode と同じ制約。

正常終了、Lisp error、setup途中失敗、editor thread終了はテストする。

## terminal writer

KKP control sequence は、ncurses が操作している端末と同じ出力先へ送る必要がある。

注意:

- `mainloop.lisp` は editor 実行中に `*standard-output*` 等を broadcast stream へ束縛する。
- `term.lisp` の `*term-io*` は `term-set-tty` 経路で開く C `FILE*` で、Common Lisp stream ではない。
- `ncurses.lisp` にはロード時の `*terminal-io*` を保存した `*terminal-io-saved*` がある。
- ncurses の C stdio 出力と別経路の書き込みを混ぜる場合、順序と flush を考える必要がある。

したがって、KKP から直接 `format t` や外部 `printf` を呼ぶ実装にはしない。

`term.lisp` 側に raw terminal sequence writer を持たせ、出力先と flush を集約する案を採る。

正確な実装方法は、通常 `initscr` 経路で出力 trace を確認して決める。

## `term-set-tty` と初回対応範囲

`term-set-tty` 経路には、KKPとは別の既存懸念がある。

- `newterm` の SCREEN* 管理
- FILE* close と `endwin` の順序
- `delscreen` へ渡す対象
- OS 固有 ioctl 値

これらを KKP feature に抱き合わせで修正しない。

初回 KKP 自動有効化の対象は **通常の `initscr` 経路**に限定する案。

`term-set-tty` を使う経路は、別途確認できるまで KKP enable 対象外にする。

Windows / PDCurses も初回対象外。ロード自体を壊さないことは確認する。

## ファイル構成案

新規:

```text
frontends/ncurses/kitty-keyboard.lisp
```

package:

```lisp
:lem-ncurses/kitty-keyboard
```

責務:

- KKP 定数
- modifier decode
- KKP / CSI-u pure parser
- KKP functional key table
- Lem Key 変換
- push / pop 用の小さい lifecycle helper

`wgetch` 自体は `input.lisp` に残す。

sequence collector を `input.lisp` に置くか、新ファイルへ置くかは実装時に依存方向を見て決める。

`lem-ncurses.asd` では pure KKP code を `key.lisp` の後、`input.lisp` の前に置く案。

terminal writer は `term.lisp` に置き、KKP 側から term を呼ぶ方向にする。

## 実装順

### 1. baseline を取る

まだ KKP flag 1 を有効にしない。

現在の環境で:

- 通常文字
- UTF-8
- Ctrl
- Meta / Option
- Shift+Meta
- arrows
- Shift/Ctrl/Meta + arrows
- Home / End / Delete / Page
- F keys
- mouse
- resize
- `C-]` abort

の現状を記録する。

### 2. pure parser / Key変換

端末モードを変えずに実装する。

対象:

- CSI-u
- legacy functional CSI
- tilde form
- PUA functional key
- keypad normalization
- modifier mapping
- unsupported event の安全な reject

専用 unit test を作る。

### 3. sequence collector を input path へ統合

まだ flag 1 は有効にしない。

- ncurses key number と共存
- partial / timeout / ERR / resize
- legacy CSI 回帰
- mouse 回帰
- `C-]`

を通す。

### 4. terminal writer / lifecycle を作る

まだ実端末へ KKP push しない状態で writer を mock して:

```text
push
input loop
pop
finalize
```

の順序と cleanup failure をテストする。

### 5. 明示設定を追加

`enable-kitty-keyboard-protocol`（仮）を追加。

default は `nil`。

### 6. 実端末で flag 1 を有効化

parser / input integration が完成した後に初めて:

```text
CSI > 1 u
```

を送る。

終了時:

```text
CSI < u
```

を送る。

### 7. macOS 実機確認

WezTerm / Kitty 直結で確認する。

### 8. local へ統合

feature branch を直接他PR branchへ依存させず、日常利用の組み合わせは `local` で行う。

## テスト

### pure parser

最低限:

| 入力 | 期待 |
|---|---|
| `115;9u` | Super+s |
| `122;10u` | Shift+Super+z |
| `99;5u` | Ctrl+c |
| `93;5u` | Ctrl+] Key。parserではabortにしない |
| `27u` | Escape |
| `115u` / `115;1u` | modifierなし s |
| `1;9A` | Super+Up |
| `3;9~` | Super+Delete |
| `13;9~` | Super+F3 |
| `13;9u` | Super+Return |
| `9;9u` | Super+Tab |
| `127;9u` | Super+Backspace |
| `259;9u` | Super+U+0103。Upにしない |
| `57376u` | F13 |
| `57414u` | KP_Enter相当 |
| `57419u` | KP_Up相当 |

追加:

- modifier省略
- unknown modifier bit
- invalid scalar value
- surrogate
- U+10FFFF超
- 長大数値 / 長大sequence
- unknown PUA
- malformed final
- CPR / DA / KKP query reply を Key にしない
- release / advanced field を press と誤解釈しない

### Key / keyspec

- `Super+s` が keyspec と一致する。
- `Shift+Super+z` と `Super+Z` の違いを明示的にテストする。
- Alt / Meta mapping。
- C-i / C-m / C-[ の existing core conversion。
- 一般 UTF-8 文字が挿入可能。

### collector / get-event

- 1byteずつ分割された CSI。
- ESC のみ先行。
- sequence途中でtimeout。
- `ERR`。
- resize。
- ncurses変換済み `KEY_*`。
- raw CSI と `KEY_*` の共存。
- raw `C-]` と KKP `Ctrl+]` の両方が同じ非強制 abort。
- mouse click / drag / scroll。
- queue / partial data が次の通常文字へ漏れない。

### lifecycle

- 設定OFFなら push / pop しない。
- 設定ONなら push 1回 / pop 1回。
- push後の例外でも pop を試みる。
- pop失敗でも `term-finalize` が実行される。
- 二重popしない。
- editor thread終了時にも cleanup。

### 実機

#### WezTerm

端末側:

```text
enable_kitty_keyboard = true
```

確認:

- Cmd+s
- Cmd+z
- Cmd+Shift+z
- Cmd+arrow
- Ctrl+a / Ctrl+c / Ctrl+g / Ctrl+]
- Option/Meta + 文字
- Option/Meta + Shift + 文字
- Escape
- Tab / Shift+Tab
- Return
- Backspace / Delete
- F keys
- mouse
- resize
- 日本語入力
- paste
- key repeat
- Lem終了後の shell 入力

#### Kitty

同様に確認する。

## 初回の対象外

以下は、必要になったら別途扱う。

- KKP support auto detection
- `CSI ? u` + Primary DA negotiation
- push 後の query verification
- SSH / tmux / Zellij 等の multiplexer 対応保証
- DCS passthrough
- suspend / resume 時の KKP stack 管理
- `term-set-tty` 経路の KKP 有効化
- Windows / PDCurses
- Alt と Meta を Lem core で別 modifier にする変更
- C-i / Tab、C-m / Return、C-[ / Escape を core で完全に分離する変更
- event type / alternate key / associated text 等、flag 1 以外の enhancement

これらを「未対応だから設計失敗」とは扱わないが、対応済みとも説明しない。

## 将来 support detection を追加する場合

必要性が出た場合は公式方式を使う。

```text
CSI ? u
Primary Device Attributes query
```

ただし追加時には最低限:

- input reader を1つに保つ
- KKP reply / DA reply を通常Keyへ流さない
- probe中のユーザー入力を捨てない
- timeoutを unsupported と同一視しない
- delayed reply を後続文字として漏らさない
- old reply と verification reply を取り違えない

を解決する。

support detection は parser 完成後に追加する。

## 守るべき条件

1. 設定OFFでは既存の入力動作を変えない。
2. CSI-u parser は KKP enable state と独立して動く。
3. KKP flag 1 を実端末へ送る前に、その形式を input path が処理できる。
4. `wgetch` を raw byte reader と仮定しない。
5. Unicode codepoint を ncurses key number table へ流さない。
6. 未知 event を既知 shortcut へ downgrade しない。
7. terminal response を通常 Key として送らない。
8. `C-]` abort を維持する。
9. current mouse / resize / legacy function key を回帰させない。
10. push / pop を対にし、二重popしない。
11. pop失敗でも ncurses cleanup を止めない。
12. KKP以外の既存TTY問題を feature に無理に混ぜない。

## まだ実装前に決めること

### 1. Shift+文字の keyspec 方針

KKP の `Shift+Super+z` を、そのまま:

```text
Shift + Super + sym="z"
```

として bind する方針を基本にする。

既存の `M-Z` 等との互換を baseline で確認する。

### 2. keypad の対応表

KKP PUA keypad code をどの既存 Lem named key へ正規化するか、公式表と Lem key table を並べて確定する。

### 3. terminal writer の実装

通常 `initscr` 経路で、ncursesの画面切替と KKP push/pop の順序を実出力で確認してから決める。

### 4. config 変数名

`enable-kitty-keyboard-protocol` は仮名。

Lem ncurses の既存 naming に合わせて最終決定する。

## まとめ

今回の KKP 対応は、`Cmd+s` の escape sequence を1つ追加する作業ではない。

flag 1 を使うと Ctrl / Escape / Alt / keypad 等の入力形式も変わる。

一方、support detection まで初回から実装すると、query response / DA / timeout / delayed reply / input buffering まで一気に責務が広がる。

そのため初回は:

```text
既存入力の baseline
  ↓
KKP / CSI collector + parser
  ↓
Lem Key 変換
  ↓
input.lisp 統合
  ↓
既存入力回帰
  ↓
明示 opt-in config
  ↓
CSI > 1 u
  ↓
実機確認
  ↓
CSI < u
```

という順序で進める。

**parser と activation を分離し、activation は parser が実際の input path へ統合された後にだけ行う。**

これを初回実装の中心原則とする。