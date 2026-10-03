# Lem ncurses Kitty Keyboard Protocol 対応 — 設計レビュー

## 1. 結論と、このノートの読み方

**元の設計の方向は妥当だが、そのまま有効化処理を実装する段階には達していない。** 特に、入力を読む単位、遅延した問い合わせ応答、push の所有権、Unicode と ncurses キー番号の分離、テンキー、Lem core のキー変換を先に確定する必要がある。

このレビューは実装依頼ではない。以下の「推奨」は設計判断の提案であり、実機確認済みの実装を意味しない。Lem 本体・設定・既存の調査ノートは変更していない。

レビュー対象: [Kitty-Keyboard-Protocol対応-調査と設計.md](./Kitty-Keyboard-Protocol対応-調査と設計.md)。以下では「元ノート」と呼ぶ。

重要度の意味:

- **P0**: 解決せずに flag 1 を有効化してはいけない。入力不能、別コマンドの実行、端末状態の取り違えにつながる。
- **P1**: 日常利用開始までに方針・試験を確定する。条件付きの対応を明示することも解決方法に含む。
- **P2**: 初回対応から外せるが、制約を記録する。

証拠の区分:

- **コード確認**: 下記 SHA のソースを実際に読んだ結果。
- **仕様確認**: 公式仕様・ncurses 公式資料に書かれた性質。
- **補助実測**: このレビュー環境の Linux + ncurses で観測した結果。ユーザーの macOS + WezTerm での観測ではない。
- **設計上の推論**: 上記から導いた故障経路。Lem 実機で発生を再現したこととは区別する。
- **未確認**: 実装・端末・依存ライブラリの実際の版を使った確認が必要な事項。

以降の行番号は固定 SHA に対する位置。将来の main の行番号として扱わない。

## 2. 調査対象と再現性

調査日: 2026-10-03（日本時間）。調査中と記録作成時に remote の main / local を確認した。

| 対象 | 確認した版 | 結果 |
|---|---|---|
| `takashit16833/lem` main | `27572e42923a99d1dee0be8b991e0bfd2113b24d` | 元ノートの参照 SHA と一致 |
| 同 local | `6371b46377ad5783067fe624dfc6aec02335f03b` | 対象6ファイルでは term.lisp のパレット初期化1行のみ main と異なる |
| 同 fix/ncurses-terminal-colors | `6371b46377ad5783067fe624dfc6aec02335f03b` | local と同じ head |
| Workbench の元ノート | commit `835ccfc3f7a0649583884beaa72e4e9e70629e1a` / blob `60bd5f20adc0fe65124250db326367cdf2d611d1` | GitHub 経由で全文を取得 |
| cl-charms 参考ソース | `HiTECNOLOGYs/cl-charms` の `74956e33ecbafd5a948be50532d102bfcdca2fa8` | バインディングを確認。ユーザーに実際にインストールされた版とは未照合 |
| 補助実測環境 | Linux / Python curses / ncurses `6.5-20240427` / `TERM=xterm-256color` | `wgetch` 相当の返り値を PTY 経由で観測 |

ユーザー環境の Lem をビルド・起動しての確認、macOS の ncurses、WezTerm/Kitty の実キー操作、SSH/multiplexer の実機試験は本レビューでは実施していない。レビュー環境に SBCL はなく、Lem のテスト一式も実行していない。以下を「Lem 全体のテストが通った」という記録に読み替えないこと。

### 2.1 必須6ファイルの確認記録

リンクは main の移動する URL ではなく、確認済み SHA に固定した。

