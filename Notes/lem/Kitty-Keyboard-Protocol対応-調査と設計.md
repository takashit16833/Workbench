# Lem ncurses Kitty Keyboard Protocol 対応 - 調査と設計案

## このノートの目的

Lem の ncurses フロントエンドへ Kitty Keyboard Protocol（以下 KKP）対応を追加するにあたり、仕様・現行コード・実機観測を整理し、実装案をレビューできる状態にする。

このノートは「確定済みの仕様書」ではない。特に設計判断については、別の AI や人間が前提からレビューできるよう、採用案だけでなく代替案・リスク・未確定点も残す。

今回の重要な前提は次のとおり。

- KKP 対応端末だけを前提にして既存入力処理を置き換えない。
- KKP を有効化できない環境では、現在の Lem ncurses の入力処理を維持する。
- 一方で CSI-u 形式そのものは KKP の progressive enhancement が無効でも送られる場合があるため、「KKP が有効なときだけ CSI-u を解析する」という単純な分岐にも依存しない。
- 端末や multiplexer の名前を決め打ちせず、可能ならプロトコルの問い合わせで能力を確認する。
- 実装前に parser と negotiation をテスト可能な形へ分離する。

## 調査時点

- 調査日: 2026-10-03
- Lem fork: `takashit16833/lem`
- 調査した `main`: `27572e42923a99d1dee0be8b991e0bfd2113b24d`
- 対象フロントエンド: `frontends/ncurses`

主に確認したファイル:

- `frontends/ncurses/input.lisp`
- `frontends/ncurses/key.lisp`
- `frontends/ncurses/mainloop.lisp`
- `frontends/ncurses/term.lisp`
- `frontends/ncurses/lem-ncurses.asd`
- `src/key.lisp`

## 参照仕様・参考実装

### KKP 公式仕様

https://sw.kovidgoyal.net/kitty/keyboard-protocol/

今回特に重要な箇所:

- Quickstart
- Progressive enhancement
- Detection of support for this protocol
- Modifiers
- Legacy key event encoding
- Functional key definitions

### WezTerm

https://wezterm.org/config/lua/config/enable_kitty_keyboard.html

`enable_kitty_keyboard = true` のとき、WezTerm はアプリケーションから送られた KKP の keyboard encoding 変更要求を処理する。

### Emacs kkp

https://github.com/benotn/kkp

参考にした点:

- KKP 対応を動的に検出している。
- malformed reply、partial reply、slow SSH などを想定したテストがある。
- KKP 有効時に Ctrl 系キーのバイト表現が変わることを明示している。

### crossterm

https://github.com/crossterm-rs/crossterm/blob/master/src/event.rs

参考にした点:

- `DISAMBIGUATE_ESCAPE_CODES` を明示的な enhancement flag として扱う。
- push と pop をペアで扱う。
- Super / Hyper / Meta を独立した modifier として扱う。

## 用語

### KKP 対応

端末、または端末までの経路が KKP を理解できること。

端末単体が対応していても、途中に multiplexer が入り、その問い合わせや escape sequence を正しく通さなければ、アプリケーションから見て利用可能とは限らない。

したがって `TERM_PROGRAM=WezTerm` のような環境変数だけで判定する方針は採らない。

### KKP enhancement が有効

KKP 対応端末で progressive enhancement flags が設定されている状態。

今回まず使いたいのは flag `1`:

```text
Disambiguate escape codes = 0b1
```

### CSI-u

`CSI ... u` 形式のキーイベント。

`CSI` は実際には次の2バイト。

```text
ESC [
0x1b 0x5b
```

例:

```text
ESC[115;9u
```

これは今回の実機では `Cmd+s` を表した。

注意: 「CSI-u = enhancement 有効時だけの入力」ではない。公式仕様では legacy mode でも従来形式で表現できないキーを CSI-u で送ることがある。

## KKP 仕様で確認したこと

### Quickstart

公式 Quickstart では、アプリケーション側は起動時に次を送る。

```text
CSI > 1 u
```

終了時には次を送る。

```text
CSI < u
```

`CSI > 1 u` は単なる「ON」ではなく、現在の keyboard mode を端末側スタックへ push したうえで flag 1 を使う形になる。

`CSI < u` はスタックを pop し、アプリケーション開始前の状態へ戻す。

そのため、終了時に `CSI = 0 u` のようにゼロへ上書きするより push/pop を使うべき。

### enhancement flags の問い合わせ

