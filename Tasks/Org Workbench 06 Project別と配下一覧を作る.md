---
status: doing
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-25T21:30:46+09:00
tags:
  - task
---

# Project 別タスク一覧を Agenda で作る

## 完成イメージ

タスクの保存先ファイルを一つずつ開かなくても、**登録済み Project または無所属を選び、その所属タスクを Org Agenda で一覧・操作できる** ようにする。

Project 別一覧は独自のタスク検索 UI を作らず、Org 標準のタグ検索による Agenda view を利用する。Workbench が持つのは、`projects.org` の Project 定義を人間向けに選択し、対応する Project タグまたは無所属の検索条件を Org Agenda に渡すための薄い処理とする。

Project の所属はこれまでどおり Org 標準のタグ継承に従う。親の `:p_ragscope:` を継承した子・孫も RAGScope の一覧に含め、子自身に `:p_workbench:` が付いている場合は Workbench の一覧にも現れる。複数所属をどちらか一方に限定しない。

継承込みの有効タグに登録済み Project のタグを一つも持たない見出しは無所属として扱う。無所属の一覧では、登録済み Project タグを除外する Agenda の検索条件を Workbench 側で組み立てる。

Agenda は Project 別一覧だけでなく、元の Org 見出しへの移動、TODO 状態の変更、日時やタグの操作、Clock や将来の org-pomodoro など、Org の標準操作につながる共通の窓口として使う。標準機能で足りる操作を Workbench で重複実装しない。

### 操作例：RAGScope のタスクを見る

1. Workbench の Project 別 Agenda を実行する。
2. 登録済み Project または無所属から「RAGScope」を選ぶ。
3. Workbench の `tasks/` だけを対象に、RAGScope の Project タグへ一致する見出しを Agenda に表示する。
4. 親から Project タグを継承した子・孫も同じ一覧で確認する。
5. Agenda 上で目的のタスクへ移動し、必要なら元の Org 見出しを開くか、Org の標準操作を実行する。

一覧では TODO 状態とタスク階層を把握できる形を目指す。表示調整が必要な場合も、まず `org-agenda-prefix-format` など Org Agenda の標準設定で実現できるか確認し、Workbench 独自の表示処理は増やさない。

### Task 07 との分担

Task 06 と Task 07 はどちらも Org Agenda の上に作る。

- Task 06 は *Project という切り口* でタスクを見る。RAGScope、Workbench、無所属などを選んで一覧する。
- Task 07 は *日付や状態という切り口* で日々の進捗を見る。今日の予定、期限、DOING、WAITING、未完了タスクなどをまとめる。

Project 別一覧だけを別の UI に分離せず、Org Agenda を Workbench のタスク一覧・操作の共通の窓口にする。

### 今回の作業と範囲

Org Agenda の `tags` または同等の標準的なタグ検索を基礎に、Workbench の Project 選択と接続する。

Project を選んだ場合は、その Project の内部タグを検索条件に使う。無所属を選んだ場合は、登録済み Project タグをすべて除外する条件を組み立てる。

Agenda の対象は Workbench の `tasks/` に限定し、通常の `org-agenda-files` や通常の Agenda 表示設定を Workbench のために上書きしない。Project 別 view に必要な設定は、その view の中だけに閉じる。

親タスクを別途選び、「直属の子だけ」「子孫すべて」を切り替える独自操作は初期要件に入れない。Org のタグ継承と Agenda の検索結果をそのまま利用する。

このタスクでは Project 別一覧と、そこから Org 標準の操作へつながるところまでを扱う。今日の予定・期限・状態をまとめた日常用 Agenda は Task 07 で扱う。Pomodoro の独自対象選択や対象保持は実装しない。

## やること

- 登録済み Project または無所属を選択できる既存の Project 選択処理を利用する。
- Project 選択結果を Org Agenda のタグ検索条件へ変換する。
- Project タグの継承を Org 標準の検索に任せ、親・子・孫を Project 別 Agenda に表示する。
- 複数 Project に所属するタスクを、それぞれ該当する Project の一覧に表示する。
- 無所属を、登録済み Project タグを持たない見出しとして Agenda で一覧できるようにする。
- Project 別 Agenda の対象を Workbench の `tasks/` に限定し、通常の Org Agenda 設定に影響させない。
- TODO 状態と階層が把握できる表示を、Org Agenda の標準設定を優先して整える。
- Agenda 上から元の Org 見出しへ移動し、通常の Org 操作を利用できることを確認する。

## 完了条件

- RAGScope、Workbench、無所属を切り替えて Project 別 Agenda を表示できる。
- 親の Project タグを継承した子孫が該当 Project の一覧に含まれる。
- 別の Project タグを追加した子孫が複数の Project 一覧に現れる。
- 登録済み Project タグを持たない見出しを無所属として一覧できる。
- Project 別 Agenda が Workbench の `tasks/` だけを対象とし、通常の Org Agenda の対象・表示設定を変更しない。
- Agenda 上から元の Org 見出しへ移動でき、Org の標準操作をそのまま利用できる。
- Project 別一覧のための独自タスク走査・独自 picker を持たない。

前提: [[Org Workbench 02 Projectの登録と所属選択を作る]]、[[Org Workbench 05 サブタスクのCaptureを作る]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
