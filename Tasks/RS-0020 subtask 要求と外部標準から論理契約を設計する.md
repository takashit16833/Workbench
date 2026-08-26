---
status: doing
priority: medium
dateCreated: 2026-08-21T09:16:00+09:00
dateModified: 2026-08-26T09:47:44.776+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0020 共通エラー・構造化ログの論理契約を再設計する]]"
blockedBy:
  - uid: "[[RS-0020 subtask ユースケース設計を作成する]]"
    reltype: FINISHTOSTART
branch: RS-0020/error-logging-contract
timeEntries:
  - startTime: 2026-08-21T01:18:52.866Z
    description: Work session
    endTime: 2026-08-21T01:43:52.993Z
  - startTime: 2026-08-21T01:50:03.156Z
    description: Work session
    endTime: 2026-08-21T02:15:03.214Z
  - startTime: 2026-08-21T02:30:15.366Z
    description: Work session
    endTime: 2026-08-21T02:55:15.434Z
  - startTime: 2026-08-21T04:08:51.167Z
    description: Work session
    endTime: 2026-08-21T04:33:51.233Z
  - startTime: 2026-08-21T05:52:55.163Z
    description: Work session
    endTime: 2026-08-21T06:17:55.288Z
  - startTime: 2026-08-21T06:24:42.447Z
    description: Work session
    endTime: 2026-08-21T06:49:42.510Z
  - startTime: 2026-08-21T06:54:54.392Z
    description: Work session
    endTime: 2026-08-21T07:19:54.444Z
  - startTime: 2026-08-24T08:47:55.843Z
    description: Work session
    endTime: 2026-08-24T09:12:55.918Z
  - startTime: 2026-08-25T20:56:42.282Z
    description: Work session
    endTime: 2026-08-25T21:21:42.347Z
  - startTime: 2026-08-25T21:39:49.804Z
    description: Work session
    endTime: 2026-08-25T22:04:49.885Z
  - startTime: 2026-08-25T22:15:59.472Z
    description: Work session
    endTime: 2026-08-25T22:40:59.480Z
  - startTime: 2026-08-25T22:46:42.740Z
    description: Work session
    endTime: 2026-08-25T23:11:42.852Z
  - startTime: 2026-08-26T00:22:44.692Z
    description: Work session
    endTime: 2026-08-26T00:47:44.776Z
---

## Squash merge commit body

- RAGScopeの要求とシステム境界から、ログ・エラー・処理の関連付けで確認する必要がある事実を整理する
- 構造化ログ、実行追跡、相関、HTTPエラー表現に関する外部標準を比較し、RAGScope固有の論理契約を定義する
- Trace、Span、LogRecord、重要度、出来事、失敗、エラー情報、コンポーネント間のContext伝播の責務を決定する

## 目的

既存のHaskell型、Python型、JSON Schema、旧ログ・エラー設計を設計制約にせず、RAGScopeが必要とする意味から共通の論理契約を作る。

## 現在地

- OpenTelemetryのモデルとRAGScopeの要求を照合し、処理構造はSpan、意味のある時点の出来事は構造化LogRecordとして扱う方向で整理した。
- ログだけで処理の親子関係、開始・終了、所要時間、最終状態を表すとSpan相当を独自に再実装するため、Spanを採用する判断に至った。
- Trace境界は下位機能が`Traceが存在するか`で動的に所有するのではなく、RAGScopeのトップレベルな利用操作の1回の実行を基準にする方向で整理した。
- その境界の正本となるユースケース設計が現在存在しないため、`[[RS-0020 subtask ユースケース設計を作成する]]`を先に完了してから本Subtaskを再開する。
- ローカル可視化はAspire Dashboardなどを候補として、Trace階層、Spanの時間関係、LogRecordとの相関を確認するための検証手段として使用する。可視化ツール自体をRAGScopeの論理契約や必須基盤にはしない。

## 完了条件

- 要求から必要な観測事実と公開するエラー情報が整理されている
- ユースケース設計を正本として、1回のユースケース実行とTraceの対応を説明できる
- 外部表現や実装言語に依存しないTrace / Span / LogRecordの論理契約が設計書として成立している
- Spanの開始・終了・StatusとLogRecordのEventを重複したライフサイクル表現として扱っていない
- TraceId / SpanIdとRAGScopeが永続管理するドメイン識別子の責務が分離されている
- RAGScopeアプリケーションからAI推論サービスへTrace Contextを伝播する共通規則が定義されている
- 重要度、途中の失敗、最終的なSpanの失敗、共通エラーの関係が決定されている
- ローカル可視化で代表的なTrace / Span / LogRecordの関係を確認し、論理モデルの理解を妨げる不整合がない
- 文書の分割と名称は確定した責務に基づいて決められている