| ファイル | 実際に確認した箇所 | 元ノートとの照合 |
|---|---|---|
| [frontends/ncurses/input.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/input.lisp) | 全144行。getch、with-getch-input-timeout、get-key、csi\[1、get-event | 概略は一致。ただし keypad の先行解析、ERR/resize、pad の遅延生成が設計に十分反映されていない |
| [frontends/ncurses/mainloop.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/mainloop.lisp) | 全47行。input-loop、invoke | lifecycle の概略は一致。出力ストリームの束縛と cleanup 失敗時の扱いが不足 |
| [frontends/ncurses/term.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/term.lisp) | 全500行。特に415–494行 | raw/keypad/refresh は一致。term-io は Lisp stream ではなく C FILE*。finalize の既存問題が見落とされている |
| [frontends/ncurses/key.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/key.lisp) | 全193行。char-to-key、defkeycode、全キー表 | Super/Hyper の型拡張不要という結論は一致。Unicode への流用と Insert/テンキーの扱いは要修正 |
| [frontends/ncurses/lem-ncurses.asd](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/lem-ncurses.asd) | 全20行。serial components、条件付き依存 | key の後/input の前への追加は可能。ただし term は key より前にロードされる |
| [src/key.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/key.lisp) | 全185行。key struct、convert-key、make-key、match-key、key-to-char | 構造体の確認だけでは不足。既存の C-i/C-m/C-[ 変換、キャッシュ、文字挿入条件も見る必要がある |

### 2.2 追加で確認したコード

- [src/input.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/input.lisp): `keys-equal-p`、`maybe-convert-to-meta`、`read-key`、`read-event`。
- [src/keymap.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/keymap.lisp): `parse-keyspec`（394–423行）、`insertion-key-p`（535行以降）、キー検索とキャッシュされた Key の利用。
- [src/event-queue.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/event-queue.lisp): `send-event`、`send-abort-event`、`receive-event`。
- [src/buffer/interrupt.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/buffer/interrupt.lisp): `interrupt` の force の違い。
- [src/commands/edit.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/commands/edit.lisp): 通常挿入・Backspace/C-h の既存割り当て。
- [frontends/ncurses/ncurses.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/frontends/ncurses/ncurses.lisp): `*terminal-io-saved*`（113行）。
- [contrib/mouse-sgr1006/main.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/contrib/mouse-sgr1006/main.lisp): マウスの parser と有効化/無効化 hook。
- [lem-tests.asd](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/lem-tests.asd)、[tests/input.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/tests/input.lisp)、[tests/keymap.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/tests/keymap.lisp)、[tests/self-insert-command.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/tests/self-insert-command.lisp): 現在の試験範囲。
- [qlfile.lock](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/qlfile.lock): Quicklisp 配布版は2025-06-22。参考に読んだ cl-charms master とインストール済み依存が同一という保証はない。

## 3. 元ノートで、そのまま採用できる前提

1. `CSI > 1 u` と `CSI < u` をペアにし、端末名の決め打ちを避ける。
2. flag 1 が Cmd だけでなく Escape/Ctrl/Alt 等へ影響することを考慮する。
3. CSI-u の認識と、Lem が enhancement を要求している状態を分ける。
4. `C-]` は単なるコマンドキーではなく ncurses frontend の `:abort` として保持する。
5. 純粋な構文解析、入力の収集、端末との問い合わせ処理を分けて試験できるようにする。
6. KKP query + Primary DA を使う検出方法と、有効化後の問い合わせは仕様に根拠がある。
7. screen の準備後に push、screen の終了前に pop する順番は正しい方向。

ただし、上記だけで「既存入力を維持できる」という証明にはならない。以下が追加で必要。

## 4. 指摘の一覧

| ID | 重要度 | 指摘 | 性質 |
|---|---|---|---|
| R01 | P0 | wgetch の入力を生バイトと見なせない | 現行コードと補助実測 |
| R02 | P0 | 同じ TTY だけでなく、C stdio と画面出力の順序を保証する必要がある | 現行コード・設計不足 |
| R03 | P0 | enabled と push 所有権が別。rollback 後も legacy とは限らない | 仕様・設計矛盾 |
| R04 | P0 | DA の残りと遅延応答を通常入力ループでも処理する必要がある | 現行コード・設計不足 |
| R05 | P0 | 未知/壊れた CSI を読んだ後の fallback が未定義 | 現行コード・設計不足 |
| R06 | P0 | ERR、resize、入れ子 timeout、pad 未生成を扱っていない | 現行コード・設計不足 |
| R07 | P0 | Unicode codepoint を char-to-key に渡すとキー番号と衝突する | 現行コード |
| R08 | P1 | core の C-i/C-m/C-[ 変換で KKP の区別が失われる | 現行コード・互換性判断 |
| R09 | P1 | Shift の小文字表現と既存の大文字 keyspec は一致しない | 仕様・現行コード |
| R10 | P0 | テンキーと PUA 機能キーを初期範囲から落とせない | 仕様・現行コード |
| R11 | P1 | 省略形、F3、特殊キー名、Ctrl+Space の対応を具体化する必要がある | 仕様・現行コード |
| R12 | P1 | Alt/Meta を畳み込む仕様を未確定のままにしない | 仕様・core の制約 |
| R13 | P0 | 応答の bit 1 だけの確認では parser の対応範囲を保証できない | 仕様・設計不足 |
| R14 | P1 | C-c のシグナルと C-] の割り込みを混同しない | 現行コード・TTY |
| R15 | P0 | teardown エラーでも term-finalize を実行する必要がある | 現行コード |
| R16 | P1 | term-set-tty 経路には既存の解放/型/移植性問題がある | 現行コード・公式 API |
| R17 | P1 | Escape timeout を減らしても core の Meta prefix 待ちは別に残る | 現行コード |
| R18 | P1 | ungetch は大量入力保全の汎用 FIFO ではない | 公式 API・参考 binding |
| R19 | P0 | 提案された実装順は入力統合より push が先 | 元ノート内部の矛盾 |
| R20 | P1 | 既存テストは frontend の回帰を保証しない | 現行テスト定義 |
| R21 | P1 | mouse の枝を残すだけでは ncurses が前段で奪う場合を防げない | 補助実測・現行コード |
| R22 | P1/P2 | suspend、子アプリ、multiplexer、端末設定の対応境界が不足 | 仕様・未確認事項 |

## 5. 詳細レビュー

### R01: 入力の単位は「ncurses の返り値」。生バイトだけではない（P0）

**根拠**: input.lisp 13–18行は `newpad` に `keypad 1` を設定し、`wgetch` を呼ぶ。term.lisp 465–466行は stdscr 側の keypad と `ESCDELAY=0` も設定する。key.lisp 67行以降は `KEY_UP` 等に相当する整数を Key に変換している。

ncurses は terminfo に一致するシーケンスを先に機能キー番号へ変換する。つまり `getch` の返り値には少なくとも以下が混在する。

- 0–255 の入力バイト
- 255 より大きな ncurses のキー番号/拡張キー番号
- `KEY_RESIZE` 等の通知
- `ERR=-1`

**問題**: 「CSI を文字列として読む」設計だけでは、同じ意味のキーがある環境では文字列、別環境では整数になる経路を扱えない。ncurses 変換済みキーを再び CSI parser へ流してはいけない。

**推奨**: 既存の keypad を維持し、未変換で到着した CSI だけを追加解析する。内部の入力種別を、バイト/機能キー/resize/ERR として区別する。KKP のために keypad を無条件に無効化する変更は、SS3、terminfo の端末差、既存機能キーを自前で再実装する別の大きな変更になる。

**必要試験**: 生の `CSI 1;5A` と、ncurses が返す Ctrl-Up 相当番号を別々に入力し、現在成功している経路を維持する。拡張番号は固定値を別の環境へ持ち込まない。補助実測では Ctrl-Up は575だったが、key.lisp の既存表は566/567を登録しており、既存の移植性問題も見える。これは KKP parser 追加だけで解決したと主張できない。

### R02: 出力先と、画面/問い合わせの出力順序を確定する（P0）

**根拠**: term.lisp 440–444行の `*term-io*` は `fopen(..., "r+")` の戻り値である C `FILE*`。通常の initscr 経路ではこの変数を設定しない。mainloop.lisp 33–35行は `*standard-output*`、`*error-output*`、`*terminal-io*` を空の broadcast stream に束縛する。ncurses.lisp 113行にはロード時の `*terminal-io*` を保存した別変数があり、mouse-sgr1006 の hook はそれを利用する。

**問題**:

- `*term-io*` に Common Lisp の `write-string` / `finish-output` は使えない。
- mainloop の束縛の内側で通常の `format t` を使うと出力されない。
- `*terminal-io-saved*` は任意の tty 指定と一致する保証がなく、ncurses が用いる C stdio と出力順序を共有する保証もない。
- fd への直接 write と C FILE* のバッファ出力を混在させると、同じ TTY でも順序が逆転し得る。Lisp の finish-output だけでは C stdio の未送信データを保証できない。

**推奨**: term 層が「選択した input/output の終端」「出力所有権」「flush/書き込み失敗」を管理する。指定 tty の FILE* を使うなら C 側の書き込み/flush が必要。通常経路で使う出力 FILE*/fd も明示する。`/dev/tty` は process の制御端末であり、term-set-tty の対象と同一と決めつけない。

term-init は464行で refresh 済みなので、単に initscr 呼び出し直後へ push する案より安全である。ただし実際の `smcup`、`smkx`、push の送出順序は trace で確認する。端末の alternate screen への切り替えが C の出力バッファに残ったまま、別の経路の push が先に端末へ届くことを防ぐ。

**必要試験**: stdout をファイルへ向けた指定 tty 起動でも、そのファイルに KKP sequence が混ざらないこと。同じ tty を入出力に使うこと。送信ログで screen 切り替え後の push と、screen 終了前の pop を確認すること。最初は editor thread を起動する前に setup を完了すると出力競合を抑えられるが、依存する画面/マウス初期化の順序も合わせて確認する。

### R03: push 所有権を enabled から独立させる。失敗後は「元の状態」（P0）

**根拠**: 元ノートは「enabled にできた場合だけ teardown」と「push 後の verification 失敗時は pop」を併記する。公式仕様は現在の状態を push/pop で管理し、main/alternate screen に独立した stack を要求する。

**問題**:

1. push が送出された直後に例外や割り込みが起きると、enabled はまだ false でも pop が必要。
2. bit 1 の確認失敗時に pop を試みても、その書き込みが失敗する場合がある。
3. 失敗時の pop と最終 cleanup の pop が二重になると、開始前から存在した stack entry を消し得る。
4. pop で戻る状態は flags=0 とは限らない。開始前 flags が3/31等なら、rollback 後も拡張入力が届く。「失敗したから legacy parser だけに戻す」は誤り。
5. 遅延した最初の query 応答を verification の返事と誤認すると、実際には push 後の状態を確認できていない。

**推奨**: 少なくとも端末セッションごとに以下を持つ。

| 情報 | 用途 |
|---|---|
| support 判定: unknown / unsupported / supported | timeout と非対応を区別 |
| 開始前に観測した flags | rollback 後に legacy と断言しないため |
| 現在確認した flags | parser と要求モードの整合確認 |
| push を送出した記録 | enabled 未確定でも cleanup 対象にするため |
| pop 済み/復旧不明 | 二重 pop 防止、書き込み失敗の記録 |
| 所有する tty/screen/session | 再起動・別 tty へ古い状態を持ち越さないため |

これは大きな状態機械を公開する提案ではない。内部構造体1つでもよい。2つの boolean だけでは、必要な終了処理を判定する情報が不足する。

端末から stack 操作成功の個別 ACK は得られない。flags の問い合わせも「自分の stack entry が存在する」ことの証明ではない。送出成功と実際の端末処理を同一視しない。書き込み途中の失敗も起こり得るので、writer の契約を定義する。

### R04: probe 中だけでなく通常 get-event でも応答を回収する（P0）

**根拠**: input.lisp 127–137行は `CSI ?...` を処理しない。最初の `?` を読んで Escape を返し、残りを次回の入力として残す。元ノートの probe は KKP query に続けて Primary DA query を送る。

**具体的な故障経路**:

1. `CSI ?0u` を受信した時点で supported として probe を早く終了する。
2. その後に来る `CSI ?1;2c` が入力ループへ残る。
3. 現行 get-event では Escape と `1;2c` 等の残りへ分裂する。
4. Escape の設定次第では Meta prefix として次の文字を取り込み、残りが編集入力になる。

probe が DA まで待つ場合も、全体 timeout 後に遅い KKP/DA 応答が到着するケースが残る。新しい問い合わせには transaction ID がないため、返信の段階を安易に区別できない。

**推奨**:

- 端末入力の読み取り所有者を1つにする。probe が Lisp stream/fd を直接読む一方、通常入力は wgetch を使う構成は避ける。ncurses の内部バッファに先読み済みの入力があり得るため。
- KKP 応答と DA 応答を、通常入力と同じ収集/分類処理に通す。
- probe の KKP 応答だけでなく、対応する DA 境界の回収を管理する。
- timeout は unsupported の証明ではない。unknown として有効化しない判断にする。
- 期限後の応答も完全な応答として消費し、Key として流さない。無期限に query を再開したり、遅い返事だけで後から自動 push したりしない。
- startup negotiation は全体の期限を持ち、DA すら来ない経路で無限待ちしない。
- probe1 と verification の query を同時に未完了にしない。DA 境界を含めた順序を定義する。

DA query は具体的に `ESC[c`（Primary DA）を想定する。`ESC[>c` の Secondary DA と混同しない。問い合わせと返事の `?`/`>`/終端を曖昧にしない。

**必要試験**: KKP→DA、DAのみ、KKPのみ→deadline、両方遅延、deadline直後の返信、verification中の古い返信、返信の前後にユーザー入力、resize、マウスを挿入する。

### R05: 読み切った CSI に「既存 fallback」はそのまま適用できない（P0）

**根拠**: `csi\[1` は stream を進めながら読む。input.lisp 135–137行は対応しない枝で読んだ部分を戻さず Escape を返す。元ノートは新 parser が認識できない CSI を既存挙動へ fallback としている。

**問題**: 新 collector が終端まで消費した後、古い `csi\[1` を呼ぶと、その関数は既に消費した CSI の続きではなく次の入力を読む。逆に、同じ列を pending queue へ戻して新 collector から再度読むと、永久再解析になる場合がある。

**推奨**: 以下を明確に分ける。

1. 完全な既知のキー列: Key へ変換。
2. 完全な問い合わせ応答: 状態更新、コマンド入力なし。
3. 構文が正しいが初回範囲外の機能キー/イベント: 列全体を消費して無視し、必要なら診断記録。PUA の文字として挿入しない。
4. 完全だが無関係な CSI: 非キー制御列としての扱いを定義。
5. 未完成/壊れた列: 読み取った prefix と後続の独立入力の境界を保ち、有限時間/有限長で再同期する。

完全な未知キーを無修飾文字に落とす fallback は危険。たとえば未知 modifier を捨てて `s` にすると保存キーが文字入力に変わる、または意図しない割り当てを起動する。

ECMA-48 の CSI の parameter/intermediate/final byte の範囲を収集段階で扱い、構文の解釈は別にする。数値のみを読んで最初のアルファベットまで、という実装で CPR/DA/mouse/paste/focus を全部キー扱いしない。長さ/数値桁数の上限を設定する。上限値は初回対応範囲から決める。無制限の `parse-integer` や文字列伸長は避ける。

元ノートの「非対応なら現行と同じ」と「未知 CSI の保全」と「CSI-u は常時追加解析」は、すべての未知入力について文字どおり同時には成立しない。守る対象は現在成功している既存キー/マウス/通知とし、未知列の挙動変更は明示する。

### R06: timeout の対象、ERR、resize、pad 初期化（P0）

**根拠**: input.lisp 11–18行は初回 getch で pad を作る。20–24行の timeout macro は必ず終了時に `-1` へ戻す。40–42行も UTF-8 追加バイトに同 macro を使う。get-event の冒頭だけが ERR/resize/abort を分類する。

**不足点**:

- probe が初回 getch より前に `wtimeout *padwin* ...` を呼ぶと、pad は nil のまま。
- 元ノートの「CSI 内100ms」は全列の期限ではなく、現行では各 wgetch の待ち時間。1バイトずつ届く場合、全体待ちは列長に応じて伸びる。
- macro を入れ子にすると内側終了時に外側の timeout へ戻らず無期限待ちへ戻る。probe で UTF-8 の get-key や mouse を読む構成では危険。
- CSI 途中で `KEY_RESIZE` を受けた際、それを文字として消費すると resize が失われる。ERR=-1 を code-char、配列要素、数値 parser に渡せない。
- `ESCDELAY=0`（ncurses 内の識別）と `escape-delay=100`（Lem の後続待ち）と CSI の wtimeout は別の層。100ms 一箇所の変更だけで解決しない。
- 再 invoke で残る `*padwin*` が有効な screen のものか確認する必要がある。現行は pad を明示的にリセットしていない。

**推奨**: probe前に明示的な input initialization を行う。timeout を restore 可能にするか、入れ子にせず残り期限を各 read に渡す。部分列を保持し、resize等を別に保全する。全列/全交渉の期限と無入力の期限を区別する。ERR は timeout 以外の I/O エラーでもあり得るため、常に「キーなし」として無限に busy loop する終了不能経路も診断する。

大きく非同期化することが唯一の解ではない。短い同期交渉でも、同一入力所有者・入力保全・遅延応答の処理・期限があれば成立し得る。純粋 parser の partial string テストだけでは、この問題を試験できない。

### R07: KKP Unicode を ncurses char-to-key に流用しない（P0）

**根拠**: key.lisp 21–24行の `char-to-key` は `char-code` を `*keycode-table*` で引く。この表には ncurses 番号も入っている。`[up]` は #o403 =259。KKP の Unicode 259 は文字 `ă`（U+0103）。

**具体例**: `CSI 259;9u` を `(char-to-key (code-char 259))` へ渡すと Up に変わり、Super+ă ではなく Super+Up を作り得る。同様に多数の文字で衝突する。get-key の UTF-8 復号後にも同じ関数を使っており、既存コードにも同種の構造的問題がある。KKP でこの表を再利用すると、その問題を増やす。

**推奨**: KKP の codepoint → Key は独立した変換経路にする。ASCII の特別キーは明示した小さい対応表、一般 Unicode は直接1文字の `sym` として扱う。ncurses 番号 → Key の表を Unicode の表として扱わない。

Unicode scalar と実際の Common Lisp `code-char` 可否を検証する。負数、サロゲート、U+10FFFF超、不正/過大数値を reject。PUA の KKP 機能キー領域は先にキー表で分類する。PUA の通常テキストが UTF-8 で来る経路とは区別する。すべての codepoint を char-downcase すると一般 Unicode キーを変えるため不可。

**必要試験**: `259;9u`、`330;9u`、`402;9u`、日本語、補助平面の文字、サロゲート、上限超。通常UTF-8での既存衝突も別に記録し、KKP変更に無断で抱き合わせ修正しない。

### R08: core の変換と、KKP が提供する区別の範囲（P1）

**根拠**: src/key.lisp 51–53行は `C-m→Return`、`C-i→Tab`、`C-[→Escape`。make-key 76–79行は convert-key の結果をキャッシュキーとして使う。core は既に Return/Tab/Escape を初期化している。

**結論**: KKP が `CSI 105;5u`、`CSI 109;5u`、`CSI 91;5u` を区別して送っても、普通に make-key へ通すと core で既存キーにまとめられる。parser が正しいだけでは「すべての曖昧性をなくした」という機能にはならない。

**初回の推奨**: 既存の変換を維持する互換対応として明記する。Cmd/Super の追加に core の変換変更まで混ぜない。将来 C-i と Tab を別々に bind したいなら、keyspec、他 frontend、キーキャッシュ、表示、既存の割り当てを含む別検討にする。

**追加の既存懸念**: make-key は変換後の args をキャッシュキーにする一方、新規オブジェクトは元の args で `%make-key` する。キャッシュを空にした試験では最初の生成順に影響され得る。通常ロードでの実際の結果と、キャッシュを独立させた試験の結果を区別する。ここはソースからの指摘で、今回実行再現はしていない。

parser は core のキャッシュされた Key の slot を `setf` して modifier を後付けしない。別の make-key を呼んで作る。modifier は bit 値の整数ではなく boolean に変換する。Key slot は boolean 型である。

### R09: Shift と大文字の一致は自動ではない（P1）

**根拠**: KKP の main codepoint は unshifted。`Cmd+Shift+z` は `122;10u` のように来る。src/keymap.lisp の parse-keyspec は文字の大文字/小文字と shift slot をそのまま保存し、src/input.lisp の keys-equal-p も両方を比較する。

| 生成される Key | keyspec の例 | 関係 |
|---|---|---|
| super=t, shift=t, sym="z" | `S-Shift-z` / `Shift-S-z` | 同じ modifier/sym |
| super=t, shift=nil, sym="Z" | `S-Z` | 上記とは異なる |
| meta=t, shift=t, sym="z" | `M-Shift-z` | 従来の `M-Z` とは異なる |

**問題**: 既存 ESC-prefix は、送信された大文字を sym として Meta Key を作ることがある。KKP で Alt+Shift+z が unshifted z + Shift になると既存の `M-Z` が一致しなくなる。元ノートの回帰項目「Meta/Option系」だけではこの違いを検出しにくい。

**推奨**: ASCIIの大文字 shortcut 互換を frontend で正規化するのか、KKP を独立した Shift keyspec で扱うのか、先に選ぶ。少なくとも旧 Meta+大文字の既存挙動を無言で変えない。Super の新規割り当ては対応する keyspec を文書化する。

記号の Shift は単純な上書き・大文字化では処理できない。JIS/US/その他配列で shifted symbol が異なる。flag4 を要求しない初回設計では、unshifted のキー+Shiftを基本にするなど対応限界を明記する。flag4 を追加するなら構文・照合を実装して試験してからであり、flag1だけの設計へ無断で追加しない。

通常の `A` が UTF-8 テキストとして来る経路は `sym="A"`、modifierなしで挿入する。ここを `shift=t, sym="a"` に変えると insertion-key-p が通常挿入キーとして認めなくなる。

### R10: flag1 は非テキストのテンキーも変える（P0）

**根拠**: KKP の Disambiguate escape codes は非テキストの keypad を専用コードで報告する。src/key.lisp の named keys には KP_Enter/KP_Up 等の名前がない。元ノートの初期範囲は主として一般文字、矢印、~キーに限定され、テンキーの変換が未定義。

**問題**: たとえば KP_Enter の `57414u`、KP_Up の `57419u` が一般Unicodeとして扱われると私用文字の挿入になり、無視すると従来使えていた Enter/矢印相当操作が消える。

**推奨**: 初回は core のキー名を増やさず、テンキーの既存等価キーへ正規化する案が最小。KP_Enter→Return、KP方向→対応方向、KP_Home/End/Page/Insert/Delete→同じ名前。KP_BEGIN の `CSI E` / `CSI 1;...E` / `57427~` は既存 named key と同一にできないので扱いを明示する。数字/演算子についてはNumLock/テキスト生成経路を観測し、機械的に全部無視しない。

F13–F24 は core に名前が既にあるが、u形式のPUA番号になる。F25以降、media、独立したmodifier、lockキー本体は初回範囲外でもよいが、文字へ変換しない。NumLock/CapsLock の modifier bit を無視する判断と、NumLock/CapsLock 自体のキーイベントを処理する判断は別。

**必要試験**: NumLock ON/OFF の keypad、KP_Enter、KP方向/操作キー、F13/F24、未知PUA。物理テンキーがなければまず合成入力で parser/変換を試験し、実機未確認と記録する。

### R11: 省略形と機能キー表を具体化する（P1）

**根拠**: KKP Quickstart と Functional key definitions。src/key.lisp の標準キー名は Enter でなく Return、MENU は ContextMenu、スペースは Space。ncurses/key.lisp は13をReturn、9をTab、127をBackspaceへ変換するが、8はC-hとして登録している。

初回範囲に少なくとも以下を明記する。

| 受信 | 基本の意味/注意 |
|---|---|
| `27u` | Escape。modifier省略は有効 |
| `115u` / `115;1u` | 修飾なしのキー。省略をエラーにしない |
| `CSI A` / `CSI H` / `CSI F` / `CSI P` / `CSI Q` / `CSI S` | modifierなしなら先頭1も省略される |
| `CSI 3~` / `CSI 3;9~` | Delete / Super+Delete |
| `CSI 13~` / `CSI 13;9~` | F3 / Super+F3。uの13はReturnなので終端を区別 |
| `CSI 7~` / `CSI 8~` | Home / End の別形式 |
| `CSI 11~` / `CSI 12~` / `CSI 14~` | F1/F2/F4 の別形式 |
| `CSI 13;9u` / `CSI 9;9u` / `CSI 127;9u` | Super+Return/Tab/Backspace。素のキーのlegacy例外を修飾付き全部へ拡張しない |
| `CSI 32;5u` | Ctrl+Space。既存の NUL=C-@ との互換を決める |
| `CSI 57363u` | MENU を使うならContextMenuへ |

元ノートの「modifier欠落」は、必須値が壊れている場合と、仕様上合法な省略を分ける必要がある。modifierの省略は1を意味する。colonの空subfieldや追加fieldも、完全な形式を収集したうえで対応/非対応を判定する。

現行公式仕様では F3 の CSI R 形式は CPR（カーソル位置応答）と衝突するため削除されている。古い一覧から R→F3 を追加しない。legacy の SS3 R は別であり、ncurses が処理する F3 を壊さない。

Backspace の0x08は元ノートの「Backspaceのlegacy表現」に含まれるが、現在のLem表ではC-hである。現在どちらも削除に割り当てられていることと、Keyの同一性は別。KKPの127uはBackspaceとして扱い、raw 08を本変更だけで全面的に再定義しない。`kbs` と実際の端末設定も確認する。

### R12: Alt と Meta の衝突を仕様として決定する（P1）

**根拠**: KKPはAlt(bit2)/Meta(bit32)を別に持つ。Lem key structには単一のmeta slotのみ。現行ESC-prefixはmeta=t。

**推奨**: 初回の互換対応としては Alt OR Meta→Lem meta が合理的。ただし「区別できない」と明記し、Alt+Metaの同時押しも同じMetaへ畳む試験を持つ。区別したければcore型・keyspec・他frontendの変更が必要になるので別案件にする。Metaだけの入力を黙って無修飾へ落とすのは不可。

CapsLock/NumLockのbitをshortcut照合から除外するのは合理的。未知bitは別問題であり、すべて除去して既知shortcutとして実行するかどうかを決める必要がある。初回は未知modifierを含む完全イベントを無視する方が、意図しないコマンド実行を避けやすい。

Option/AltGrがOS側で文字生成に使われた場合、端末へmodifier付きのキーではなくテキストだけが届くことがある。KKPを有効にしても「すべてのOption操作がMetaになる」と説明しない。IME/配列/端末の入力割り当てを実測する。

### R13: flags の検証は parser が読める形式との照合である（P0）

**根拠**: 元ノートは push後に「bit1が立っている」ことでenabled判定する。KKPにはevent type、alternate key、all keys、associated text の追加形式がある。

**問題**: 1だけを扱うparserに対して返信3/5/31等を「bit1あり」で受け入れると、releaseやcolon field、テキスト付きイベントを誤解釈し得る。開始前から別アプリが設定したモードで、push前のユーザー入力を保全する場合も同じ問題がある。

**推奨**: `CSI >1u` で要求する初回は、確認したflagsが初回parserの対応範囲と一致することをチェックする。正しい端末はpushしたflagsへ移るが、verificationは部分実装や経路問題を見つけるために行うものなので、予想外の値を成功にしない。

構文認識は以下を安全に扱う。

- press（event type省略/1）はKeyへ。
- repeat（2）は対応する場合press相当へ。
- release（3）はコマンドとして実行しない。
- alternate keys/associated text は初回未対応なら列全体を消費して無視し、修飾やreleaseだけを取り落として通常Keyへ変換しない。
- `key=0` のtext eventをC-@に変えない。

「要求しない形式には対応しなくてよい」と「要求前/rollback後に元から届く形式を安全に処理する」は別。初回は高度な形式を無視する対応も可能だが、開始前flags≠0の場合にキーを失う制約を隠してlegacy保証しない。

### R14: C-] の割り込みを守る。C-c のシグナルは別（P1）

**根拠**: input.lisp 120行はraw29→:abort。mainloop.lisp 19–20行は`:abort`を`send-abort-event editor-thread nil`へ。23–25行はSBCLのinteractive-interruptをforce=tで送る。term-initはcbreak後にrawを設定している。

**結論**: 元ノートのC-]指摘は正しい。parser外で完全一致したCtrl+]を:abortに変換する方針も適切。Shift/Super/Meta/Hyper付きCtrl+]まで一律abortにしない。lock bitsを除くかどうかも一致判定より前に確定する。

