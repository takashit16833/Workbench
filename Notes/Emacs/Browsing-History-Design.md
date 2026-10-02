# Browsing History 設計

## このノートについて

Browsing History は、ブラウザの「戻る / 進む」のように、
Emacs 内で以前いた場所へ戻ったり、戻ったあとに進んだりするための仕組み。

今回の Tab Routing とは別の機能として作る。

## Browsing History が知ること

Browsing History が扱うのは、

> 場所を履歴として持ち、戻る / 進む

ことだけ。

Browsing History 自体は、

- Tab
- Tab Routing
- Tab ID
- Project
- Bufferlo

を知らない。

利用側が Browsing History を1つ作って使う。

今回の構成では、たまたま各 Tab がそれぞれ1つの Browsing History を使う。

```text
Tab A → Browsing History A
Tab B → Browsing History B
```

これは Browsing History 自体の制約ではない。

## 履歴の構造

Better Jumper の履歴構造を参考に、まず次の形で考える。

```text
History
├─ ring
│   ├─ Location A
│   ├─ Location B
│   └─ Location C
└─ idx
```

- `ring` は、これまでいた場所の履歴。
- `idx` は、戻る / 進むで今どの履歴位置を見ているか。

たとえば、

```text
A → B → C → D
```

と移動したあとに戻ると、履歴そのものは残したまま `idx` が動く。

```text
[A, B, C, D]
       ↑
      idx
```

さらに戻れば B、進めば C へ移動する。

## 履歴1件の構造

ring の1件は、場所を復元するための情報を持つ。

```text
Location
├─ file
├─ position
└─ marker
```

### marker

通常はこちらを使う。

Emacs の marker は buffer 内の位置に追従するため、
履歴を記録したあとに手前の文章が増減しても、元いた場所を追いやすい。

### file と position

marker が使えなくなった時のために持つ。

たとえば対象 buffer が kill された場合でも、

```text
file を開き直す
↓
position へ移動する
```

ことで、その場所へ戻れる。

## marker-table は使わない

Better Jumper は、

```text
(file position marker-key)
              ↓
          marker-table
              ↓
            marker
```

という構造を使っている。

これは履歴を Emacs 終了後にも保存・復元することを考えた構造。

今回は、

> Emacs を終了したら Browsing History は消えてよい

とする。

そのため marker を別テーブルへ分けず、Location が直接 marker を持つ。

```text
Location
├─ file
├─ position
└─ marker
```

永続化が必要になった場合は、その時に改めて保存形式を考える。

## 戻る / 進む

Browsing History はブラウザと同じ感覚で動かす。

```text
A → B → C → D
```

D から戻れば C、さらに戻れば B。

B から進めば C。

また、B まで戻った状態で新しく E へ移動した場合は、

```text
A → B → E
```

となり、C / D へ進む履歴は捨てる。

## 何を履歴に入れるかは別の話

Browsing History 自体は、

> このコマンドを履歴に入れる

という判断をしない。

利用側が、

```text
この移動を記録する
↓
Browsing History に現在位置を追加する
```

と呼び出す。

そのため、`find-file`、Consult、xref、Avy などのどの操作を記録対象にするかは、
Browsing History 本体とは分けて考える。

Consult の preview のような一時的な移動を記録するかどうかも、利用側が決める。

## Tab Routing との関係

今回の Tab 構成では、各 Tab がそれぞれ Browsing History を使う。

ただし Browsing History から Tab Routing を呼ばない。

```text
Tab 側
  ↓
その Tab が使う Browsing History を取得
  ↓
記録 / 戻る / 進む
```

という一方向の関係にする。

別 Tab へ切り替えたことを Browsing History に入れるかどうかも、
Tab 側の使い方として決める。

## セッションをまたがない

Browsing History は Emacs の実行中だけ保持する。

Emacs を終了したら履歴は消える。

今回は savehist や desktop などを使った永続化は行わない。

## テスト

履歴そのものは Emacs の UI 操作からできるだけ分離し、ERT で確認しやすくする。

まず確認したいのは、

- 履歴を追加できる
- 戻ると1つ前へ進む
- 進むと1つ後へ戻る
- 戻った途中で新しい履歴を追加すると、その先の履歴が消える
- 複数の History を作っても互いに混ざらない
- marker が編集後の位置に追従する
- marker が使えない場合に file + position へフォールバックできる

こと。

Tab ごとの保持については、Browsing History 本体ではなく Tab 側の統合テストで確認する。

## 実装ファイル

Browsing History 本体は、Tab Routing と分ける。

候補:

```text
elisp/my-browsing-history.el
```

ここには Tab 固有の処理を入れない。

Tab との接続や、どのコマンドを記録対象にするかは別の場所で扱う。