現在値の問い合わせ:

```text
CSI ? u
```

対応端末の返答:

```text
CSI ? <flags> u
```

例:

```text
ESC[?0u
```

なら現在の enhancement flags は 0。

### 対応検出

公式仕様では、KKP 対応検出のために `CSI ? u` だけを送って固定 timeout 待ちするより、続けて Primary Device Attributes の問い合わせを送り、その応答を境界として使う方法が説明されている。

考え方:

```text
CSI ? u
Primary Device Attributes query
        ↓
KKP reply が先に来た
        → KKP 対応

Device Attributes reply まで来たのに KKP reply がない
        → KKP 非対応
```

この方法なら「非対応端末なので返答がない」のか「単に遅い」のかを、固定時間だけで決めにくくできる。

ただし実際の Lem 実装では、問い合わせ中にユーザー入力が混ざった場合に捨てない仕組みが必要。

### flag 1 の影響

flag 1 を有効にすると、従来は1バイトや ESC-prefix だったキーの一部が CSI-u になる。

例:

```text
Ctrl+c
Ctrl+]
Escape
Alt+key
Ctrl+Alt+key
```

したがって、`Cmd+s` だけを解析できる状態で flag 1 を有効にするのは危険。

### キーイベント形式

Quickstart の中心形式:

```text
CSI number ; modifiers [u~]
CSI 1 ; modifiers [ABCDEFHPQS]
```

通常文字は flag 1 だけなら引き続き UTF-8 テキストとして届く。

Enter / Backspace / Tab も flag 1 だけなら legacy 表現が残る。

### modifier

KKP の modifier bit:

```text
shift  = 1
alt    = 2
ctrl   = 4
super  = 8
hyper  = 16
meta   = 32
caps   = 64
num    = 128
```

escape sequence 上の値は `1 + bit field`。

そのため Super のみなら:

```text
8 + 1 = 9
```

`Cmd+s` の例:

```text
ESC[115;9u

115 = Unicode codepoint 's'
9   = Super
```

macOS では KKP の Super は Command キーに対応する。

## 実機で確認したこと

環境:

- macOS
- WezTerm
- Lem ncurses

### enhancement 無効状態

```sh
printf '\033[?u'; xxd
```

返答:

```text
^[[?0u
```

よって enhancement flags は 0。

この状態で `xxd -g 1` に対して `Cmd+s` を押すと、今回の環境では通常の `s` として見えた。

### 手動で flag 1 を push

```sh
printf '\033[>1u'
```

その後 `Cmd+s` を押すと:

```text
^[[115;9u
```

つまり WezTerm からアプリケーションへ:

```text
ESC[115;9u
```

が届いた。

また、この状態では `xxd` に対する `Ctrl+C` / `Ctrl+D` / `Ctrl+Z` が従来のシグナルや EOF として働かなくなった。

これは flag 1 によって Ctrl 系キーが escape sequence としてアプリケーションへ渡ることと一致する。

## 現行 Lem ncurses の入力経路

概略:

```text
keyboard
  ↓
OS
  ↓
terminal emulator
  ↓
PTY
  ↓
ncurses / wgetch
  ↓
frontends/ncurses/input.lisp
  ↓
Lem Key
```

### `input.lisp`

`getch` は `wgetch` を使って ncurses から入力コードを取る。

通常文字は `get-key` → `char-to-key` で Lem の Key へ変換する。

ESC が来た場合だけ手動で続きを読む。

現状の CSI 部分は概略次の形。

```lisp
(case (getch)
  (#.(char-code #\<)
   ;; SGR mouse
   ...)
  (#.(char-code #\1)
   (csi\[1))
  (t
   (get-key-from-name "escape")))
```

つまり `ESC [` の直後について:

```text
<  → mouse
1  → csi[1
その他 → Escape 扱い
```

### `csi\[1`

現在は主に次のような legacy CSI を処理している。

```text
1;2A → Shift+Up
1;3A → Meta+Up
1;5A → Ctrl+Up
...
```

modifier 2〜8 を case で個別に分け、A/B/C/D/F/H を Up/Down/Right/Left/End/Home へ変換している。

この実装は:

- 数値部分が `1` 固定
- modifier が1桁の 2〜8 固定
- `u` 終端を扱わない
- Super / Hyper を扱わない

ため、そのままでは KKP の `115;9u` を処理できない。

### 重要: `C-]` の特別扱い

