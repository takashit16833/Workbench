### LemのProject機能

| 操作                | Lem                             | Emacs `project.el` で近いもの      |
| ----------------- | ------------------------------- | ----------------------------- |
| 現在のプロジェクトを登録      | `C-x p s` (`project-save`)      | `project-remember-project` 相当 |
| 登録済みプロジェクトへ移動     | `C-x p p` (`project-switch`)    | `project-switch-project`      |
| プロジェクト内のファイルを開く   | `C-x p f` (`project-find-file`) | `project-find-file`           |
| プロジェクトのルートを開く     | `C-x p d`                       | `project-dired` に近い           |
| 登録解除              | `C-x p u` (`project-unsave`)    | `project-forget-project`      |
| そのプロジェクトのバッファを閉じる | `C-x p K`                       | `project-kill-buffers`        |