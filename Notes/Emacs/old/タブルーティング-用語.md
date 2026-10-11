# タブルーティング / Browsing History で使う言葉

このノートは、会話の中で出てきた言葉がそのまま設計用語にならないようにするための小さなメモ。

**ここに載っているものだけ、今回の設計で名前を付けて使う。**

ここにない表現は、説明のための言い換えとして扱う。

Emacs / Bufferlo / project.el / xref など、もともと存在する名前は対象外。

## 今使っている言葉

| 用語 | ここでの意味 |
| --- | --- |
| **Tab Workspace** | 1つの Tab を、独立した作業スペースのように見せる考え方。Project や Repository と同じ意味ではない。 |
| **Tab Routing** | file / buffer を、どの Tab で表示するか決める仕組み。 |
| **Routing Function** | 1つのルーティング条件を表す関数。マッチすれば Destination、しなければ nil を返す。 |
| **Destination** | Routing Function が返す「行き先」。どの Tab を使うか判断するための情報。 |
| **Tab ID** | 表示名とは別に Tab を識別する値。Destination の ID を Tab に覚えさせる。 |
| **Project Context** | Project 用の Tab にいる時だけ、その Project root を project.el に補助的に伝える仕組み。 |
| **Browsing History** | ブラウザのような「戻る / 進む」を行うための履歴機能。Tab / Window には依存せず、保存単位は設定で切り替える。初期値は Tab。 |

## Destination だけ少し補足

たとえば、

```elisp
(:id org
 :name "Org")
```

なら、

> Org という Tab へ行く

というルーティング結果。

Project なら、

```elisp
(:id (project . "/work/foo/")
 :name "foo")
```

のようにできる。

Destination は Project 専用ではない。

## 用語ではないもの

次のような表現が会話中に出ても、それだけで新しい設計概念にはしない。

- First Match
- Tab Snapshot
- Tab Plan
- Buffer Set
- Tab-local
- Project Workspace
- Routing Facts
- History Backend
- Navigation History
- Workspace Manager

必要になれば、その時に改めて「名前を付けるほどの概念か」を考える。

特に **Project Workspace** は使わない。今回の Tab は Project と1対1ではないため。
