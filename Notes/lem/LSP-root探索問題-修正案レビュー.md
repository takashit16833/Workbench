# Lem LSP root 探索問題 — 修正案レビュー

レビュー日: 2026-10-04（JST）

対象: [LSP-root探索問題-調査と修正案.md](LSP-root探索問題-調査と修正案.md)

目的: 原因分析と修正案を独立に検証し、upstream に提出する修正と回帰テストの成立条件を明確にする。本書はレビューであり、Lem 本体への変更・commit・push・PR 作成は行っていない。

## 1. 総合判定

**原因分析の中心は正しい。修正案 1 は妥当。修正案 2 は方向性が妥当だが、現状のまま実装・提出するのは不可。**

停止条件の欠落、directory pathname に対する file-namestring の利用、文字列の部分一致による誤認を現行ソースで確認した。ノートの概念コードを切り出した比較実験でも、通常の .git directory、紛らわしいファイル名、階層付きマーカー、HOME 外での探索は改善した。

ただし次の事項は PR 前に直す必要がある。

| ID | 重要度 | 指摘 | 必要な対応 |
|---|---|---|---|
| R1 | 必須 | 「現行の有効な spec に .asd を根拠として使えない」という結論は範囲不足。任意に読み込める lem-lisp-mode/v2 に .asd の spec が存在する | 文字列の契約変更と一緒に、この spec の動作を維持する |
| R2 | 必須 | filesystem root 判定 helper のテストだけでは探索への接続漏れを検出できない | 公開 find-root-directory を呼ぶ、停止保証付きの回帰テストを追加 |
| R3 | 必須 | PR 2 のテスト案全体は修正前・部分的退行時に必ず有限終了する構成になっていない | 上位の停止用マーカーと実行上限を設計する |
| R4 | 必須 | .git 未検出と「開始 directory への fallback」が同じ値になるテストは退行を見逃す | マーカーのある親と開始 directory を必ず分ける |
| R5 | 必須 | root URI を再計算するのは新しい workspace を作る経路。既存の同言語 workspace は再利用される | 実機確認は新しい Lem プロセスで行う。既存接続の観測を修正確認に使わない |
| R6 | 要明文化 | function callback の引数型は保てるが、呼び出し順・回数・directory 列挙回数は変わる | 保証する互換性を限定して明記し、不要な反復列挙を避ける |
| R7 | 要明文化 | probe-file* は存在しない場合だけでなくエラー時にも NIL を返し得る。subpathname のエラーは別 | 判定失敗と不正な設定値の扱いを分ける |
| R8 | 要明文化 | 相対パスは候補 directory 内に限定されるとは限らない。空文字・親参照などの扱いが未定 | 正式な文字列マーカー契約を記述 |
| R9 | 範囲訂正 | fork main と upstream main はレビュー時点で同一ではない | 両方の SHA と関連部分の一致を記録 |

2 PR に分ける方針は維持してよい。ただし独立した branch を作ることと、修正前にも安全に回帰テストを実行できることは別の条件である。

## 2. 確認範囲と証拠の区分

### 2.1 固定した対象

| 対象 | 今回確認した版 |
|---|---|
| Workbench 入力ノートの blob SHA | 478fb47194ed7a5bfc0b2aaaa3dc07c63d5850b0 |
| takashit16833/lem main | 27572e42923a99d1dee0be8b991e0bfd2113b24d |
| lem-project/lem main | da26ca8443a17b9e681f191491c453dbf24e3dd9 |
| UIOP ソース確認用 fare/asdf mirror | f2ded94075a2e6e0b65e66870cf338d1951683e0（UIOP 3.3.6.2） |
| 比較実験の実行環境 | Ubuntu 24.04 系 / x86_64 / SBCL 2.2.9.debian / ASDF・同梱 UIOP 3.3.1 |

upstream main は fork main の次の commit で、差分は frontends/ncurses/term.lisp の 1 行変更だけだった。今回扱う language-mode、language spec、workspace 管理、test 定義のコードは両者で同じである。入力ノートの「確認時点で同内容だった」を過去の記録として否定するものではないが、PR 作業開始時には upstream を再取得する必要がある。

Lem の qlfile は uiop を指定し、qlfile.lock は ql-2024-10-12 を記録している。これは今回の比較実験に使った UIOP と同一であることを意味しない。ユーザー環境で実際にロードされた UIOP の版は本レビューでは実測していない。

### 2.2 証拠の種類

- **ソース確認**: fork の repository を取得し、全体検索で直接呼び出し、マーカー設定、ASDF の読み込み経路、workspace の生成・再利用、既存テストと CI を追跡した。関連部分について upstream 最新との差分も確認した。
- **今回の比較実測**: 現行ソース末尾の match-pattern-p / find-root-directory-1 / find-root-directory をそのまま別 package へ読み込み、入力ノート末尾の概念コードとも比較した。
- **入力ノートが報告するユーザー実測**: macOS 上の .git pathname、HOME にある .gitconfig 類、LuaLS のログ、親 pathname の遷移。これらはユーザー側で行われた実測の記録として扱い、今回こちらで macOS 上の同一実験を再実行したとは書かない。
- **未検証**: Lem 全体の build / Rove suite / 実際の LuaLS initialize / macOS・Windows 上での提案コード / permission error / 実プロジェクトの symlink を含む統合動作。

比較実験の list-directory は、ローカル filesystem 用に UIOP の subdirectories と directory-files を個別に名前順で並べ、probe-file で存在確認する代替実装とした。Lem の virtual handler、SBCL の Unicode 専用比較、画面や LSP 接続はロードしていない。したがって **探索関数と UIOP の局所実験であり、Lem 本体のテスト合格ではない。**