Lemはrawモードなので、通常のCtrl+cも既にTTYによるSIGINTにならず入力バイトとして到着するのが基本。xxdでCtrl+C/D/Zが効かなくなった観測は、xxd実行時のTTY状態での観測であり、Lemの既存動作をそのまま表すものではない。KKPによるCtrl+c Keyを、既存のSBCL interrupt handlerと同じforce=tのabortへ勝手に変更しない。

**必要試験**: raw29と93;5uの両方が非強制の割り込みを送ること。ユーザーコマンドが長く動いているときもC-]が届くこと。Ctrl+c/g/d/zの既存コマンド処理、Ctrl+]追加modifier、外部からのSIGINTを別項目で確認する。

### R15: cleanupは二段にする。pop失敗でendwinを飛ばさない（P0）

**根拠**: invokeは既にunwind-protectでterm-init失敗/入力loop例外からterm-finalizeへ進む。

**危険な追加**: cleanupに単純に `(teardown-kkp)`、`(term-finalize)`を順に書くと、前者のエラーで後者が実行されない。

**推奨**: KKP teardownをprotected formに、term-finalizeをそのcleanupに置くなど、popの成功に関係なくterminal cleanupが実行される構造にする。pushを含むsetupも同じ保護範囲内へ置く。最後に出す診断は画面/出力ストリーム復旧後に行う。

