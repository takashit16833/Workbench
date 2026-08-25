# Branch
## リネーム

`old-branch` を `new-branch` に変更する。

**CLI**

1. **ローカルブランチ名を変更**

```bash
# そのブランチにいる場合
git branch -m new-branch

# 別のブランチにいる場合
git branch -m old-branch new-branch
```

2. **新しい名前でリモートへ push**

```bash
git push origin -u new-branch
```

`-u` を付けることで、ローカルの `new-branch` とリモートの `origin/new-branch` が追跡関係になる。

3. **リモートの古いブランチを削除**

```bash
git push origin --delete old-branch
```

**Lazygit**

1. `Local branches` で `old-branch` を選択
2. `R` — Rename branch
3. `new-branch` に変更
4. `u` — Upstream options
5. `u` — Unset upstream
6. `P` — Push
7. `origin` に `new-branch` を push して upstream に設定
8. `Remote branches` で `origin/old-branch` を選択
9. `d` — Delete

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

## ブランチ間の差分を見る

`main` から `feat/foo` で何が変わったかを見る。

**CLI**

```bash
# 修正したファイル一覧
git diff --name-only main...feat/foo

# 特定ファイルの修正内容
git diff main...feat/foo -- path/to/file

# 全ファイルの修正内容
git diff main...feat/foo
```

`...` は、2ブランチの共通の分岐点から `feat/foo` までの差分を見る。

**Lazygit**

1. `Local branches` で比較元のブランチを選択
2. `W` — Diff options
3. `Enter ref to diff` で比較先のブランチを指定
4. `Enter` — 修正したファイル一覧を表示
5. ファイルを選択すると修正内容を表示
6. `Esc` — 差分表示を終了

## 別ブランチの特定ファイルだけ取り込む

`feat/foo` の特定ファイルだけを `main` に取り込む。

**CLI**

```bash
git switch main
git checkout feat/foo -- path/to/file
```

変更はステージ済みになる。

**Lazygit**

1. `main` を checkout
    
2. `Local branches` で `main` を選択
    
3. `W` — Diff options
    
4. `Enter ref to diff` で `feat/foo` を指定
    
5. `Enter` — 差分ファイル一覧を表示
    
6. 対象ファイルを選択
    
7. `c` — Checkout file
    
8. 差分を確認して commit
    

対象ファイルはステージ済みになる。
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
