# jq リファレンス & Tips

```toc
minLevel: 2
maxLevel: 3
```

## 入力・整形

| やりたいこと | コマンド |
| --- | --- |
| JSON 全体を整形 | `jq '.' data.json` |
| 標準入力から読む | `cat data.json \| jq '.'` |
| macOS のクリップボードから読む | `pbpaste \| jq '.'` |
| 1 行に圧縮して出力 | `jq -c '.' data.json` |
| JSON の構文を確認 | `jq -e '.' data.json > /dev/null` |
| jq のバージョンを確認 | `jq --version` |

`.` は「入力された JSON 全体」。jq の式はシングルクォートで囲むのが基本。

## 基本構文

| 式 | 意味 |
| --- | --- |
| `.` | 現在の入力全体 |
| `.name` | `name` を取得 |
| `.metadata.class` | 入れ子の項目を取得 |
| `.["some-key"]` | 記号を含む項目名を取得 |
| `.[0]` / `.[-1]` | 配列の先頭／末尾 |
| `.[1:3]` | 配列の位置 1〜2 を取得（終端 3 は含まない） |
| `.[]` | 配列の各要素を個別に出力 |
| `.[] \| .name` | 各要素の `name` を取り出す（`.[].name` と同じ） |
| `.a, .b` | `a` と `b` を別々の結果として出力 |
| `[.[] \| .name]` | 複数の結果を 1 つの配列にする |
| `{name, age}` | 指定項目だけのオブジェクトを作る |
| `{user: .name}` | 項目名を `user` に変更して作る |

**`.[]` と `[.[]]` の違い**

```bash
echo '[1,2,3]' | jq '.[]'
# 1
# 2
# 3

echo '[1,2,3]' | jq -c '[.[]]'
# [1,2,3]
```

jq の `|` は「左の結果を右の式へ渡す」。シェルの `|` は「左のコマンドの出力を右のコマンドへ渡す」。

## 値の取得

以下では、`users.json` を入力として使用する。

```json
[
  {"name":"Alice","age":30,"team":"A"},
  {"name":"Bob","age":20,"team":"B"},
  {"name":"Carol","age":25,"team":"A"}
]
```

| 取得したいもの | コマンド／式 |
| --- | --- |
| 最初の人の名前 | `jq -r '.[0].name' users.json` |
| 全員の名前（1 行ずつ） | `jq -r '.[].name' users.json` |
| 全員の名前を配列で | `jq '[.[].name]' users.json` |
| 配列の要素数 | `jq 'length' users.json` |
| オブジェクトの項目名 | `jq '.[0] \| keys' users.json` |
| 入力の型を調べる | `jq 'type' users.json` |
| 項目の存在確認 | `jq '.[0] \| has("name")' users.json` |
| `null` や `false` の代替値 | `.name // "未設定"` |
| アクセス時のエラーを抑える | `.name?` |

`//` は左側が `null` または `false` の場合に右側を採用する。`0`、空文字列、空配列は代替しない。

## 条件抽出・変換

| 式 | 意味 |
| --- | --- |
| `select(.age >= 25)` | 条件に一致する要素を残す |
| `map(.name)` | 配列の各要素を名前に変換 |
| `map(select(.age >= 25))` | 条件に合う要素を配列で返す |
| `map({name, age})` | 各要素から必要な項目だけ残す |
| `map({user: .name})` | 各要素の項目名を変える |
| `map(.age + 1)` | 数値を計算して返す |

```bash
jq -c '.[] | select(.age >= 25)' users.json
# {"name":"Alice","age":30,"team":"A"}
# {"name":"Carol","age":25,"team":"A"}

jq -c 'map(select(.age >= 25))' users.json
# [{"name":"Alice","age":30,"team":"A"},{"name":"Carol","age":25,"team":"A"}]
```

`select` は条件に一致しない要素を出力しない。`map` は配列を受け取り、変換後の配列を返す。

条件には `==`、`!=`、`>`、`>=`、`<`、`<=`、`and`、`or`、`not` を使える。

## 並べ替え・集計

| 式 | 意味 |
| --- | --- |
| `length` | 件数 |
| `map(.age) \| add` | 年齢の合計 |
| `sort_by(.age)` | 年齢の昇順 |
| `sort_by(.age) \| reverse` | 年齢の降順 |
| `map(.team) \| unique` | 重複を除いたチーム一覧 |
| `group_by(.team)` | チーム別にグループ化 |

**条件に合う件数**

```bash
jq '[.[] | select(.age >= 25)] | length' users.json
# 2
```

**チームごとの件数**