「Common Lispのunwind-protectがあるからすべての異常終了で戻る」は保証しない。SIGKILLは当然として、ncurses/ランタイムのsignal handlerや外部コードが直接終了する経路もある。正常終了、Lisp例外、editor thread終了、setup途中の失敗、writer失敗を個別に試験する。

### R16: term-set-tty 経路の既存問題を、追加設計の基盤にしない（P1）

**コード確認**: term.lispは次の状態。

1. fopenのNULL、newtermの失敗を明示検査しない。
2. newtermへTERM環境変数ではなく固定文字列"xterm"を渡す。
3. newtermの戻り値SCREEN*を保存しない。
4. term-finalizeはFILE*をfcloseしてからendwinする。
5. delscreenへSCREEN*ではなく`charms/ll:*stdscr*`を渡す。
6. resize-termのioctl要求21523はLinuxの値を固定しており、macOSで同じと仮定できない。

**公式APIとの照合**: newtermが返すのはSCREEN*、initscr/stdscrはWINDOW*。delscreenの引数はSCREEN*。参考cl-charmsのbindingもCの型をそのまま示しており、WINDOW*を自動変換するwrapperは見当たらない。この意味で5は型不一致の既存問題である。実際のユーザー環境でクラッシュするかは未確認。

FILE*を閉じた後にncursesがendwinで出力する順序も不適切な前提になる。KKPのwriterをこのFILE*へ追加すれば安全になる、とだけ説明してはいけない。