## 3. 原因分析の妥当性と、断定範囲の修正

### 3.1 filesystem root の停止条件

現行 find-root-directory-1 は、候補 directory 内を調べた後、HOME への pathname-equal だけで停止する。POSIX の絶対 directory pathname では root の parent が root 自身になるため、HOME に到達しない経路でマーカーが見つからないと同じ候補を繰り返す。

これはソースから説明でき、今回の切り出し実験でも末尾の候補が「/、/、/、/」になることを確認した。実験は list-directory の呼び出しが 20 回を超えた時点で診断用エラーを出し、無制限には実行していない。

「無限再帰」はソース上の説明として妥当だが、実行結果が常に永久に固まるとまでは断定しない。処理系・最適化・例外発生の有無によって、反復し続ける、stack を使い切る、directory 列挙で例外になる等があり得る。正確な不具合は **探索が通常の経路で停止できないこと**。

また「HOME 外なら必ず発生」は強すぎる。途中に一致するマーカーがある場合、HOME が filesystem root 自身の場合、HOME が探索経路の祖先である場合などは停止する。条件は「HOME に到達しない祖先探索で、検査する候補にマーカーがなく、他のエラーも発生しない」である。

ユーザーが報告した「LuaLS が hello を出したが initialize が来ない」はこの不具合と整合する。現行 ensure-lsp-buffer は run-server の後、make-workspace による root 計算を行い、その後で connect-and-initialize に進む。root 計算が終わらなければ、その initialize 送信経路まで到達しない。ただし当時の停止位置を debugger/backtrace で直接取得した記録は入力ノートにはないため、ログ単独で停止箇所を証明したとは書かない。

### 3.2 .git directory と部分一致

Lem の list-directory は directory と file を列挙し、directory pathname の file-namestring は空文字になる。したがって .git directory 自体は文字列 ".git" に一致しない。一方、.gitconfig 等の file 名には search が一致する。主原因の分析は正しい。

function 型の既定 .git 判定も空文字には一致しないため、「文字列判定だけ直して既定値を残す」は不十分という入力ノートの指摘も正しい。

正しい Git root を返すことと、.git directory を認識したことは別である。探索開始 directory が Git root と同じなら、マーカーを見逃しても fallback で同じ値を返す可能性がある。回帰テストと実機の直接関数確認では必ず src/ 等の子 directory から開始する。

### 3.3 階層付きマーカーと探索順

直下 entry の file-namestring を見る方式では ".lsp/config.edn" を扱えない。候補から相対 path を作って存在確認する案はこの問題に合う。

現行実装は directory を近い順に探し、各候補ではいずれか 1 つの pattern に一致すれば返す。pattern の順序が祖先間の優先順位になるわけではない。例えば子に .git、親に typst.toml があれば、修正後も最も近い子が選ばれる。

入力ノートの Typst に関する「typst.toml があれば先に検出可能」は、pattern の順序で typst.toml を優先するという意味に読めるため修正した方がよい。現行の入れ子も entry → pattern であり、directory 全体に対する pattern 優先探索ではない。

## 4. R1: .asd の互換性調査は訂正が必要

### 4.1 現行に存在する設定を分けて扱う

| 場所 | 指定 | 現行での位置付け |
|---|---|---|
| extensions/lisp-mode/lisp-mode.lisp:41 | editor variable に '(".asd") | 通常の Lisp mode 初期化で設定される。ただし現在の compute-root-uri はこの editor variable を読まず、spec の slot を読む |
| extensions/lisp-mode/v2/lsp-config.lisp:12 | Lisp LSP spec に '(".asd") | コメントや reader 条件で無効化されていない。lem-lisp-mode/v2 をロードすると登録される |
| extensions/lisp-mode/lem-lisp-mode.asd:64–68 | lem-lisp-mode/v2 system | lem-lisp-mode に依存し、v2/lsp-config を component としてロードできる |
| lem.asd の lem system | lem-lisp-mode に依存 | v2 を通常の依存に含めていない |
| extensions/wat-mode/lsp-config.lisp:6–13 | '("*.wat" "*.wast") | #+(or) で spec 定義全体が読み飛ばされる。現行の有効な登録ではない |

重要な区別は **標準でロードされない追加 system** と **reader により無効化された定義**。Lisp v2 は前者、WAT は後者である。

よって「標準の読み込みで v2 は有効でない」は説明できるが、「現行のサポート対象に .asd を使う spec はない」「互換性を考えなくてよい」にはならない。本体にあるロード可能な system が共通 API の利用者である以上、PR 2 でその動作を維持する必要がある。

### 4.2 実際に変わる動作

sample.asd が project/ に存在し、src/ から '(".asd") で探す場合:

- 現行: search により sample.asd に一致し、project/ を選ぶ。
- 提案: project/.asd という特定 path だけを probe する。sample.asd は対象にならない。
- 一致が他にない場合: PR 1 未適用なら停止しない問題に到達し得る。PR 1 適用済みなら src/ へ fallback して、誤った root を返す。

これは抽象的な互換性懸念ではなく、今回の比較実験で root が変わることを確認した。

### 4.3 最小の対応

文字列を相対 path にする設計を採用する場合、Lisp v2 側の旧 ".asd" 指定を function callback に移す。旧挙動を厳密に維持するだけなら、例えば次の形である。

~~~lisp
:root-uri-patterns
(list (lambda (name) (search ".asd" name)))
~~~

