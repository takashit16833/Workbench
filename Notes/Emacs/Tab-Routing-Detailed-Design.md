# .emacs.d-cli タブルーティング 詳細設計

## 対象

このノートでは、`.emacs.d-cli` のタブルーティング実装を関数単位で追う。

基本的な目的と全体像は `Tab-Routing-Basic-Design.md` を参照する。

中心となる実装は以下。

```text
lisp/my-tab-routing.el
lisp/my-tab-bar.el
lisp/my-project-context.el
lisp/my-navigation.el

test/my-tab-routing-test.el
test/my-project-context-test.el
```

## 1. ルーティング結果の表現

ルーティング関数は、

```elisp
(ID . NAME)
```

を返す。

例:

```elisp
(tasks . "Tasks")
(org . "Org")
(misc . "Misc")
((project . "/tmp/work/dotfiles/") . "dotfiles")
```

`car` が内部識別子、`cdr` が表示名。

プロジェクトだけはID自身が cons になっている。

```elisp
(project . PROJECT-ROOT)
```

これにより、

- 種類が project である
- どの project か

を1つの値で表現する。

## 2. Workbench Tasks 判定

対象ディレクトリは定数で保持する。

```elisp
(defconst my/tab-routing-workbench-tasks-directory
  (expand-file-name "~/org/workbench/tasks/"))
```

判定関数:

```elisp
my/tab-routing-workbench-task
```

処理:

1. 対象ディレクトリを末尾 `/` 付きに正規化
2. FILE を `expand-file-name`
3. `string-prefix-p` で配下か判定
4. 一致したら `(tasks . "Tasks")`

拡張子ではなく配置場所で分類するため、Org 判定より先に置かれている。

## 3. Org 判定

関数:

```elisp
my/tab-routing-org
```

`file-name-extension` を小文字化し、`org` なら、

```elisp
(org . "Org")
```

を返す。

プロジェクト内の Org ファイルも Org タブへ送るため、Project 判定より先に評価される。

## 4. Project 判定

内部関数:

```elisp
my/tab-routing--project-destination
```

引数はファイルではなく DIRECTORY。

処理:

```text
DIRECTORY
   ↓
project-current
   ↓
project-root
   ↓
root を正規化
   ↓
((project . ROOT) . PROJECT-NAME)
```

プロジェクト名は、

```elisp
(file-name-nondirectory
 (directory-file-name root))
```

でルートディレクトリ名から取得する。

ファイル用関数:

```elisp
my/tab-routing-project
```

は、

```elisp
(file-name-directory file)
```

を取り、`my/tab-routing--project-destination` へ委譲する。

この分離により、xref のようにファイルを持たず DIRECTORY だけ分かる場合にも同じ Project 判定を再利用できる。

## 5. ルーティングフィルター

変数:

```elisp
my/tab-routing-filters
```

現在値:

```elisp
'(my/tab-routing-workbench-task
  my/tab-routing-org
  my/tab-routing-project)
```

実行側:

```elisp
my/tab-routing--destination
```

処理:

1. FILE が空でない文字列か確認
2. `expand-file-name`
3. `cl-some` でフィルターを上から実行
4. 最初の non-nil を採用
5. どれにも一致しなければ `(misc . "Misc")`

つまりフィルター順そのものが仕様。

## 6. バッファからの表示先判定

関数:

```elisp
my/tab-routing--buffer-destination
```

対象 BUFFER を取得し、そのバッファへ `with-current-buffer` で入る。

判定:

```text
buffer-file-name がある
  → ファイルルーティング

xref--xref-buffer-mode
  → default-directory から Project 判定

その他
  → nil
```

特殊バッファを何でも Misc に送るのではなく、所属先が判断できるものだけ動かす。

## 7. タブの識別情報

各タブには、

```elisp
my/tab-routing-id
```

という独自エントリを持たせる。

概念例:

```elisp
(current-tab
 (name . "dotfiles")
 (my/tab-routing-id . (project . "/Users/foo/dotfiles/"))
 ...)
```

表示名ではなくこのIDを使ってタブを再利用する。

## 8. タブ選択の中心処理

関数:

```elisp
my/tab-routing--select
```

引数:

```elisp
(ID . NAME)
```

戻り値:

- 新しいタブを作成した場合: non-nil
- 既存タブを使った場合: nil

### 8.1 現在タブの確認

