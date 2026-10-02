# Browsing History 設計

## 目的

ブラウザのように「戻る / 進む」を行うための履歴機能。

Browsing History 自体は Tab や Project を知らない。
今回は各 Tab がそれぞれ1つ利用する。

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

## 記録対象

Browsing History は「何を記録するか」を判断しない。

利用側が Location を渡して記録する。

Consult / xref / Avy など、どの移動を記録するかは別途決める。

## テスト

- 履歴を追加できる
- 戻る / 進むが正しく動く
- 戻った途中から追加した時に forward 履歴が消える
- 複数の History が混ざらない
- marker が編集後の位置へ追従する
- marker が使えない場合に file + position へフォールバックする

## 実装ファイル

```text
elisp/my-browsing-history.el
```

Browsing History 本体には Tab 固有の処理を入れない。

Better Jumper の履歴構造を参考にしつつ、今回はセッション内だけで使うため、marker は Location が直接持つ。
