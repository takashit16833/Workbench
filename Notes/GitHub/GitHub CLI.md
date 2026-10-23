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
| オプション            | 説明                             |
| ---------------- | ------------------------------ |
| `my-repo`        | 作成するリポジトリ名                     |
| `--public`       | 公開リポジトリとして作成する（誰でも閲覧可能）        |
| `--clone`        | 作成したリポジトリをローカル環境に複製する          |
| `--add-readme`   | `README.md` を自動生成し、最初のコミットに含める |
実行結果： GitHub上に公開リポジトリ `my-repo` が作成され、`README.md` が追加された状態でローカル環境にも複製されます。
### clone
```bash
gh repo clone takashit16833/my-repo
```
## プルリクエスト
### 作成
```bash
gh pr create --fill-first --web
```
|オプション|説明|
|---|---|
|`--fill-first`|現在のブランチの最初のコミットから、PRのタイトルと本文を自動設定する|
|`--web`|ブラウザでPR作成画面を開く|

実行結果： 現在のブランチを対象としたPR作成画面がブラウザで開きます。最初のコミットの情報がタイトルと本文に反映され、内容を確認・編集してからPRを作成できます。

補足： `--web` を指定すると、コマンド実行時点ではPRは作成されず、ブラウザ上で作成を確定します。
## ワークフロー
### 実行
```bash
gh workflow run manual.yml -f greeting=goodbye
```
### 実行中のワークフローのログをインタラクティブに確認
```bash
gh run watch
```
#### 実行結果
```text
❯ gh run watch
? Select a workflow run * Add Manual Workflow, Hello [main] 1s ago
✓ main Hello · 40033129942
Triggered via push less than a minute ago

JOBS
✓ hello in 5s (ID 120686018803)
  ✓ Set up job
  ✓ Run echo "Hello, world"
  ✓ Run actions/checkout@v4
  ✓ Post Run actions/checkout@v4
  ✓ Complete job

ANNOTATIONS
! Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
hello: .github#2

- "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026. For more information, see https://github.com/actions/runner-images/issues/14748"
hello: .github#1


✓ Run Hello (40033129942) completed with 'success'
```
### 終了しているワークフローの確認
```bash
gh run view
```