`tab-bar-tabs` から、

```elisp
(assq 'current-tab tabs)
```

で現在タブを得る。

現在タブの `my/tab-routing-id` が目的IDと同じなら何もしない。

### 8.2 既存IDの検索

全タブから、

```elisp
(alist-get 'my/tab-routing-id candidate)
```

が目的IDと同じものを探す。

見つかれば、

```elisp
tab-bar-select-tab
```

でそのタブへ移動する。

### 8.3 ID未設定の同名タブ

ID一致がなければ、

- `my/tab-routing-id` が未設定
- `name` が目的NAMEと同じ

タブを探す。

既存の手動タブや旧状態をそのまま再利用して、後からIDを付けるための処理。

### 8.4 新規タブ

再利用候補がなければ、

```elisp
tab-bar-new-tab
```

で新規作成し、`tab-bar-rename-tab` で名前を付ける。

同名タブが既にある場合は、表示上も区別できるようIDを含んだ名前へ変更する。

内部では最終的にIDで区別するため、表示名は補助情報。

## 9. タブIDの保存

現在タブの実データは、

```elisp
tab-bar--current-tab-find
```

で取得している。

この関数が返すタブ alist に対して、

```elisp
(my/tab-routing-id . ID)
```

を追加または更新する。

過去の変更履歴では、単純な `setf (alist-get ...)` では意図した永続化にならず、実際のタブ alist を `setcdr` で更新する形へ修正されている。

この部分は内部APIへの依存でもあるため、新実装時に再検討する。

## 10. 最初の scratch を Misc にする

関数:

```elisp
my/tab-routing-initialize-misc-tab
```

以下の条件をすべて満たす場合のみ初期化する。

- タブ数が1
- 選択ウィンドウのバッファが `*scratch*`
- `my/tab-routing-id` が未設定
- `explicit-name` が未設定

処理:

1. タブ名を `Misc` へ変更
2. `my/tab-routing--select '(misc . "Misc")` を呼ぶ
3. タブID `misc` を付与

再読み込み時に既存タブを破壊しないため、条件を厳しくしている。

## 11. find-file advice

関数:

```elisp
my/tab-routing--find-file
```

`find-file` に `:around` advice として登録する。

処理:

```text
FILE
 ↓
my/tab-routing--destination
 ↓
my/tab-routing--select
 ↓
元の find-file
 ↓
必要なら bufferlo-clear
```

ポイントは、**ファイルを開く前に目的タブへ移動する**こと。

これにより、新しいファイルバッファは最初から目的タブのウィンドウへ表示される。

## 12. switch-to-buffer advice

関数:

```elisp
my/tab-routing--switch-to-buffer
```

既存バッファへ切り替えるときのルーティングを担当する。

処理:

1. `get-buffer`
2. `my/tab-routing--buffer-destination`
3. `my/tab-routing--select`
4. 元の `switch-to-buffer`
5. 新規タブなら Bufferlo を初期化

これにより、一度開いたファイルへ戻る場合も所属タブへ自動的に戻れる。

## 13. display-buffer advice

関数:

```elisp
my/tab-routing--display-buffer
```

`display-buffer` を使う各種コマンドにも対応するための処理。

目的タブを先に選んだあと、元の `display-buffer` をそのまま呼ぶ。

戻り値の Window もそのまま返す。

つまり、

```text
どのタブか
```

だけを制御し、

```text
どのウィンドウへどう表示するか
```

は既存の `display-buffer` に任せる。

## 14. switch-to-buffer だけ起動後に有効化する

関数:

```elisp
my/tab-routing--enable-switch-to-buffer
```

`find-file` と `display-buffer` はセットアップ時に advice を登録する。

一方 `switch-to-buffer` は、

- すでに起動後なら即時
- 起動途中なら `emacs-startup-hook`

で有効化する。

理由は、Emacs 起動中に内部で行われる多数のバッファ切り替えへルーティングが干渉するのを避けるため。

## 15. advice の depth

ルーティング advice は、

```elisp
'((depth . 100))
```

で登録する。

旧設定では Better Jumper のナビゲーション履歴 advice も同じ基本関数へ入る。

意図する構造は概ね、

```text
navigation advice
    ↓
routing advice
    ↓
original function
```

となる。

ナビゲーション側から見ると、タブ移動を含んだ一連の移動全体を追跡できる。

## 16. セットアップ

