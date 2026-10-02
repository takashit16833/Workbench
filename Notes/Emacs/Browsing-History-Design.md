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
- `marker`: 編集後も位置へ追従する
- `file + position`: marker が使えない場合の復元用

履歴は Emacs 終了時に破棄する。

## 挙動

```text
A → B → C → D
```

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

公開する操作名は、

```text
my/browsing-history-push
my/browsing-history-back
my/browsing-history-forward
```

とする。

- `push`: Location を履歴へ追加する
- `back`: 1つ前の Location へ戻る
- `forward`: 1つ後の Location へ進む

`back` / `forward` はブラウザと同じ意味で使う。
`push` は History の ring に Location を積む操作なので、そのままの名前にする。

## History の取得

scope は設定で切り替える。

```elisp
(defcustom my/browsing-history-scope 'tab
  "Browsing History をどの単位で持つか。"
  :type '(choice (const tab)
                 (const window)))
```

初期値を `tab` にするのは、今回の構成では Tab ごとに履歴を分けたいから。

取得は2つに分ける。

```text
my/browsing-history-current
  → 現在の History を取得
  → なければ nil

my/browsing-history-ensure-current
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

そのため scope を Tab から Window に変えても、advice や back / forward の処理は変更しない。

## 記録対象

Browsing History は「何を記録するか」を判断しない。

利用側が Location を `my/browsing-history-push` に渡して記録する。

Consult / xref / Avy など、どの移動を記録するかは旧設計を基準に別途つなぐ。

## テスト

- 履歴を追加できる
- 戻る / 進むが正しく動く
- 戻った途中から追加した時に forward 履歴が消える
- 複数の History が混ざらない
- scope が tab / window のどちらでも対応する History を取得できる
- `current` は History がなければ nil を返す
- `ensure-current` は History がなければ作成する
- marker が編集後の位置へ追従する
- marker が使えない場合に file + position へフォールバックする

## 実装ファイル

```text
elisp/my-browsing-history.el
```

History のデータ構造と履歴操作には Tab / Window 固有の処理を入れない。
Tab / Window の違いは、現在使う History を取得する処理に閉じ込める。

Better Jumper の履歴構造を参考にしつつ、今回はセッション内だけで使うため、marker は Location が直接持つ。

Tab 複製時に History をどう扱うかは、必要になった時に決める。