`get-event` は通常キー変換より前に、ncurses code が `C-]` の値なら `:abort` を返している。

```text
C-] raw byte
  ↓
:abort
```

flag 1 が有効になると `Ctrl+]` は CSI-u 形式になるため、現在の `abort-code` 判定を通らなくなる。

したがって KKP parser が `Ctrl+]` を Lem Key にできるだけでは不十分で、従来の `:abort` セマンティクスを維持する処理が必要。

これは今回特にレビューしてほしい点。

### `key.lisp` と `src/key.lisp`

Lem の core `key` struct はすでに次を持つ。

```lisp
ctrl
meta
super
hyper
shift
sym
```

つまり Super と Hyper を表すために core Key 型を拡張する必要はない。

一方、KKP は `alt` と `meta` を別 modifier として持つが、Lem の ncurses では従来 ESC-prefix を `:meta t` として扱っている。

初期案では:

```text
KKP alt   → Lem meta
KKP super → Lem super
KKP hyper → Lem hyper
KKP meta  → 要検討
```

とする。

`KKP meta` も Lem meta へ畳み込む案はあるが、KKP alt と区別できなくなる。Lem core に Alt がないため、ここはレビュー対象。

Caps Lock / Num Lock も Lem Key に対応フィールドがない。flag 1 の初期実装では shortcut の modifier としては無視する案を考えている。

### `mainloop.lisp`

`invoke` は現在:

```text
term-init
  ↓
input-loop
  ↓
unwind-protect cleanup
  ↓
term-finalize
```

という構造。

KKP の stack は main screen と alternate screen で別管理される仕様なので、ncurses が screen をセットアップした後に push し、screen を終了する前に pop する必要がある。

そのため lifecycle の位置は:

```text
term-init
  ↓
KKP setup
  ↓
input-loop
  ↓
KKP teardown
  ↓
term-finalize
```

が自然。

`unwind-protect` cleanup 内で KKP teardown を `term-finalize` より前に実行する。

### `term.lisp`

`term-init` は raw mode / keypad 等を設定する。

現状、任意の control sequence を「ncurses が実際に使っている同じ TTY」へ送るための共通 API は見当たらない。

`update-cursor-shape` は外部 `printf` プロセスを `:output :interactive` で呼んでいる。

KKP では問い合わせと返答を厳密に同じ端末 I/O へ流したいので、外部 `printf` に依存せず、`term.lisp` に terminal sequence 書き込み関数を用意する案を考える。

`term-set-tty` が使われるケースでは、process stdout と ncurses が使う TTY が一致しない可能性があるため、この点もレビュー対象。

## 危険だった初期案

最初に考えかけた案は:

```text
Lem 起動
  ↓
無条件に CSI > 1 u
  ↓
KKP が使える前提で input.lisp を拡張
```

だった。

これは採用しない。

問題:

1. KKP 非対応端末で有効化できたか確認していない。
2. flag 1 は Cmd だけでなく Ctrl / Escape / Alt 等の既存入力表現も変える。
3. parser が部分対応のまま enhancement を有効化すると、既存キーを壊す。
4. `C-]` の abort のように、単なる Key 変換以外の既存セマンティクスも壊れる。
5. terminal multiplexer を挟んだとき、端末名だけで能力を判断できない。

## もう一つの注意: 「有効なら KKP parser、無効なら legacy parser」も単純すぎる

一見自然な案:

```text
KKP enabled
  → KKP parser

KKP disabled
  → existing parser
```

にも問題がある。

公式仕様では legacy mode でも、従来形式では表現できないキーイベントを CSI-u で送ることがある。

したがって **CSI-u の構文認識そのものは KKP enabled state に依存させない** 方がよいと考える。

状態で分けるのは:

- enhancement をこちらから要求するか
- enhancement 有効時に期待される入力形式
- teardown 時に pop が必要か

であり、CSI-u parser 自体は additive に利用する。

## 提案する設計

### 方針

1. KKP の protocol parser と terminal negotiation を分離する。
2. CSI-u parser は enhancement state に関係なく、受信したら解釈できる。
3. enhancement は KKP 対応と要求 flag の有効化を確認できたときだけ使う。
4. 非対応・不明なら legacy mode のまま。
5. KKP parser が認識できない CSI は既存挙動へ fallback する。
6. terminal state の変更は必ず push/pop で対にする。

### 新規ファイル案

```text
frontends/ncurses/kitty-keyboard.lisp
```

package:

```lisp
:lem-ncurses/kitty-keyboard
```

