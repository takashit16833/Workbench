# タブルーティング・移動履歴の設計レビュー

調査日: 2026-10-02（JST）

## 1. 結論

旧設計書2本は、旧実装の主要な動作を正しく説明している。タブ名とIDの分離、Tasks → Org → Project → Misc の優先順位、ファイルなしバッファの例外、Project Context、初期化時期、Bufferlo連携は実装と一致する。

ただし、「表示方法を保つ」の適用範囲、Miscの並べ替え、旧Navigationの記録条件、現在の移植先の構成について補足・訂正が必要である。

リファクタ案の **観測 → 純粋な判断 → 状態変更** という骨格は採用してよい。しかし、そのまま実装に移せる完成した詳細設計ではない。特に次の3点は実装前に修正する。

1. `tab-bar-tabs-function`でMiscを除外しない。この関数は表示だけでなくタブの選択・作成・移動にも使われる。
2. Bufferloへの通知は「作成直後」と「目的バッファの表示成功後」を分ける。旧実装と同じ一覧初期化をするなら後者を使う。
3. 移動履歴の保存先と、タブをまたぐ戻る・進むの仕様を先に決める。Navigationを外側のadviceにするだけでは、Better Jumperのウィンドウ別履歴との整合性は保証できない。

より単純な代替案として、**Emacs標準のxref履歴をNavigationの保存先にする案**を第一候補として提案する。全体で1つの履歴を使うなら、移動後に保存先ウィンドウを復元する必要がなく、RoutingとNavigationを独立させやすい。Better Jumper固有の動作が必要なら、その必要性を確認して採用する。

これは設計レビューと提案であり、採用済み仕様ではない。今回変更するのは本ノートだけで、設定・実装・既存の4設計書は変更しない。

## 2. 調査範囲と確認の限界

### 固定した版

| 対象 | 調査したコミット・版 |
| --- | --- |
| 旧 `.emacs.d-cli` | `199290856dfea46b6da9ccb98c218888e8503ed3` |
| 新 `.emacs.d` | `464f8c6ae36f257b7c7b23999525c22e289701a9` |
| Workbenchの4設計書 | `5b33ed217f2aa7397476546f1d8dc9e94a8fae1d` |
| Emacs | `emacs-31.1`、コミット `a360712c9d272d950d8d8255ef74570f7e90b7d9` |
| Better Jumper | `b1bf7a3c8cb820d942a0305e0e6412ef369f819c` |
| Bufferlo | `1ab597c021ee33511fdaad942cc6dd5ac064f6ba` |

旧実装の関連4ファイル、初期化設定、Routing / Project ContextのERT、移植先の全configファイルとinit、Emacs 31.1の`tab-bar.el` / `window.el` / `files.el` / `project.el` / `xref.el`、Better Jumper・Bufferloの上記ソースを照合した。タブID永続化に関する旧コミットの差分も確認した。

以下では「ソースから確認できた事実」と「実機で確認すべき挙動」を区別する。調査環境にはEmacs実行ファイルがなく、ERT・端末上の操作・性能測定は実施していない。ユーザー環境のインストール済みBetter Jumper / Bufferloが上記コミットと同じとは限らない。

したがって、再現条件からの不具合予測を「ユーザー環境で再現済み」とは扱わない。実装時の確認項目は後半に記載する。

### 対象設計書

- [旧基本設計](Tab-Routing-Basic-Design.md)
- [旧詳細設計](Tab-Routing-Detailed-Design.md)
- [新基本設計案](Tab-Routing-and-Navigation-Basic-Design.md)
- [新詳細設計案](Tab-Routing-and-Navigation-Detailed-Design.md)

## 3. 旧設計書と実装の照合

### 一致している部分