これは元の substring 動作を維持し、sample.asd.bak への一致も残す。今回の PR でそれも直したいなら、「末尾が .asd の file 名に限定する」等の別の挙動変更として説明・テストする。互換移行と判定精度改善を混同しない。

通常 Lisp mode の editor variable にある ".asd" も現行の残存設定としてノートに記録する。ただし repository 内で root finder へ渡す現行経路は見つからなかったため、その設定まで機械的に変更する必要があると断定しない。共通の契約として整合させるなら変更理由を書く。

WAT の旧文字列は現在の動作を壊す根拠ではない。無効コードに wildcard 風の文字列があるという記録に留め、本 PR で glob を追加する必然性はない。

外部ユーザーが ".asd" や任意の substring を設定している可能性は repository 検索だけでは否定できない。文字列の意味を変えること自体は明示し、複雑な名前判定は function に移す方法を説明する。

## 5. UIOP の使い方と正式な契約

### 5.1 subpathname + probe-file* は基本案として妥当

UIOP の公式 manual とソースでは、string subpath は Unix 形式の相対 path として解析され、base の directory 部分へ結合される。"/" を区切りに使う ".lsp/config.edn" を言語設定の可搬な形式にする意図に合う。

probe-file* は file と directory の存在を調べる。今回の SBCL 実験では、末尾 "/" を持たない project/.git pathname でも .git directory の存在を検出できた。返り値はその検査 path であり、directory の truename に正規化された値ではなかった。

重要なのは **probe の返り値を root として返さず、現在の候補 directory を返すこと**。これなら .git file と directory の両方に対応し、Git worktree の gitfile の内容を読む必要もない。ただし空の .git file でも root とするため、「実際に有効な Git repository であること」を検証する仕組みにはならない。これはマーカー方式の既存の範囲である。

### 5.2 NIL の意味と例外の境界

確認した UIOP ソースの probe-file* は内部に ignore-errors を持つ。したがって NIL は「存在しない」だけでなく「存在を確認できなかった」を含み得る。permission error 等を必ず caller へ通知する API ではない。

~~~lisp
(uiop:probe-file* (uiop:subpathname directory pattern))
~~~

では subpathname を先に評価する。その parse/relative constraint のエラーは probe-file* 内部の ignore-errors の対象外である。絶対 path の文字列でエラーになることは今回の実験でも確認した。

推奨する区分:

- 存在確認が NIL: このマーカーでは候補を採用しない。
- マーカーの形式が契約外: 設定の問題として明示的なエラー、または定義時の検証。無言で「マーカーなし」に変換することは避ける。
- callback がエラー: 広い ignore-errors で隠さない。

ただし permission error を必ず別表示する設計を本 PR に追加することまでは求めない。その区別が必要なら probe-file* だけでは不足するため別設計が必要である。

function pattern の list-directory は列挙中に例外となり得るので、「どんな path でも必ず fallback する」という保証はできない。停止条件の修正は、directory 列挙や filesystem I/O が完了する前提での探索停止保証である。

### 5.3 空文字・親参照・wildcard

今回の SBCL / UIOP 3.3.1 での実測:

| string subpath | subpathname / probe の結果 |
|---|---|
| ".git" | directory が存在すれば非 NIL |
| ".asd" | .asd という literal path。sample.asd には一致しない |
| "*.wat" | name component は文字列 "*"、wild-pathname-p は NIL。glob として展開されない |
| "" | base directory 自身。存在すれば真 |
| "." | base/.。存在すれば真 |
| "../sentinel" | base の親にある sentinel に到達する |
| "/sentinel" | 相対 path 要件によりエラー |

したがって「relative subpath」だけでは「候補の中にあるマーカー」という意味にならない。特に空文字・"." は事実上どの既存候補も root にする。親参照は候補とは違う directory の存在で root を決める。

PR 2 の docstring 等で、最低限次を決める:

1. string は候補からの**特定の相対 path**であり、substring・正規表現・glob ではない。
2. file と directory のどちらでも存在すれば一致する。
3. 区切りは言語設定上 "/" を使う。
4. 空文字、自分自身だけを示す path、absolute path、親 directory 参照を許すか。通常の root marker 用途では禁止を推奨する。
5. callback の引数は直下 entry の file-namestring（directory では空文字）である。

禁止する場合、入力検証をどこで行うかとそのテストを追加する。大規模な path 検証基盤は不要だが、「API に渡せばたぶん安全」という説明で済ませない。これは信頼済みユーザー設定の契約明確化であり、新たなセキュリティ機能の要求ではない。

## 6. function pattern の互換性と処理量

### 6.1 引数は維持する

引数を basename に変えたり、directory 名を渡したり、pathname を渡したりしないという方針は適切。既存 callback は file-namestring を受け取る。

directory entry で空文字を受け取る挙動も現行契約の一部になる。これを使って任意の directory entry の存在を調べる callback は、今回の切り出し比較でも同じ candidate を返した。

symbol の function designator は現行 etypecase の function branch には含まれない。今回新たに symbol を受け付ける変更を混ぜる必要はない。

### 6.2 順序・回数まで同じではない

現行:

~~~text
candidate ごとに 1 回列挙
  entry A → pattern 1, pattern 2
  entry B → pattern 1, pattern 2
~~~

提案:

~~~text
pattern 1 → candidate を列挙して全 entry に callback
pattern 2 → candidate をもう一度列挙して全 entry に callback
~~~

引数の種類は同じでも、呼び出しの順序・回数・短絡停止地点が変わる。特に filesystem を変更する callback、回数に依存する callback、エラーを出す callback では差が出る。