リポジトリ全体の検索ではterm-set-ttyの定義/export以外に直接の利用箇所は見つからなかった。ただし外部ユーザー設定から呼べるexported APIなので「未使用だから無視できる」と断言しない。

**対応案**: 初回は通常initscr経路のKKP対応に範囲を限定し、指定ttyで自動有効化しない制約を明示するか、指定ttyの初期化/解放を別の目的の変更として先に整える。これらの既存問題を全部KKP featureへ混ぜるのは避ける。coreの仕様を変える必要があるという指摘ではない。

### R17: Escape は core の prefix 設定でも待つ（P1）

**根拠**: src/input.lispの`meta-prefix-keys`初期値はnil。`read-key`/`read-event`は`maybe-convert-to-meta`を呼び、設定されていればEscape等を受けた後、次のKeyを待ってMetaを付ける。

KKPの27uを正しくEscapeへ変換してfrontendの曖昧性が解消しても、ユーザーがmeta-prefix-keys=tならcore側の待ちは残る。初期値nilなので全ユーザーに起こるわけではない。KKP対応のためにcoreのprefix設定を勝手に解除しない。

**必要試験**: nil/t/custom keyの3条件でEscape、Escape→文字、Escape→Escape、Alt+文字、C-[の既存変換を確認する。frontendの100msとcoreの次のKey待ちを同じ現象として調整しない。

### R18: ungetch と pending queue の用途を限定する（P1）

**根拠**: 公式ungetchはscreenに属する入力queueへ1コードを戻す。参考cl-charmsにはungetch bindingがある（958行付近）。ただしユーザーの依存版で存在するかは別途確認する。

ungetchは複数回なら通常LIFOであり、queue容量/失敗戻り値を持つ。probe中の大量pasteをすべてungetchで戻す設計は適切ではない。`ungetch`した文字列が、再度ncursesのterminfo解析を通るかどうかも、生バイトをfdへ戻す動作と同じではない。

**推奨**: frontend側のFIFOに「ncurses返り値の種別付き列」または「順序を持つ分類済みイベント」を保存する。両方を混在させる場合は責務を定義する。probe readerは通常getchのpending queueを自分で再消費して永久循環させないよう、保全入力と新しい端末入力の読み口を分ける。ただし新しい読み口もncurses経由とし、fdの直接readへ切り替えない。

再送・再分類の回数を管理し、問い合わせ応答の再解析を繰り返さない。大量入力でprobeの期限が延びないこと、メモリ上限/交渉中止時の保全方針を決める。入力を全破棄するflushinpを安易に使わない。

### R19: parserが「存在する」だけでは有効化してよい状態ではない（P0）

**根拠**: 元ノートの実装順はpure parser→query→push/verification/pop→get-event統合→lifecycle統合。一方invariantでは「enhancement有効化前に必要parserが揃う」とする。

純粋parserを作っても実際のinput pathがそれを呼ばなければ、push直後のユーザー入力、verification中のCtrl/Escape、失敗後の残り入力を扱えない。段階3を実機で有効にするのは早い。

**修正**: 入力collector/分類/既存回帰/応答回収を統合し、KKPを要求しない状態で検証した後、初めてpushを実機に出す。交渉の模擬テストでwriterへpush予定文字列を出すことと、本物のTTYへ出すことを区別する。詳細な順序は8節。

### R20: 既存テスト一式が通ってもncurses入力の保証にならない（P1）

**根拠**: lem-tests.asdはlem/coreとfake interface等へ依存するが、lem-ncursesの入力試験をcomponentsに持たない。tests/input.lispはcoreのMeta prefixとキー比較が中心。tests/keymap.lispは別のキー検索回帰。tests/self-insert-command.lispはskipされており、実際の挿入試験が無効。

**推奨**: frontend専用の試験systemを明示し、ASDF test-op/CIから実行する。純粋parser、入力readの模擬、交渉/lifecycle、実際のncurses+PTY、ユーザー環境の実機を分ける。fake-interfaceでキーを直接渡す試験はwgetch/TTY層を通らない。

lem-ncurses.asdはserialなので新ファイルをkeyの後/inputの前に置く案は成立する。ただしtermはその前にロードされる。termが新packageのシンボルを読み取り時点で直接参照するとpackage未定義になる場合がある。termにwriterを置き、交渉側がtermを呼ぶ依存方向が自然。純粋parserが画面初期化や端末queryをロード時に起動しないことも試験する。最小構成ではextensionsが条件付きで外れるため、テスト依存やmouseの存在を暗黙に前提としない。

### R21: mouse の既存枝を残すだけでは不足（P1）

**根拠**: input.lispのSGR mouse枝は`ESC [ <`が生バイトで到着することを前提とする。contribのparserはgetch返り値をすぐcode-charしてM/mまで読む。Linuxではterm.lispのmouse-mode初期値は0だが、keypad/terminfoは別に作用する。

補助実測では、`ESC[<0;10;5M` の先頭 `ESC[<` がncursesの409（KEY_MOUSE）へ変換され、残りだけがバイトとして返った。mousemaskを有効にしない条件でもこの経路が観測された。したがってSGR専用枝を変更しなくても、前段の挙動によってその枝に入らない環境がある。

これはユーザーのmacOSで新たに壊れたという証拠ではなく、既存の環境差の実測である。KKP変更前後を同一環境で比べ、既存問題を新変更の不具合と混同しない。

またcontrib parserはERR=-1、resize、欠損した数字に強くない。startup probeでeditor初期化前にこのparserを呼び、返された処理用lambdaを実行する設計は避ける。probe中はマウス入力を保全し、必要なeditor状態ができてから元のイベント経路へ渡す。未知列の無限読み取りをKKP collectorでさらに増やさない。

### R22: 初回対応の端末/実行境界を明記する（P1/P2）

**コード/仕様との照合**:

- KKP問い合わせの成功は「この経路で返信が来た」ことを示す。すべてのキーが正しく往復する保証ではない。
- WezTermの公式設定はenable_kitty_keyboard=trueでモード変更sequenceを扱う、と説明している。query対応と設定変更許可を同一視せずverificationする。
- tmux/Zellij等は単純なバイト転送だけでなく入力変換を行い得る。外側端末へDCS passthroughで強制pushする案は、内側の入力解釈とstack所有権を壊す可能性があるため初回に導入しない。
- ncursesのSIGTSTP handlerは画面の一時終了/復帰や入力破棄を行い得る。invokeの最終cleanupだけでは途中のscreen切り替えを追跡できない。Lemソースの検索ではfrontendに専用suspend/resume処理は見つからなかったが、外部signalとライブラリhandlerの作用まで不存在とは言えない。
- 外部コマンドや子TUIを同じ端末へ出す将来機能では、KKPを保持するか一時解除するかを決める必要がある。現在のterm-set-tty以外にも、別PTYで動く内蔵terminalと外側TTYの設定を混同しない。
- Windows/PDCursesの条件分岐もASDFに存在する。POSIX fd/FILE*/ioctlをWindowsで無条件に実行する実装にしない。初回の対象外なら無効としてロード可能にする。

**初回推奨範囲**: macOS+WezTerm/Kitty直結、通常initscr経路、flag1のみ。Linux直結のncurses+PTY試験は回帰確認に使う。multiplexer、suspend/resume、指定TTYの対応を主張するなら、それぞれ合格試験を追加する。未対応経路は自動有効化を避ける設定も用意する。

OS/端末が先に消費するCmd shortcutはKKPでは復元できない。元ノートのflags=0でCmd+sがsとして観測された事実を、すべてのKKP端末の一般仕様へ拡張しない。

## 6. 補助実測: ncurses の前段変換

### 6.1 方法

このレビュー環境でPTY master/slaveを作り、childのstdin/stdoutをslaveへ向けた。childはPython cursesで次を設定した。

1. `initscr`、`noecho`、`cbreak`、`raw`、`nonl`。
2. stdscrのrefresh、keypad=True。
3. 読み込み中のlibncursesw.so.6のESCDELAYをC変数経由で0へ設定。
4. 1×1のpadを作り、keypad=True、入力終了確認用timeout=150ms。
5. parentが1シーケンスをPTY masterから注入し、pad.getchの整数列をpipeへ返す。

Pythonのset_escdelay(0)はPython wrapperが拒否したため、同じ共有ライブラリのESCDELAYをctypesで設定した。これはLemがC変数を0にする設定に合わせたものであり、Pythonの仕様をLemの不具合と扱わない。

端末エミュレーターはこのPTYに接続していない。キーボードイベント生成やKKP応答の発生を試験したのではなく、**指定したバイト列がncursesに渡った後の入力変換**を試験した。

### 6.2 結果

| 注入バイト（ESCを可視化） | pad.getchの結果 | 判断 |
|---|---|---|
| `ESC[115;9u` | 27,91,49,49,53,59,57,117 | この環境ではCSI-uは生バイトで残る |
| `ESC[1;5A` | 575 | 拡張キー番号へ変換される |
| `ESC[A` | 27,91,65 | application cursor mode用terminfoとの違いが見える |
| `ESCOA` | 259 | Upへ変換される |
| `ESCOR` | 267 | legacy F3へ変換される |
| `ESC[13~` | 27,91,49,51,126 | KKP側F3形式は生バイトで残る |
| `ESC[?0u` | 27,91,63,48,117 | query replyも自前分類が必要 |
| `ESC[?1;2c` | 27,91,63,49,59,50,99 | DAも自前分類が必要 |
| `ESC[<0;10;5M` | 409,48,59,49,48,59,53,77 | KEY_MOUSE化されたprefixと残りの混在 |
| `ESC[Z` | 353 | Shift-Tabへ変換される |

この値は環境固有。特に575を新しい固定表へ採用するための測定ではない。元のLemコードをこのPythonへ移植して実行したわけでもない。Lem/cl-charmsとユーザー端末で同じ結果になるかは別に測る。

### 6.3 補助実測を再現するコード（Linux用）

上記観測と同じ設定で動く小さな確認コード。Linuxのlibncursesw.so.6とPython cursesが前提。macOSへそのまま実行するためのコードではない。実端末へKKPの有効化要求は送らず、child専用のPTYだけを使う。

```python
import os, pty, select, json, curses, ctypes

sequences = [
    ("Super-s", b"\x1b[115;9u"),
    ("Ctrl-Up", b"\x1b[1;5A"),
    ("Up CSI", b"\x1b[A"),
    ("Up SS3", b"\x1bOA"),
    ("F3 SS3", b"\x1bOR"),
    ("F3 KKP", b"\x1b[13~"),
    ("KKP reply", b"\x1b[?0u"),
    ("DA reply", b"\x1b[?1;2c"),
    ("SGR mouse", b"\x1b[<0;10;5M"),
    ("Shift-Tab", b"\x1b[Z"),
]

for name, sequence in sequences:
    master, slave = pty.openpty()
    report_r, report_w = os.pipe()
    ready_r, ready_w = os.pipe()
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.close(report_r)
        os.close(ready_r)
        for fd in (0, 1, 2):
            os.dup2(slave, fd)
        os.environ["TERM"] = "xterm-256color"
        try:
            screen = curses.initscr()
            curses.noecho()
            curses.cbreak()
            curses.raw()
            curses.nonl()
            screen.refresh()
            screen.keypad(True)
            library = ctypes.CDLL("libncursesw.so.6")
            ctypes.c_int.in_dll(library, "ESCDELAY").value = 0
            pad = curses.newpad(1, 1)
            pad.keypad(True)
            pad.timeout(150)
            os.write(ready_w, b"R")
            values = []
            while True:
                code = pad.getch()
                if code == -1:
                    break
                values.append(code)
            curses.endwin()
            os.write(report_w, json.dumps(values).encode())
        except Exception as error:
            os.write(report_w, repr(error).encode())
        os._exit(0)

    os.close(report_w)
    os.close(ready_w)
    os.close(slave)
    os.read(ready_r, 1)
    os.write(master, sequence)
    report = b""
    while True:
        readable, _, _ = select.select([master, report_r], [], [], 2)
        if report_r in readable:
            chunk = os.read(report_r, 65536)
            if not chunk:
                break
            report += chunk
        if master in readable:
            try:
                os.read(master, 65536)
            except OSError:
                pass
    os.waitpid(pid, 0)
    print(name, report.decode())
    for fd in (master, report_r, ready_r):
        os.close(fd)
```

これは正常な10入力を観測するためのコードであり、collectorやLemの自動試験を代替しない。診断自体の無限待ちを避けたいCI等へ組み込む場合はparentにも全体期限を追加する。

### 6.4 現行 get-event のソースから追える失敗例

実際のLemを起動した再現ではなく、input.lispのcaseによる静的な追跡結果。

| wgetchへ渡された未変換列 | 現行コード上の分岐 | 結果の見通し |
|---|---|---|
| `ESC[115;9u` | CSI直後1→csi\[1→次の1がセミコロンでない | Escapeを返し、`5;9u`が残る |
| `ESC[97;9u` | CSI直後9→その他 | Escapeを返し、`7;9u`が残る |
| `ESC[?0u` | CSI直後?→その他 | Escapeを返し、`0u`が残る |
| `ESC[A` | CSI直後A→その他 | Escapeを返す。既存ncursesがUp番号へ変換した経路とは別 |

つまり現在は「新しいキーが無視される」だけでなく、列の残りが文字入力として届き得る。この失敗形を基準に、新collectorの無関係入力保全を設計する。

## 7. 推奨する責務と入力契約

以下は既存coreを大幅に変えないための提案であり、確定した新API名ではない。

| 層 | 担当 | 禁止すること |
|---|---|---|
| term | 選択TTY、出力先、flush、screen準備/終了、書き込み失敗 | Lisp標準出力へ決め打ち、FILE*をLisp streamと扱う |
| inputのread層 | wgetchの返り値、pad、期限、pending FIFO | 同時にfd直readする第二reader |
| sequence collector | CSIの境界、partial、ERR/resize、長さ制限 | 読んだ列を何度も無制限にreplay |
| 純粋parser | 完全列→構造/分類結果 | 端末モード変更、abort割り込み送信 |
| Key変換 | Unicode/機能キー/modifier→Lem Key | ncurses番号表をUnicode表として流用、Keyを破壊的変更 |
| negotiation | query/DAの順序、期限、flags確認、push所有権 | 非対応とtimeoutの同一視、enabledだけでpop判定 |
| get-event | Key/resize/mouse/abortという既存frontend契約 | query replyや未知イベントの内部symbolをsend-eventへ流す |
| mainloop | setup保護範囲、input-loop、teardownとfinalize | pop失敗でendwinを飛ばす |

parserの返り値は「Keyかnil」だけでは情報不足。少なくとも、キー、応答、未対応の完全イベント、構文エラー、未完成を区別できるようにする。純粋な完全列parserと、部分入力を保持するcollectorの違いも明記する。

`get-event`から返す内部の`:unsupported`等に注意する。event-queueのreceive-eventはsymbol/functionをfuncallするので、内部分類値をそのまま送ると通常キーとして無視される保証がない。問い合わせはfrontend内で処理し、既存のevent契約に対応するものだけを送る。

同期probeでも、通常loopでも、同じread/collector/parserを使う。probe専用の違う入力解釈を作らない。入力readerは1つ、writerも選択TTYのものを一貫して使う。

## 8. 安全な実装順と通過条件

各段階は同じ作業branch内でもよい。ここで順序を示すことはupstream PRを要求する意味ではない。新規作業は最新mainを基点にし、色修正等をPR用branchへ混ぜず、日常利用で組み合わせるのはlocalにする。

### 段階1: 現行入力の基準と、互換性の選択を記録

- 実際に使うSBCL/cl-charms/ncursesの版、TERM/terminfo、端末版/設定を記録。
- C-i/C-m/C-[の既存変換を維持するか確定。
- Meta+大文字とShift keyspec、Alt/Metaの対応、Ctrl+Space、テンキー対応を確定。
- 同じ環境で通常キー、機能キー、mouse、C-]の現状を取得。

通過条件: 元から失敗する入力と新変更の回帰を区別できる。

### 段階2: 純粋parser/Key変換と専用test system

- flag1に必要な形式と省略形、Unicode、PUA、特殊キー、未知形式の消費方針を実装。
- query reply/DA/CPRをキーと区別。
- 実際のLem Keyとkeyspecを使って照合、文字挿入可否を試験。
- ASDFへ試験を登録し、端末なしで実行できることを確認。

通過条件: 表9.1の期待値を満たす。端末へのpushはまだ出さない。

### 段階3: collector、pending入力、get-eventへの統合

- pad初期化、timeout復元、ERR/resize、部分列再同期、長さ上限。
- 現在成功しているlegacy CSIとncurses番号、mouse、UTF-8、abortを維持。
- query/DAの遅延応答を通常loopでも回収。

通過条件: 模擬readによる分割/遅延/混在/異常系と、ncurses+PTY回帰が通る。pushはまだ出さない。

### 段階4: term writerとlifecycleの保護構造

- 出力先・flush・screen切り替えの順序を確定。
- push/pop所有権をセッション内に持つ。
- pop失敗でもfinalizeが通る構造を先に試験。
- 指定TTYを対応させるならR16を解決/検証。対象外なら明示して有効化しない。

通過条件: writerを模擬した失敗注入試験と、実際の出力traceが期待した順序。

### 段階5: support probeを統合（有効化なし）

- KKP query+DA、期限、入力保全、遅延応答、unknownを試験。
- 初回probeと後続queryの応答を取り違えないことを確認。

通過条件: KKP無効/非対応環境でも既存キーを失わず、応答の残りを挿入しない。

### 段階6: push1/verification/rollbackを有効化

- 現在の要求と一致するflagsを確認。
- push後未確認、verification失敗、rollback失敗、退出割り込みの全経路を試験。
- 開始前flagsが0以外の場合を含める。

通過条件: 表9.3の送信列/入力保全/所有権の期待値を満たす。

### 段階7: ユーザーのmacOSで実機試験→local統合

- WezTerm許可あり/なし、Kittyで直結確認。
- key到着だけでなく、実際の保存/Undo/Redo/選択/終了/割り込みを確認。
- 終了後のkeyboard flagsとシェルのCtrl/矢印/文字入力を確認。
- 対応を主張する経路だけmultiplexer等の実機試験を追加。

通過条件: 同一版で試験記録が残る。実機結果と仮説が違えば、結果に合わせて設計を見直す。

## 9. 追加すべき試験と期待結果

### 9.1 parser / Key変換

文字列はCSI prefixを除く表記も混ぜている。実装の入力契約に合わせてprefix有無を統一し、両方を暗黙に許可しない。modifier省略と不正modifierは区別する。

| 入力例 | 必須の検査 |
|---|---|
| `115;9u` | super=t、sym="s"、他modifier=nil。`parse-keyspec "S-s"`と一致 |
| `122;10u` | Shift+Super+zの選択した互換方針。少なくとも`S-Z`との相違を試験 |
| `99;5u` / `93;5u` | Ctrl+c / Ctrl+]。parser段階では:abortを送らない |
| `93;13u`等 | Ctrl+Super+]は非強制abortへ一律変換しない |
| `27u` / `115u` / `115;1u` | 合法な省略。既定modifier=1 |
| `CSI A/H/F/P/Q/S/E` | 数値省略。Eの対応方針を含む |
| `1;9A` / `3;9~` / `13;9~` | Super+Up/Delete/F3。13;9uと別 |
| `7~` / `8~` / `11~` / `12~` / `14~` | 機能キーの別形式 |
| `13;9u` / `9;9u` / `127;9u` | Return/Tab/Backspaceの正確なキー名 |
| `105;5u` / `109;5u` / `91;5u` | core変換を含む初回互換方針 |
| `32;5u` | Ctrl+Spaceと既存NULの関係 |
| `259;9u` / `330;9u` / `402;9u` | Unicode→ncursesキー番号の誤変換がない |
| 日本語/補助平面codepoint | 正しい1文字sym。文字挿入経路とshortcutを区別 |
| `57376u` / `57387u` | F13/F24。私用文字として挿入しない |
| `57414u` / `57419u` / `57426u` | テンキーの互換対応 |
| Alt / Meta / Alt+Meta / Hyper | 初回mappingをboolean slotで確認 |
| CapsLock/NumLock付きshortcut | lock bit除外後に同じshortcut。lockキー本体は別 |
| `115;9:3u` | releaseを保存コマンドとして実行しない |
| `115;9:2u` | repeat方針を確認 |
| alternate-key / text付き / key0 | 未対応なら全列消費し、別キーを実行しない |
| `CSI ?0u` / `CSI ?1u` / `CSI ?1;2c` | Keyでない応答として区別 |
| `CSI 1;2R` | CPRをF3へ変換しない |
| 数値なし/不正終端/0 modifier/負数 | 安全なreject。既知shortcutへの誤変換なし |
| サロゲート/U+10FFFF超/長大数値/長大列 | 上限と例外処理。無限待ち/過大確保なし |