| 設計書の記述 | 確認結果 |
| --- | --- |
| Destinationは`(ID . NAME)` | 一致。ProjectのIDだけが`(project . ROOT)`のcons |
| Tasks → Org → Project → Misc | 一致。`cl-some`による最初のnon-nil。Tasksは`~/org/workbench/tasks/`配下の文字列判定 |
| Orgは拡張子で判定する | 一致。大文字・小文字を区別しない。プロジェクト内でもOrgが優先 |
| 通常のファイルなしバッファは動かさない | 一致。xref結果だけ`default-directory`からProjectを検出 |
| 現在ID → 既存ID → IDなし同名 → 新規作成 | 一致。新規作成時の同名衝突にはIDを含む表示名を付ける |
| 最初のscratchをMiscへ転用 | 一致。タブ1個・scratch表示・IDなし・明示名なしが条件 |
| `find-file` / `switch-to-buffer` / `display-buffer`をadvice | 一致。タブ操作を元の処理より前に行う |
| `switch-to-buffer`のみ起動後に有効化 | 一致。初期設定中は`emacs-startup-hook`へ登録 |
| Routing adviceのdepthは100 | 一致。Navigationはdepth指定なしなので通常の0。Navigationが外側になる |
| 新規タブだけBufferloの一覧を初期化 | 一致。元の表示処理が正常終了した後に`bufferlo-clear`を呼ぶ |
| Project Contextは明示directory・既存overrideを優先 | 一致。バッファの`default-directory`は恒久変更しない |
| Better Jumperの初期化とRoutingが結合 | 一致。`my-navigation.el`にはさらに最大化とvterm設定も混在 |
| タブID永続化が過去に修正された | 一致。`aca91e0`、`df4801d`の差分でも確認 |

根拠: [旧Routing](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/lisp/my-tab-routing.el)、[旧Project Context](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/lisp/my-project-context.el)、[旧初期化](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/init.el)。

### 補足・訂正すべき部分

#### O1. 「display-bufferの表示方法を保つ」は限定的

旧詳細設計13節は、元の`display-buffer`へ引数をそのまま渡し、その戻り値を返す点では正しい。ただし、**先に選択タブとウィンドウ構成が変わる**ので、元の表示要求と同じ結果になるとは限らない。

`display-buffer`の標準の説明は「ウィンドウを選択せず表示する」。旧adviceはタブを選択するため、背景での表示要求でも利用者の作業タブが変わり得る。また、表示を行わずnilを返す要求でも、その前段のタブ作成・選択は済んでいる。

正確な記述は「表示先タブを先に変更し、その変更後の状態で標準の表示処理へ委譲する」。ウィンドウ選択を含む意味まで保存しているわけではない。