純粋な判定関数を前提にすれば、候補が一致するかどうかは同じ OR 条件になる。しかし「function pattern の完全互換」とは書かず、「引数契約と純粋な判定としての意味を維持する」と限定する。

### 6.3 改善案

candidate ごとに必要なら 1 回だけ list-directory し、複数の function pattern で再利用する。strings だけの場合は列挙を不要にできる。

空の directory では列挙結果が NIL になるため、NIL を「未計算」と「計算済みで空」の両方に使う cache は避ける。別の loaded-p を持つか、function pattern がある場合だけ 1 回先に計算する。

これは大規模な性能最適化ではなく、概念コードが新たに導入する不要な重複 I/O を避ける程度でよい。function の列挙順まで保持する必要があるなら entry → function pattern を維持する設計にする。strings と functions を別経路にする場合の短絡順序も説明する。

## 7. 境界、path の扱い、既存 filesystem 抽象

### 7.1 HOME と filesystem root は一致判定の後でよい

今回の最小修正では、HOME で停止する既存方針を残す。HOME 自身に本物のマーカーがある場合は返せるように match → stop の順序を維持する。

filesystem root も同じ順序にすることで、root 自身にマーカーがあれば採用する。この点は説明とテストの対象にする。root の検査前に停止する実装とは結果が違う。

HOME は「HOME の範囲外なら検索しない」という境界ではなく、**祖先としてその pathname に到達したときだけ停止する**。HOME 外から始めた探索が HOME の親にあるマーカーを検査し得ることは、root 停止追加後も変わらない。

### 7.2 parent == self と反復形式

parent と candidate の pathname-equal は、POSIX の絶対 directory pathname の終端判定として妥当。Lem に同型の root-directory-p がある点も根拠になる。

親は 1 回だけ計算して終端判定と次の遷移に使えば十分。helper の新設も loop 化も必須ではない。Common Lisp の tail-call 最適化は一般の仕様保証ではないので、loop 化は stack 使用を増やさない利点があるが、**停止条件を欠いた loop も停止しない**。loop 化だけを回帰対策と扱わない。

今回の呼び出し元 buffer-directory は通常 directory の string を返す。公開 API のテストでは pathname だけでなく末尾区切り付き string も含める。fallback は元の directory を返すため、常に pathname を返すと新たに約束しない。途中で内部表現を pathname に揃えても、外側の fallback 値の契約を不用意に変えない。

relative directory、区切りのない directory 名、logical pathname、Windows の drive-relative / UNC 等までの保証を parent == self だけから導かない。今回の PR の実証範囲は主に macOS/Linux の絶対 directory pathname とする。

### 7.3 symlink

pathname-equal は pathname の component 比較であり、filesystem の同一性や truename の同一性を調べない。HOME の別名や symlink 経由の path が HOME と等しいとは限らない。

probe-file* の返り値を marker 存在の真偽にだけ使い、candidate の path を返す設計は不要な root の canonicalize を避ける。一方、UIOP の列挙・symlink の扱いは処理系で差があると公式 manual も明記している。

「symlink なら循環する」「今回の変更で必ず安全になる」といった断定はしない。本体で path を全面的に truename 化する変更は、root URI や buffer filename の表記を変え得るので本 PR に混ぜない。

### 7.4 virtual filesystem / TRAMP

現行 list-directory は UIOP による実 directory 列挙を使いながら、各 entry の検査には Lem の virtual-probe-file を通す。提案の direct probe-file* は、この handler を経由しない。

ただし現行 list-directory がすでに完全な virtual directory 列挙 API を通っているわけではなく、LSP の pathname-to-uri も単純な file URI 生成である。したがって「TRAMP の LSP root が今正常で、今回壊れる」とまでは実証できない。

注意点として残し、今回は local filesystem の修正と明記する。単純に virtual-probe-file に置換すれば解決するとも言えない。現行 TRAMP の probe-file-handler は remote の test -f を利用し、directory 検査には別 handler があるため、.git directory を同じ存在 API だけで拾えるとは限らない。

### 7.5 project finder の統合

今回統合しない判断は適切。project.lisp は file/directory を分けるだけでなく、HOME・root を marker 検査より先に扱う、文字列 "/" を用いる、file 名に equalp を使う等の違いがある。.git file が directory マーカーとして検出されるわけでもない。

「project finder も同じ仕様なので共通化だけすればよい」とは言えない。directory marker と exact file 名の扱いを参考にする範囲に留める。

## 8. LSP workspace の生成・再利用と実機確認

現行の流れ:

1. ensure-lsp-buffer が language-id で既存 workspace を探す。
2. 見つかればその workspace を利用し、buffer hook 等を追加する。root を再計算しない。
3. 見つからなければ run-server。
4. make-workspace → compute-root-uri → find-root-directory。
5. connect-and-initialize → initialize の root-uri に計算結果を使う。

workspace の一覧は language-id ごとに current-workspace と workspaces を持つ。自動選択のキーが project root URI になっているわけではない。

そのため、この修正だけでは「同じ言語の別 project を開いたら自動的に別 root になる」は保証されない。これは既存の workspace 管理の別課題であり、本 PR に広げない。

lsp-restart-server は現在の workspace を dispose して ensure-lsp-buffer を呼ぶ。dispose-workspace 自体は client:dispose を呼ぶだけで、確認したコードに workspace 一覧からの削除はない。少なくとも「このコマンドを呼べば必ず新しい root が計算される」とはソース上言えない。

