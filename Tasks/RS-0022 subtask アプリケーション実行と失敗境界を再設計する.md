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
- UseCaseの`UseCaseResult`をHaskellの`Either failure result`として扱い、それを必要な場合だけ内包するOperation全体の結果を具体化する
- UseCase前後の通常失敗・UseCase固有failure・Exceptionの扱いをApplication境界で具体化する
- `Observation`・`Result`・`AppError`を現在の責務から再評価し、不要な旧共通エラー・必須ログ合成構造を変更または削除する
- logging自身の失敗と`OperationFailure`が重なった場合のRAGScopeアプリケーション固有の扱いをコードとテストで確定する

## 目的

旧logging基盤と一体化しているアプリケーション実行・失敗境界を、新しいLogging公開API、Operation root span / UseCase子spanの実行追跡境界、`UseCaseResult`を必要な場合だけ内包する`OperationResult`の結果関係に合わせて再構成する。

利用者操作全体の実行境界と`OperationSuccess`・`OperationFailure`の意味は、RAGScope正本の`project-docs/design/利用者操作基本設計.md`を正本とする。Haskellでの結果表現、Operation固有failureの構造、UseCase failureの保持・受け渡し、`ToErrorType`との接続は`project-docs/design/利用者操作詳細設計.md`を正本とする。このSubtaskではWorkbenchだけにOperation設計を確定せず、検討によって決まった現在設計を正本へ反映する。正確な具体型名・constructor名・関数・moduleはコードとテストを機械可読な正本とする。

前段の設計では、UseCase実行結果を概念上`UseCaseResult = UseCaseSuccess | UseCaseFailure`とし、Haskell境界では`Either failure result`の`Right result`を`UseCaseSuccess`、`Left failure`を`UseCaseFailure`として扱うことまで確定している。`UseCaseFailure`は結果区分であり、`DenseSearchFailure`など具体的なUseCase固有failure型とは分ける。具体failure型はそのUseCaseを所有するFeatureが持つ。

1回の利用者操作全体は概念上`OperationResult = OperationSuccess | OperationFailure`とし、必要な場合だけ内側に`UseCaseResult`を含む。Haskellの利用者操作境界は`Either operationFailure result`で表し、共通`OperationResult` ADTは導入しない。`operationFailure`は全Operation共通型ではなく、利用者操作ごとに実際に発生し得る具体failureを列挙した直和型とする。UseCaseの具体failureは`ErrorType`へ変換してから持ち上げず、Operation固有failureのconstructorで包んで保持する。Operation固有failureの`ToErrorType`は、内包する具体failureの`ToErrorType`へ委譲する。

このSubtaskでは、上記の確定済み表現を前提に、各Operationで使う具体型名・constructor・module、Exception境界、logging failureとの最終結果合成を実装へ落とす。

Application / processの起動・終了など、利用者操作外のライフサイクル失敗を`OperationResult`へ含めない。

## 完了条件

- RAGScope正本の`project-docs/design/利用者操作基本設計.md`・`project-docs/design/利用者操作詳細設計.md`と実装・テストが矛盾していない
- 1回の利用者操作全体を`Either operationFailure result`で表し、各Operation固有failure型の正確な型名・constructor・module配置をコードとテストで確定している
- UseCaseの`Either failure result`について、`Right result`を`UseCaseSuccess`、`Left failure`を`UseCaseFailure`として扱い、これをOperation全体の結果と同一視せず内側の結果として受け取れる
- `UseCaseFailure`という結果区分と、`DenseSearchFailure`などUseCase固有の具体failure型を同一視せず、具体failure型をそのUseCaseを所有するFeatureへ配置できる
- UseCaseの`Left failure`を`ErrorType`へ潰さず、Operation固有failureの対応constructorで具体failure値を保持したまま`OperationFailure`の原因として引き渡せる
- routing・command判定・入力変換・検証などUseCase前の通常失敗をUseCase固有failureへ変換せず、Operation固有failureの具体constructorとして扱える
- `UseCaseSuccess`後のresponse / output側の結果処理で起きた通常失敗をOperation固有failureの具体constructorとして扱え、UseCase自身の`UseCaseSuccess`を変更しない
- Application / process lifecycleのstartup・shutdown failureを`OperationResult`へ混在させない
- Operation固有failureが`error_type`として観測される場合、`ToErrorType` instanceが各constructorの内包failureへ委譲し、同じ原因をUseCase spanとroot spanで同じ`ErrorType`として扱える
- 同期Exceptionについて、どこで捕捉するか、通常の`OperationFailure`へ変換する条件、変換しないExceptionをどう伝播させるかをコードとテストで確定している
- 非同期Exceptionを通常の`UseCaseFailure`へ変換せず、必要なcleanupを行った後の再throw境界をコードとテストで確定している
- Operation root spanとUseCase spanのStatus・`error_type`が、それぞれ`OperationResult`・`UseCaseResult`とException方針に従って設定される
- UseCase固有failureの失敗ログをUseCase spanへ記録し、`OperationFailure`の原因へ持ち上げたことだけを理由に同じ失敗ログをroot側へ重複記録しない
- logging failureを失敗した同じlogging経路へ再帰的に記録しない
- `OperationSuccess` + logging成功、`OperationFailure` + logging成功、`OperationSuccess` + logging失敗、`OperationFailure` + logging失敗の各組み合わせについて、呼び出し元へ返す最終結果と保持する失敗情報をコードとテストで確定している
- `Observation`・`Result`・`AppError`・旧`ExecutionFailure`相当の構造は、新しいOperation結果境界とLogging境界に必要なものだけが残っている
- 旧共通エラー契約や旧必須ログ合成構造を維持するためだけの型・変換・分岐が残っていない
- 正常、UseCase前失敗、UseCase固有failure、UseCase後失敗、同期Exception、非同期Exceptionのcleanup、logging failure、`OperationFailure`とlogging failureの重複について必要な自動テストがある