### 9.2 collector / get-event の模擬read

完全列だけでなく、readの呼び出しごとの返り値・時刻を渡す。テスト対象の実装と同じ分岐をテストコード内に複製して「一致した」としない。

- 1バイトずつ、ESCだけ先行、ESCと[の間、数字の途中、終端前の100ms超遅延。
- deadlineまでpartial、deadline後に残り、次の通常キーが直後に来る。
- CSI途中にresize番号、ERR、一時的な中断、別機能キー番号。
- query前後のASCII/UTF-8、Alt+文字、pasteの大量入力。
- pending FIFOの順番、1回だけの再分類、queueから自分の保全入力を永久に読み続けないこと。
- pad=nilからprobe開始、入れ子readのtimeout、例外後のtimeout復元。
- 純粋parserの未対応結果がevent-queueへ流れないこと。
- raw C-]とKKP C-]が同じabortを返し、追加modifierが違うこと。
- 生CSI・変換済みKEY_*・SS3・UTF-8の各経路。
- mouseの完全/partial/KEY_MOUSE prefix化、resizeとの混在。
- 同一プロセスで再invokeした場合のpad/session/pending stateリセット。

### 9.3 negotiation / lifecycle の送信列と失敗注入

| 条件 | 期待 |
|---|---|
| KKPreply→DA | 対応観測。DAを残してキー挿入しない |
| DAのみ | 非対応判断。push/popを送らない |
| KKPreplyのみ | 期限とDA境界の方針どおり。後続queryとの取り違えなし |
| 返信なし / malformed / timeout | unknown/失敗。有効化しない。無限待ちなし |
| timeout後のKKP/DA reply | 通常入力の文字として挿入しない |
| supported、push1、query=1 | 自分のpush記録、対応範囲確認、終了時pop1回 |
| push後query=0/予想外flags | rollback。enabled成功にしない |
| push直後の例外/interrupt | enabled未設定でもpop対象 |
| verification失敗後のcleanup | rollbackと最終popが二重にならない |
| popのwriter失敗 | term-finalize実行。復旧不明を記録 |
| query前に通常入力/resize/mouse | 順序/種類を維持。probe処理で実行しない |
| 開始前flags=3/31 | 戻り先をlegacyと偽らない。拡張列を誤実行しない |
| 始めからflags=1 | 自分のpushの有無を判断でき、開始前entryを消さない |
| editor functionが失敗 / editor thread終了 | cleanup順序と出力復旧が維持される |
| 別tty / 再起動 | 古い状態で別screenをpopしない |