責務:

- KKP の定数
- modifier decode
- CSI-u / KKP key sequence の純粋 parser
- query reply の parser
- enhancement state

端末から実際に読む `wgetch` 自体は `input.lisp` に残す。

`lem-ncurses.asd` では `key.lisp` の後、`input.lisp` の前に読み込む案。

### state

単純な `*kitty-keyboard-enabled-p*` だけでなく、少なくとも次を区別したい。

```text
:unknown
:unsupported
:enabled
```

ただし実装を必要以上に複雑にしないため、最終的には:

```lisp
*kitty-keyboard-supported-p*
*kitty-keyboard-enabled-p*
```

程度でもよい。

push 後の verification に失敗した場合は、その場で pop して enabled にしない。

### setup の案

擬似コード:

```text
probe KKP support

unsupported / timeout / malformed
  → legacy mode のまま

supported
  → CSI > 1 u
  → CSI ? u で再確認
  → bit 1 が立っている
       → enabled
    bit 1 が立っていない / malformed / timeout
       → CSI < u
       → legacy mode
```

対応確認は公式仕様に合わせ、`CSI ? u` と Primary Device Attributes query の組み合わせを使う案。

### なぜ push 後にも query するか

公式仕様は実装によって enhancement の一部だけを実装する可能性にも触れている。

そのため:

```text
terminal supports KKP
```

と

```text
requested flag 1 is actually active
```

を分けて確認する。

### teardown

enabled にできた場合だけ:

```text
CSI < u
```

を送る。

`term-finalize` より前に行う。

異常終了でも Common Lisp の制御が戻るケースでは `unwind-protect` で pop する。

`SIGKILL` や端末自体の強制終了では cleanup 不可能。これは一般的な terminal mode と同じ制約として扱う。

### terminal write API

`term.lisp` に例えば:

```lisp
(write-terminal-sequence string)
```

のような API を追加する案。

要件:

- ncurses が実際に使用している TTY へ書く。
- `term-set-tty` 利用時も stdout 決め打ちにしない。
- `finish-output` 相当で問い合わせを確実に端末へ出す。
- shell の `printf` subprocess を毎回作らない。

実際に `*term-io*` / `*tty-name*` / Common Lisp stream のどれを使うのが最も安全かは要レビュー。

### query 中の入力保全

startup negotiation 中にユーザーがキーを押す可能性がある。

問い合わせ parser が KKP reply と Device Attributes reply 以外の入力を読んだ場合、その入力を捨ててはいけない。

案:

- `input.lisp` に pending input queue を持つ。
- negotiation 中の unrelated byte / event を queue へ戻す。
- 通常 `getch` は queue を先に消費する。

ncurses / cl-charms の `ungetch` が安全に使えるなら、それを使う案も比較する。

ここは実装前に確認する。

### CSI 読み取り

現在の `case (getch)` の枝を闇雲に増やすのではなく、数字で始まる CSI key sequence をまとまりとして読む。

ただし SGR mouse の:

```text
CSI < ... M/m
```

は現在の専用処理を維持する。

イメージ:

```text
ESC [
  ↓
first char
  ├─ <
  │   → existing mouse parser
  │
  └─ number / supported CSI key prefix
      → read key CSI sequence
      → parse KKP / legacy functional form
      → Lem Key
```

### `csi\[1` の扱い

現在の `csi\[1` を KKP 専用に拡張する案は採らない。

理由:

- KKP の codepoint は `115`、`97` など `1` 以外でも始まる。
- `1;...` 自体も legacy functional key と KKP functional key の両方で使う。
- Super modifier は 9 以上になり、現行の1文字 case では扱いにくい。

代わりに、CSI key sequence を文字列または構造として一度読み、pure parser で解釈する。

既存の `csi\[1` が処理している `1;2A` 等も新 parser 側へ移す案。

### parser が扱う初期範囲

flag 1 を有効化する以上、`Cmd+s` だけの対応では不足。

少なくとも Quickstart で flag 1 使用時に必要な形式を対象にする。

#### Unicode / control key

```text
CSI number ; modifiers u
```

例:

```text
115;9u → Super+s
99;5u  → Ctrl+c
27u    → Escape
```

#### arrows / Home / End / F1-F4 等

```text
CSI 1 ; modifiers [ABCDEFHPQS]
```

例:

```text
1;9A → Super+Up
```

#### `~` 系 functional keys

```text
CSI number ; modifiers ~
```

