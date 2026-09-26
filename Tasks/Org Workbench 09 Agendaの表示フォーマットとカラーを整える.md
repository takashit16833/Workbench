---
status: todo
projects:
  - "[[org-workbench]]"
dateCreated: 2026-09-26T09:47:03+09:00
dateModified: 2026-09-26T09:47:03+09:00
tags:
  - task
---

# Agenda の表示フォーマットとカラーを整える

## 完成イメージ

**Org Workbench の機能と実運用確認が終わったあとに、Agenda の情報量・階層表現・配色を整理し、日常的に見続けても読みやすい表示へ仕上げる。**

タスク07では機能を成立させることを優先し、Workbench 専用 Agenda の各 view に必要な情報を表示できる状態まで作る。タスク08では実タスクを使って初回リリースを確認する。このタスク09では、その時点で実際に使って分かった表示上の違和感をまとめて調整する。

フォーマット調整では、単純に情報を減らすのではなく、各 view の目的に応じて「何を表示すると判断しやすいか」を整理する。Org 標準の Agenda 機能・prefix format・breadcrumb などで実現できるものを優先し、独自の表示ロジックは必要性を確認してから追加する。

カラー調整では、現在の =retro-hacker-blue= の方向性を維持しつつ、Agenda で目立ちすぎる TODO 状態・期限・予定・タグ・区切り線などを青系モノトーン中心に整理する。重要な状態差が分からなくなるほど単色にはせず、役割の違いは明度・彩度・太字などで区別する。

### 表示フォーマットで確認すること

Workbench 専用 Agenda の各 view を実際のタスクで開き、次の観点を確認する。

- =wa= の通常 Agenda で、時刻・Scheduled / Deadline・期限超過などの有用な情報を残しつつ、機械生成されたファイル名を category として表示しない。
- =wt= では親・子・孫の階層が直感的に分かり、同じ Project のタグ表示と競合しない。
- =wm= では検索結果だけを見ても所属する親タスクが分かる。
- =wp= では Project 配下の階層が自然に読める。
- =wd= では今日の予定・期限超過・本日期限・今後の期限について、元の日付と親タスクの文脈を確認できる。
- =ws= では DOING / WAITING の対象だけを見ても親タスクの文脈が分かる。
- =wo= では Overview として必要十分な情報に絞り、同じタスクが複数の意味で表示される場合も読みづらくならない。
- Workbench 専用の表示調整が通常の Org Agenda の表示形式へ漏れない。

表示を短くすること自体を目的にしない。情報を追加した方が判断しやすい場合は残し、重複・ノイズ・位置関係によって読みにくいものを整理する。

### カラーで確認すること

=retro-hacker-blue= の Org / Org Agenda 関連 face を確認し、現在のピンク・緑・オレンジなどの強い色が必要以上に目立つ箇所を調整する。

特に次を確認する。

- TODO / DOING / WAITING / DONE / DROPPED
- Scheduled / Deadline / 期限超過
- Agenda の日付・今日・見出し
- block agenda の見出し・区切り線
- Project などのタグ
- 選択行・現在位置
- 通常の Org buffer と Org Agenda の色の一貫性

基本は青系モノトーンを中心にし、現在の Emacs・WezTerm・Yazi と馴染む見た目にする。ただし状態の識別性が落ちる場合は、限定的に別色や明度差を使用する。

変更前に、どの face が実際の表示を担当しているかを =describe-face= などで確認する。見た目から推測して無関係な face を変更しない。

## やること

- タスク08までの実運用結果を踏まえ、Workbench Agenda の =wa / wt / wm / wp / wd / ws / wo= を一通り確認する。
- 各 view の目的に合わせ、breadcrumb・階層・日時・Scheduled / Deadline 情報・タグなどの表示内容と並びを整理する。
- Org 標準の表示機能で実現できるものを優先し、不要な独自処理は追加しない。
- 機械生成されたタスクファイル名を Workbench 専用 Agenda の category として表示しない。通常の Org Agenda の表示には影響させない。
- =retro-hacker-blue= の Org / Org Agenda 関連 face を実際の face 名まで確認し、青系モノトーンを軸に視認性を調整する。
- 表示調整後に既存 ERT をすべて実行し、必要に応じて表示仕様を固定するテストを追加する。
- 実タスクでも再確認し、機能上の情報を落としていないことと、長時間見ても過度に派手でないことを確認する。

## 完了条件

- Workbench Agenda の各 view で、親子関係・Project・状態・日時など、その view の判断に必要な情報を無理なく読み取れる。
- Workbench 専用 Agenda に機械生成ファイル名が category として表示されず、通常の Org Agenda の表示設定には影響しない。
- 日付系 view では元の SCHEDULED / DEADLINE と親タスクの文脈を確認できる。
- =retro-hacker-blue= の Org Agenda が青系モノトーンを基調とした落ち着いた配色になり、TODO 状態・期限・予定など必要な差は判別できる。
- Org buffer・Org Agenda・既存の Emacs / WezTerm / Yazi の見た目に大きな違和感がない。
- 既存 ERT がすべて通り、表示調整によって Workbench の機能や通常の Org Agenda に副作用が出ていない。

前提: [[Org Workbench 08 実タスクを登録して初回リリースを確認する]]
参照: [設計書](https://github.com/takashit16833/.emacs.d-cli/blob/feat/org-workbench/workbench/design.org)
