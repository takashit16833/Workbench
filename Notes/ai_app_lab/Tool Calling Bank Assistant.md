# Tool Calling Bank Assistant

## 位置づけ

この資料は、Tool Calling（関数呼び出し）を学ぶための新しい学習プロジェクトの基本設計書である。

目的は、銀行アプリを完成させることではない。目的は、LLM が生成した Tool Call を、アプリケーション側が検証し、安全に実行または拒否する責任分界を理解・実装・検証することである。

この資料は、後続の AI や開発者が同じ前提で作業を進められるように、学習目的、スコープ、用語、状態、ツール仕様、バリデーション、レスポンス形式、テスト観点を明文化する。

## 学習目的

このプロジェクトで身につけることは次の通り。

- Tool Calling において、LLM は「実行者」ではなく「ツール呼び出し要求の提案者」であると説明できる。
- アプリケーション側が、ツール名、引数、対象、状態、実行可否を検証する必要性を説明できる。
- LLM が不正な tool call を出しても、アプリケーション側で安全に拒否できる設計を作れる。
- 正常系だけでなく、存在しない口座、残高不足、凍結口座、金額不正、未知ツール、引数不足などの異常系をテストできる。
- 成功・失敗を構造化 JSON として返し、後続の LLM 最終回答に使える形にできる。
- 状態を変更する処理では、成功時だけ状態を変更し、失敗時には状態を一切変更しないことを保証できる。

## このプロジェクトで扱う題材

題材は「簡易銀行口座の残高照会・送金アシスタント」とする。

ユーザーは自然言語で、残高照会や送金を依頼する。将来的には LLM がその依頼を tool call に変換する。ただし v1 では本物の LLM には接続しない。固定の assistant tool call JSON を入力として使い、アプリケーション側の検証・実行・拒否・状態更新だけを学習対象にする。

銀行という題材を選ぶ理由は、状態変更と安全性の重要性が明確だからである。送金は、不正な引数や矛盾した状態を許すと危険な操作になる。そのため、LLM の出力を信用せず、アプリケーション側で検証するという Tool Calling の責任分界を学びやすい。

## 重要な設計原則

### LLM は信頼しない

LLM が出した tool call は、ユーザー入力と同じく信頼できない外部入力として扱う。

LLM が次のような出力をする可能性を前提にする。

- 存在しないツール名を指定する。
- 必須引数を欠落させる。
- 引数名を間違える。
- 型の違う値を出す。
- 負数や 0 円の送金を要求する。
- 存在しない口座を指定する。
- 残高を超える送金を要求する。
- 凍結口座を送金元または送金先に指定する。
- 最終回答フェーズで再び tool call を要求する。

これらは LLM の失敗ではなく、アプリケーション側が防ぐべき通常の入力パターンとして扱う。

### アプリケーションが唯一の実行責任を持つ

LLM は送金を実行しない。LLM は「このツールを、この引数で呼びたい」という要求を出すだけである。

実際に送金するかどうか、状態を変更するかどうか、エラーを返すかどうかは、必ずアプリケーション側が決定する。

### v1 では LLM 接続をしない

v1 の目的は、LLM が自然言語から正しい tool call を出せるかを試すことではない。

v1 の目的は、固定 tool call JSON を入力にして、アプリケーション側の検証・実行・拒否・状態不変性を確認することである。

LLM 接続は v2 以降で扱う。

### モックデータを使う

v1 では本物のデータベース、銀行 API、認証、外部ネットワーク、永続化ストレージは使わない。

すべてメモリ上の固定データで表現する。

モックデータは手抜きではない。外部要因を消し、Tool Calling の責任分界だけを観察するための学習環境である。

## 用語

### Tool Call

LLM または固定テスト入力が出す「ツール呼び出し要求」。

