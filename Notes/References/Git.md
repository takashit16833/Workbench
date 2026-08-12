# branch
##### `origin/feat/foo` を追跡するローカルブランチ `feat/foo` を作成する
###### コマンド
```bash
git branch --track feat/foo origin/feat/foo
```
###### Lazygit
1. `Remote branches` を開く
2. `origin/feat/foo` を選択
3. `n`
4. ローカルブランチ名を確認して作成
# worktree
##### `origin/feat/foo` を追跡する新規ブランチと worktree を同時に作成する
###### コマンド
```bash
git worktree add --track -b feat/foo ../feat-foo origin/feat/foo
```
###### Lazygit
1. `Remote branches` を開く
2. `origin/feat/foo` を選択
3. `w` — New worktree
4. `b` — New local branch + worktree
5. ブランチ名 `feat/foo` を確認
6. worktree の作成先を選択