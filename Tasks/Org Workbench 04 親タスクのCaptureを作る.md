---
status: done
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-23T15:10:21.331+09:00
tags:
  - task
completedDate: 2026-09-23
---

# 親タスクを Capture で作成する

## 完成イメージ

Emacs の `M-x org-capture` から「Workbench: タスク作成」を選び、親を持たないタスクを新しい Org ファイルとして登録する。作成時の入力はタイトル（必須）と登録済み Project（任意）のみ。Project を選ばなければ無所属、複数選べば複数所属となる。TODO・ID・CREATED は自動設定する。日時・優先度・BRANCH・SOURCE・本文などは Capture 中に追記するか、保存後にタスクの Org ファイルを開いて編集する。作成用テンプレートをクイック／詳細に分けない。

### 操作例：タイトルだけで登録する

例えば「API の性能を改善する」というタスクを思いついたら、次の操作で登録する。

1. `M-x org-capture` から「Workbench: タスク作成」を選ぶ。
2. タイトル「API の性能を改善する」を入力し、Project は選ばずに進める。
3. 必要なら Capture の編集画面で本文やメモを書き足す。
4. `C-c C-c` で保存して元の画面へ戻る。すぐ編集を続けるなら `C-u C-c C-c` で保存後にタスクへ移動する。

`~/org/workbench/tasks/` に新しい `.org` ファイルが作成され、内容は次のようになる。`ID` と `CREATED` は自動で設定し、同名タスクでも別のファイル名を使う。

```org
* TODO API の性能を改善する
:PROPERTIES:
:ID:       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
:CREATED:  [2026-09-22 Tue 10:00]
:END:

性能改善について調査する。
```

※ ID・作成日時は表示例。本文は入力した場合だけ含まれる。

### 操作例：Project を選び、必要な詳細を編集する

同じ「タスク作成」で RAGScope を選ぶと、所属タグが見出しに付き、タスクは Project 別一覧からも探せる。Project の選択は任意で、Workbench との複数所属も可能。日時や優先度などを尋ねる追加フォームは設けない。

次は RAGScope のタスクを作成し、Capture 中または保存後の Org 編集で日時・優先度・BRANCH・SOURCE・本文を追記した例。

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

※ 各値は入力例。Project を未選択にした場合は所属タグを付けない。日時・優先度・BRANCH・SOURCE は編集しなければ追加されない。

### 保存・キャンセル・再編集

- 確定したタスクは `tasks/` に保存され、Agenda の検索対象になる。未完了のタスクは TODO 一覧からも探せる。
- 同じタイトルを続けて登録しても別ファイルを作り、既存タスクを上書きしない。
- タイトルが空なら確定できない。失敗時や `C-c C-k` でキャンセルしたときは、不完全なファイルを残さない。
- `C-u C-c C-c` で保存直後にタスクへ移動でき、保存後も Agenda の一覧から元の見出しを開いて状態・日時・本文・任意項目を編集できる。

**このタスクの対象は親のないタスクの作成まで。** 同じ「タスク作成」から既存タスクを親に選んで子タスクを追加する機能はタスク05で扱い、別の作成テンプレートは増やさない。上記は完成予定の動作であり、現時点ですべて実装済みという意味ではない。

## やること

`org-capture` の作成入口を「タスク作成」1つに統一する。親のないタスクは1件につき新しいファイルを作成し、作成後すぐ詳細を編集できるようにする。

- タイトルを必須とし、登録済み Project の選択を任意にする。無所属・複数所属に対応し、TODO・ID・CREATED を自動設定する。
- 詳細入力用のテンプレートや日時・優先度などの質問を増やさず、Capture 中の追記と保存後の通常の Org 編集で対応する。
- `C-c C-c` で保存して元の画面へ戻り、`C-u C-c C-c` では保存後に作成した見出しへ移動できるようにする。
- ファイル名衝突による上書きを避け、本文やメモを保存できるようにする。失敗・キャンセル時に空ファイルを残さない。
- 既存の Capture 設定やショートカットを調べ、競合を起こさない。Emacs のキー操作は Emacs 側で管理する。

## 完了条件

- 「タスク作成」からタイトルだけで無所属タスクを作れ、TODO・ID・CREATED があり Agenda の検索対象になる。
- RAGScope・Workbench・無所属・複数所属を選べる。日時や BRANCH などは作成中・保存後に Org の編集で追加できる。
- 通常保存と保存後の移動ができ、Agenda から元のタスクを開いて再編集できる。
- 同名タスクを続けて作成しても別ファイルになり、失敗・キャンセル時に不完全なファイルを残さない。

前提: [[Org Workbench 02 Projectの登録と所属選択を作る]]、[[Org Workbench 03 タスクの形式と状態を整える]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