例：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 3000
  }
}
```

### Tool

アプリケーション側に実装された決定論的な処理。

本プロジェクトでは `get_balance` と `transfer_funds` の 2 つだけを v1 の対象とする。

### Tool Result

ツールの実行結果。成功・失敗に関わらず、構造化 JSON として返す。

### State

アプリケーションが保持する口座データ。v1 ではメモリ上に保持する。

### Guardrail

LLM が出した tool call をそのまま実行せず、アプリケーション側で検証・拒否する安全装置。

## v1 のスコープ

v1 で実装・検証するもの。

- 固定モック口座データ。
- 固定 assistant tool call JSON の受け取り。
- tool 名の検証。
- arguments の構造検証。
- `get_balance` の実行。
- `transfer_funds` の実行。
- 成功時だけ残高を更新する処理。
- 失敗時に状態を一切変更しない保証。
- 成功・失敗の構造化 JSON レスポンス。
- 意味のある正常系・異常系テスト。

## v1 で扱わないもの

v1 では次を扱わない。

- 本物の LLM 接続。
- Ollama 接続。
- 自然言語から tool call を生成するプロンプト調整。
- 複数 tool call の同時実行。
- 複数ターンのエージェントループ。
- `tool_call_id` の厳密な追跡。
- transaction log の永続保存。
- 監査ログ。
- 認証。
- 権限管理。
- 実銀行 API。
- DB。
- Web UI。
- CLI の作り込み。
- 送金前のユーザー確認フロー。

これらは重要ではあるが、v1 の学習対象ではない。

## v1 の最小状態モデル

初期状態は次のモックデータとする。

```json
{
  "accounts": {
    "A001": {
      "holder_name": "Alice Smith",
      "balance": 15000,
      "status": "active",
      "currency": "JPY"
    },
    "A002": {
      "holder_name": "Bob Jones",
      "balance": 5000,
      "status": "active",
      "currency": "JPY"
    },
    "A003": {
      "holder_name": "Charlie Brown",
      "balance": 0,
      "status": "frozen",
      "currency": "JPY"
    }
  }
}
```

### 口座フィールド

- `holder_name`: 口座名義。v1 では表示用であり、送金可否には使わない。
- `balance`: 残高。整数。単位は JPY。
- `status`: 口座状態。v1 では `active` または `frozen` のみを扱う。
- `currency`: 通貨。v1 では全口座 `JPY` 固定とする。

### 状態変更のルール

- `get_balance` は状態を変更しない。
- `transfer_funds` は成功時のみ状態を変更する。
- `transfer_funds` が失敗した場合、すべての口座残高は処理前と同一でなければならない。
- 部分的な更新は禁止する。送金元だけ減って送金先が増えない状態や、その逆は許可しない。

## v1 のツール仕様

### get_balance

指定された口座の残高と状態を返す。

#### 入力

```json
{
  "account_id": "A001"
}
```

#### 必須引数

- `account_id`: string

#### 成功条件

- `account_id` が存在する。

#### 成功レスポンス

```json
{
  "status": "ok",
  "result": {
    "account_id": "A001",
    "holder_name": "Alice Smith",
    "balance": 15000,
    "status": "active",
    "currency": "JPY"
  }
}
```

#### エラー条件

- `account_id` がない。
- `account_id` が string ではない。
- 未定義の余分な引数がある。
- `account_id` が存在しない。

### transfer_funds

送金元口座から送金先口座へ指定金額を移動する。

#### 入力

```json
{
  "source_account_id": "A001",
  "target_account_id": "A002",
  "amount": 3000
}
```

#### 必須引数

- `source_account_id`: string
- `target_account_id`: string
- `amount`: integer

#### v1 では採用しない引数

- `reason`
- `memo`
- `currency`
- `request_id`
- `idempotency_key`

これらは v1 の本質ではないため、指定された場合は余分な引数として拒否する。

#### 成功条件

すべてを満たす場合だけ成功とする。

1. 必須引数がすべて存在する。
2. 余分な引数が存在しない。
3. `source_account_id` が string である。
4. `target_account_id` が string である。
5. `amount` が integer である。
6. `amount` が 1 以上である。
7. 送金元口座が存在する。
8. 送金先口座が存在する。
9. 送金元と送金先が異なる。
10. 送金元口座の status が `active` である。
11. 送金先口座の status が `active` である。
12. 送金元口座の残高が amount 以上である。

#### 成功時の状態変更

例として `A001` から `A002` に 3000 円送金する場合、初期状態から次のように変化する。

- A001: 15000 → 12000
- A002: 5000 → 8000

#### 成功レスポンス

```json
{
  "status": "ok",
  "result": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 3000,
    "source_balance": 12000,
    "target_balance": 8000,
    "currency": "JPY"
  }
}
```

## 共通エラーレスポンス形式

エラーは文字列だけで返さない。必ず構造化 JSON として返す。

```json
{
  "status": "error",
  "error_code": "insufficient_funds",
  "message": "残高が不足しています",
  "details": {
    "source_account_id": "A001",
    "current_balance": 15000,
    "requested_amount": 20000
  }
}
```

### 共通フィールド

- `status`: `error` 固定。
- `error_code`: プログラムで判定しやすい短い識別子。
- `message`: ユーザー向け説明に使える自然言語の短い説明。
- `details`: エラー内容を理解するための構造化データ。不要な場合は空オブジェクトでもよい。

## エラーコード一覧

v1 では次の error_code を使う。

### Tool Call レベル

#### unknown_tool

未知のツール名が指定された。

例：`delete_account` が指定された。

#### invalid_tool_arguments

arguments がオブジェクトではない、または tool call 全体の形が壊れている。

### get_balance

#### missing_account_id

`account_id` が存在しない。

#### invalid_account_id_type

`account_id` が string ではない。

#### unexpected_argument

未定義の引数が指定された。

#### account_not_found

指定された `account_id` が存在しない。

### transfer_funds

#### missing_source_account_id

`source_account_id` が存在しない。

#### missing_target_account_id

`target_account_id` が存在しない。

#### missing_amount

`amount` が存在しない。

#### invalid_source_account_id_type

`source_account_id` が string ではない。

#### invalid_target_account_id_type

`target_account_id` が string ではない。

#### invalid_amount_type

`amount` が integer ではない。

#### invalid_amount

`amount` が 1 未満である。

#### source_account_not_found

送金元口座が存在しない。

#### target_account_not_found

送金先口座が存在しない。

#### self_transfer_not_allowed

送金元と送金先が同一である。

#### source_account_frozen

送金元口座が凍結されている。

#### target_account_frozen

送金先口座が凍結されている。

#### insufficient_funds

送金元口座の残高が不足している。

## バリデーション順序

後続 AI は、特別な理由がない限り次の順序で検証する。

### get_balance

1. tool 名が `get_balance` であることを確認する。
2. arguments がオブジェクトであることを確認する。
3. 許可された引数が `account_id` だけであることを確認する。
4. `account_id` が存在することを確認する。
5. `account_id` が string であることを確認する。
6. 指定口座が存在することを確認する。
7. 残高情報を返す。

### transfer_funds

1. tool 名が `transfer_funds` であることを確認する。
2. arguments がオブジェクトであることを確認する。
3. 許可された引数が `source_account_id`, `target_account_id`, `amount` だけであることを確認する。
4. 必須引数がすべて存在することを確認する。
5. 各引数の型を確認する。
6. `amount` が 1 以上であることを確認する。
7. 送金元口座が存在することを確認する。
8. 送金先口座が存在することを確認する。
9. 送金元と送金先が異なることを確認する。
10. 送金元口座が `active` であることを確認する。
11. 送金先口座が `active` であることを確認する。
12. 残高が足りることを確認する。
13. 残高を更新する。
14. 成功レスポンスを返す。

この順序は、エラーを安定して再現し、テスト結果のぶれを減らすために決める。

## Tool Call 入力の v1 標準形

v1 の固定入力は次の形を標準とする。

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 3000
  }
}
```