```bash
jq -c 'group_by(.team) | map({team: .[0].team, count: length})' users.json
# [{"team":"A","count":2},{"team":"B","count":1}]
```

`unique` と `group_by` はキー順に並べ替えるため、元の出現順を維持する用途には注意。

## 出力形式

| やりたいこと | コマンド |
| --- | --- |
| JSON として出力 | `jq '.' users.json` |
| 文字列の引用符を外す | `jq -r '.[].name' users.json` |
| 1 件の JSON を 1 行にする | `jq -c '.[]' users.json` |
| TSV（タブ区切り） | `jq -r '.[] \| [.name, .age] \| @tsv' users.json` |
| CSV（カンマ区切り） | `jq -r '.[] \| [.name, .age] \| @csv' users.json` |
| 名前をカンマ区切りで連結 | `jq -r '[.[].name] \| join(", ")' users.json` |
| キーの並びを整える | `jq -S '.' users.json` |

`-r` が引用符を外すのは、出力が文字列の場合だけ。`@tsv` や `@csv` を使うときも `-r` を指定する。

## オプション

| 指定 | 意味 |
| --- | --- |
| `-r` | 文字列をそのまま出力 |
| `-c` | JSON を 1 件 1 行で出力 |
| `-s` | 複数の入力 JSON 値を配列にまとめる |
| `-n` | 入力を読まずに jq の式を実行 |
| `-R` | JSON ではなく通常のテキストとして入力を読む |
| `-e` | 最後の結果に応じて終了状態を設定（`false`／`null` は失敗扱い） |
| `-S` | オブジェクトのキーを整列 |
| `--arg name value` | 文字列を `$name` として渡す |
| `--argjson name json` | JSON 値を `$name` として渡す |
| `-f filter.jq` | 式をファイルから読み込む |

`-s` は**入力値そのもの**を配列化する。入力がすでに配列なら、`jq -s '.' users.json` は二重配列になる。

## Tips

### macOS のクリップボードで即座に試す

```bash
pbpaste | jq '.'
pbpaste | jq -r '.[].name'
```

クリップボードが JSON であることが前提。加工結果をコピーしたい場合は、例えば `jq -c '.' data.json | pbcopy` とする。

### 複数行の JSON をまとめる（JSON Lines）

```bash
printf '%s\n' '{"id":1}' '{"id":2}' | jq -sc '.'
# [{"id":1},{"id":2}]
```

`-s` で入力された複数の JSON 値を配列にまとめ、`-c` で 1 行に表示する。

### 普通のテキストを JSON として扱う

```bash
printf 'apple\nbanana\n' | jq -R '.'
# "apple"
# "banana"

printf 'apple\nbanana\n' | jq -Rsc 'split("\n") | map(select(length > 0))'
# ["apple","banana"]
```

`-R` はテキストを行単位で読む。`-Rs` は入力全体を 1 つの文字列として読む。

### 必要な項目だけを別のコマンドへ渡す

```bash
jq -r '.[].name' users.json | sort -u
```

`-r` で 1 行ずつ出力すれば、`sort` など通常のシェルコマンドと組み合わせやすい。

### 長い式をファイルに保存する

```jq
# filter.jq
group_by(.team)
| map({team: .[0].team, count: length})
```

```bash
jq -f filter.jq users.json
```

### シェルの値を安全に渡す

```bash
target='A'
jq --arg team "$target" 'map(select(.team == $team))' users.json
jq --argjson min 25 'map(select(.age >= $min))' users.json
```

`--arg` は文字列、`--argjson` は数値・真偽値・配列などの JSON 値として渡す。式に直接文字列を埋め込むより安全。

### 条件の結果をシェルの if で使う

```bash
if jq -e 'any(.[]; .age >= 30)' users.json >/dev/null; then
  echo '30歳以上がいる'
fi
```

`-e` により、最後の結果が `false`／`null` なら終了状態が失敗になる。

## よくあるエラー・注意点

| 症状 | 確認・対処 |
| --- | --- |
| `zsh: no matches found` | 式を `jq '.[].name' users.json` のように引用符で囲む |
| `Cannot index ...` | 現在の値の型を `type` で確認する |
| `null` が出る | 項目名や存在を `keys`・`has("name")` で確認する |
| `select` で何も出ない | 条件に一致する値がない可能性。`[.[] \| select(...)]` なら空配列で確認できる |
| `-r` でも JSON のまま | `-r` はオブジェクト・配列の JSON 表示をなくす指定ではない |
| `-s` で配列が二重になった | 入力が配列なら `-s` は不要な場合がある |
| JSON の構文エラー | 入力を `jq '.' data.json` で確認する |

公式仕様: [jq マニュアル](https://jqlang.org/manual/)。