実機確認は、修正した build の**新しい Lem プロセス**で対象言語のファイルを最初に開く方法を推奨する。package の関数再定義後に既存 workspace を見るだけでは修正を検証できない。

root finder に全 buffer 共通 cache を新設する必要はない。今回問題になる保持済み値は workspace の root-uri である。

## 9. 回帰テストの修正案

### 9.1 配置と既存 helper

tests/language-mode.lisp を新設し、lem-tests.asd に登録する案は妥当。core の root finder 自体には実際の language server や ncurses 起動は不要である。

既存 tests/legit.lisp の unwind-protect + delete-directory-tree の考え方は参考になるが、helper 全体をコピーしない。その helper は get-universal-time の秒値だけで directory 名を作るため、同一秒の複数呼び出しや並行実行で衝突し得る。また git init/commit の失敗を ignore-error-status で無視している。

root 探索テストは空の .git directory / .git file を作れば十分で、Git subprocess は基本不要。衝突しない一時 directory を作り、作成したものだけを unwind-protect で掃除する。実際の Git worktree を使う確認を別途行うなら subprocess の終了 status も確認する。

### 9.2 修正前にも安全に実行する

入力ノートの PR 2 テスト 1、5、6 は、元コードでは正しい marker を検出できず、fixture 外へ探索する可能性がある。.gitconfig のテストも、上位の「本物 .git directory」は、directory 判定だけが退行した実装を止められない。

既存 substring 判定で確実に見つかる **file 型の停止用マーカー**を fixture の上位に配置する方法が使える。nested marker では function callback を追加し、上位に sentinel file を置く。期待 root はその上位ではなく、正しい nested marker を持つ下位 candidate にする。

ただし上位 sentinel を置くと未検出時の fallback を見るテストにはならない。fallback/終端テストは別に用意する。

無限探索の回帰テストには時間・訪問回数等の実行上限が必要。helper のテストだけでは、helper の呼び出し忘れが通る。推奨は以下のいずれか:

- SBCL テスト環境で期限を設定し、公開 find-root-directory を実際に呼ぶ。期限切れを成功として扱わない。中断後の cleanup と suite の継続を確認する。
- 別プロセスで公開関数を実行し、親プロセスの期限で制御する。期限超過は失敗。
- テスト用の directory 列挙差し替えで candidate 訪問回数を制限し、公開関数を呼ぶ。正常な終了では上限到達のエラーが出ないことを検査する。

最後の方法で共通関数の symbol-function を変更する場合は package lock、unwind-protect による復元、他テストとの並行実行に注意する。本番 API にテスト専用の制限値を追加する必要はない。

停止テストのマーカーなし条件は、実 HOME や "/" に偶然 .git があるかどうかに依存させない。常に偽となる function 判定や制御した列挙を使う。HOME が "/" の環境では HOME 外の試験を区別する。

### 9.3 必須のテスト行列

| 分類 | 条件 | 期待 | 検出する退行 |
|---|---|---|---|
| PR 1 | HOME に届かない absolute path、全候補不一致 | 終了し開始 directory を返す | root 終端条件の欠落 |
| PR 1 | filesystem root 自身、全候補不一致 | 終了し開始 root を返す | root の parent 自己参照 |
| PR 1 | root に一致あり（制御された検査） | root を採用 | 停止を match より先にする変更 |
| PR 1 | HOME 自身に一致あり / 不一致 | 一致なら HOME、不一致なら fallback | HOME 順序変更 |
| PR 1 | HOME の子に不一致、HOME より上だけ一致 | HOME で止まり開始へ fallback | HOME 上限の削除 |
| PR 2 | project/.git/、開始 project/src/ | project/ | directory marker 未検出 |
| PR 2 | project/.git file、開始 project/src/ | project/ | gitfile 対応の退行 |
| PR 2 | child/.gitconfig と上位の正しい marker | 上位 root | 部分一致の残存 |
| PR 2 | child/package.json.bak と上位 package.json | 上位 root | file 名の部分一致 |
| PR 2 | project/.lsp/config.edn、開始 project/src/ | project/ | 階層付き path 未対応 |
| PR 2 | NIL patterns、project/.git/、開始 project/src/ | project/ | 既定 lambda を残すミス |
| PR 2 | 複数祖先に marker | 最も近い candidate | pattern 優先順位を祖先順位と混同 |
| PR 2 | string + function 混在 | どちらかの成立で root | type 別経路の漏れ |
| PR 2 | callback に通常 file 名と directory の空文字 | 旧引数契約 | callback への引数変更 |
| PR 2 | Lisp v2 相当、sample.asd | 移行後も project/ | .asd の literal 化 |
| PR 2 | file/directory の marker が同じ候補に複数 | candidate を返す | probe 結果自体を root として返すミス |
| 共通 | pathname と末尾区切り付き string | 同じ探索結果を表す | 実際の buffer-directory 型の見落とし |
| 共通 | マーカーなし（制御された上限付き） | 元の開始値へ fallback | root を返してしまう変更 |

PR 2 を PR 1 未適用 main から独立させる場合、上の「マーカーなし」の共通テストは PR 1 側に置くか、fixture 内で HOME 境界を制御する。PR 2 単体に無保護で置かない。

### 9.4 default .git のテストで特に注意すること

開始値が project/ で、期待値も project/ なら、既定 lambda を残しても fallback で通る危険がある。開始値は必ず project/src/。さらに旧実装が fixture 外へ出て停止できなくならないよう、上位に .git file の sentinel を置くか、期限を設定する。

この条件を満たすと、旧実装は上位 sentinel / timeout、修正版は project/ となり、退行を明確に検出できる。