LLM API によっては `tool_calls[].function.name` や `tool_calls[].function.arguments` のような形式になることがある。ただし v1 では API ごとの差異に深入りしない。v1 の内部入力は上記の単純な形に正規化されたものとして扱う。

API 固有形式の変換は v2 以降で扱う。

## v1 の処理フロー

v1 は次の流れで動く。

1. 固定 tool call JSON を入力として受け取る。
2. tool 名を確認する。
3. arguments の構造を確認する。
4. tool ごとのバリデーションを行う。
5. 成功条件を満たす場合だけ tool を実行する。
6. 成功時は状態を更新する。
7. 失敗時は状態を変更しない。
8. Tool Result を構造化 JSON で返す。

v1 では、Tool Result を LLM に戻して自然言語回答を生成するところまでは扱わない。ただし、将来 LLM に渡せる形式として構造化 JSON を返す。

## 将来の LLM 接続時のメッセージライフサイクル

v2 以降で本物の LLM に接続する場合、概念上は次の流れになる。

1. ユーザー入力を messages に追加する。
2. アプリケーションが tools 定義を LLM に渡す。
3. LLM が assistant メッセージとして tool call を返す。
4. アプリケーションが tool call を検証する。
5. 許可された場合だけ tool を実行する。
6. Tool Result を tool メッセージとして messages に追加する。
7. messages を再度 LLM に渡す。
8. LLM が最終回答を生成する。