Insert / Delete / PageUp / PageDown / F5 以降など、公式 Functional key table のうち Lem が named key として持つものを対応させる。

### modifier mapping 案

```text
KKP shift → Lem shift
KKP alt   → Lem meta
KKP ctrl  → Lem ctrl
KKP super → Lem super
KKP hyper → Lem hyper
KKP meta  → Lem meta ?
```

`alt → meta` は現行 ncurses が ESC-prefix を Meta として扱うこととの互換性を優先した案。

`KKP meta` の扱いは要レビュー。

Caps Lock / Num Lock は初期実装では Lem Key modifier に反映しない案。

### `C-]` abort の維持

KKP parser が生成した Key が:

```lisp
(make-key :ctrl t :sym "]")
```

なら、現在の raw `abort-code` と同じく `:abort` を返す必要がある。

実装方法候補:

1. parse 後の Key を `get-event` で `C-]` と比較し `:abort` へ変換する。
2. KKP parser 自体が special event を返す。

責務分離の観点では 1 を推す。

parser は Key を返し、Lem ncurses 固有の abort セマンティクスは `get-event` が担当する。

### Escape timeout

現行 `get-event` は:

- ESC の次の1文字に `escape-delay`
- CSI 内に 100ms

の timeout を使っている。

flag 1 有効時は Escape キー自体が CSI-u になるため曖昧性は減るが、既存 timeout をそのまま残すと slow SSH / multiplexer で途中の sequence を切る可能性がある。

今回の PR で timeout 機構まで大きく変更するかは慎重に判断する。

最低限、parser 単体では partial input を誤変換しないテストを用意する。

## 採用を考えている実装順

これは PR を分ける意味ではなく、同一 feature branch 内で安全に確認する順番。

### 1. pure parser とテスト

端末状態を変更せず、文字列から Lem Key を生成する処理を作る。

この段階では KKP を有効化しない。

### 2. terminal query / detection

`CSI ? u` + Device Attributes を使った対応確認を実装する。

問い合わせ reply parser をテストする。

### 3. push / verification / pop

対応確認できた場合だけ flag 1 を push。

再 query で flag 1 を確認。

失敗時は即 pop して legacy mode に戻す。

### 4. `get-event` へ統合

- mouse を維持
- CSI key parser を追加
- existing legacy CSI を新 parser でも再現
- `C-]` abort を維持

### 5. `mainloop` lifecycle へ統合

```text
term-init
setup KKP
input-loop
teardown KKP
term-finalize
```

### 6. 実機テスト

WezTerm / Kitty / KKP 無効化 WezTerm で確認する。

## テスト案

### parser unit test

最低限:

```text
115;9u  → Super+s
122;10u → Shift+Super+z
99;5u   → Ctrl+c
93;5u   → Ctrl+]
1;9A    → Super+Up
3;9~    → Super+Delete
```

modifier:

```text
1 → none
2 → Shift
3 → Alt/Meta
5 → Ctrl
9 → Super
複合 bit
```

異常系:

- 数値欠落
- modifier 欠落
- 不正 terminator
- partial sequence
- 非数値
- 未知 functional key

### support detection test

ケース:

1. KKP reply → DA reply
   - supported
2. DA reply だけ
   - unsupported
3. garbage → KKP reply → DA
   - supported、garbage は input queue に残す
4. partial reply
   - fallback
5. timeout
   - fallback
6. push 後 query で flag 1 が立たない
   - pop して disabled

### 既存入力の回帰

- 通常文字
- UTF-8
- Ctrl+a 等
- Meta/Option 系
- Escape
- arrow
- Shift/Ctrl/Meta + arrow
- Delete / Home / End / PageUp / PageDown
- F keys
- mouse
- resize
- `C-]` abort

### 実機 matrix

#### WezTerm / KKP 許可

- Cmd+s
- Cmd+z
- Cmd+Shift+z
- Cmd+arrow
- Ctrl 系
- Option/Meta 系
- mouse
- 日本語入力
- Lem 終了後に keyboard flags が元へ戻る

#### WezTerm / KKP 許可なし

`enable_kitty_keyboard=false` 相当で:

- KKP を enabled 扱いしない
- legacy key handling が壊れない
- 起動待ちが不自然に長くならない

#### Kitty

同様に確認。

#### multiplexer

初回 PR の必須条件にするかは要検討。ただし設計上は端末名ではなく query で判定するため、対応している経路なら自然に利用できる形を目指す。