### 9.5 LSP との接続確認

core の単体テストに加え、必要なら compute-root-uri を実際の buffer と spec で呼び、子 directory から親 project の URI になることを 1 ケース確認する。既存 mock workspace helper は root-uri を固定して workspace を作っており、root 計算を自動的にはカバーしない。

この確認のために LuaLS 起動を全 unit test へ持ち込む必要はない。実機での initialize、diagnostics、completion は別の受け入れ確認として記録する。

## 10. 今回の切り出し比較実験

### 10.1 fixture

P を一時領域内の root-fixture/ とした。P は実 HOME の配下ではない。

~~~text
P/
  .git                  普通の file（上位の停止用）
  sentinel              普通の file（callback の停止用）
  package.json
  project/
    .git/                普通の directory
    sample.asd
    src/                 開始 directory
  decoy/
    .gitconfig
    package.json.bak
  nested/
    .lsp/
      config.edn
~~~

現行の 3 関数は repository のソースから切り出した。提案は入力ノート末尾の 4 関数をそのまま切り出した。list-directory は第 2 節のローカル代替実装。過剰な呼び出しは 20 回超でエラーにし、プロセス全体にも 15 秒の上限を設定した。

### 10.2 結果

| ケース / 開始 / patterns | 現行 | ノートの概念コード |
|---|---|---|
| .git directory / P/project/src/ / '(".git") | P/ | P/project/ |
| 既定 .git / P/project/src/ / NIL | P/ | P/project/ |
| .gitconfig 誤認 / P/decoy/ / '(".git") | P/decoy/ | P/ |
| package.json.bak 誤認 / P/decoy/ / '("package.json") | P/decoy/ | P/ |
| nested marker / P/nested/ / string + sentinel callback | P/ | P/nested/ |
| 旧 .asd / P/project/src/ / string + sentinel callback | P/project/ | P/ |
| 存在しない専用 marker / P/project/src/ | 訪問回数上限エラー。末尾候補は "/" の繰り返し | P/project/src/ |
| 空文字判定 callback / P/project/src/ | P/project/ | P/project/ |

nested marker と .asd の実験には、P/sentinel の file 名に一致する function を patterns の最後に追加した。現行が対象のマーカーを拾わなくても P/ で停止するようにするためである。したがって .asd の概念コード結果 P/ は、本来の fallback ではなく sentinel の一致による root である。

この比較では .git の file が上位にあるため、旧 .git directory 検出失敗を時間無制限の hang にせず観測できた。元コードで上位 file もない場合の失敗は別の「存在しない専用 marker」ケースで観測した。

### 10.3 この結果が証明しないこと

- macOS の実 Lem build が改善したこと。
- Windows 上で同じ pathname の扱いになること。
- ユーザーのロード済み UIOP と一致すること。
- LuaLS の rootUri・診断・補完が改善したこと。
- callback の副作用や virtual filesystem の完全互換。

PR を「テスト済み」とするには、Lem の実 test system と実機確認を別途通す必要がある。

## 11. PR の構成と受け入れ条件

### 11.1 PR 1 — root 探索の終端条件

含める:

- HOME の既存停止条件を残す。
- parent == candidate による root 終端条件。
- match → stop の順序。
- 公開関数を通る、実行上限付きの回帰テスト。

含めない:

- 文字列の意味変更。
- default .git の変更。
- LSP workspace の選択・再起動仕様。
- project finder との統合。

loop 化は小さな同等変形として可能だが、レビューしやすさを優先して選ぶ。helper を置くなら helper 単体テストだけで完了としない。

### 11.2 PR 2 — マーカーの正確な相対 path 判定

含める:

- string を候補からの特定相対 path とする判定。
- .git file / directory、階層付き path、紛らわしい file 名の回帰テスト。
- NIL の既定値を string ".git" に移す。
- function 引数契約の維持と、不要な繰り返し列挙の回避。
- **Lisp v2 の .asd 利用者の移行と回帰テスト。**
- 文字列形式、callback、fallback を説明する docstring / 必要な開発文書。

「通常の .git directory 検出」「誤一致防止」「階層付き path」「既定 .git」「利用者の移行」は、同じ文字列契約を正しく導入するための一連の変更であり、1 PR に含めてよい。

glob support、全 path の canonicalize、URI encoding、multi-project workspace、remote LSP は独立の目的なので混ぜない。

### 11.3 branch の独立性

双方を最新 main から独立に作る方針は維持する。両方が language-mode.lisp と lem-tests.asd を変更するため、merge/rebase 時に競合し得るが、これは動作上の依存とは別である。

片方が upstream に入ったら main を更新し、残りを最新 main に合わせる。両方を日常利用する場合は local に統合する。PR 2 を、未マージ PR 1 の branch から派生させる必要はない。

### 11.4 提出前に必要な確認

1. 対象 branch の実際の Lem test system で追加テストを実行する。
2. 修正前に各テストが有限時間で失敗し、修正後に成功することを確認する。
3. PR 2 では「default .git の変更を戻した場合」「Lisp v2 の移行を外した場合」に対応テストが失敗することを確認する。
4. repository の既存 Rove suite と通常の CI 相当を実行する。
5. macOS + WezTerm の新しい Lem プロセスで、HOME 内・HOME 外・普通の Git root・マーカーなしを確認する。
6. LuaLS の新しい initialize で rootUri を確認する。diagnostics / completion も確認し、別ノートの JSON-RPC 問題による失敗と区別する。
7. 実行したコマンド、Lem commit、SBCL・UIOP の版、テスト結果を PR 本文に記録する。

