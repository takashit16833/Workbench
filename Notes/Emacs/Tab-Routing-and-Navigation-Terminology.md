# タブルーティング / Navigation 設計用語

## このノートの役割

このノートは、タブルーティング / Navigation 設計で使う **正式な設計用語の正本**。

設計ノートや会話の中でそれらしい名前が出てきても、**この表に載っていなければ正式な設計用語ではない**。

つまり、

```text
用語表にある
  → 今回の設計で採用した概念

用語表にない
  → 説明のための表現
     その場限りの言い換え
     実装候補の名前
```

として扱う。

新しい概念名が必要になった場合は、先にこの用語表へ追加して意味を決めてから設計で使う。

これにより、会話中にたまたま出た言葉がそのまま設計概念として一人歩きするのを防ぐ。

Emacs / Emacs Lisp / Bufferlo / project.el / xref など、外部ですでに定義されている一般用語や API 名はこの表の対象外。

---

## 正式な設計用語

| 用語 | 意味 | 何を指さないか |
| --- | --- | --- |
| **Tab Workspace** | 1つの Emacs Tab を、独立した作業環境として見せる今回の中心概念。Buffer Set / Navigation History / Window Configuration などを Tab 単位で分離する。 | Project や Repository と同義ではない。 |
| **Tab Routing** | file / buffer を、どの Tab Workspace で表示するか決めて移動させる機能。 | Project 判定そのものではない。Navigation History の管理もしない。 |
| **Routing Function** | 1つの Routing 条件を表す関数。対象を見て、マッチすれば Destination、マッチしなければ nil を返す。 | Tasks / Org / Project など特定種類に限定されない。 |
| **Routing Functions** | Routing Function を優先順に並べたリスト。上から順に評価する。 | 固定されたルール一覧ではない。利用者が追加・削除・並べ替えできる。 |
| **First Match** | Routing Functions を上から評価し、最初に non-nil の Destination を返した Routing Function の結果を採用する規則。 | 全ルールを評価して後から順位付けする方式ではない。 |
| **Destination** | Routing の判定結果。「どの Tab Workspace へ送るか」を表す値。現在案では `:id` と `:name` を持つ plist。 | 実際の Tab オブジェクトや Tab 番号そのものではない。 |
| **Destination ID** | Destination の `:id`。Workspace をプログラムから識別する値。 | 表示名ではない。Project root に限定されない。 |
| **Tab ID** | Tab に保存された Workspace 識別子。基本的には Destination ID と同じ値を保存し、既存 Tab の再利用判定に使う。 | Tab の表示名や Tab 番号ではない。 |
| **Misc Fallback** | file がどの Routing Function にもマッチしなかった時に Misc Destination へ送る fallback。 | 通常の Routing Function の1つではない。file-less buffer を自動的に Misc へ送る規則でもない。 |
| **Tab Snapshot** | Tab の選択判断に必要な情報だけを取り出した小さな値。純粋な Plan 判定へ渡す。 | Emacs の Tab 全内部状態のコピーではない。 |
| **Tab Plan** | Destination と Tab Snapshot から決める Tab 操作の計画。例: stay / select / create。 | 実際の `tab-bar-*` 操作そのものではない。 |
| **Project Context** | Project 型 Destination を持つ Tab で、Tab が表す project root を `project.el` へ補助的に伝える機能。 | すべての Tab に Project を割り当てる仕組みではない。 |
| **Buffer Set** | その Tab Workspace から見えるローカルな buffer 集合。現在は Bufferlo で実現する方針。 | Emacs 全体の `buffer-list` そのものではない。Project 内ファイル一覧でもない。 |
| **Navigation** | 現在の Tab Workspace 内で「戻る / 進む」ための移動記録を扱う機能。 | Tab 間の移動や Tab Routing そのものではない。 |
| **Navigation History** | Navigation が使う移動履歴。今回の仕様では Tab ごとに1本持つ。 | Window ごとの履歴、Emacs 全体で1本の global history ではない。 |
| **Tab-local** | 状態が Tab Workspace ごとに独立していること。今回 Navigation History に対して使う。 | Window-local や buffer-local と同じ意味ではない。 |

---

## 用語として採用していない表現

以下は、過去の会話や設計途中で出たことがあるが、**正式な設計用語としては採用しない**。

| 表現 | 扱い |
| --- | --- |
| **Project Workspace** | 採用しない。Tab ≠ Project のため誤解を招く。 |
| **Routing Facts** | 採用しない。すべての Routing Function に共通する大きな Facts オブジェクトを設ける設計にはしない。 |
| **History Backend** | 採用しない。xref / Better Jumper を交換可能にする汎用抽象化は作らない。 |
| **Workspace Manager** | 採用しない。現時点ではそのような上位管理オブジェクトを作らない。 |

この表に追加されていない新しい名前が会話中に出ても、**自動的に設計へ採用されたとはみなさない**。

---

## Destination の位置づけ

`Destination` は正式な設計用語。

流れの中ではここに位置する。

```text
file / buffer
    ↓
Routing Functions
    ↓
First Match
    ↓
Destination
    ↓
Tab Snapshot と比較
    ↓
Tab Plan
    ↓
Tab 操作
```

たとえば、

```elisp
(:id org
 :name "Org")
```

なら「`org` という ID の Tab Workspace へ送る」という Routing 結果。

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

なら「その Project 用の ID を持つ Tab Workspace へ送る」という Routing 結果。

Destination 自体が Project を意味するわけではない。

---

## 用語を増やす時のルール

新しい名前を正式な設計用語として使いたくなったら、次の順番にする。

```text
1. 本当に新しい概念が必要か確認
2. 既存用語で表現できないか確認
3. この用語表へ追加
4. 意味と「何を指さないか」を書く
5. その後で基本設計 / 詳細設計へ使う
```

会話で便利だから、実装上の関数名に使ったから、AI が説明中に大文字で書いたから、という理由だけでは設計用語にしない。
