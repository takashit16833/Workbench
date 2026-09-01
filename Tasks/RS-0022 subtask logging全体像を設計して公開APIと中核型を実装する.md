---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-01T14:25:33.984+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
branch: RS-0022/design-logging-architecture
timeEntries:
  - startTime: 2026-08-31T22:10:59.506Z
    description: Work session
    endTime: 2026-08-31T22:36:00.494Z
  - startTime: 2026-08-31T22:49:38.178Z
    description: Work session
    endTime: 2026-08-31T23:14:38.333Z
  - startTime: 2026-08-31T23:29:51.643Z
    description: Work session
    endTime: 2026-08-31T23:54:51.711Z
  - startTime: 2026-09-01T00:31:19.161Z
    description: Work session
    endTime: 2026-09-01T00:56:19.215Z
  - startTime: 2026-09-01T01:15:47.148Z
    description: Work session
    endTime: 2026-09-01T01:40:47.208Z
  - startTime: 2026-09-01T02:02:29.733Z
    description: Work session
    endTime: 2026-09-01T02:27:29.797Z
  - startTime: 2026-09-01T03:05:43.442Z
    description: Work session
    endTime: 2026-09-01T03:30:43.504Z
  - startTime: 2026-09-01T05:25:33.985Z
    description: Work session
---

## Squash merge commit body

- RAGScopeアプリケーションから見たlogging・tracing・observabilityの公開API、module責務、依存方向を現在契約から組み直す
- `1利用者操作 = 1 trace`、UseCase子span、trace外ログ、OperationResultが必要な場合だけUseCaseResultを内包する結果関係を全体設計へ反映する
- 現在契約を直接表すlogging中核型と、所有者ごとのeventから共通loggingへ渡す境界を実装する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを、新設計で不要な前提として残さない

## 進め方

Haskellコードへ着手する前に、`Notes/RAGScope/RAGScopeアプリケーション/RAGScope実行追跡・構造化ログ基盤.canvas`で、実行追跡・構造化ログ基盤と周辺境界を一つの全体像として整理する。`RAGScope旧共通実行基盤.canvas`はCanvasの粒度・配置・表現方法の参考に使い、旧設計の構造を引き継ぐ根拠にはしない。

利用者操作全体の実行境界・`OperationResult`・`OperationFailure`に関する現在設計は、RAGScope正本の`project-docs/design/利用者操作実行設計.md`を正本とする。WorkbenchのCanvasと設計ノートは、その正本を前提にlogging / tracing / observabilityの実装を検討する作業用ビューであり、Operation側の新しい設計判断を正本より先に確定しない。Operation側の設計判断が必要になった場合は、正本の`利用者操作実行設計.md`へ反映する。

Canvasと設計ノートでは少なくとも次を確定してからHaskell実装へ進む。

- `1 trace = 利用インターフェースが受け付けた1回のトップレベルな利用者操作`という実行追跡単位
- Operation root spanがrouting・command判定・入力変換・検証より前からUseCase後の結果処理までを覆う境界
- UseCase実行をroot span配下の子spanとする境界
- UseCase実行結果を概念上`UseCaseResult = UseCaseSuccess | UseCaseFailure`とし、Haskellの`Either failure result`で`Right result = UseCaseSuccess`、`Left failure = UseCaseFailure`と表す境界
- 利用者操作全体を概念上`OperationResult = OperationSuccess | OperationFailure`とし、必要な場合だけ内側の`UseCaseResult`を含む境界
- `UseCaseFailure`という結果区分と、`DenseSearchFailure`など具体的なUseCase固有failure型を分けること。具体failure型はそのUseCaseを所有するFeatureに置き、一般的な結果区分を`FeatureFailure` / `FeatureResult`とは呼ばないこと
- `UseCaseFailure`を外側の`OperationFailure`の原因として扱い、UseCase前後の通常失敗をUseCase固有failureへ混ぜないこと。`UseCaseSuccess`だけでは`OperationSuccess`を確定しないこと
- Application / process lifecycleを`OperationResult`や個別traceへ混ぜず、trace外eventとして扱えること
- trace内ログは`TraceId`・`SpanId`を組で持ち、trace外ログは両方を持たないこと
- Feature / Interface / Lifecycle eventそれぞれの所有者と、`ToLogSpec -> LogSpec -> LogRecord`へ合流する共通logging境界
- 利用側から見た公開API
- module一覧と各責務
- module間の依存方向
- 中心となる型とデータの流れ
- Runtime、Sink、JSON / SQLite外部表現、テスト差し替え境界
- logging自身の失敗処理を後続Application実行・失敗境界へ渡せる公開境界
- `Observation`、`Result`、`AppError`を後続で再評価できる位置づけ

`UseCaseResult = UseCaseSuccess | UseCaseFailure`と`OperationResult = OperationSuccess | OperationFailure`は現在の正本に従う。UseCaseのHaskell境界は`Either failure result`とする。一方、`OperationResult`の正確なHaskell型名、constructor、外側のfailure ADT、同期・非同期Exceptionやlogging failureとの最終合成はこのSubtaskで先行固定しない。これらは後続の`RS-0022 subtask アプリケーション実行と失敗境界を再設計する`で検討し、確定した現在設計をRAGScope正本の`利用者操作実行設計.md`へ反映する。

ただし後続のException・失敗設計が破綻しないよう、現在Subtaskでは次を前提として残す。

- 通常のUseCase failureは`Left failure`として返し、結果区分としては`UseCaseFailure`となる。
- `UseCaseFailure`は結果区分であり、具体failure型とは分ける。
- UseCase外の通常失敗をUseCase固有failureへ変換しない。
- 同期Exception・非同期Exceptionは通常の`UseCaseFailure`と同一視しない。
- lifecycle failureを`OperationResult`へ含めない。
- logging failureを失敗した同じlogging経路へ再帰的に記録しない。

OpenTelemetryはRAGScopeの要求を決める基準ではなく、Canvasで定めるRAGScope側の実行追跡を実現するために利用する。

## 完了条件

- 新しいCanvasと設計ノートで、Lifecycle、1回の利用者操作、UseCase、Loggingの境界を一つの全体像として説明できる
- `OperationResult`が必要な場合だけ`UseCaseResult`を内包し、`UseCaseFailure`は`OperationFailure`へ反映される一方、`UseCaseSuccess`だけでは`OperationSuccess`が確定しない関係を説明できる
- UseCaseの結果区分と具体failure型、Featureという所有単位を混在させず説明できる
- Operation側の新しい設計判断をWorkbenchだけで確定せず、RAGScope正本の`project-docs/design/利用者操作実行設計.md`を現在設計の反映先として扱っている
- trace内eventとtrace外eventが同じLogging基盤へ合流し、不正なTrace Contextの部分状態を作らない中核型・公開境界を実装できる設計になっている
- Canvasの全体像を基準にLogging / Observability / Tracingの公開APIと中核型が実装されている
- 既存module構成を残すこと自体を理由にした責務や型がない
- trace実装SubtaskがOperation root span / UseCase子spanの境界を、Application実行・失敗Subtaskが`OperationResult`の正確なADTと失敗合成を、それぞれこのSubtaskの全体像から独立して具体化できる
- 正本リポジトリの設計書を変更した場合、Subtask終了前に作業時点の最新`RAGScope文書作業ルール.md`を再確認し、「必須の責務・配置チェック」を変更した設計書全体と差分に対して再実施している