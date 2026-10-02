# Browsing History 設計

## 目的

ブラウザのように「戻る / 進む」を行うための履歴機能。

History のデータ構造や「戻る / 進む」の処理は、Tab や Window に依存しない。

どの単位で History を持つかは設定で切り替える。
初期値は Tab。

## データ構造

```text
History
├─ ring
│   └─ Location の一覧
└─ idx

Location
├─ file
├─ position
└─ marker
```

History / Location は `cl-defstruct` で表す。

項目が固定されたデータであり、専用の型と accessor を持てるため。

- `ring`: 移動履歴
- `idx`: 現在見ている履歴位置
- `marker`: 編集で位置がずれても追従する目印
- `file + position`: marker が使えない場合の復元用

`position` は Location を記録した時点の位置を保存する。
marker は編集に追従するが、position は更新しない。

履歴は Emacs 終了時に破棄する。

履歴件数の初期上限は 100 件とし、設定で変更できるようにする。
上限を超えた場合は最も古い Location から捨てる。

## 挙動

説明では古い順に、

```text
A → B → C → D
```

と書く。

現在地は D。

```text
back    → C
back    → B
forward → C
```

B まで戻ったあと E へ移動した場合は、

```text
A → B → E
```

となり、C / D への forward 履歴は捨てる。

履歴の端では循環しない。

```text
A で back
  → A のまま

D で forward
  → D のまま
```

連続して同じ Location を追加しようとした場合は何もしない。

内部では最新の Location を ring の 0 番に置き、`idx` は現在位置を指す。

```text
空
  ring = []
  idx  = -1

A を追加
  ring = [A]
  idx  = 0

B を追加
  ring = [B, A]
  idx  = 0

back
  ring = [B, A]
  idx  = 1   ; A

forward
  ring = [B, A]
  idx  = 0   ; B
```

back / forward では、復元に成功してから idx を変更する。
復元できなかった場合は idx を変更しない。

公開する操作名は、

```text
browsing-history-push
browsing-history-back
browsing-history-forward
```

とする。

- `push`: Location を履歴へ追加する
- `back`: 1つ前の Location へ戻る
- `forward`: 1つ後の Location へ進む

`back` / `forward` はブラウザと同じ意味で使う。
`push` は History の ring に Location を積む操作なので、そのままの名前にする。

## 移動を記録する時

Browsing History 本体は、どの Emacs コマンドを記録対象にするかを知らない。
記録対象のコマンドとの接続側が、移動前と移動後の Location を確認する。

同じ scope の中で A から B へ移動した場合は、

```text
移動前
  → A を覚える

コマンド実行

移動成功
  → B を取得

現在の履歴位置が A でなければ A を push
  ↓
B を push
```

とする。

そのため、履歴が空の状態で A から B へ初めて移動した場合は、

```text
A → B
```

の両方が残り、最初の back で A、forward で B へ戻れる。

キャンセル、失敗、同じ Location への移動では履歴を変更しない。

記録対象外の通常のカーソル移動などによって、実際の移動元と History の現在位置が異なる場合は、移動元を追加してから移動先を追加する。

## History の取得

scope は「履歴を分ける単位」。

```elisp
(defcustom browsing-history-scope 'tab
  "Browsing History をどの単位で持つか。"
  :type '(choice (const tab)
                 (const window)))
```

初期値を `tab` にするのは、今回の構成では Tab ごとに履歴を分けたいから。

取得は2つに分ける。

```text
browsing-history-current
  → 現在の History を取得
  → なければ nil

browsing-history-ensure-current
  → 現在の History を取得
  → なければ作って保存
  → History を返す
```

使い分けは、

```text
back / forward
  → current

push
  → ensure-current
```

とする。

利用側は Tab や Window を直接調べず、この取得処理を通す。

History の保存場所は scope に応じて変える。

```text
scope = tab
  → Tab の独自パラメータに保存 / 取得

scope = window
  → window parameter に保存 / 取得
```

移動コマンドとの接続側は、移動前後で同じ scope の所有者かも確認する。

初期実装では、Tab A から Tab B のように scope の所有者が変わる移動は1つの履歴としてつながない。
そのため Tab B の履歴へ Tab A の Location が混ざることはなく、back / forward で Tab をまたがない。

## Location の復元

Location を復元する時は marker を優先する。

```text
marker が有効
  → marker の buffer / position へ移動

marker が使えない
  → file が現在も存在すれば開き直す
  → 保存した position を有効な範囲に収めて移動

file も復元できない
  → 復元失敗
  → idx は変更しない
```

削除された file を履歴復元のために新規作成しない。

初期実装では file を持つ Location だけを記録対象にする。
file を持たない buffer の履歴対応は、必要になった時に追加する。

Browsing History が復元するのは Location だけで、Window の分割や配置は復元しない。
現在選択している Window に Location を表示する。

back / forward による復元中は、その表示を新しい履歴として記録しない。
また、接続側で Tab Routing も抑制し、履歴を作った後にルーティング規則が変わっても、復元中に別の Tab へ送り直さない。

## 記録対象

Consult / xref / Avy など、どの移動コマンドを記録するかは旧設計を基準に別途つなぐ。

最初から広い範囲へ接続せず、必要な移動を1つずつ追加する。

## テスト

- 空の History に最初の移動 A → B を記録できる
- 履歴を追加できる
- 戻る / 進むが正しく動く
- 履歴の端で循環しない
- 連続した同じ Location を重複して追加しない
- 戻った途中から追加した時に forward 履歴が消える
- キャンセル / 失敗では履歴が変わらない
- 複数の History が混ざらない
- scope が tab / window のどちらでも対応する History を取得できる
- scope の所有者が変わる移動では History が混ざらない
- `current` は History がなければ nil を返す
- `ensure-current` は History がなければ作成する
- marker が編集後の位置へ追従する
- marker が使えない場合に file + position へフォールバックする
- 復元できない場合は idx が変わらない
- back / forward の復元が新しい履歴を作らない

## パッケージとしての境界

Browsing History は `.emacs.d` の内部機能ではなく、独立した Emacs Lisp パッケージとして実装する。

リポジトリ名は、

```text
emacs-browsing-history
```

を候補とする。

パッケージ側に置くもの:

```text
History / Location
push
back / forward
scope
Tab / Window への History 保存・取得
Location の復元
Browsing History 自身の ERT
```

`.emacs.d` 側に残すもの:

```text
Consult を記録対象にする
xref を記録対象にする
Avy を記録対象にする
どのキーへ back / forward を割り当てるか
Tab Routing と同時に使う時の接続
```

つまり、

```text
パッケージ
  → Browsing History の仕組み

.emacs.d
  → 自分の Emacs で何を履歴として記録するか
```

と分ける。

Tab Router には依存しない。
Tab Router 側からも Browsing History を必須依存にしない。

パッケージとして公開する関数・変数は `browsing-history-` を prefix にする。
`.emacs.d` 専用の `my/` prefix は使わない。

`use-package` からは package-vc 経由で読み込む想定。

```elisp
(use-package browsing-history
  :vc (:url "https://github.com/takashit16833/emacs-browsing-history.git"
       :rev :newest))
```

## 実装ファイル

```text
browsing-history.el
```

History のデータ構造と履歴操作には Tab / Window 固有の処理を入れない。
Tab / Window の違いは、現在使う History を取得する処理に閉じ込める。

Better Jumper の履歴構造を参考にしつつ、今回はセッション内だけで使うため、marker は Location が直接持つ。

Tab 複製時に History をどう扱うかは、必要になった時に決める。