重要なのは、4 と 5 は必ずアプリケーション側の責任で行うことである。

## テスト方針

テストは LLM の賢さではなく、アプリケーション側の安全性を確認する。

v1 のテストでは、自然言語プロンプトを入力しない。固定 Tool Call JSON を入力する。

### テストで必ず確認すること

- 正しい `get_balance` を実行できる。
- 正しい `transfer_funds` を実行できる。
- 成功時に残高が正しく変わる。
- 失敗時に残高が変わらない。
- 未知ツールを拒否できる。
- 必須引数不足を拒否できる。
- 余分な引数を拒否できる。
- 引数の型違いを拒否できる。
- 0 円送金を拒否できる。
- 負数送金を拒否できる。
- 存在しない送金元口座を拒否できる。
- 存在しない送金先口座を拒否できる。
- 自己送金を拒否できる。
- 凍結された送金元口座を拒否できる。
- 凍結された送金先口座を拒否できる。
- 残高不足を拒否できる。
- エラー時に `status`, `error_code`, `message`, `details` が返る。

## v1 テストケース一覧

### TC-01 残高照会成功

入力：

```json
{
  "name": "get_balance",
  "arguments": {
    "account_id": "A001"
  }
}
```

期待：

- `status` は `ok`。
- `balance` は 15000。
- 状態は変わらない。