関数:

```elisp
my/tab-routing-setup
```

主な処理:

1. 最初の scratch を Misc 化
2. 旧 Org 専用ルーティング advice を除去
3. 旧 `display-buffer-alist` エントリを除去
4. `find-file` へ advice
5. `display-buffer` へ advice
6. 起動後に `switch-to-buffer` へ advice

`advice-member-p` を使い、再実行時に advice が重複しないようにしている。

旧 Org 専用ルーティング除去処理は移行互換用なので、新 `.emacs.d` には基本的に不要。

## 17. Bufferlo 連携

関数:

```elisp
my/tab-routing--clear-new-tab
```

新しいタブを作った場合だけ、

```elisp
bufferlo-clear
```

を呼ぶ。

条件:

- 新規タブである
- `bufferlo-mode` が有効
- `bufferlo-clear` が存在

目的は、新しいタブへ以前のタブのローカルバッファ一覧を持ち込まないこと。

旧設定では、

```elisp
bufferlo-prefer-local-buffers 'tabs
```

も指定され、タブごとのバッファ集合を優先している。

## 18. Misc の非表示

ファイル:

```text
my-tab-bar.el
```

関数:

```elisp
my/tab-bar-format-tabs
```

`tab-bar-tabs` を順に見て、

```elisp
(alist-get 'my/tab-routing-id tab)
```

が `misc` のものだけ除外する。

それ以外は、

```elisp
tab-bar--format-tab
```

へ渡す。

Misc はデータとしては存在するが、表示だけ消している。

## 19. Misc を飛ばすタブ移動

関数:

```elisp
my/tab-bar-adjacent-visible-tab
```

現在位置から指定方向へ循環し、

```elisp
my/tab-routing-id != misc
```

の最初のタブ番号を返す。

この関数を使って、

```elisp
my/tab-bar-select-visible
my/tab-bar-move-visible
```

を実装する。

そのため、

- タブ切り替え
- タブ並べ替え

のどちらでも Misc を通常操作から除外できる。

## 20. Project Context の取得

ファイル:

```text
my-project-context.el
```

関数:

```elisp
my/project-context-root
```

現在タブの `my/tab-routing-id` が、

```elisp
(project . ROOT)
```

なら ROOT を返す。

それ以外:

- org
- tasks
- misc
- nil

では nil。

TRAMP ルートも文字列のまま保持する。

## 21. project-current advice

関数:

```elisp
my/project-context--project-current
```

`project-current` へ `:around` advice として登録する。

優先順位:

```text
1. project-current の DIRECTORY 引数
2. 既存 project-current-directory-override
3. 現在タブの Project root
4. 元の project-current の通常判定
```

DIRECTORY が明示されている場合や既存 override がある場合は何も変えない。

それ以外では、

```elisp
(let ((project-current-directory-override
       (my/project-context-root)))
  ...)
```

と動的束縛して元の `project-current` を呼ぶ。

バッファの `default-directory` 自体は変更しない。

## 22. Magit 連携

関数:

```elisp
my/project-context--magit-status
```

旧設定では `magit-status` の既定リポジトリも現在タブのプロジェクトへ合わせている。

ポイントは対話的引数取得の前から `default-directory` を一時的にタブルートへ合わせること。

一方、

- prefix argument がある
- DIRECTORY が明示されている

場合はユーザー指定を優先する。

新しい `.emacs.d` では Lazygit を使う方針なので、この部分は基本的に移植不要。

## 23. Project Context セットアップ

関数:

```elisp
my/project-context-setup
```

処理:

1. `project-current` へ advice
2. Magit 読み込み後に `magit-status` へ advice

こちらも `advice-member-p` で重複登録を防ぐ。

## 24. 旧初期化構造

`my-navigation.el` が、

```elisp
(require 'my-tab-routing)
(require 'my-project-context)
```

し、

```elisp
my/org-tab-routing-setup
```

から、

```elisp
(my/tab-routing-setup)
(my/project-context-setup)
```

を呼ぶ。

さらにこの `my/org-tab-routing-setup` は Better Jumper の `:config` から呼ばれている。

つまり旧構成は、

```text
better-jumper
  ↓
my-navigation
  ↓
tab routing / project context
```

という不要な結合を持っている。

新実装では分離候補。

## 25. ERT: Routing

`test/my-tab-routing-test.el` では主に次を確認する。

### 優先順位