根拠: [旧advice](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/lisp/my-tab-routing.el#L147-L160)、[Emacsのdisplay-buffer](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/window.el#L8176)。

#### O2. Miscは並べ替えの移動対象・移動先候補から除外される

旧基本設計の「並べ替えの対象にも含めない」は、利用者がMisc自体を移動できず、隣の可視タブを移動先にするという意味なら正しい。

ただし実際の`tab-bar-move-tab-to`は全タブ中の番号で動かすため、他のタブがMiscをまたぐと、結果としてMiscの物理的な位置も変わり得る。「Miscは常に固定位置」とは解釈しない。

またキーは単なるPageUp / PageDownではなく、旧initでは`C-<prior>` / `C-<next>`、並べ替えはそれにShiftを加えたキー。

根拠: [旧Tab UI](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/lisp/my-tab-bar.el)。

#### O3. 旧Navigationは「位置が変われば常に記録」ではない

旧Navigationは次の条件を持つ。

- 追跡中・Better Jumperのジャンプ中は記録しない。
- 移動前にBetter Jumperのlocal modeが有効で、ファイルバッファである。
- 元の処理が正常終了する。
- 移動前後の選択ウィンドウが`eq`で同じ。
- 移動元バッファとmarkerが生存している。
- 移動後もファイルバッファである。
- バッファまたはmarker基準の位置が変わった。

旧詳細設計はNavigationの役割・advice順序を説明するが、この制約の一覧がない。新設計の「bufferかpointが変われば記録」は、旧仕様の説明ではなく**記録対象を広げる変更案**として扱う。

根拠: [旧Navigation 13–35行](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/lisp/my-navigation.el#L13-L35)。

#### O4. Project rootの正規化は物理的な同一性の保証ではない

旧処理は`expand-file-name`と`file-name-as-directory`を使う。相対表記・末尾スラッシュなどは揃うが、シンボリックリンク経由のパスと実体のパスを必ず同じIDにする処理ではない。

新設計も「末尾`/`で正規化すれば同一プロジェクトを必ず識別できる」とは書かない。基本は`project-root`の返すルート表記を採用し、必要性を観測するまで`file-truename`を追加しない。後者はTRAMPや存在しないパスに余計な問い合わせを発生させ得る。

#### O5. 現在の移植先ではBufferlo・Magitが有効

旧基本設計のBufferlo再採用の検討、旧詳細設計22節の「Lazygit方針なのでMagit連携は移植不要」は、現在の`.emacs.d`を表す記述ではない。

| 現在の設定 | 内容 |
| --- | --- |
| `config/basic.el` | Bufferloを`:demand t`で読み込み、modeを有効化。`C-x b`はBufferloの切替 |
| `config/git.el` | Magit、magit-deltaを設定。`C-x g`は`magit-status` |
| `config/development.el` | `project-switch-commands`にもMagitを追加 |
| `config/ui.el` | tab-bar / tab-lineは導入済み。tab-lineの次・前は標準コマンド |
| `elisp/` | 新Routing / Project Context / Navigationはまだ存在しない |

Magitのタブ文脈連携は「不要と確定」ではなく「現在も必要か検討」。Bufferloは導入済み機能として接続を設計する。

根拠: [新basic.el](https://github.com/takashit16833/.emacs.d/blob/464f8c6ae36f257b7c7b23999525c22e289701a9/config/basic.el)、[新git.el](https://github.com/takashit16833/.emacs.d/blob/464f8c6ae36f257b7c7b23999525c22e289701a9/config/git.el)、[新development.el](https://github.com/takashit16833/.emacs.d/blob/464f8c6ae36f257b7c7b23999525c22e289701a9/config/development.el)、[新ui.el](https://github.com/takashit16833/.emacs.d/blob/464f8c6ae36f257b7c7b23999525c22e289701a9/config/ui.el)。

### 既存ERTで保証している範囲

Routingは10本、Project Contextは9本のテストがある。ルール優先順位・ID保存・初期Misc・xref分類・project-currentの優先順位・Magitの引数取得などを確認する構成。

ただしRoutingのタブ操作は標準関数を差し替えたテストが中心であり、実際のタブ切替・ウィンドウ構成復元・Bufferlo・Better Jumperとの統合は保証しない。専用Navigation / Tab UIのテストファイルもない。「既存ERTがあるのでタブをまたぐ戻る・進むは保証済み」とは判断できない。

根拠: [Routingテスト](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/test/my-tab-routing-test.el)、[Project Contextテスト](https://github.com/takashit16833/.emacs.d-cli/blob/199290856dfea46b6da9ccb98c218888e8503ed3/test/my-project-context-test.el)。今回これらは実行していない。

## 4. リファクタ案の評価と修正提案

### 採用してよい設計

- DestinationとTab Planを純粋関数に分ける。
- Project検出とtab-barの読み書きを境界関数に寄せる。
- 表示名とIDを分離し、IDなし同名タブの自動採用をやめる。
- Project ContextをNavigationやRoutingの初期化から分離する。
- 拡張ルールの登録機構を、必要性が出るまで作らない。
- Navigationの再入防止と、戻る・進む中の記録抑制を独立に持つ。
- 自作の小さい機能を遅延読み込みするためだけに複雑な仕組みを増やさない。

### R1. Misc非表示に`tab-bar-tabs-function`を使う案は変更する【重要】

対象: 新基本設計「公開API優先」、新詳細設計19節。

Emacs 31.1では`tab-bar-select-tab`、タブ作成、移動、閉じる処理などもこの変数の関数を呼ぶ。Miscを除外した一覧を返すと、操作対象一覧そのものが欠ける。現在タブがMiscなら、内部のcurrent-tab検索も見つからなくなる。

**全タブ一覧と表示用一覧を分ける方針は正しいが、標準変数の置き換え位置が違う。**

初期実装はMiscを表示する標準UIで完成させる。非表示が必要になった段階で、`tab-bar-format`の描画専用関数で除外する。旧実装のように元の全タブ番号を維持し、`tab-bar--format-tab`の利用を1か所へ隔離する案は、誤った公開API利用より妥当。

公開機能だけで描画を構成する案も可能だが、クリック・閉じる操作・番号・現在タブの表示を再構築する量と比較して判断する。`tab-bar-show`も全タブ数を見ているため、隠したMiscを表示個数から除くかは別途必要な仕様。

根拠: [Emacs 31.1の一覧取得と保存](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L838-L872)、[タブ選択](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L1682)、[描画](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L1044-L1074)。

### R2. Bufferlo連携は表示成功後に行う【重要】

対象: 新基本設計「Bufferlo」、新詳細設計18節。

新案は`create → ID設定 → tab-created-hook → bufferlo-clear`。旧処理は`create → 目的バッファを表示 → bufferlo-clear`。

Bufferloの`bufferlo-clear`は現在バッファだけを残す。移植先の新規タブはscratchを表示する設定なので、作成直後に実行するとscratchを残す。表示後に実行すれば目的ファイルを残す。両者は同じ動作ではない。

提案する通知は、必要な後者だけの`my/tab-routing-after-display-functions`。`created-p`と実際の表示ウィンドウを渡す。接続側が「作成されたタブへの表示が成功したときだけ、目的ウィンドウを選択した一時的な状態で一覧を初期化する」。RoutingはBufferloを直接呼ばない。

表示を行わずnilを返した場合・元の処理が失敗した場合は、成功通知を出さない。元の処理の戻り値はそのまま返す。作成通知が別の用途で必要になるまではhookを2つ作らない。

根拠: [Bufferloのbufferlo-clear](https://github.com/florommel/bufferlo/blob/1ab597c021ee33511fdaad942cc6dd5ac064f6ba/bufferlo.el#L1813-L1823)。

### R3. Better Jumperの履歴保存先を明示する【重要】

対象: 新詳細設計22–28節、36節。

`better-jumper-set-jump`の引数は位置だけ。ファイルは実行時のcurrent-buffer、履歴は`better-jumper-context`に従う現在のwindow / bufferへ保存される。`with-current-buffer source-buffer`だけでは、選択ウィンドウを移動元へ戻したことにはならない。

ウィンドウ別履歴の場合、旧実装は前後のwindowが異なると記録しない。新案がこの条件を取り除けば、移動元を移動先ウィンドウの履歴へ記録する可能性がある。逆に同じwindowオブジェクトでも、タブのウィンドウ構成復元で履歴の状態が同じとは限らない。

さらにBetter Jumperの戻る処理は、移動開始前に履歴を読み、`find-file`の後に現在文脈から履歴位置を更新する。途中でRoutingがタブを変えると、開始時と終了時で文脈が変わり得る。adviceの順序は必要条件になっても、この問題を解決する十分条件ではない。

| 希望する仕様 | 設計上の意味 |
| --- | --- |
| Bから戻るとAのファイル・位置へ戻り、進むとBへ戻る | タブをまたぐ1つの履歴が自然。標準xrefのglobal履歴を第一候補にする |
| 各タブ・各ウィンドウで履歴を独立させる | タブをまたぐ移動を記録するか、履歴をどちらに保存するかを別途定義する |

Better Jumperを残す場合は、小さな統合試作で保存先・履歴位置・markerの保持を先に確認する。`get-jumps` / `set-jumps`の単純コピーも万能な解決ではない。公開APIは履歴構造をコピーするが、位置を追従するmarker表のコピーまで同じAPIで扱ってはいない。

根拠: [Better Jumperの文脈取得](https://github.com/gilbertw1/better-jumper/blob/b1bf7a3c8cb820d942a0305e0e6412ef369f819c/better-jumper.el#L157-L216)、[記録とジャンプ](https://github.com/gilbertw1/better-jumper/blob/b1bf7a3c8cb820d942a0305e0e6412ef369f819c/better-jumper.el#L284-L370)、[公開get/set](https://github.com/gilbertw1/better-jumper/blob/b1bf7a3c8cb820d942a0305e0e6412ef369f819c/better-jumper.el#L426-L443)。実際のタブ構成での再現は未確認。

### R4. Locationの整数とmarkerの役割を分ける

対象: 新詳細設計22–25節。

純粋な比較に整数のpointを使うのはよい。ただし移動元を保持する間に編集が入る可能性があるなら、整数は元のテキストの位置に追従しない。旧実装の`copy-marker`を単純に整数へ置き換えるとこの性質を失う。

境界で移動元markerを保持し、比較時点ではmarkerを整数へ変換した値を純粋関数へ渡す。保存先がxrefならmarker自体を引き渡せる。

markerの所有権も決める。記録しなかった場合・失敗時は追跡側が解放し、xref履歴へ引き渡した場合は追跡側で`set-marker nil`しない。新詳細設計25節の`prog1`例は骨格としてはよいが、再入防止・抑制・markerの後始末・記録失敗時の方針を補ってから実装する。

### R5. 戻る・進む中の抑制は公開コマンドのaround adviceを優先

対象: 新詳細設計27節。

Better Jumperにはpre/post jump hookがある。ただし調査版の内部ジャンプは、preとpostの間でエラーが起きた場合にpost hookの実行を保証しない。preで自作抑制状態をtにしpostでnilに戻す方式では、状態が残り得る。

公開のbackward / forward / newestコマンドをaround adviceで包み、`defvar`した変数を`let`で動的束縛する案が単純。エラー・中断でも束縛は戻る。xref案でもback / forwardへの同じ抑制を行う。Routingは抑制せず、履歴から戻ったバッファの所属タブを選択する。

### R6. プロジェクト検出は「対象ファイルの文脈」と「現在タブの文脈」を分ける

対象: 新詳細設計7節、20–21節。

Routingは`project-current nil target-directory`で対象の場所を明示する。Project Contextはdirectory省略時だけ現在タブのrootを補う。この分離を維持する。対象directoryを省略すると、現在のProjectタブのoverrideに引っ張られて、別プロジェクトを現在タブへ送る循環が起こり得る。

また`project-current-directory-override`は検索開始地点だけでなく、プロジェクト選択の質問を省略する意味も持つ。古いタブのrootが削除・移動されると通常の質問動作と違う結果になるため、期待をテストする。rootがあることと、現在も検出できるProjectであることは同じではない。

根拠: [Emacs 31.1 project.el](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/progmodes/project.el#L207-L294)。

### R7. タブID保存は全体再構築より、限定した変更が単純

対象: 新詳細設計14節。

`tab-bar-tabs`は実際のフレームのタブ一覧を返し、`tab-bar-tabs-set`はその一覧をフレームへ保存する。したがって公開関数で読み書きできる。ただしSnapshotから全タブを作り直すと、ウィンドウ構成・履歴・Bufferlo等の独自情報を落とす。

今回のおすすめは、境界内で`tab-bar-tabs`からcurrent-tabを探し、**現在タブの独自IDだけを更新する**方式。`tab-bar--current-tab-find`を直接使う必要はない。例えば取得済みtabに対する更新場所は`(cdr tab)`とし、現在タブの先頭シンボルを壊さない。

純粋にするのはPlanまででよい。状態変更境界を破壊的変更なしにすること自体を目標にしない。全体コピーを選ぶ場合も、未解釈のエントリを保持し、操作直前の最新一覧を元にする。

Emacs 31.1はタブ切替時に標準項目以外のエントリを引き継ぐ。ただしその挙動は実タブの往復・並べ替え・閉じる/復元で統合テストする。

根拠: [一覧読み書き](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L847-L872)、[独自エントリの引継ぎ](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L1492-L1560)、[旧修正差分](https://github.com/takashit16833/.emacs.d-cli/commit/df4801d320a30b26d04db7048e011766aeef529c)。

### R8. 表示経路はadvice名だけで決めない

対象: 新詳細設計16–17節、30節。

Emacs 31.1の通常のファイル表示は次の経路を使う。

`find-file → find-file-noselect → pop-to-buffer-same-window → pop-to-buffer → display-buffer`

`switch-to-buffer`を必ず経由するわけではない。xref履歴の戻る・進むも`pop-to-buffer`を使う。このため`find-file` / `switch-to-buffer`だけを捕まえても、すべてのファイル表示・履歴移動は網羅できない。

新設定のtab-line切替、Bufferlo、Consult、Dired、xref、別ウィンドウで開く操作を対象として、経路ごとの観測が必要。単なる下位関数の監視だけでは、Consultの候補プレビューを確定した移動と区別できない場合もある。

初期案は「利用者が現在ウィンドウでファイルを開く・切り替える経路」に絞る。背景表示や別ウィンドウ指定の自動Routingは後から追加する。汎用`display-buffer` adviceを使うなら、タブ移動を許可する条件・表示なし・専用ウィンドウ・起動中・履歴再生・プレビュー中の扱いを明示する。

`find-file-noselect`や単なる`set-buffer`は、ファイルを読むだけの処理にも使われるので、自動タブ切替の対象にしない。

根拠: [find-file](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/files.el#L1967-L2001)、[pop-to-buffer](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/window.el#L9413-L9474)、[xref履歴移動](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/progmodes/xref.el#L522-L557)。

### R9. 相対パス・再入・失敗時の契約を追加する

旧`find-file` adviceは、分類ではパスを絶対化するが、元の関数には元のFILEを渡す。相対パスの場合、先に別タブへ移動すると`default-directory`が変わり、分類したファイルと開くファイルがずれる可能性がある。

新実装はタブ変更前の基準directoryでパスを確定し、分類と元の表示処理で同じ対象を使う。複数ファイルに展開するwildcardは、文字列1つに対するPlanでは各ファイルの所属を保証できないので、対応範囲を別途決める。

また、タブ作成中の`switch-to-buffer`やhook、表示処理中の別表示要求による再入を扱う。Routingの再入抑制はNavigationの`--tracking`とは別で、境界に小さい動的変数を持つ。抑制対象をタブ作成・選択の内部処理に限定するか、同じ表示要求の重複だけにするかをテストで固定し、wildcard等の別バッファまで一律に捨てない。

表示が失敗した場合に空タブが残るかも仕様。初期実装では複雑な自動rollbackを作らず、事前に正常化できる入力は正常化し、成功後通知を行わない。自動でタブを削除する復旧は、作成時hookなどの状態変更まで元に戻せると確認してから検討する。

### R10. 境界のテストを一律に薄くしない

新詳細設計8節の「境界なのでERTを大量に書かない」は、本数を抑える方針なら妥当。しかし今回壊れやすいのは境界である。

純粋なPlanのテストを十分に書いても、IDの永続化・実際のウィンドウ選択・Bufferloの実行タイミング・履歴の文脈・advice再登録を保証しない。これらは実際のEmacs状態を使った少数の統合ERTを必須候補にする。

## 5. より単純な代替案

### 5.1 Navigationの保存先に標準xref履歴を使う【推奨候補】

Emacs 31.1には次の公開機能がある。

| 機能 | API |
| --- | --- |
| 移動元markerを記録 | `xref-push-marker-stack` |
| 戻る | `xref-go-back` |
| 進む | `xref-go-forward` |
| 全体・ウィンドウ別の履歴を選択 | `xref-history-storage` |
| 全体で1つの履歴 | `xref-global-history`（標準値） |
| 履歴の消去 | `xref-clear-marker-stack` |

全体履歴なら、移動成功後に捕捉済みの移動元markerを記録しても、選択ウィンドウの変更に保存先が左右されない。履歴の戻る・進むはバッファ表示を行うため、Routingの表示経路とつなげられる。

提案構成は、**Navigationは「何を記録するか」だけを自作し、履歴保存・戻る・進むはxrefへ任せる**。履歴のためだけに新しい抽象層や汎用保存先の差替え機構は作らない。

ただし、Better Jumperと完全に同じ動作ではない。

| 観点 | 標準xref | Better Jumper（調査版） |
| --- | --- | --- |
| 全体で1つの履歴 | 標準値として対応 | 設定はwindow / buffer。全体履歴の設定はない |
| 移動元markerを直接渡す | 対応 | 公開記録関数は位置を受け、current-bufferから記録 |
| 削除済みバッファへ戻る | エラー。ファイルの自動再訪問はしない | ファイル名から`find-file`し、markerがなければ保存位置を使用 |
| 最大件数 | 調査版のxref履歴は上限なし | 最大件数を設定できる |
| 既存xrefの定義ジャンプとの関係 | 同じ履歴を共有できる | xrefの履歴とは別 |

xrefは定義ジャンプ時にも自身で記録する。自作Navigationで同じジャンプを二重記録しない設計が必要。最初は標準xrefコマンドを自作追跡の対象から除外し、下位関数にも追跡を付ける場合は「現在の上位コマンドがxrefなら記録しない」条件を設ける。Consult / LSPがどちらの履歴を記録するかは、利用中の版で確認する。

この案の採用条件は「タブをまたいで戻る・進む」「削除済みバッファの再訪問や履歴上限が現時点では必須ではない」。これが合うなら、Better Jumper連携を設計するより依存と状態管理を減らせる。

根拠: [Emacs 31.1 xref履歴の公開設定・記録・戻る・進む](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/progmodes/xref.el#L440-L595)、[xref自身の記録](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/progmodes/xref.el#L1650-L1668)。統合操作は未実測。

### 5.2 標準のdisplay-buffer-in-tabは部分的な候補

Emacs 31.1には`display-buffer-in-tab`がある。既に対象バッファを表示しているタブ、または`tab-name`で指定した名前のタブを再利用できる。

名前だけでよく、表示規則を`display-buffer-alist`へ統一できる用途なら、独自Planを減らせる。しかし今回のProject ID・同名Project・手動改名とは一致しない。名前を完全なrootにすれば区別できても、表示名と識別子の分離を失う。

また`switch-to-buffer`が通常は表示規則を必ず経由するわけではない。`switch-to-buffer-obey-display-actions`の変更は表示全体の挙動を変えるので、標準関数があるという理由だけで一括変更しない。

結論: Project IDを重視する現在の要件では独自Planを残す。特殊バッファだけの限定した表示規則には標準actionを検討できる。

根拠: [display-buffer-in-tab](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/tab-bar.el#L2995-L3065)、[switch-to-buffer](https://github.com/emacs-mirror/emacs/blob/a360712c9d272d950d8d8255ef74570f7e90b7d9/lisp/window.el#L9568-L9693)。

## 6. 修正後の構成案

### Routing

流れは既存案を維持する。

`対象を確定 → 事実を観測 → Destination → 最新Tab Snapshot → Plan → タブ操作 → 標準の表示処理 → 成功後通知`

| 部分 | 入出力・役割 |
| --- | --- |
| 入力の確定 | ファイルなら元のdirectory基準の絶対パス。バッファなら実際の対象buffer |
| 事実の観測 | ファイル・バッファ種別・対象directoryのProject root |
| Destination | 純粋。初期はProject / Misc / ルーティングしない、の3種類 |
| Snapshot | 現在フレームの全タブ。index / current / id / nameだけを取り出す |
| Plan | 純粋。stay / select / create。同名別IDは別タブ |
| 実行 | 最新の実データでタブ選択・作成・ID更新。Routing内部の再入を抑制 |
| 成功後通知 | Bufferloなどを接続。元の戻り値を維持する |

Tasks / Orgは新構成では初期ルールに含めない案とする。必要になれば、その時に固定ルールへ追加する。同名Projectの表示はIDと別の小さい処理にし、最初はrootを補助表示する程度で十分。

Planはnil Destinationを「操作なし」として扱うこと、Snapshotは現在フレームのものであることも契約に追加する。indexは操作直前の一覧から生成し、イベントをまたいで保存しない。

### ファイル配置

既存の新設定の粒度に合わせ、初期は次で十分。

| 場所 | 内容 |
| --- | --- |
| `elisp/my-tab-routing.el` | 分類、Plan、tab-bar境界、表示への接続、success通知 |
| `elisp/my-project-context.el` | タブIDからrootを読む、project-current連携 |
| `elisp/my-navigation.el` | 移動前後の判定、記録対象、再入・再生抑制、xrefまたはBetter Jumperへの接続 |
| `config/ui.el` | 有効化、表示、配色、タブ操作キー |
| `config/editor.el` | Navigationの有効化と戻る・進むキー |
| `config/basic.el` | 導入済みBufferloの設定と表示成功後の接続 |

Misc非表示・循環移動の処理が増えたときだけ`elisp/my-tab-bar.el`へ分離する。数行の設定のための新しいconfigファイルや、Tab Identity専用の汎用モジュールは作らない。

Project ContextはRouting実装の内部関数を呼ばず、共有する`my/tab-routing-id`のデータ契約だけを読む。IDの保存場所は1つにし、別の台帳を増やさない。

### Navigation

`移動元markerを捕捉 → 対象コマンド → 移動後の値を観測 → 純粋な判定 → 履歴へ記録`

初期候補は「成功した明示的な移動」だけ。単なるカーソルキー、候補プレビュー、履歴再生は記録しない。起動時にファイルを表示しただけの経路も通常の利用者操作とは分ける。

純粋な判定に渡すのは、buffer識別・markerから読んだpoint・必要ならwindow識別と、記録対象としての資格を表す値まで。predicate内部で`buffer-live-p`やmarkerの現在位置を読まない。生存確認は境界で行う。

NavigationはRoutingのDestinationやID構造を知らない。xrefのglobal履歴を採用するなら、この独立性が維持しやすい。Better Jumperでタブ別の履歴を求める場合は、小さい接続層が本当に必要かを先に検証する。

## 7. 実装前・実装中の検証計画

### 最初に確認する仕様

1. Bへ移動した直後の「戻る」はAまで戻るのか、B内の過去位置だけを戻るのか。
2. Miscを最初から隠す必要があるか。
3. 背景の表示要求・別ウィンドウ指定でもタブを変えるか。
4. 削除済みバッファへ戻るとき、ファイルを開き直す必要があるか。

本レビューのおすすめは、まず **Project / 可視Misc、現在ウィンドウの明示的移動、全体のxref履歴** で小さく成立させること。その後、必要な例外だけ追加する。

### 純粋関数のERT

| 対象 | 必須候補 |
| --- | --- |
| Destination | Project、Projectなしfile、通常special、xref特殊扱い、nil入力、採用する優先順位 |
| Plan | stay / select / create、IDなし同名を奪わない、同名別root、nil Destination、ID比較、入力を変更しない |
| Project ID | project以外・不正なIDではnil、TRAMP文字列保持 |
| Navigation判定 | 同じ場所、同一buffer内の位置変化、別buffer、資格なし、windowのみの変化 |
| Tab UI | 採用した場合、Miscを飛ばす循環・可視タブ1つ・現在Misc・並べ替え先 |

### 実際のEmacs状態を使う統合ERT・操作確認

| 項目 | 確認する結果 |
| --- | --- |
| ID永続化 | A → B → AでID保持。IDなし手動タブを奪わない。同名Projectを分離 |
| 相対パス | 別タブのdefault-directoryへ変わっても、元の基準directoryのファイルを開く |
| Bufferlo | 新規タブ表示後は対象bufferだけを残す。既存タブの一覧は消さない |
| 履歴 | A位置1 → B位置2 → 戻る → 進む。file / point / tabがすべて正しい |
| 同一Project内 | file1 → file2 → 戻る・進む。同一buffer内の明示的な位置移動も確認 |
| 履歴再生 | 戻る・進むが新しい移動履歴を作らない。中断後も通常記録が再開する |
| xref統合 | 標準定義ジャンプを二重記録しない。xref-go-backのpop-to-buffer経路でもRoutingが動く |
| 入れ子 | project-find-file等の上位/下位を二重記録しない。タブ作成中に別タブを増やさない |
| 特殊な表示 | xref結果、display-bufferがnil、背景表示、専用window、別window指定 |
| 候補選択 | Bufferlo、Consult、tab-line、Dired。Consult取消で履歴やタブが変わったままにならない |
| 初期化 | 設定再読込でadviceやhookが重複しない。起動ファイル表示に干渉しない |
| 無効化 | 自作advice/hookを解除できる。利用者が作ったタブを勝手に削除しない |

UI部分をすべて自動テストへ詰め込む必要はないが、保存先・引数の保持・通知時期などの境界契約は自動で確認する。初期化の対になる解除処理も用意すると切り分けがしやすい。

### 性能

Routingなし / ありで、同じProject内の切替、別Projectへの切替、既に開いているbuffer、TRAMPの初回と2回目以降を比較する。Project検出・パス問い合わせ・tab-bar・表示処理を分けて測る。

特別ルールで決まる対象にも一律でProject検出を行うと、旧実装の短絡評価より遅くなり得る。新たにTasks / Org等を追加するなら、高コストのProject検出前に安価な分類で確定できる対象を除く。必要性を測る前にキャッシュを導入しない。

## 8. 推奨する実装順

1. タブをまたぐ履歴の仕様を決め、xrefまたはBetter JumperとRoutingの最小試作を行う。保存先と戻る・進むを先に検証する。
2. DestinationとPlanを純粋関数として作りERTを書く。
3. 実タブの選択・作成・ID永続化を確認する。
4. 通常のファイル表示1経路へ接続し、相対パス・再入・失敗を確認する。
5. 導入済みBufferloを成功後通知へ接続する。
6. Project Contextを接続する。Magitの必要性は現在設定に合わせて別途決める。
7. Navigationを少数の明示的な移動へ接続する。標準xrefの記録との重複を防ぐ。
8. 実際に使うtab-line・Bufferlo・Consult・Dired・xrefの経路を1つずつ追加確認する。
9. 必要ならMisc非表示や背景表示Routingを追加する。

新案の「Routingから実装する」大枠はよい。ただし履歴文脈の問題を最後まで残すと、完成後に大きな作り直しになり得る。そのため、全機能の実装を始める前に小さい統合試作を追加する。

## 9. 今回の判断

**リファクタ案は骨格を採用し、境界の契約を修正して進める価値がある。** 全面再設計や多数の抽象層は不要。

優先度が高い変更は、描画用一覧の扱い、Bufferloの通知時期、履歴保存先の3つ。追加する小さな純粋関数はDestination・Plan・移動判定を中心にし、Emacsの状態変更は短い境界関数に閉じ込める。

NavigationはBetter Jumperありきにせず、標準xref履歴を比較する。全体履歴が希望に合うなら、こちらが責務の独立・標準機能優先・実装量の小ささという点で、現リファクタ案より良い候補になる。
