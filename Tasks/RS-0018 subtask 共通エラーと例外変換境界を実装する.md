---
status: done
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-19T12:48:25.849+09:00
tags:
  - task
projects:
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
blockedBy:
  - uid: "[[RS-0018 subtask AI推論サービスのPython実装・テスト基盤を作る]]"
    reltype: FINISHTOSTART
branch: RS-0018/common-error
timeEntries:
  - startTime: 2026-08-18T21:15:44.196Z
    description: Work session
    endTime: 2026-08-18T21:40:44.223Z
  - startTime: 2026-08-18T21:49:08.826Z
    description: Work session
    endTime: 2026-08-18T22:14:08.952Z
  - startTime: 2026-08-18T22:19:50.287Z
    description: Work session
    endTime: 2026-08-18T22:44:50.378Z
  - startTime: 2026-08-18T22:55:00.500Z
    description: Work session
    endTime: 2026-08-18T22:59:18.256Z
  - startTime: 2026-08-18T23:12:14.169Z
    description: Work session
    endTime: 2026-08-18T23:32:57.289Z
  - startTime: 2026-08-19T00:11:47.808Z
    description: Work session
    endTime: 2026-08-19T00:36:48.010Z
  - startTime: 2026-08-19T01:23:45.233Z
    description: Work session
    endTime: 2026-08-19T01:48:45.322Z
  - startTime: 2026-08-19T01:54:48.787Z
    description: Work session
    endTime: 2026-08-19T02:19:48.850Z
  - startTime: 2026-08-19T02:24:57.937Z
    description: Work session
    endTime: 2026-08-19T02:49:58.001Z
  - startTime: 2026-08-19T03:11:43.316Z
    description: Work session
    endTime: 2026-08-19T03:36:43.487Z
completedDate: 2026-08-19
---

## Squash merge commit body

- 共通エラーの5項目の意味をPythonで表現し、正常結果と失敗結果を明示的に扱える境界を追加する
- Python例外を安全な共通エラーへ変換し、想定外例外を`internal`として扱う境界を実装する
- 元の例外メッセージやスタックトレースなどの非公開情報を利用者向け情報や構造化ログへ漏らさない
- 機能固有の閉じたエラー表現から共通エラーへ変換できる境界を用意する

## 目的

AI推論サービスで発生する失敗を、現在の共通エラー設計と同じ意味でPython側から扱えるようにする。

Haskell側の実装構造は共有せず、共通契約の意味と公開境界だけを揃える。

## 関連Subtask

- 先行: [[RS-0018 subtask AI推論サービスのPython実装・テスト基盤を作る|AI推論サービスのPython実装・テスト基盤を作る]]
- 後続: [[RS-0018 subtask LogEvent生成とJSON変換を実装する|LogEvent生成とJSON変換を実装する]]

## 完了条件

- 共通エラーの`category`、`code`、`message`、`context`、`cause`をPythonで表現できる
- 正常結果と失敗結果を明示的に区別できる
- 想定外のPython例外を安全な`internal`エラーへ変換できる
- 非公開の原因情報を利用者向け情報や構造化ログへ渡さない
- 共通層が機能固有のエラーコードを任意に決定しない
