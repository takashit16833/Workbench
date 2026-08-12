# Branch
## リネーム
1. **ローカルブランチ名を変更**
```bash
# そのブランチにいる場合
git branch -m new-branch

# ブランチから変更する
git branch -m old-branch new-branch
```
2. **新しい名前でリモートへpush**
```bash
git push origin -u new-branch
```
`-u` を付けることで、ローカルの `new-branch` とリモートの `origin/new-branch` が追跡関係になる。

3. **リモートの古いブランチを削除**
```bash
git push origin --delete old-branch
```
## リモートブランチをローカルに作る

`origin/feat/foo` を追跡する `feat/foo` を作成する。

**CLI**

```bash
git branch --track feat/foo origin/feat/foo
```

現在のブランチは切り替わらない。

**Lazygit**

1. `Remote branches` で `origin/feat/foo` を選択
2. `n` — New branch
3. ブランチ名を確認して作成

Lazygit では作成後、そのブランチへ checkout する。
# Worktree

## リモートブランチから worktree を作る

`origin/feat/foo` を追跡するブランチと worktree を同時に作成する。

**CLI**

```bash
git worktree add --track -b feat/foo ../feat-foo origin/feat/foo
```

**Lazygit**

1. `Remote branches` で `origin/feat/foo` を選択
2. `w` — New worktree
3. `b` — New local branch + worktree
4. ブランチ名と作成先を確認
