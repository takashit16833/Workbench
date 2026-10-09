# jq リファレンス & Tips

```toc
title: 目次
minLevel: 2
maxLevel: 2
```
## Overview — jq の役割と考え方

### jq とは

**JSON を読み、必要な部分を取り出したり、形を変えたりするコマンド。**

```text
JSON → jq のフィルター → 結果
```

「JSON のパーサー」というだけではなく、抽出・絞り込み・整形・集計まで行える。

例:

```bash
echo '{"name":"pgvector","position":0}' | jq '.name'
# "pgvector"
```

### 覚えるべき考え方

jq の `.` は「**現在の入力**」。

```text
入力: {"name":"pgvector"}

.       → {"name":"pgvector"}   入力全体
.name   → "pgvector"            name を取り出す
```

jq は **1 つの入力から、0 個・1 個・複数個の結果を出せる**。この点が重要。

```bash
echo '[1,2,3]' | jq '.[]'
# 1
# 2
# 3
```

出力は「3 個の JSON 値」であり、`[1,2,3]` という 1 個の配列ではない。

## Quick Start — 導入と JSON の整形

### インストールと確認

```bash
brew install jq
jq --version
```

### JSON を見やすく整形

```bash
echo '{"a":1,"b":[2,3]}' | jq '.'
```

結果:

```json
{
  "a": 1,
  "b": [
    2,
    3
  ]
}
```

`jq '.'` は入力全体をそのまま出力する。表示を整えたいだけならこれで十分。

### ファイル・標準入力・クリップボード

```bash
jq '.' data.json                # ファイルを読む
cat data.json | jq '.'          # 標準入力から読む
pbpaste | jq '.'                # macOS のクリップボードを読む
jq -c '.' data.json             # 1 行の JSON にする
```

ファイルがあるなら `cat` を挟まず `jq '.' data.json` と書ける。

### このノートで使う例

以下を `tokens.json` として保存した想定で説明する。PGroonga の `TokenMecab("include_class", true)` によるトークン解析結果を元にした例。

```json
[
  {"value":"pgvector","position":0,"force_prefix_search":false,"metadata":{"class":"名詞","subclass0":"固有名詞","subclass1":"組織"}},
  {"value":"は","position":1,"force_prefix_search":true,"metadata":{"class":"助詞","subclass0":"係助詞"}},
  {"value":"何","position":2,"force_prefix_search":true,"metadata":{"class":"名詞","subclass0":"代名詞","subclass1":"一般"}},
  {"value":"を","position":3,"force_prefix_search":true,"metadata":{"class":"助詞","subclass0":"格助詞","subclass1":"一般"}},
  {"value":"する","position":4,"force_prefix_search":true,"metadata":{"class":"動詞","subclass0":"自立"}},
  {"value":"もの","position":5,"force_prefix_search":true,"metadata":{"class":"名詞","subclass0":"非自立","subclass1":"一般"}},
  {"value":"です","position":6,"force_prefix_search":true,"metadata":{"class":"助動詞"}},
  {"value":"か","position":7,"force_prefix_search":true,"metadata":{"class":"助詞","subclass0":"副助詞／並立助詞／終助詞"}},
  {"value":"？","position":8,"force_prefix_search":true,"metadata":{"class":"記号","subclass0":"一般"}}
]
```

以下の例で `tokens.json` とある部分は、クリップボードに同じ JSON をコピーしていれば `pbpaste | jq '...'` に置き換えてよい。

## Basic Syntax — 基本構文

### `.` — 現在の入力

```bash
jq '.' tokens.json
```

配列全体を出力する。

### `.[0]` / `.[]` — 配列の位置を指定／順番に取り出す

```bash
jq '.[0]' tokens.json   # 最初の要素（位置 0）
jq '.[-1]' tokens.json  # 最後の要素
jq '.[]' tokens.json    # 全要素を 1 件ずつ出力
```

`.[0]` は 1 件、`.[]` は 9 件の JSON オブジェクトを出力する。

### `.value` — オブジェクトの項目を取り出す

```bash
jq '.[0].value' tokens.json
# "pgvector"

jq '.[0].metadata.class' tokens.json
# "名詞"
```

名前に `-` などを含む項目は `.["some-key"]` と書ける。

### `|` — 左の結果を右へ渡す

```bash
jq '.[] | .value' tokens.json
```

```text
配列
  ↓ .[]
各トークン（9 件）
  ↓ .value
各トークンの文字列（9 件）
```

`.[].value` は `.[] | .value` の短い書き方。

**シェルの `|` と jq の `|` は別物**。

- `pbpaste | jq '...'` は、シェルがコマンド同士をつなぐ。
- `jq '.[] | .value'` は、jq の式の中で処理をつなぐ。

### `,` と `[ ... ]` — 複数結果と配列

