---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-20T17:06:15+09:00
dateModified: 2026-09-20T17:06:15+09:00
tags:
  - task
---

# RAGScope と Workbench の実タスクを登録して初回リリースを確認する

## 完成イメージ

**タスク04〜07までに作った機能を、実際の RAGScope と Workbench の作業で一通り使える状態にし、日々のタスク管理の更新先を新しい Org Workbench に切り替える。** これが初回リリースの最終確認になる。架空のテストデータを表示して終わるのではなく、今後も取り組む本物のタスクを登録して、作成・更新・検索・進捗確認の流れを試す。

旧 Workbench の全履歴を完全移行するタスクではない。必要な作業だけ新しい Org 版に登録し、旧 Workbench は参照用に残す。双方向同期もしない。

### 作業例①：移すタスクを選び、Org に登録する

1. 旧 Workbench の RAGScope と Workbench のタスクを確認する。
2. 現在進行中の作業や、これから着手する作業だけを選ぶ。過去の全タスクを機械的に移す必要はない。
3. 新しい Org 版の登録済み Project「RAGScope」「Workbench」に所属させて、Capture で親タスクを作る。
4. 必要に応じて子・孫タスクを追加し、元のタスクに必要な本文・日時・所属・参照リンクを確認して反映する。
5. Workbench 自身の今後の改善項目も、新しい Org 版にタスクとして登録する。

例えば RAGScope に次の作業が必要なら、親タスク1件と子タスク2件を登録する。次は保存される内容の説明例で、実際に移行するタスク名や値を指定するものではない。

```org
* DOING API の性能を改善する :p_ragscope:
DEADLINE: <2026-09-30 Wed>
:PROPERTIES:
:ID:       parent-id
:CREATED:  [2026-09-22 Tue 11:00]
:END:

** DONE 遅いクエリを調べる
CLOSED: [2026-09-22 Tue 12:00]
:PROPERTIES:
:ID:       child-id-1
:CREATED:  [2026-09-22 Tue 11:00]
:END:

** TODO SQL の改善案を実装する
:PROPERTIES:
:ID:       child-id-2
:CREATED:  [2026-09-22 Tue 11:00]
:END:
```

ID・作成日時・終了日時は表示例。実際には自動生成・記録された値を使用する。親の Project タグを子に重複して書く必要はない。

### 作業例②：実際の作業を最初から最後まで通して確認する

RAGScope と Workbench の **両方で**、次の一連の操作を試す。

1. `org-capture` で親タスクを作成し、必要に応じて Project を選ぶ。
2. 作成した親を検索して選び、その配下に子タスクを追加する。
3. タスクの状態を `TODO` → `DOING` → `DONE` に更新する。待機が必要なものは `WAITING` にし、必要なら `TODO` に戻す。
4. Project 別一覧で所属タスクを探し、親別一覧で直属の子・子孫を確認する。結果から目的の見出しを開く。
5. `org-agenda` で今日の予定・期限・未完了タスクを確認し、変更後の状態が反映されることを確かめる。

この流れがどちらか一方の Project でしか動かない状態では、初回リリースを完了としない。

### 作業例③：例外ケースと再起動を確認する

普段の操作に加えて、次の条件でもデータが正しく扱われることを確かめる。

- Project を指定しないタスクと、複数 Project に所属するタスクを作成・検索できる。
- `SCHEDULED` / `DEADLINE` を省略しても作成でき、指定した場合は Agenda で確認できる。
- 親・子それぞれに異なる ID があり、作成時の CREATED と完了・中止時の CLOSED が記録される。
- 親子の見出しや参照リンクから、正しい対象へ移動できる。
- Emacs を再起動してもタスク・階層・状態・Agenda の検索対象が維持される。

問題が見つかった場合は該当する機能の担当タスクで修正し、修正後に同じ操作を試す。

### 完了後の使い方と今回の範囲

初回リリース後は、新しく発生した RAGScope や Workbench のタスクを Org 版に作成し、進捗も Org 版で更新する。旧 Workbench は過去情報を調べるための参照先として残す。操作手順と未解決の課題を短く記録し、追加機能の要望は新しい Workbench のタスクとして管理する。

**このタスクの完了は、初回マイルストーンの達成を意味する。** Project 削除、Clear、休日・予定の一括変更、Pomodoro、アイデア・ノートの管理などは未実装でもよい。全履歴移行や双方向同期も対象外。上記は完成予定の確認手順であり、現時点でリリース済みという意味ではない。

## やること

このタスクの完了が初回マイルストーンの達成条件。設計書の「リリースまでに最低限作る機能」を実際に使って確認する。

- 旧 Workbench の RAGScope / Workbench タスクを参照し、今から使うものだけ Org に登録する。全履歴の移行や双方向同期は行わない。
- 新しい Org 版の `RAGScope` と `Workbench` Project にタスクを振り分け、主なタスクとサブタスクを作る。Workbench 自身の今後の改善項目も新しい環境で管理を始める。
- 新規 Capture → Project 選択 → サブタスク追加 → 状態更新 → Project 別・親別一覧 → Agenda 確認を、両 Project で通して試す。
- 無所属・複数所属、日時の省略・指定、再起動、ID・CREATED、完了時 CLOSED、リンク移動を確認する。不具合があれば担当タスクで修正する。
- 操作方法と残した課題を短く記録する。従来の Workbench を参照用に残し、以後のタスク更新先を Org とする。

## 完了条件

- RAGScope と Workbench で実際に必要なタスクを Org に登録できている。
- 両 Project でタスクを作成・更新・検索・Agenda 表示でき、通常の進捗管理に移れる。
- Project 削除、Clear、休日・予定の一括変更、Pomodoro、アイデア・ノートは未実装でもよい。追加機能は新しい Workbench のタスクで管理する。

前提: [[Org Workbench 04 親タスクのCaptureを作る]]、[[Org Workbench 05 サブタスクのCaptureを作る]]、[[Org Workbench 06 Project別と配下一覧を作る]]、[[Org Workbench 07 Agendaで進捗を確認する]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