- Workbench Tasks が Org より先
- Org が Project より先
- フィルター登録順を尊重

### Project

- Project ID にルート全体を使用
- Project に所属しなければ Misc

### 特殊バッファ

- 通常のファイルなしバッファは勝手にルーティングしない
- xref は `default-directory` の Project を使用

### Tab ID

- 既存タブへIDを保存
- 次回同じIDなら再利用

### Misc 初期化

- 最初の scratch を Misc 化
- 再実行しても新しい Misc を増やさない
- 既存タブが複数ある場合は変更しない

## 26. ERT: Project Context

`test/my-project-context-test.el` では主に次を確認する。

- タブ変更に合わせて Project root が変わる
- Org / Misc / 未登録タブでは root を返さない
- TRAMP path を保持
- `default-directory` を書き換えない
- 明示 DIRECTORY を優先
- 既存 override を優先
- Org / Misc では通常判定を変えない
- Magit の既定リポジトリにタブルートを使用
- Magit の明示指定を優先

## 27. 現在テストが薄い部分

新実装では追加テスト候補。

- `find-file` advice 全体
- `switch-to-buffer` advice 全体
- `display-buffer` advice 全体
- Bufferlo 連携
- 新規タブ後の `bufferlo-clear`
- Misc のタブバー非表示
- Misc を飛ばすタブ移動
- Misc を飛ばす並べ替え
- Better Jumper と routing advice の順序

純粋関数と Emacs 状態変更を分けて実装すれば、より小さな ERT にできる。

## 28. 変更履歴から分かる設計の発展

旧実装は一度に完成したものではなく、段階的に現在の形へ発展している。

### 最初

- Org
- Project
- Misc
- `find-file`
- `switch-to-buffer`
- `display-buffer`
- Bufferlo

を中心とするファイルルーティングとして導入。

### その後

- タブIDの保存方法を修正
- 最初の scratch を Misc として再利用
- Misc をタブバーから非表示
- タブ単位 Project Context を追加
- xref のようなファイルなしバッファにも拡張
- 起動途中の `switch-to-buffer` 干渉を避けるため有効化時期を変更
- Workbench Tasks ルールを最優先として追加

したがって、現在のコードには「最終設計」と「過去実装との互換処理」が混在する。

新実装ではこれを分離した方がよい。

## 29. 新 .emacs.d への移植時に確認する項目

### Routing

- Tasks / Org / Project / Misc のどれを残すか
- xref 以外に特殊バッファルーティングが必要か
- filter API をそのまま使うか

### Tab Identity

- 独自IDをタブ alist へ保存する方式を継続するか
- 公開APIだけで実現可能か
- 同名 Project の表示方法

### Advice

- `find-file`
- `switch-to-buffer`
- `display-buffer`

すべて必要か実測・動作確認する。

### Project Context

`project-current-directory-override` を使う考え方は比較的きれいなので、有力な再利用候補。

### Bufferlo

タブごとのバッファ分離が本当に必要か、Emacs 31.1 の標準機能も含めて比較する。

### UI

Misc を隠す必要が今もあるか。

### 起動速度

旧実装はタブルーティング・Bufferlo・Better Jumper が起動時に結合している。

新構成では必要になる時点まで読み込まない設計が可能か検討する。

## 30. 実装時の分離案

新実装では責務を次のように分けると理解・テストしやすい。

```text
Tab Routing
├── destination calculation
├── tab lookup
└── tab selection

Project Context
├── tab project root
└── project-current adapter

Tab UI
├── visible tab filtering
├── next/previous
└── move

Tab-local Buffers
└── Bufferlo or replacement
```

特に、

```text
判定
```

と、

```text
Emacs の状態変更
```

を分ける。

たとえば destination 計算は極力純粋関数へ寄せ、ERT で直接確認できる形が望ましい。

## まとめ

旧実装の詳細を見ると、中心となる設計はかなり明確である。

```text
File / Buffer
   ↓
Route rule
   ↓
Destination
   ↓
Tab ID
   ↓
Select / Create Tab
   ↓
Project Context / Bufferlo / UI
```

新しい `.emacs.d` では、この流れをそのまま前提にせず、

- Emacs 31.1 の標準機能
- 公開API
- 起動時依存
- Bufferlo の必要性
- advice の影響範囲
- ERT のしやすさ

を一つずつ確認してから再構築する。
