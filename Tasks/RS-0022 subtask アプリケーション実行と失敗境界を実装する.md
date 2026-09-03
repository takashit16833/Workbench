---
status: waiting
priority: medium
dateCreated: 2026-08-27T08:12:00+09:00
dateModified: 2026-09-03T11:31:04+09:00
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

- 確定済みのlogging再設計と利用者操作単位の実行追跡境界に合わせて、Operation全体の実行結果と最終失敗確定の責務を実装する
- UseCaseの`UseCaseResult`をHaskellの`Either failure result`として扱い、それを必要な場合だけ内包するOperation全体の結果を実装する
- Application側の共通`OperationFailure`へ`ToErrorType` instanceを持つ具体failure値を保持し、Operation境界を`Either OperationFailure result`として実装する
- UseCase前後の通常失敗・UseCase固有failure・Exceptionの扱いをApplication境界でコードとテストへ落とす
- `Observation`・`Result`・`AppError`を現在の責務から再評価し、不要な旧共通エラー・必須ログ合成構造を変更または削除する
- logging自身の失敗と`OperationFailure`が重なった場合のRAGScopeアプリケーション固有の扱いをコードとテストで確定する

## 目的

全体設計Subtaskで確定し、先行実装Subtaskでコード化したLogging / Tracing / Observability境界を前提に、アプリケーション実行・失敗境界を実装する。

利用者操作全体の実行境界と`OperationSuccess`・`OperationFailure`の意味は、RAGScope正本の`project-docs/design/利用者操作基本設計.md`を正本とする。Haskellでの結果表現、共通`OperationFailure`が具体failureを保持する方法、UseCase failureの受け渡し、`ToErrorType OperationFailure`の処理は`project-docs/design/利用者操作詳細設計.md`を正本とする。このSubtaskではWorkbenchだけに新しいOperation設計を確定せず、正本に反映された現在設計を実装する。正確なconstructor構文・関数・moduleはコードとテストを機械可読な正本とする。

UseCase実行結果は概念上`UseCaseResult = UseCaseSuccess | UseCaseFailure`とし、Haskell境界では`Either failure result`の`Right result`を`UseCaseSuccess`、`Left failure`を`UseCaseFailure`として扱う。`UseCaseFailure`は結果区分であり、`DenseSearchFailure`など具体的なUseCase固有failure型とは分ける。具体failure型はそのUseCaseが所有し、`RAGScope.<UseCase>.Failure`へ置く。

1回の利用者操作全体は概念上`OperationResult = OperationSuccess | OperationFailure`とし、必要な場合だけ内側に`UseCaseResult`を含む。Haskellの利用者操作境界は次の形とする。

```haskell
Either OperationFailure result
```

すべてのトップレベルな利用者操作は同じ`OperationFailure`型を使う。概念上の型は次の形である。

```haskell
data OperationFailure where
  OperationFailure
    :: ToErrorType failure
    => failure
    -> OperationFailure
```

UseCaseが`Left failure`を返した場合、Applicationは具体的な`failure`値を受け取った場所でUseCase span、失敗ログ、利用者向け結果など必要な処理を行い、利用者操作も失敗として終了する場合に`Left (OperationFailure failure)`を返す。UseCase前・UseCase後の通常failureも、その具体型を必要とする処理を終えた後に同じconstructorで包む。具体failureを先に`ErrorType`へ変換しない。

`ToErrorType OperationFailure`は`OperationFailure failure`から中のfailure値を取り出して`toErrorType failure`を実行する。利用者操作ごとのfailure ADTや、Input / UseCase / Outputなど処理段階を表すconstructorは作らない。`OperationFailure`の定義はUseCase固有failure型をimportせず、`ToErrorType`のために`RAGScope.ErrorType`へ依存する。

このSubtaskでは、上記の確定済み表現を前提に、`OperationFailure`の正確なmoduleとconstructor構文、Exception境界、logging failureとの最終結果合成を実装へ落とす。

Application / processの起動・終了など、利用者操作外のライフサイクル失敗を`OperationResult`へ含めない。

## 完了条件

- RAGScope正本の`project-docs/design/利用者操作基本設計.md`・`project-docs/design/利用者操作詳細設計.md`と実装・テストが矛盾していない
- 1回の利用者操作全体を`Either OperationFailure result`で表し、すべてのトップレベルな利用者操作が共通`OperationFailure`を使用している
- `OperationFailure`が`ToErrorType` instanceを持つ具体failure値を保持し、利用者操作ごとのfailure ADTやInput / UseCase / Outputなど処理段階ごとのconstructorを必要としない
- UseCaseの`Either failure result`について、`Right result`を`UseCaseSuccess`、`Left failure`を`UseCaseFailure`として扱い、これをOperation全体の結果と同一視せず内側の結果として受け取れる
- `UseCaseFailure`という結果区分と、`DenseSearchFailure`などUseCase固有の具体failure型を同一視せず、具体failure型をそのUseCaseが所有する`RAGScope.<UseCase>.Failure`へ配置できる
- UseCaseの`Left failure`を受け取った場所でUseCase failureとして必要な処理を行った後、具体failure値を失わず`Left (OperationFailure failure)`として返せる
- routing・command判定・入力変換・検証などUseCase前の通常failureをUseCase固有failureへ変換せず、必要な処理の後に`OperationFailure failure`として返せる
- `UseCaseSuccess`後のresponse / output側の結果処理で起きた通常failureを、必要な処理の後に`OperationFailure failure`として返せ、UseCase自身の`UseCaseSuccess`を変更しない
- `ToErrorType OperationFailure`が中のfailure値に`toErrorType`を適用し、同じUseCase failureをUseCase spanとroot spanで観測する場合に同じ`ErrorType`を得られる
- `OperationFailure`の定義がUseCase固有failure型をimportせず、`ragscope-application`から`ragscope-error`への直接依存だけで成立する
- Operation境界の外側で具体failure型に応じた分岐を要求せず、必要な失敗理由を`toErrorType operationFailure`から取得できる
- Application / process lifecycleのstartup・shutdown failureを`OperationResult`へ混在させない
- 同期Exceptionについて、どこで捕捉するか、通常の`OperationFailure`へ変換する条件、変換しないExceptionをどう伝播させるかをコードとテストで確定している
- 非同期Exceptionを通常の`UseCaseFailure`へ変換せず、必要なcleanupを行った後の再throw境界をコードとテストで確定している
- Operation root spanとUseCase spanのStatus・`error_type`が、それぞれ`OperationResult`・`UseCaseResult`とException方針に従って設定される
- UseCase固有failureの失敗ログをUseCase spanへ記録し、`OperationFailure`へ包んだことだけを理由に同じ失敗ログをroot側へ重複記録しない
- logging failureを失敗した同じlogging経路へ再帰的に記録しない
- `OperationSuccess` + logging成功、`OperationFailure` + logging成功、`OperationSuccess` + logging失敗、`OperationFailure` + logging失敗の各組み合わせについて、呼び出し元へ返す最終結果と保持する失敗情報をコードとテストで確定している
- `Observation`・`Result`・`AppError`・旧`ExecutionFailure`相当の構造は、新しいOperation結果境界とLogging境界に必要なものだけが残っている
- 旧共通エラー契約や旧必須ログ合成構造を維持するためだけの型・変換・分岐が残っていない
- 正常、UseCase前失敗、UseCase固有failure、UseCase後失敗、同期Exception、非同期Exceptionのcleanup、logging failure、`OperationFailure`とlogging failureの重複について必要な自動テストがある