## 既存動作を壊さないための invariants

レビュー時に特に確認してほしい条件。

1. KKP 非対応なら現行 Lem と同じ入力経路で動く。
2. KKP detection failure を「対応」と誤判定しない。
3. enhancement 有効化前に必要 parser が揃っている。
4. push したら、制御可能な終了経路では必ず pop する。
5. pop は `term-finalize` より前。
6. query reply を通常キー入力として Lem へ流さない。
7. query 中に押されたユーザー入力を捨てない。
8. mouse sequence を KKP parser が奪わない。
9. `C-]` abort を維持する。
10. legacy CSI の既存 Shift/Meta/Ctrl + arrow を壊さない。
11. KKP enabled state と CSI-u parser の有無を同一視しない。

## レビューしてほしい論点

### A. support detection

`CSI ? u` + Primary Device Attributes を使う同期 probe を `term-init` 後 / input-loop 前に置く案は妥当か。

より良い方法として通常 event loop に query response を統合すべきか。

### B. query 中の input buffering

pending input queue を `input.lisp` に追加するのが妥当か。

`ungetch` 等、ncurses の既存機能を使う方がよいか。

### C. terminal output

`term-set-tty` を考慮して、KKP control sequence をどの stream / fd へ書くべきか。

`term.lisp` に汎用 raw terminal writer を追加する設計でよいか。

### D. parser の常時有効化

CSI-u は legacy mode でも来る可能性があるため、KKP enabled state に依存せず認識する方針でよいか。

### E. Alt / Meta mapping

KKP Alt と KKP Meta を Lem の単一 `meta` へどう対応させるか。

### F. 初回対応範囲

flag 1 を要求するなら、Quickstart に記載された key event forms を一通り実装してから有効化するべき、という判断でよいか。

### G. `C-]` abort

Key parser の外側で `Ctrl+]` を `:abort` へ変換する案でよいか。

### H. timeout

現行 100ms timeout を初回 PR では維持するか、KKP 導入と同時に見直すべきか。

## 現時点の推奨案

現時点では次を推す。

```text
                  ┌──────────────┐
                  │ term-init    │
                  └──────┬───────┘
                         ↓
              KKP support probe
                         ↓
            ┌────────────┴────────────┐
            │                         │
       unsupported                supported
            │                         │
            │                   push flag 1
            │                         │
            │                     query flag
            │                         │
            │               ┌─────────┴─────────┐
            │               │                   │
            │          verified             failed
            │               │                   │
            │          KKP enabled              pop
            │               │                   │
            └───────────────┴───────────────┬───┘
                                            ↓
                                      input-loop
                                            ↓
                                 CSI-u parser is additive
                                            ↓
                                      teardown
                                            ↓
                                   pop only if pushed
                                            ↓
                                     term-finalize
```

重要なのは:

```text
KKP state
```

と

```text
CSI-u を解析できること
```

を別物として扱うこと。

KKP enhancement が使えなくても既存処理は維持する。

CSI-u が届いた場合は enhancement state にかかわらず、認識可能なら Lem Key へ変換する。

## 実装前に追加で確認したいこと

- cl-charms / ncurses の `ungetch` が現在の依存バージョンで使えるか。
- `term-set-tty` の実際の利用箇所と用途。
- Primary Device Attributes query を現在の `wgetch` / keypad 設定下でどう受け取るか。
- ncurses が alternate screen に入る正確なタイミングと `term-init` / `term-finalize` の関係。
- Lem の keyspec で Super / Hyper / Shift+Super の組み合わせが想定どおり bind / print / compare できること。
- KKP Meta と Lem Meta のマッピング方針。

## まとめ

今回の目的は `Cmd+s` を通すことだけではない。

KKP の flag 1 を要求すると既存の Ctrl / Escape / Alt 等の表現まで変わるため、protocol negotiation と parser の対応範囲をセットで考える必要がある。

また、KKP が無効でも CSI-u が現れる可能性があるため、`enabled?` の真偽だけで parser を完全に切り替える設計も避ける。

現時点では:

- KKP 対応を protocol query で確認
- flag 1 を push し、実際に有効になったことを確認
- 非対応・失敗時は legacy mode
- CSI-u parser は additive に常時利用可能
- existing CSI / mouse / abort semantics を維持
- push/pop を ncurses screen lifecycle の内側で対にする

という構成を推奨する。

この設計自体をレビューしたうえで、実装へ進む。