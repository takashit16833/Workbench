# 修正版：GitHub Actions イベント一覧
|イベント|説明|
|---|---|
|`branch_protection_rule`|ブランチ保護ルールが作成・変更・削除されたとき|
|`check_run`|個別のチェックが作成・再実行・完了されたときなど|
|`check_suite`|一連のチェックが完了したとき|
|`create`|ブランチやタグが作成されたとき|
|`delete`|ブランチやタグが削除されたとき|
|`deployment`|デプロイが作成されたとき|
|`deployment_status`|デプロイの状態が通知されたとき|
|`discussion`|Discussionsの議論が作成・変更されたときなど|
|`discussion_comment`|Discussionsのコメントが作成・編集・削除されたとき|
|`fork`|リポジトリがフォークされたとき|
|`gollum`|Wikiページが作成・更新されたとき|
|`image_version`|指定したイメージの新しいバージョンが利用可能になったとき|
|`issue_comment`|IssueやPRの会話欄にコメントが作成・編集・削除されたとき|
|`issues`|Issueが作成・編集・クローズされたときなど|
|`label`|リポジトリのラベルが作成・変更・削除されたとき|
|`merge_group`|マージキューで統合前のチェックが要求されたとき|
|`milestone`|マイルストーンが作成・変更・削除されたときなど|
|`page_build`|GitHub Pagesの公開元ブランチにプッシュされたとき|
|`public`|非公開リポジトリが公開されたとき|
|`pull_request`|PRが作成・更新・再オープンされたときなど|
|`pull_request_review`|PRのレビューが提出・編集・取り消されたときなど|
|`pull_request_review_comment`|PRのコード差分へのレビューコメントが作成・編集・削除されたとき|
|`pull_request_target`|PRに関するイベントを、統合先ブランチ側の設定で実行するとき|
|`push`|ブランチやタグがプッシュされたとき|
|`registry_package`|GitHub Packagesのパッケージが公開・更新されたときなど|
|`release`|Releaseが作成・公開・編集されたときなど|
|`repository_dispatch`|外部からAPI経由で実行が要求されたとき|
|`schedule`|指定した時刻・周期になったとき|
|`status`|コミットの状態が更新されたとき|
|`watch`|リポジトリにスターが付けられたとき|
|`workflow_call`|別のワークフローから呼び出されたとき|
|`workflow_dispatch`|GitHub画面・CLI・APIから手動実行されたとき|
|`workflow_run`|別のワークフローが開始・完了したときなど|
