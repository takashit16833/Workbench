---
status: doing
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-22T10:59:41+09:00
tags:
  - task
---

# 親タスクを Capture で作成する

## 完成イメージ

Emacs の `M-x org-capture` から Workbench のタスク作成を選び、親を持たない主なタスクを新しい Org ファイルとして登録できるようにする。入力はタイトルだけでもよく、必要なときは Project や予定なども指定できる。作成途中で本文やメモを書き足せて、保存後も通常の Org ファイルとして編集できる。

### クイック作成：タイトルだけで登録する

例えば「API の性能を改善する」というタスクを思いついたら、次の操作で登録する。

1. `M-x org-capture` から「Workbench: クイック作成」を選ぶ。
2. タイトル「API の性能を改善する」を入力する。
3. Capture の編集画面で、必要なら本文やメモを書き足す。
4. `C-c C-c` で確定する。

`~/org/workbench/tasks/` に新しい `.org` ファイルが作成され、内容は次のようになる。`ID` と `CREATED` は自動で設定し、ファイル名は同名タスクでも重複しないものを使う。

```org
* TODO API の性能を改善する
:PROPERTIES:
:ID:       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
:CREATED:  [2026-09-22 Tue 10:00]
:END:

性能改善について調査する。
```

※ ID・作成日時は表示例。メモは入力した場合だけ含まれる。

### 詳細作成：必要な情報を指定して登録する

タイトルに加え、所属 Project、開始予定、期限、優先度、作業ブランチ、参照先を必要なものだけ指定できる。どの任意項目も空のまま進められる。Project は登録済みのものから選び、RAGScope・Workbench・無所属・複数所属に対応する。

例えば RAGScope のタスクで Project・予定・優先度・ブランチ・参照先を指定すると、次のようなファイルになる。

```org
* TODO [#A] API の性能を改善する :p_ragscope:
SCHEDULED: <2026-09-23 Wed>
DEADLINE: <2026-09-30 Wed>
:PROPERTIES:
:ID:       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
:CREATED:  [2026-09-22 Tue 10:00]
:BRANCH:   feat/api-performance
:SOURCE:   https://example.com/issues/123
:END:

性能改善について調査する。
```

※ 各値は入力例。指定しなかった Project タグ、日時、優先度、BRANCH、SOURCE は追加しない。

### 確定・キャンセル後の動き

- 確定したタスクは `tasks/` に保存され、Agenda の検索対象になる。
- 同じタイトルを続けて登録しても別ファイルを作り、既存のタスクを上書きしない。
- タイトルが空なら確定できない。作成に失敗したときや `C-c C-k` でキャンセルしたときは、不完全なファイルを残さない。
- 保存したタスクは再度開いて、状態・日時・本文・任意項目などを編集できる。

**このタスクの対象は親のない主なタスクの作成まで。** 既存タスクを親に選んで子タスクを追加する機能は別タスクで作る。上記は完成予定の動作であり、現時点ですべて実装済みという意味ではない。

## やること

新しい作業の入口を `org-capture` にする。親のない主なタスクは 1 ファイル作成し、作成後すぐ編集できるようにする。

- タイトルだけで保存できるクイック作成を用意する。TODO・ID・CREATED などの初期値は自動付与する。
- 詳細作成では登録済み Project（複数・無所属可）、開始予定 SCHEDULED、期限 DEADLINE、優先度、BRANCH、SOURCE を任意入力できる。省略した値の入力を強制しない。
- ファイル名衝突による上書きを避け、本文やメモを書き足せる。
- 既存の Capture 設定やショートカットを調べ、競合を起こさない。Emacs のキー操作は Emacs 側で管理する。

## 完了条件

- タイトルだけで作成でき、生成ファイルが Agenda の検索対象になる。
- RAGScope・Workbench・無所属・複数所属で作成でき、日時や BRANCH を付けても再編集できる。
- 同名タスクを続けて作成しても別のファイルになり、失敗・キャンセル時に不完全なファイルを残さない。

前提: [[Org Workbench 02 Projectの登録と所属選択を作る]]、[[Org Workbench 03 タスクの形式と状態を整える]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