writerは送信データ/順序を記録できる模擬実装にする。端末側のstackモデルも別に置いて二重popを検出する。queryのflags値だけを見てstack復旧の試験を省略しない。

### 9.4 実際のncurses+PTY試験

- `TERM=xterm-256color`および使用するterminfo、実際のcl-charmsが読み込むncursesで実行。
- 既存のncurses番号と生CSIが同じcollectorで共存できること。
- query reply、DA reply、mouse prefixが前段でどう変換されるか。
- 必要な場合、人工端末応答器でquery/push/popを認識し、入力を遅延・分割して返す。
- screen入退出とKKP送信順を出力traceで検証。PTYだけではscreenごとのstackや実キーボードの生成を保証できないので、その部分は実機へ残す。
- 指定TTY対応を主張するならstdoutのredirectと別TTYを試験。既存delscreen型不一致を放置したまま試験合格を主張しない。

### 9.5 ユーザー環境の実機記録

必須直結条件はWezTerm KKP許可あり/なし、Kitty。Linuxはncurses/terminfo差を確認する補助条件とし、実際の対応対象にするなら実機合格を追加する。

記録する環境:

- LemのSHA/branch、SBCL版、ロードされたcl-charmsの場所/版、ncursesの共有ライブラリと版。
- TERMと関連terminfo、WezTerm/Kitty版、KKP/CSI-u/キー割り当てに関わる設定。
- キーボード配列、OS側modifier変更、IMEのON/OFF、直接接続/SSH/multiplexerの有無。

