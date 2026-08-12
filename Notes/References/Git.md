# Branch

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

# Commit

## 複数コミットを1つにまとめる

直近3コミットを1つにまとめる。

```bash
git rebase -i HEAD~3
```

2つ目以降を `squash` に変更する。

```text
pick    abc1234 commit 1
squash  def5678 commit 2
squash  ghi9012 commit 3
```

保存後、コミットメッセージを編集する。

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
