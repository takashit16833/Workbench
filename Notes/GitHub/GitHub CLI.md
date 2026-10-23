# GitHub CLI

## リポジトリ

### 一覧

```bash
gh repo list
```

### 作成

```bash
gh repo create my-repo --public --clone --add-readme
```

| 引数・オプション | 説明 |
|---|---|
| `my-repo` | リポジトリ名 |
| `--public` | 公開リポジトリを作成 |
| `--clone` | 作成後にローカルへ複製 |
| `--add-readme` | `README.md` を作成し、最初のコミットに含める |

### 複製

```bash
gh repo clone takashit16833/my-repo
```

## プルリクエスト

### 作成

```bash
gh pr create --fill-first --web
```

| オプション | 説明 |
|---|---|
| `--fill-first` | 最初のコミットからPRのタイトルと本文を補完 |
| `--web` | ブラウザでPR作成画面を開く |

PRはブラウザ上で確定する。

## ワークフロー

### 手動実行

```bash
gh workflow run manual.yml -f greeting=goodbye
```

`workflow_dispatch` の入力 `greeting` に `goodbye` を渡す。

### 実行状況の監視

```bash
gh run watch
```

対象の実行を選択し、完了まで状態を確認する。

### 実行結果の確認

```bash
gh run view
```

実行を選択してジョブ・ログなどを確認する。