確認する操作:

- Cmd+s/z/Shift+z、Cmd+方向、Option+文字/大文字/記号、Ctrl+a/i/m/[/]/c/g/d/z、Tab/Shift+Tab、Return、Backspace/Delete、F1–F4/F13、テンキー。
- 英数字、大文字、記号、日本語変換、貼り付け。文字入力をmodifier付きキーに変えない。
- mouseクリック/drag/scroll、resize、キー長押し。
- C-]による長時間コマンドの中断、正常終了、Lisp例外、交渉途中の失敗。
- 終了前後のflags比較だけでなく、シェルの文字入力/Ctrl/矢印が通常どおりであること。
- 対応を主張する場合のみsuspend/resume、外部TUI、multiplexer接続/切断/再接続。

診断はまずLem内のgetch返り値・parser結果・送信sequenceを、TTY以外のログへ出す方法がよい。別プロセスのxxdで同じTTYを同時に読まない。rawバイトを読む診断とncurses返り値を読む診断は違う観測である。

## 10. 元ノートの論点 A–H への回答

| 論点 | 回答 |
|---|---|
| A support detection | term-init後/input-loop前の同期probeは成立し得る。ただしpad初期化、単一reader、全体期限、DA回収、遅延応答回収を先に備える |
| B input buffering | frontend FIFOを推奨。raw byteだけでなくncurses通知/番号を扱う。ungetch単独で大量保全しない |
| C terminal output | term層が選択TTYを管理。同一TTYだけでなくC stdioとの出力順序/flushを保証。指定TTYの既存不整合を先に解決するか範囲外へ |
| D 常時CSI-u認識 | 賛成。ただし完全列の構文認識と対応範囲外イベントの実行は別。無条件に全uを文字へ変換しない |
| E Alt/Meta | 初回は両方をLem metaへ畳む互換案が合理的。情報喪失を明示し、Shift+Altの大文字互換を別途確定 |
| F 初回範囲 | Quickstartの形式は必要条件。テンキー、PUA F13–F24、省略形、特殊名、core変換、実際のncurses番号経路も必要 |
| G C-] abort | parser外で完全一致Key→:abortがよい。raw29と同じ非強制interrupt。C-c/SIGINTとの混同を避ける |
| H timeout | 100ms値の大変更を避けることは可能。ただしpad未生成、入れ子の復元、全体期限、partial/ERR/resizeの扱いは後回しにできない |

## 11. 関連Issue/PRの確認と、そこから言えないこと

- [lem-project/lem #1911](https://github.com/lem-project/lem/issues/1911): notcursesへ変更したいという要望。本文とコメントを確認した。closedで、コメントはDiscussionへの移動の相談。このclosed状態は「Lem ncursesにKKPが実装済み」の証拠ではない。
- [lem-project/lem PR #2332](https://github.com/lem-project/lem/pull/2332): パレット変更抑制。調査時はopen/未merge、headは`6371b463...`。今回の入力設計と目的が異なるので混ぜない。localがこの修正を持つことと、KKP対応済みであることは別。
- [lem-project/lem PR #1069](https://github.com/lem-project/lem/pull/1069): SDL2のmodifier対応を設定可能にする変更。Alt/Meta/Superの名前が端末/OS/frontend横断で自動的に同じ操作になるとは限らない参考。ncursesへの実装を保証するものではない。
- GitHub APIで`repo:lem-project/lem "kitty keyboard" is:issue`、同`is:pull-request`を検索。前者は#1911、後者は0件。`CSI is:issue`は0件、`keyboard is:pull-request`は16件でfrontend差の関連変更を確認した。検索結果だけで全Issue/PRの不存在や別名実装の不存在を断言しない。

元ノートが挙げたEmacs kkp/crosstermは設計の参考として有用だが、このレビューではそれらの全テスト/全実装を独立検証したとは扱わない。Lemの同じTTY/同じncurses pathでの根拠を優先した。

## 12. 一次資料

仕様/APIの根拠は下記。説明は要約であり、引用文ではない。将来読み直す際は、レビュー日以後の変更と確認SHAを区別する。

- [KKP公式仕様](https://sw.kovidgoyal.net/kitty/keyboard-protocol/): Quickstart、Key codes、Modifiers、Event types、Progressive enhancement、Detection、Legacy encoding、Functional key definitionsを確認。
- [WezTerm enable_kitty_keyboard](https://wezterm.org/config/lua/config/enable_kitty_keyboard.html): trueでkeyboard encoding変更sequenceを処理する設定。
- [ncurses curs_getch](https://invisible-island.net/ncurses/man/curs_getch.3x.html): keypad、terminfo、KEY_*、ERR、ungetch。
- [ncurses curs_inopts](https://invisible-island.net/ncurses/man/curs_inopts.3x.html): raw/cbreak、keypad、ESC識別、wtimeout、typeahead。
- [ncurses curs_initscr](https://invisible-island.net/ncurses/man/curs_initscr.3x.html): initscr/newterm、SCREEN*/WINDOW*、endwin/delscreen、signal handlerとscreen復帰。
- [cl-charms binding（固定SHA）](https://github.com/HiTECNOLOGYs/cl-charms/blob/74956e33ecbafd5a948be50532d102bfcdca2fa8/src/low-level/curses-bindings.lisp): define-exported-cfuns、ungetch、newterm、delscreen、stdscr、ESCDELAY。インストール済み版の根拠には使わない。

## 13. 次のAI/実装担当へ

このノートの設計提案を、追加の観測なしに確定仕様へ昇格させないこと。最初の仕事は8節の段階1の互換方針と現在の実行環境を確定すること。その後は端末モードを変更しない試験から始める。

特に、次の省略をしてはいけない。

1. `src/key.lisp`のstructだけを見てcore影響なしと判断しない。convert-keyとkeyspec照合まで確認する。
2. rawバイトparserの試験だけでncurses入力全体の試験完了としない。
3. enabled booleanだけでpopの必要性を決めない。
4. timeout後にlegacyへ戻ったと断言しない。開始前flagsと遅延返信が残る。
5. 未知列/未知PUA/未知modifierを通常文字や既知shortcutへ安易に変換しない。
6. query reply/DA/CPRをeditorの入力queueへ流さない。
7. parserをinput pathへ統合する前に、実機のflag1を有効化しない。
8. ttyのFILE*/screen型不一致を、推測のままKKP変更へまとめて修正しない。対応範囲か独立した修正として扱う。
9. ユーザーのmacOS実測と、このノートのLinux補助実測を混ぜない。
10. Commit/push/PRは次の依頼の範囲に従う。このレビューのpush許可をLem本体改造やupstream PRの許可へ拡張しない。
