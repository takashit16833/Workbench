# GitHub Actions ワークフロー

## pushで実行

```yaml
name: Hello
on: push
jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello, world"
      - uses: actions/checkout@v4
```

| キー | 設定値 | 説明 |
|---|---|---|
| `name` | `Hello` | ワークフロー名 |
| `on` | `push` | プッシュ時に実行 |
| `jobs.hello` | — | ジョブID（`hello` は任意の名前） |
| `runs-on` | `ubuntu-latest` | ジョブの実行環境 |
| `steps` | — | 順番に実行する処理 |
| `run` | `echo "Hello, world"` | コマンドを実行 |
| `uses` | `actions/checkout@v4` | 既存のActionを利用し、コードを取得 |

## 手動実行（workflow_dispatch）

```yaml
name: Manual
on:
  workflow_dispatch:
    inputs:
      greeting:
        type: string
        default: Hello
        required: true
        description: A cheerful word
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - env:
          GREETING: ${{ inputs.greeting }}
        run: echo "$GREETING"
```

### 入力の設定（workflow_dispatch.inputs）

| キー | 設定値 | 説明 |
|---|---|---|
| `workflow_dispatch` | — | 手動実行を許可 |
| `greeting` | — | 入力項目名（任意） |
| `type` | `string` | 文字列を受け取る |
| `default` | `Hello` | 初期値 |
| `required` | `true` | 必須入力 |
| `description` | `A cheerful word` | 入力欄の説明 |

`${{ inputs.greeting }}` で入力値を参照する。シェルに直接埋め込まず、`env` で環境変数に渡して利用する。

### 選択式の入力（choice）

`workflow_dispatch.inputs` 内の抜粋：

```yaml
log-level:
  type: choice
  options: [info, warn, error]
```

手動実行画面で選択肢から値を選べる。

## 定期実行（schedule）

```yaml
name: Schedule
on:
  schedule:
    - cron: '*/15 * * * *'
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: date
```

15分ごとに実行。時刻の基準は既定でUTC（`timezone` で変更可能）。実行は遅れる場合がある。
