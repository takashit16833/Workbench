# GitHub Actions ワークフロー
```yml
name: Hello
on: push
jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello, world"
      - uses: actions/checkout@v4
```

| キー           | 設定値                   | 説明                        |
| ------------ | --------------------- | ------------------------- |
| `name`       | `Hello`               | ワークフローの名前                 |
| `on`         | `push`                | プッシュ時に実行する                |
| `jobs`       | —                     | ジョブを定義する                  |
| `jobs.hello` | —                     | ジョブID。`hello` は任意の名前      |
| `runs-on`    | `ubuntu-latest`       | ジョブを実行する環境                |
| `steps`      | —                     | 順番に実行する処理の一覧              |
| `run`        | `echo "Hello, world"` | 指定したシェルコマンドを実行する          |
| `uses`       | `actions/checkout@v4` | リポジトリのコードを取得するActionを実行する |

---
## マニュアル実行例

```yml
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
      - run: echo "${{ inputs.greeting }}"
```
### 1. ワークフローの基本設定

| キー                  | 設定値      | 説明        |
| ------------------- | -------- | --------- |
| `name`              | `Manual` | ワークフローの名前 |
| `on`                | —        | 実行条件を定義する |
| `workflow_dispatch` | —        | 手動実行を許可する |
### 2. 入力パラメータ（inputs）

`workflow_dispatch.inputs` に定義する設定です。

| キー            | 設定値               | 説明          |
| ------------- | ----------------- | ----------- |
| `greeting`    | —                 | 入力項目の名前（任意） |
| `type`        | `string`          | 入力値の型（文字列）  |
| `default`     | `Hello`           | 入力値の初期値     |
| `required`    | `true`            | 入力を必須にする    |
| `description` | `A cheerful word` | 入力欄に表示する説明  |
### 3. ジョブの設定（jobs）

| キー        | 設定値             | 説明           |
| --------- | --------------- | ------------ |
| `jobs`    | —               | ジョブを定義する     |
| `run`     | —               | ジョブID（任意の名前） |
| `runs-on` | `ubuntu-latest` | ジョブを実行する環境   |
### 4. ステップの設定（steps）

| キー      | 設定値                             | 説明            |
| ------- | ------------------------------- | ------------- |
| `steps` | —                               | 順番に実行する処理の一覧  |
| `run`   | `echo "${{ inputs.greeting }}"` | 入力された文字列を表示する |
### 特に重要な構文

```
${{ inputs.greeting }}
```

これはGitHub Actionsの式で、`inputs` に渡された `greeting` の値を参照します。

例えば `greeting` に `Good morning` と入力すれば、実行されるコマンドは次のようになります。

```
echo "Good morning"
```

つまり、`workflow_dispatch` と `inputs` を組み合わせることで、実行時に利用者が値を指定できるワークフローを作成できます。

なお、`inputs.greeting` をシェルコマンドへ直接埋め込む書き方は、入力内容によっては意図しないコマンド実行につながります。実際の運用では、環境変数 `env` を経由して渡す方法が安全です。

---
### choice型による列挙値の指定
```yml
inputs:
  log-level:
    type: choice # 入力パラメータを特定の値に制限
    options: # 受け付ける入力値を列挙
      - ﻿﻿info
      - ﻿﻿warn
      - ﻿﻿error
```
ブラウザから実行する場合、入力部分がドロップダウンになる。

---
### 定期実行
```yml
name: Schedule
on:
  schedule: # 定期実行イベント
    - cron：'*/15 * * * *1' #15分ごとに起動するcron 式
jobs:
  run:
    runs-on: ubuntu-latest
      steps:
        - run: date
```
タイムゾーンはUTC。時間ぴったりに起動するとは限らない。