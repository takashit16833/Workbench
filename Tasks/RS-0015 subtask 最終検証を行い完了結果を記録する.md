---
status: todo
priority: medium
scheduled: 2026-08-14
dateCreated: 2026-08-14T09:38:53.223+09:00
dateModified: 2026-08-14T09:58:40.874+09:00
tags:
  - task
due: 2026-08-13
projects:
  - "[[RAGScope]]"
  - "[[RS-0015 RAGScopeアプリケーションの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0015 subtask 共通エラーと構造化ログの設計書を実装へ同期する]]"
    reltype: FINISHTOSTART
branch: RS-0015/finalize
---

## Squash merge commit body

- RS-0015の全完了条件をコード、テスト、Schema、設計と照合する
- `make check`を含む最終検証を実行して結果を確認する
- RS-0015 Ticketの`結果`へ実装内容、確認方法、既知の制約を記録する
- Ticket完了用の`status: done`を親ブランチへ含め、main向けPull Requestを準備できる状態にする

## 目的

RS-0015全体について、正本Ticketの完了条件と実際のコード、テスト、Contract、Schema、設計を照合する。

不足が見つかった場合は無理に完了扱いにせず、該当するSubtaskへ戻る。

## やること

- RS-0015の完了条件を上から順に実装・テスト・Schema・設計と照合する
- 共通エラーとログ構造を確認する
- モジュール境界とFacadeを確認する
- JSON変換とSchema適合を確認する
- stdout / stderrとSink境界を確認する
- Sink失敗時の挙動を確認する
- 情報保護を確認する
- 設計書との未解消差異がないことを確認する
- プロジェクトで定めた最終テストコマンドを実行する
- `make check`を含む必要な検証が成功することを確認する
- RS-0015 Ticketの`結果`へ以下を記録する
  - 実装した共通エラーと構造化ログ基盤
  - 利用できる出力処理とcontext
  - 実行した確認コマンドと結果
  - 設計へ反映した内容
  - 後続機能へ残る適用事項
  - 既知の制約
  - 関連Pull Request
- 完了条件を満たしている場合は、Ticketを完了するPull Requestへ`status: done`を含める
- RS-0015親ブランチからmainへのPull Request準備に必要な情報を整理する

## 完了条件

- RS-0015の全完了条件について根拠を確認できる
- 最終テストが成功する
- Ticketの`結果`が記入されている
- 未解消の重大な設計・Schema・実装差異がない
- Ticketを完了する`status: done`を含め、親ブランチがmain向けPull Requestを作成できる状態になっている

## 注意

正本のプロジェクト管理規約では、実質的な変更については関連する変更がデフォルトブランチへ反映されて初めてTicketの`done`条件が成立する。

そのため、このSubtaskで`status: done`をPull Request対象へ含めても、最終的な完了確認は親ブランチがmainへmergeされた後に行う。

Pull Request作成、Ready for review、merge、branch削除はそれぞれ独立した操作として扱う。
