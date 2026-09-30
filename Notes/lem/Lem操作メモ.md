### 新規ファイル作成
`C-x C-f`
### LemのProject機能

| 操作                | Lem                             | Emacs `project.el` で近いもの      |
| ----------------- | ------------------------------- | ----------------------------- |
| 現在のプロジェクトを登録      | `C-x p s` (`project-save`)      | `project-remember-project` 相当 |
| 登録済みプロジェクトへ移動     | `C-x p p` (`project-switch`)    | `project-switch-project`      |
| プロジェクト内のファイルを開く   | `C-x p f` (`project-find-file`) | `project-find-file`           |
| プロジェクトのルートを開く     | `C-x p d`                       | `project-dired` に近い           |
| 登録解除              | `C-x p u` (`project-unsave`)    | `project-forget-project`      |
| そのプロジェクトのバッファを閉じる | `C-x p K`                       | `project-kill-buffers`        |
### directory-mode `C-x C-j`

| キー       | 操作             |
| -------- | -------------- |
| `Return` | ファイル / フォルダを開く |
| `^`      | 親フォルダへ         |
| `g`      | 再読み込み          |
| `m`      | 選択状態にする        |
| `u`      | 選択解除           |
| `D`      | 削除             |
| `C`      | コピー            |
| `R`      | 名前変更 / 移動      |
| `r`      | カーソル位置の1件を名前変更 |
| `+`      | フォルダ作成         |
| `q`      | 閉じる            |
