---
status: doing
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-01T09:48:00+09:00
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
---

## Squash merge commit body

- RAGScopeアプリケーションから見たlogging・tracing・observabilityの公開API、module責務、依存方向を現在契約から組み直す
- `1利用者操作 = 1 trace`、UseCase子span、trace外ログ、OperationResultとUseCase結果の分離を全体設計へ反映する
- 現在契約を直接表すlogging中核型と、所有者ごとのeventから共通loggingへ渡す境界を実装する
- 旧`ExecutionId`・`EventId`・`EventContext`・`OperationName`・通常/失敗イベント直和などを、新設計で不要な前提として残さない

## 進め方

Haskellコードへ着手する前に、`Notes/RAGScope/RAGScopeアプリケーション/RAGScope実行追跡・構造化ログ基盤.canvas`で、実行追跡・構造化ログ基盤と周辺境界を一つの全体像として整理する。`RAGScope旧共通実行基盤.canvas`はCanvasの粒度・配置・表現方法の参考に使い、旧設計の構造を引き継ぐ根拠にはしない。

Canvasと設計ノートでは少なくとも次を確定してからHaskell実装へ進む。

- `1 trace = 利用インターフェースが受け付けた1回のトップレベルな利用者操作`という実行追跡単位
- Operation root spanがrouting・command判定・入力変換・検証より前からUseCase後の結果処理までを覆う境界
- UseCase実行をroot span配下の子spanとする境界
- UseCaseの`Either FeatureFailure FeatureResult`と、利用者操作全体の概念的な`OperationResult = Success | Failure`を分離する境界
- UseCaseの`Left failure`を外側のOperation `Failure`へ引き渡し、UseCase前後の通常失敗をFeature failureへ混ぜないこと
- Application / process lifecycleをOperationResultや個別traceへ混ぜず、trace外eventとして扱えること
- trace内ログは`TraceId`・`SpanId`を組で持ち、trace外ログは両方を持たないこと
- Feature / Interface / Lifecycle eventそれぞれの所有者と、`ToLogSpec -> LogSpec -> LogRecord`へ合流する共通logging境界
- 利用側から見た公開API
- module一覧と各責務
- module間の依存方向
- 中心となる型とデータの流れ
- Runtime、Sink、JSON / SQLite外部表現、テスト差し替え境界
- logging自身の失敗処理を後続Application実行・失敗境界へ渡せる公開境界
- `Observation`、`Result`、`AppError`を後続で再評価できる位置づけ

`OperationResult = Success | Failure`は意味上の境界を示す概念表記としてこのSubtaskで固定するが、正確なHaskell型名、constructor、外側のfailure ADT、同期・非同期Exceptionやlogging failureとの最終合成はこのSubtaskで先行固定しない。これらは後続の`RS-0022 subtask アプリケーション実行と失敗境界を再設計する`で、実装済みのLogging / Tracing / Observability境界を前提に確定する。

ただし後続のException・失敗設計が破綻しないよう、現在Subtaskでは次を前提として残す。

- 通常のUseCase failureはUseCaseの`Left failure`として返す。
- UseCase外の通常失敗をFeature failureへ変換しない。
- 同期Exception・非同期ExceptionはUseCaseの通常failureと同一視しない。
- lifecycle failureをOperationResultへ含めない。
- logging failureを失敗した同じlogging経路へ再帰的に記録しない。

OpenTelemetryはRAGScopeの要求を決める基準ではなく、Canvasで定めるRAGScope側の実行追跡を実現するために利用する。

## 完了条件

- 新しいCanvasと設計ノートで、Lifecycle、1回の利用者操作、UseCase、Loggingの境界を一つの全体像として説明できる
- UseCaseの`Either`と利用者操作全体の`OperationResult`が別の結果境界であることを説明できる
- trace内eventとtrace外eventが同じLogging基盤へ合流し、不正なTrace Contextの部分状態を作らない中核型・公開境界を実装できる設計になっている
- Canvasの全体像を基準にLogging / Observability / Tracingの公開APIと中核型が実装されている
- 既存module構成を残すこと自体を理由にした責務や型がない
- trace実装SubtaskがOperation root span / UseCase子spanの境界を、Application実行・失敗SubtaskがOperationResultの正確なADTと失敗合成を、それぞれこのSubtaskの全体像から独立して具体化できる
- 正本リポジトリの設計書を変更した場合、Subtask終了前に作業時点の最新`RAGScope文書作業ルール.md`を再確認し、「必須の責務・配置チェック」を変更した設計書全体と差分に対して再実施している