```bash
echo '{"a":1,"b":2}' | jq '.a, .b'
# 1
# 2

jq '[.[].value]' tokens.json
# ["pgvector", "は", "何", ...]（実際は全 9 件）
```

`,` は複数の結果を続けて出す。`[ ... ]` は式が生んだ結果を **1 つの配列にまとめる**。

## Data Access — 配列とオブジェクトの値を取得

### 配列と切り出し

```bash
jq '.[1]' tokens.json       # 2 番目のトークン
jq '.[1:3]' tokens.json     # 位置 1 と 2（終了位置 3 は含まない）
jq 'length' tokens.json     # 9
```

### 入れ子のオブジェクト

```bash
jq '.[0].metadata.subclass0' tokens.json
# "固有名詞"

jq '.[0] | keys' tokens.json
# ["force_prefix_search","metadata","position","value"]
```

`keys` は項目名を配列で返す（文字列の項目名は並べ替えられる）。

### 項目がない場合

```bash
jq '.[6].metadata.subclass0' tokens.json
# null

jq '.[6].metadata.subclass0 // "未設定"' tokens.json
# "未設定"
```

`//` は左側が `null` または `false` のとき右側を採用する。`0`、`""`、`[]` は代替しない。

`?` は、型が違うなどのアクセス時のエラーを抑えたい場合に使える。

```bash
echo '[{"name":"A"},null]' | jq '.[] | .name?'
# "A"
# null
```

`?` が不要な場面で多用すると、想定外のデータを見逃すので注意。

## Filter & Transform — 絞り込みと変換

### `select` — 条件に一致したものだけ残す

```bash
jq '.[] | select(.position >= 7)' tokens.json
```

位置 7 と 8 のトークンが、それぞれ出力される。

```bash
jq '.[] | select(.metadata.class == "名詞") | .value' tokens.json
# "pgvector"
# "何"
# "もの"
```

条件には `==`、`!=`、`>`、`>=`、`<`、`<=`、`and`、`or`、`not` などが使える。

### `map` — 配列の各要素を変換

```bash
jq 'map(.value)' tokens.json
# ["pgvector", "は", "何", ...]（全 9 件）
```

`map(F)` は、基本的には `[.[] | F]` と同じ考え方。

### 絞り込んでも配列のまま返す

```bash
jq 'map(select(.metadata.class == "名詞"))' tokens.json
```

`.[] | select(...)` は複数の JSON 値を出力するが、`map(select(...))` は条件に合う要素を **配列 1 個**として出力する。

### 新しいオブジェクトを作る

```bash
jq 'map({word: .value, class: .metadata.class})' tokens.json
```

出力イメージ:

```json
[
  {"word":"pgvector","class":"名詞"},
  {"word":"は","class":"助詞"}
]
```

実際には残り 7 件も含まれる。

元の項目名と同じ名前なら `{value, position}` のように省略できる。

## Sort & Aggregate — 並べ替えと集計

### 件数を数える

```bash
jq 'length' tokens.json
# 9

jq '[.[] | select(.metadata.class == "名詞")] | length' tokens.json
# 3
```

### 並べ替える

```bash
jq 'sort_by(.position)' tokens.json           # 位置の昇順
jq 'sort_by(.position) | reverse' tokens.json # 位置の降順
```

`sort_by` は配列全体を受け取る。`.[]` で要素をばらしてから適用しない。

### 重複を除く

```bash
jq '[.[].metadata.class] | unique' tokens.json
```

異なる品詞名を配列で返す。`unique` は並べ替えも行うため、元の出現順は維持しない。

### 品詞ごとに集計する

```bash
jq 'group_by(.metadata.class) |
    map({class: .[0].metadata.class, count: length})' tokens.json
```

結果（並びは品詞名の並べ替え順）:

```json
[
  {"class":"助動詞","count":1},
  {"class":"助詞","count":3},
  {"class":"動詞","count":1},
  {"class":"名詞","count":3},
  {"class":"記号","count":1}
]
```

`group_by` は同じキーの要素を集めた「配列の配列」を返す。

## Output — 表示形式と出力

### JSON と生の文字列（`-r`）

```bash
jq '.[0].value' tokens.json
# "pgvector"

jq -r '.[0].value' tokens.json
# pgvector
```

`-r` は **結果が文字列の場合**、JSON の引用符を外して表示する。オブジェクトまで普通の文章に変換するわけではない。

### 1 行ずつ表示する

```bash
jq -r '.[].value' tokens.json
```

結果:

```text
pgvector
は
何
を
する
もの
です
か
？
```

### TSV（タブ区切り）

```bash
jq -r '.[] | [.position, .value, .metadata.class] | @tsv' tokens.json
```

`@tsv` は配列を 1 行のタブ区切りにする。`-r` を忘れると JSON 文字列として引用符で囲まれてしまう。