既存 CI は docker/Dockerfile.test で依存を準備し、Rove で lem-tests.asd と vi-mode の test system を実行する。今回の切り出しスクリプト成功でこれらを代替しない。

## 12. 根拠となる参照

以下の Lem ソースリンクはレビューした fork の commit に固定している。行番号はリンク先の該当実装を探す補助であり、将来の main の同じ行を意味しない。

| 根拠 | 参照 |
|---|---|
| root finder / default .git / export / editor variable | [src/ext/language-mode.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/ext/language-mode.lisp#L606-L627) |
| local directory 列挙 / virtual probe | [src/buffer/file-utils.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/buffer/file-utils.lisp#L85-L147) |
| buffer-directory の型と設定 | [src/buffer/internal/buffer.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/buffer/internal/buffer.lisp#L217-L233) |
| spec の root-uri-patterns slot | [extensions/lsp-mode/spec.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lsp-mode/spec.lisp#L17-L25) |
| compute-root-uri / workspace 管理 / initialize / restart | [extensions/lsp-mode/lsp-mode.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lsp-mode/lsp-mode.lisp)（142–182、209–245、407–439、546–558、1817–1823） |
| URI 生成 | [extensions/lsp-base/utils.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lsp-base/utils.lisp#L13-L18) |
| 通常 Lisp mode の旧設定 | [extensions/lisp-mode/lisp-mode.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lisp-mode/lisp-mode.lisp#L41) |
| ロード可能な Lisp v2 spec | [extensions/lisp-mode/v2/lsp-config.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lisp-mode/v2/lsp-config.lisp#L10-L12) |
| v2 の ASDF system 定義 | [extensions/lisp-mode/lem-lisp-mode.asd](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lisp-mode/lem-lisp-mode.asd#L64-L68) |
| 通常 system の依存 | [lem.asd](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/lem.asd) |
| WAT の reader による無効化 | [extensions/wat-mode/lsp-config.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/wat-mode/lsp-config.lisp#L5-L13) |
| Lua spec | [extensions/lua-mode/lsp-config.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lua-mode/lsp-config.lisp) |
| Clojure spec | [extensions/clojure-mode/lsp-config.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/clojure-mode/lsp-config.lisp) |
| Typst spec | [extensions/typst-mode/lsp-config.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/typst-mode/lsp-config.lisp) |
| 別仕様の project finder | [src/commands/project.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/src/commands/project.lisp#L94-L152) |
| parent == self の既存例 | [extensions/lisp-mode/ext/package-inferred-system.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/lisp-mode/ext/package-inferred-system.lisp#L17-L19) |
| TRAMP の probe / directory handler | [extensions/tramp/tramp.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/extensions/tramp/tramp.lisp#L618-L644) |
| テスト登録 | [lem-tests.asd](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/lem-tests.asd) |
| 一時 repository helper の実装 | [tests/legit.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/tests/legit.lisp#L55-L80) |
| mock workspace は root 固定 | [tests/lsp-mode/test-utils.lisp](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/tests/lsp-mode/test-utils.lisp#L56-L64) |
| CI の実行方法 | [.github/workflows/test.yml](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/.github/workflows/test.yml)、[docker/Dockerfile.test](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/docker/Dockerfile.test) |
| 現行 UIOP 依存の記録 | [qlfile](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/qlfile)、[qlfile.lock](https://github.com/takashit16833/lem/blob/27572e42923a99d1dee0be8b991e0bfd2113b24d/qlfile.lock) |
| UIOP 公式の API 説明 | [UIOP Manual](https://asdf.common-lisp.dev/uiop.html)（subpathname、parse-unix-namestring、probe-file*、directory-files、subdirectories） |
| UIOP の相対 path 解析・component 比較 | [UIOP 3.3.6.2 pathname.lisp](https://github.com/fare/asdf/blob/f2ded94075a2e6e0b65e66870cf338d1951683e0/uiop/pathname.lisp)（213–232、286–293、413–486、544–553） |
| UIOP の probe-file* と ignore-errors | [UIOP 3.3.6.2 filesystem.lisp](https://github.com/fare/asdf/blob/f2ded94075a2e6e0b65e66870cf338d1951683e0/uiop/filesystem.lisp#L96-L151) |
| root finder 導入時の履歴 | [d79b4e7: add find-root-directory](https://github.com/lem-project/lem/commit/d79b4e727c6482b4baac228a5160fd9e1d55015c) |
| レビュー時 upstream の更新 | [da26ca8: Avoid changing terminal color palette](https://github.com/lem-project/lem/commit/da26ca8443a17b9e681f191491c453dbf24e3dd9) |

導入時の差分には、最初から search による文字列の部分一致と HOME のみの停止条件がある。正式な契約変更を検討するうえで歴史的な実装の根拠にはなるが、意図した利用範囲や HOME 制限の理由まではその commit message から確定できない。

## 13. 次に実装する人への指示

入力ノートの概念コードをそのまま貼らず、まず R1–R5 を反映した仕様・テストを作ること。

特に避けるべき誤解:

- 「.asd は現行にない」ではない。標準で自動ロードされない Lisp v2 system に存在する。
- 「WAT に wildcard があるから glob 必須」ではない。現行 spec は reader により無効。
- 「.gitconfig テストの上位に .git directory があれば旧実装も必ず止まる」ではない。
- 「期待値が開始 directory と同じなら .git 検出テストになる」ではない。
- 「helper が root を認識するテストがあれば探索は止まる」ではない。
- 「callback に同じ型の引数を渡すなら呼び出し順・回数も同じ」ではない。
- 「probe-file* の NIL は不在を証明する」ではない。
- 「LSP を再起動すれば root を必ず再計算する」ではない。
- 「今回の Linux 切り出し実験が成功したので Lem の全テスト・実機確認済み」ではない。

原因分析を作り直す必要はない。修正案 1 の停止テストを強め、修正案 2 の利用者移行・契約・テストの終端条件を補えば、限定された目的の PR として進められる。


## 14. 付録 — 比較実験を再現するためのスクリプト

これは本体へ追加する Rove テストではなく、第 10 節の局所比較の再現用である。専用の作業 directory 内で実行する。ROOT_REVIEW_FIXTURE はその中の新規 directory の絶対 path とし、HOME・実プロジェクト・既存 repository を指定しない。スクリプトは fixture 内にテスト用 file/directory を作成し、終了後も残す。削除は作成した fixture のみに限定する。

準備:

1. レビュー対象 SHA の Lem ソースから末尾の 3 関数を original-root.lisp として保存する。package 宣言は含めない。
2. 入力ノートの「修正案の概念コード」にある 4 関数を proposed-root.lisp として保存する。ノートの他のコード片を混ぜない。
3. 以下を root-review-harness.lisp として保存する。

~~~lisp
(require :asdf)
(defpackage :root-review (:use :cl))
(in-package :root-review)
(defvar *visits* nil)
(defun list-directory (directory)
  (push (namestring directory) *visits*)
  (when (> (length *visits*) 20) (error "VISIT-BUDGET-EXCEEDED"))
  (remove-if-not #'probe-file
                 (append (sort (uiop:subdirectories directory) #'string< :key #'namestring)
                         (sort (uiop:directory-files directory) #'string< :key #'namestring))))
(defun touch (p)
  (ensure-directories-exist p)
  (with-open-file (s p :direction :output :if-exists :supersede) (write-line "" s)))
(defun run-case (label start patterns)
  (let ((*visits* nil))
    (handler-case
        (format t "~A => ~S~%" label (find-root-directory start patterns))
      (error (c) (format t "~A => ERROR: ~A; final visits=~S~%" label c (subseq *visits* 0 (min 4 (length *visits*))))))))
(format t "SBCL=~A ASDF=~A~%" (lisp-implementation-version) (asdf:asdf-version))
(let* ((base (uiop:ensure-directory-pathname (uiop:getenv "ROOT_REVIEW_FIXTURE")))
       (project (uiop:subpathname base "project/"))
       (src (uiop:subpathname project "src/"))
       (nested (uiop:subpathname base "nested/"))
       (decoy (uiop:subpathname base "decoy/")))
  (ensure-directories-exist src)
  (ensure-directories-exist (uiop:subpathname project ".git/"))
  (touch (uiop:subpathname base ".git"))
  (touch (uiop:subpathname base "sentinel"))
  (touch (uiop:subpathname base "package.json"))
  (touch (uiop:subpathname nested ".lsp/config.edn"))
  (touch (uiop:subpathname project "sample.asd"))
  (touch (uiop:subpathname decoy ".gitconfig"))
  (touch (uiop:subpathname decoy "package.json.bak"))
  (ensure-directories-exist nested)
  (let ((p (uiop:subpathname project ".git")))
    (format t "git-directory: pathname=~S probe=~S~%" p (uiop:probe-file* p)))
  (dolist (pattern '(".asd" "*.wat" "" "." "../sentinel" "/sentinel"))
    (handler-case
        (let ((p (uiop:subpathname project pattern)))
          (format t "subpath ~S: ~S name=~S wild=~S probe=~S~%" pattern p (pathname-name p) (wild-pathname-p p) (uiop:probe-file* p)))
      (error (c) (format t "subpath ~S: ERROR ~A~%" pattern c))))
  (load (uiop:getenv "ROOT_REVIEW_FUNCTIONS"))
  (run-case "explicit-git-directory" src '(".git"))
  (run-case "default-git-directory" src nil)
  (run-case "gitconfig-decoy" decoy '(".git"))
  (run-case "package-json-decoy" decoy '("package.json"))
  (run-case "nested-relative-marker" nested (list ".lsp/config.edn" (lambda (n) (string= n "sentinel"))))
  (run-case "legacy-asd" src (list ".asd" (lambda (n) (string= n "sentinel"))))
  (run-case "outside-home-no-marker" src '("ROOT-REVIEW-MARKER-DOES-NOT-EXIST"))
  (run-case "directory-function-empty-string" src (list (lambda (n) (string= n "")))))
~~~

各実装を別の Lisp プロセスで実行する。以下の timeout は GNU coreutils のものを使う Linux の例。macOS では利用可能なプロセス監視方法へ置き換える。SBCL_HOME を明示した今回の実行は一時領域へ展開した SBCL 用であり、通常インストール済みの SBCL では不要。

~~~sh
mkdir root-fixture
ROOT_REVIEW_FIXTURE="$PWD/root-fixture/" \
ROOT_REVIEW_FUNCTIONS=original-root.lisp \
timeout 15s sbcl --noinform --script root-review-harness.lisp

ROOT_REVIEW_FIXTURE="$PWD/root-fixture/" \
ROOT_REVIEW_FUNCTIONS=proposed-root.lisp \
timeout 15s sbcl --noinform --script root-review-harness.lisp
~~~

このスクリプトは観測結果を出すもので、期待値を assertion する正式な回帰テストではない。旧実装の訪問回数超過は意図した診断出力として捕捉する。PR のテストにするときは、期待値・異常終了・期限超過を明示的に検査すること。
