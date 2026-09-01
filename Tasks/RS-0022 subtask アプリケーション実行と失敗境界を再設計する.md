---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-01T09:48:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0022 RAGScopeアプリケーションの構造化ログ基盤を現在契約へ移行する]]"
blockedBy:
  - uid: "[[RS-0022 subtask trace・spanによる実行追跡とログ関連付けを実装する]]"
    reltype: FINISHTOSTART
branch: RS-0022/redesign-execution-failure
---

## Squash merge commit body

- logging再設計と利用者操作単位の実行追跡境界に合わせて、Operation全体の実行結果と最終失敗確定の責務を組み直す
- UseCaseの`Either`とOperation全体の結果を分離し、UseCase前後の通常失敗・Feature failure・Exceptionの扱いをApplication境界で具体化する
- `Observation`・`Result`・`AppError`を現在の責務から再評価し、不要な旧共通エラー・必須ログ合成構造を変更または削除する
- logging自身の失敗とOperation失敗が重なった場合のRAGScopeアプリケーション固有の扱いをコードとテストで確定する

## 目的

旧logging基盤と一体化しているアプリケーション実行・失敗境界を、新しいLogging公開API、Operation root span / UseCase子spanの実行追跡境界、UseCaseの`Either FeatureFailure FeatureResult`とは別に存在するOperation全体の成功・失敗境界に合わせて再構成する。

前段の設計で、1回の利用者操作全体には概念上`OperationResult = Success | Failure`という結果境界を持たせ、UseCaseの`Left failure`とUseCase前後の通常失敗を外側の`Failure`へ引き渡すことまで確定している。このSubtaskでは、その意味上の境界を実際のHaskell型とApplication実行フローへ落とす。

Application / processの起動・終了など、利用者操作外のライフサイクル失敗をOperationResultへ含めない。

## 完了条件

- 1回の利用者操作全体について、成功または失敗を表す正確なHaskellの結果型、failure型、constructor、module配置をコードとテストで確定している
- UseCaseの`Either FeatureFailure FeatureResult`をOperation全体の結果型と同一視せず、UseCaseの`Left failure`を外側のOperation failureへ引き渡せる
- routing・command判定・入力変換・検証などUseCase前の通常失敗をFeature failureへ変換せず、Operation failureとして扱える
- UseCase成功後のresponse / output側の結果処理で起きた通常失敗をOperation failureとして扱え、UseCase自身の成功結果を変更しない
- Application / process lifecycleのstartup・shutdown failureを1回のOperation resultへ混在させない
- 同期Exceptionについて、どこで捕捉するか、通常のOperation failureへ変換する条件、変換しないExceptionをどう伝播させるかをコードとテストで確定している
- 非同期Exceptionを通常のUseCase failureへ変換せず、必要なcleanupを行った後の再throw境界をコードとテストで確定している
- Operation root spanとUseCase spanのStatus・`error_type`が、それぞれが表す処理自身の最終結果とException方針に従って設定される
- Feature failureの失敗ログをUseCase spanへ記録し、Operation failureへ持ち上げたことだけを理由に同じ失敗ログをroot側へ重複記録しない
- logging failureを失敗した同じlogging経路へ再帰的に記録しない
- Operation成功 + logging成功、Operation失敗 + logging成功、Operation成功 + logging失敗、Operation失敗 + logging失敗の各組み合わせについて、呼び出し元へ返す最終結果と保持する失敗情報をコードとテストで確定している
- `Observation`・`Result`・`AppError`・旧`ExecutionFailure`相当の構造は、新しいOperation結果境界とLogging境界に必要なものだけが残っている
- 旧共通エラー契約や旧必須ログ合成構造を維持するためだけの型・変換・分岐が残っていない
- 正常、UseCase前失敗、Feature failure、UseCase後失敗、同期Exception、非同期Exceptionのcleanup、logging failure、Operation failureとlogging failureの重複について必要な自動テストがある
