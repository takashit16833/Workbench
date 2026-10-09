# PGroonga：日本語質問の単語抽出とOR検索

```toc
minLevel: 2
maxLevel: 2
```

## 目的・全体像

rag-lab の従来の `sparseSearch` は、`&@ 'ベクトル'` では検索できるが、`&@ 'pgvectorは何をするものですか？'` は0件だった。

そこで質問を「単語に分割 → 検索に使う語を選択 → OR検索」する。

```text
質問「pgvectorは何をするものですか？」
  ↓ TokenMecab：日本語を単語に分割
pgvector / は / 何 / を / する / もの / です / か / ？
  ↓ 品詞で絞る
pgvector / 何 / もの
  ↓ さらに不要な品詞細分類を除外（試験中）
pgvector
  ↓ PGroongaのOR検索
関連するchunks
```

※ 文書の索引を作るときの単語分割と、質問から検索語を抽出する処理は別。品詞だけでは重要語を完璧には選べない。

## SQLで使う関数・型

| 記法 | 入力 → 出力 | 意味 |
| --- | --- | --- |
| `pgroonga_tokenize` | `text`＋設定 → `json[]` | 単語ごとの情報をJSON要素の配列で返す |
| `unnest` | `anyarray → setof anyelement` | 配列の各要素を別々の行にする |
| `->>` | `json, text → text` | JSONの項目から文字列を取り出す |
| `->` | `json, text → json` | JSONの項目をJSONのまま取り出す |
| `array_agg` | 複数行の値 → 配列 | 行を再び配列にまとめる |
| `COALESCE` | 複数の値 → 最初の非NULL値 | 0件時のNULLを空配列に変える |
| `&@~` | `text, text → boolean` | `A OR B` などの検索式 |
| `&@|` | `text, text[] → boolean` | 配列中のいずれかの語でOR検索 |
| `pgroonga_score` | `tableoid, ctid → double precision` | 索引検索で得られたスコア |

`pgroonga_tokenize` の今回使う呼び方：

```sql
pgroonga_tokenize(対象文章, 'tokenizer', 'TokenMecab("include_class", true)')
-- 戻り値は json[]（JSON配列型ではなく、JSONを要素とするPostgreSQL配列）
```

## Step 12：分割方式を比較

```sql
-- 2文字単位を基本とする。日本語の品詞はわからない。
SELECT token ->> 'value' AS word
FROM unnest(
  pgroonga_tokenize('pgvectorは何をするものですか？',
                    'tokenizer', 'TokenBigram')
) AS t(token);

-- 単語と品詞を取得。
SELECT token ->> 'value' AS word,
       token -> 'metadata' ->> 'class' AS class
FROM unnest(
  pgroonga_tokenize('pgvectorは何をするものですか？',
                    'tokenizer', 'TokenMecab("include_class", true)')
) AS t(token);
```

実測：`TokenBigram` は `pg`、`gv`、`ve` … と分割。`TokenMecab` は `pgvector(名詞)`、`は(助詞)`、`何(名詞)` などに分割できた。

## Step 13：名詞だけ抽出

```sql
SELECT token ->> 'value' AS word
FROM unnest(
  pgroonga_tokenize('pgvectorは何をするものですか？',
                    'tokenizer', 'TokenMecab("target_class", "名詞")')
) AS t(token);
```

実測：`pgvector`、`何`、`もの`。**名詞だけでは不要な語も残る**。

## Step 14：OR検索

```sql
SELECT id, content
FROM chunks
WHERE content &@| ARRAY['pgvector', 'ベクトル']
ORDER BY id;
```

`&@|` は「いずれかの単語が一致したら取得」。`&@~ 'pgvector OR ベクトル'` と同等の条件になる。

実測：`docs/pgvector.md` の2チャンクがヒットした。

## Step 15：名詞の細分類を見る（未検証）

```sql
SELECT token ->> 'value' AS word,
       token -> 'metadata' ->> 'class' AS class,
       token -> 'metadata' ->> 'subclass0' AS subclass0,
       token -> 'metadata' ->> 'subclass1' AS subclass1
FROM unnest(
  pgroonga_tokenize('pgvectorは何をするものですか？',
                    'tokenizer', 'TokenMecab("include_class", true)')
) AS t(token);
```

`何` が「代名詞」、`もの` が「非自立」に分類されるかを実測する。辞書により結果は変わる。

## Step 16：不要な品詞を除外（未検証）

```sql
SELECT token ->> 'value' AS word
FROM unnest(
  pgroonga_tokenize(
    'pgvectorは何をするものですか？',
    'tokenizer',
    'TokenMecab("target_class", "-名詞/代名詞", "target_class", "-名詞/非自立", "target_class", "名詞")'
  )
) AS t(token);
```

`target_class` の `-` は指定した品詞・細分類の除外。目的は `pgvector` だけを残すこと。Step 15の実測結果と照合する。

## Step 17：単語を配列に戻す（未検証）

```sql
SELECT COALESCE(array_agg(token ->> 'value'), ARRAY[]::text[]) AS words
FROM unnest(
  pgroonga_tokenize('pgvectorは何をするものですか？',
                    'tokenizer', 'TokenMecab("target_class", "名詞")')
) AS t(token);
```

`json[]` → `unnest` でJSONの各行 → `->> 'value'` で `text` → `array_agg` で `text[]`。

`array_agg` は0件ならNULLを返すので、`COALESCE` で空の `text[]` にする。

## Step 18：単語抽出と検索をつなぐ（未検証）

```sql
WITH keywords AS (
  SELECT COALESCE(array_agg(token ->> 'value'), ARRAY[]::text[]) AS words
  FROM unnest(
    pgroonga_tokenize(
      'pgvectorは何をするものですか？',
      'tokenizer',
      'TokenMecab("target_class", "-名詞/代名詞", "target_class", "-名詞/非自立", "target_class", "名詞")'
    )
  ) AS t(token)
)
SELECT c.id, c.content,
       pgroonga_score(c.tableoid, c.ctid) AS score
FROM chunks AS c
CROSS JOIN keywords
WHERE c.content &@| keywords.words
ORDER BY score DESC, c.id ASC;
```

`WITH` で1行の検索語配列 `keywords.words` を作り、`CROSS JOIN` で各チャンクと組み合わせる。`&@|` でOR検索し、得点順に並べる。

注意：`pgroonga_score` は索引を使わない場合0になることがある。必要なら `EXPLAIN (ANALYZE, COSTS OFF)` で実行計画を確認する。

## 次の課題

- Step 15〜18の抽出語・検索結果・スコアを実測してからHaskellの `sparseSearch` に組み込む
- 単純な名詞抽出＋OR検索では、よく出る名詞による誤ヒットや、動詞を落とす問題がある。評価データを作って改善する

参考：
- [PGroonga：pgroonga_tokenize](https://pgroonga.github.io/ja/reference/functions/pgroonga-tokenize.html)
- [Groonga：TokenMecabの設定](https://groonga.org/ja/docs/reference/tokenizers/token_mecab.html)
- [PGroonga：&@|演算子](https://pgroonga.github.io/reference/operators/match-in-v2.html)
- [PGroonga：pgroonga_score](https://pgroonga.github.io/ja/reference/functions/pgroonga-score.html)