### CSV（カンマ区切り）

```bash
jq -r '.[] | [.position, .value, .metadata.class] | @csv' tokens.json
```

`@csv` は必要な引用符を付ける。区切り文字を単純に `join(",")` するより CSV に適している。

### 文字列を連結する

```bash
jq -r 'map(.value) | join("")' tokens.json
# pgvectorは何をするものですか？
```

## Options — コマンドのオプション

| オプション | 意味 | 例 |
| --- | --- | --- |
| `-r` | 文字列の引用符を外して出力 | `jq -r '.[].value'` |
| `-c` | JSON の出力を 1 件 1 行にする | `jq -c '.[]'` |
| `-s` | 入力された複数の JSON 値を 1 つの配列にまとめる | `jq -s '.'` |
| `-n` | 入力なしで jq を実行 | `jq -n '{ok: true}'` |
| `-R` | 入力を JSON ではなく文字列の行として読む | `jq -R '.'` |
| `-e` | 最後の出力が `false`／`null` かどうかなどを終了状態に反映 | `jq -e '.ok'` |
| `-S` | 出力するオブジェクトのキーを整列 | `jq -S '.'` |
| `--arg` | シェルから文字列を jq に渡す | `jq --arg x '名詞' '$x'` |
| `--argjson` | シェルから JSON 値を jq に渡す | `jq --argjson n 3 '$n'` |
| `-f` | jq の式をファイルから読む | `jq -f filter.jq data.json` |

補足: `-s` は **入力の JSON 値を配列化**するオプション。すでに `tokens.json` が配列なら `jq -s '.' tokens.json` の結果は `[[...]]` のような二重配列になる。

### `--arg` と `--argjson` の違い

```bash
jq --arg klass '名詞' 'map(select(.metadata.class == $klass))' tokens.json
jq --argjson min 5 'map(select(.position >= $min))' tokens.json
```

`--arg min 5` では `$min` は文字列 `"5"`。数値として渡すなら `--argjson`。

## Tips — 実用的な使い方

### macOS のクリップボードで即座に試す

```bash
pbpaste | jq .
pbpaste | jq -r '.[].value'
pbpaste | jq -r '.[] | [.value, .metadata.class] | @tsv'
```

注意: クリップボードの内容が正しい JSON であることが前提。`psql` の表形式の表示結果をそのまま渡しても JSON とは限らない。

### 複数行の JSON をまとめる（JSON Lines）

```bash
printf '%s\n' '{"id":1}' '{"id":2}' | jq -s '.'
# [{"id":1},{"id":2}]
```

通常の `jq '.'` は 2 つのオブジェクトを別々に出力。`-s` なら 1 つの配列になる。

### 普通のテキストを JSON として扱う

```bash
printf 'apple\nbanana\n' | jq -R '.'
# "apple"
# "banana"

printf 'apple\nbanana\n' | jq -R -s 'split("\n") | map(select(length > 0))'
# ["apple","banana"]
```

`-R` は行ごとに文字列化。`-R -s` は入力全体を 1 つの文字列として受け取る。

### 必要な項目だけを別のコマンドへ渡す

```bash
jq -r '.[].value' tokens.json | sort -u
```

左側の jq は文字列を 1 行ずつ出力し、右側の `sort -u` が重複を除く。ここでの `|` はシェルのパイプ。

### 長い式をファイルに保存する

```jq
# filter.jq
group_by(.metadata.class)
| map({class: .[0].metadata.class, count: length})
```

```bash
jq -f filter.jq tokens.json
```

### シェルの値を安全に渡す

```bash
klass='名詞'
jq --arg klass "$klass" 'map(select(.metadata.class == $klass))' tokens.json
```

jq の式をシェルの文字列展開で組み立てず、`--arg` で値を渡す。

## PGroonga Examples — トークン解析 JSON の実例

題材は上の `tokens.json`。各要素は `value`（トークン文字列）、`position`（位置）、`force_prefix_search`（接頭辞検索の指定）、`metadata.class`（品詞）などを持つ。

### トークンだけ抜き出す

```bash
jq -r '.[].value' tokens.json
```

`pgvector`、`は`、`何`……の順に出力。

### トークンと品詞を見やすく並べる

```bash
jq -r '.[] | [.position, .value, .metadata.class] | @tsv' tokens.json
```

```text
0	pgvector	名詞
1	は	助詞
2	何	名詞
3	を	助詞
4	する	動詞
5	もの	名詞
6	です	助動詞
7	か	助詞
8	？	記号
```

### 名詞だけを取り出す

```bash
jq -r '.[] | select(.metadata.class == "名詞") | .value' tokens.json
# pgvector
# 何
# もの
```

### 接頭辞検索が有効なものだけを取り出す

```bash
jq -r '.[] | select(.force_prefix_search) | .value' tokens.json
```

