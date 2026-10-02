# Browsing History 設計

## 目的

ブラウザのように「戻る / 進む」を行うための履歴機能。

History のデータ構造や「戻る / 進む」の処理は、Tab や Window に依存しない。

どの単位で History を持つかは設定で切り替える。
最初は Tab 単位で使う。

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

## History の取得

利用側は Tab や Window を直接調べず、「現在使う History」を返す関数を通す。

候補:

```elisp
(defcustom my/browsing-history-scope 'tab
  "Browsing History をどの単位で持つか。"
  :type '(choice (const tab)
                 (const window)))
```

```text
my/browsing-history-current
        ↓
my/browsing-history-scope
        ↓
   tab / window
```

`tab` の場合は現在の Tab が持つ History を返し、
`window` の場合は現在の Window が持つ History を返す。

History がまだなければ、その場で新しく作って保存してから返す。

記録処理や back / forward はこの取得関数だけを使う。
そのため scope を Tab から Window に変えても、advice や履歴操作の処理は変更しない。

## 記録対象

Browsing History は「何を記録するか」を判断しない。

利用側が Location を渡して記録する。

Consult / xref / Avy など、どの移動を記録するかは別途決める。

## テスト

- 履歴を追加できる
- 戻る / 進むが正しく動く
- 戻った途中から追加した時に forward 履歴が消える
- 複数の History が混ざらない
- scope が tab / window のどちらでも対応する History を取得できる
- History がない場合は新しく作られる
- marker が編集後の位置へ追従する
- marker が使えない場合に file + position へフォールバックする

## 実装ファイル

```text
elisp/my-browsing-history.el
```

History のデータ構造と履歴操作には Tab / Window 固有の処理を入れない。
Tab / Window の違いは、現在使う History を取得する処理に閉じ込める。

Better Jumper の履歴構造を参考にしつつ、今回はセッション内だけで使うため、marker は Location が直接持つ。