### TC-02 送金成功

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 3000
  }
}
```

期待：

- `status` は `ok`。
- A001 の残高は 12000。
- A002 の残高は 8000。

### TC-03 未知ツール拒否

入力：

```json
{
  "name": "delete_account",
  "arguments": {
    "account_id": "A001"
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `unknown_tool`。
- 状態は変わらない。

### TC-04 必須引数不足

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "amount": 3000
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `missing_target_account_id`。
- 状態は変わらない。

### TC-05 余分な引数拒否

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 3000,
    "admin_override": true
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `unexpected_argument`。
- 状態は変わらない。

### TC-06 金額型不正

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": "3000"
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `invalid_amount_type`。
- 状態は変わらない。

### TC-07 金額不正

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": -500
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `invalid_amount`。
- 状態は変わらない。

### TC-08 送金元口座なし

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A999",
    "target_account_id": "A002",
    "amount": 1000
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `source_account_not_found`。
- 状態は変わらない。

### TC-09 送金先口座なし

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A999",
    "amount": 1000
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `target_account_not_found`。
- 状態は変わらない。

### TC-10 自己送金拒否

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A001",
    "amount": 1000
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `self_transfer_not_allowed`。
- 状態は変わらない。

### TC-11 凍結送金元拒否

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A003",
    "target_account_id": "A001",
    "amount": 100
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `source_account_frozen`。
- 状態は変わらない。

### TC-12 凍結送金先拒否

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A003",
    "amount": 100
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `target_account_frozen`。
- 状態は変わらない。

### TC-13 残高不足拒否

入力：

```json
{
  "name": "transfer_funds",
  "arguments": {
    "source_account_id": "A001",
    "target_account_id": "A002",
    "amount": 20000
  }
}
```

期待：

- `status` は `error`。
- `error_code` は `insufficient_funds`。
- details に `current_balance: 15000` と `requested_amount: 20000` が含まれる。
- 状態は変わらない。

## 実装フェーズ案

### Phase 1: v1 ドメインと Tool Call 処理

目的：LLM なしで、固定 tool call JSON を検証・実行できるようにする。

含めるもの：

- Account 状態。
- Tool Call 入力型。
- Tool Result 出力型。
- get_balance。
- transfer_funds。
- バリデーション。
- 状態不変性テスト。

完了条件：

- TC-01 から TC-13 が通る。
- 失敗時に状態が変わらないことをテストで確認できる。

### Phase 2: LLM API 形式への正規化

目的：実際の LLM API が返す tool_calls 形式を、v1 の内部 Tool Call 形式へ変換できるようにする。

含めるもの：

- API 形式の assistant message パース。
- `tool_calls[].function.name` などの API 形式から内部形式への変換。
- 壊れた assistant message の拒否。

含めないもの：

- 本物の LLM 呼び出し。
- プロンプト調整。

### Phase 3: LLM 接続

目的：本物の LLM に tools を渡し、tool call を返させる。

含めるもの：

- tools 定義。
- messages 構築。
- LLM 応答の取得。
- Phase 2 の正規化処理との接続。

注意：

この段階で初めて、LLM が正しい tool call を出せるかを観察する。Phase 1 と Phase 2 が通っていない状態で LLM 接続に進まない。

### Phase 4: Tool Result を LLM に戻して最終回答を作る

目的：実行結果またはエラー結果を LLM に戻し、自然言語の最終回答を生成する。

含めるもの：

- Tool Result の messages 追加。
- 最終回答取得。
- 最終回答フェーズでは追加 tool call を拒否する制御。

### Phase 5: 発展課題

候補：

- 複数 tool call の扱い。
- 送金前確認フロー。
- transaction log。
- 監査ログ。
- idempotency key。
- 認証・権限。
- RAG と組み合わせた規約確認。

## 後続 AI への作業ルール

この資料をもとに作業する AI は、次のルールを守る。

- いきなり LLM 接続から始めない。
- いきなり自然言語プロンプト調整を始めない。
- v1 では固定 tool call JSON を入力にする。
- v1 では外部 API、DB、認証を導入しない。
- v1 では `get_balance` と `transfer_funds` 以外のツールを追加しない。
- v1 では transaction log や reason を追加しない。
- 追加したくなった機能は、まず「なぜ v1 に必要か」を説明する。
- テストは仕様を守る意味のあるものにする。
- 失敗時に状態が変わらないことを必ずテストする。
- コードを提示するときは、設計理由、テスト、実行コマンドを一緒に示す。

## このプロジェクトで特に避けること

- LLM が正しい tool call を出したかどうかだけを見て満足すること。
- エラーをただの文字列で返すこと。
- 不正な tool call を「LLM が悪い」として片付けること。
- 検証を LLM に任せること。
- 成功時と失敗時の出力形式をばらばらにすること。
- 状態更新と検証を曖昧に混ぜること。
- 失敗時の状態不変性をテストしないこと。
- 学習初期に外部 API や DB を入れて原因切り分けを難しくすること。

## 完了の定義

v1 は次を満たしたら完了とする。

- 固定 Tool Call JSON を入力として受け取れる。
- 未知ツールを拒否できる。
- `get_balance` の正常系・異常系を処理できる。
- `transfer_funds` の正常系・異常系を処理できる。
- 成功時だけ状態が変わる。
- 失敗時には状態が変わらない。
- 成功・失敗を構造化 JSON で返せる。
- TC-01 から TC-13 のテストが通る。
- LLM なしでも Tool Calling におけるアプリケーション側の責任を説明できる。

## 最重要メッセージ

Tool Calling の本質は、LLM に関数を実行させることではない。

LLM に「どのツールをどの引数で使いたいか」を提案させ、その提案をアプリケーション側が検証し、許可された場合だけ実行し、その結果を LLM に戻すことである。

このプロジェクトの v1 は、その中でも特に重要な「アプリケーション側の検証・実行・拒否・状態保護」を、LLM なしで確実に身につけるための最小プロジェクトである。