`false` の `pgvector` を除く 8 トークンが出力される。`select(.force_prefix_search)` は、真偽値の項目を条件としてそのまま使用する例。

### subclass0 が付いていないものを探す

```bash
jq -r '.[] | select(.metadata.subclass0 == null) | .value' tokens.json
# です
```

### 品詞別の件数を確認する

```bash
jq 'group_by(.metadata.class) |
    map({class: .[0].metadata.class, count: length})' tokens.json
```

トークン解析方法を変えたときに、品詞の分布を比較する材料になる。

## Troubleshooting — よくある問題

### `jq .[].value` がシェルで失敗する

`zsh` などが `[]` を特殊文字として解釈する場合がある。

```bash
jq '.[].value' tokens.json
```

**jq の式は基本的にシングルクォートで囲む**。

### `jq '.[]'` なのに配列にならない

`.[]` は結果を 1 件ずつ出力する。配列にしたいなら:

```bash
jq '[.[]]' tokens.json
```

ただし入力がすでに配列なら、単に `jq '.'` とすればよい。

### `-r` なのに JSON が出る

`-r` が引用符を外すのは文字列の結果だけ。例えば `jq -r '.[0]'` はオブジェクトを JSON として出力する。

### `null` が出る

項目が存在しない可能性がある。まず元のデータを確認する。

```bash
jq '.[6]' tokens.json
jq '.[6].metadata | keys' tokens.json
```

`null` を無条件に隠すのではなく、項目名の間違いか、省略可能な項目なのかを切り分ける。

### `Cannot index ...` と出る

現在の入力の型と、アクセス方法が合っていない可能性がある。

```bash
jq 'type' tokens.json       # "array"
jq '.[0] | type' tokens.json # "object"
```

例えば `.[] | .value` で「各オブジェクト」を処理している途中に、文字列へ再び `.value` を適用すると失敗する。

### 出力が何もない

`select` の条件に一致するものがないか、そもそも入力がない可能性がある。

```bash
jq 'length' tokens.json
jq '[.[] | select(.position > 100)]' tokens.json
# []
```

後者のように `[ ... ]` で包めば、該当 0 件も空配列として確認できる。

## Exercises — 練習問題と解答

問題は `tokens.json` を入力として考える。まずは解答を見ずに式を書いてみる。

### 問題

1. JSON を見やすく整形する。
2. 先頭のトークン `pgvector` だけを、引用符なしで表示する。
3. `value` を 9 件、1 行ずつ表示する。
4. `metadata.class` が `"助詞"` のトークンだけを、配列で返す。
5. `position` が 5 以上のトークンの件数を返す。
6. `value` をすべて連結し、元の質問文に戻す。

### 解答

```bash
# 1
jq '.' tokens.json

# 2
jq -r '.[0].value' tokens.json

# 3
jq -r '.[].value' tokens.json

# 4
jq 'map(select(.metadata.class == "助詞"))' tokens.json

# 5
jq '[.[] | select(.position >= 5)] | length' tokens.json
# 4

# 6
jq -r 'map(.value) | join("")' tokens.json
# pgvectorは何をするものですか？
```

## Cheat Sheet — 早見表と公式資料

| やりたいこと | jq の式 |
| --- | --- |
| 全体を整形 | `.` |
| 最初／最後の要素 | `.[0]` / `.[-1]` |
| 各要素を順番に出力 | `.[]` |
| 項目を取得 | `.name` |
| 入れ子の項目 | `.metadata.class` |
| 項目名の一覧 | `keys` |
| 要素数 | `length` |
| 条件に合うものだけ | `.[] | select(.position > 3)` |
| 条件に合うものを配列で | `map(select(.position > 3))` |
| 各要素を変換 | `map(.value)` |
| 必要な項目だけのオブジェクト | `map({value, position})` |
| 複数結果を配列化 | `[.[] | .value]` |
| キーで並べ替え | `sort_by(.position)` |
| 重複除去 | `unique` |
| 分類ごとにまとめる | `group_by(.metadata.class)` |
| 文字列を連結 | `map(.value) | join("")` |
| 欠けた項目の代替 | `.name // "未設定"` |
| 生の文字列で出力 | `jq -r '...'` |
| 1 行に圧縮して出力 | `jq -c '...'` |
| TSV／CSV | `@tsv` / `@csv` |

### 公式資料

- [jq 公式マニュアル](https://jqlang.org/manual/) — 構文・関数・オプションを網羅
- [jq 公式チュートリアル](https://jqlang.org/tutorial/) — 基本的な使い方
- [jq Play](https://play.jqlang.org/) — ブラウザ上で JSON と式を試せる

このノートは jq 1.7〜1.8 の基本機能を中心に記載している。実際に使っている版は `jq --version` で確認する。
