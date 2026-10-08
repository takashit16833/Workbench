# rag-lab 設計図

> 正確さよりも、まず全体像をつかむためのノート。

## いま何ができているか

rag-lab は、最小構成のRAGとして一通り動いている。

大きく分けると、

```text
文書を登録する
        ↓
質問に近い文書を探す
        ↓
見つけた文書をLLMへ渡す
        ↓
回答を作る
```

という仕組み。

---

## 全体図

```text
                    ┌──────────────┐
                    │ Markdown文書 │
                    └──────┬───────┘
                           │
                           ▼
                     チャンク分割
                           │
                           ▼
                    Embedding生成
                           │
                           ▼
              ┌─────────────────────┐
              │ PostgreSQL + pgvector│
              │                     │
              │ source              │
              │ content             │
              │ embedding           │
              └──────────┬──────────┘
                         │
                         │ 検索
                         │
質問                     │
 │                       │
 ▼                       │
Embedding生成             │
 │                       │
 └───────────────┬───────┘
                 ▼
         コサイン類似度で検索
                 │
                 ▼
              Top-K
                 │
                 ▼
              Context
                 │
                 ▼
          Ollama / Qwen3
                 │
                 ▼
               回答
```

Haskellが全体の司令塔で、Python・PostgreSQL・Ollamaをつないでいる。

---

## 文書を登録するとき

実行例:

```bash
cabal run rag-lab -- index docs/sample.md
```

流れ:

```text
Markdown
   ↓
見出しを読む
   ↓
文章をチャンクへ分割
   ↓
各チャンクに見出しを付ける
   ↓
Pythonへまとめて渡す
   ↓
SentenceTransformer
   ↓
Embedding
   ↓
PostgreSQLへ保存
```

現在は、例えば

```markdown
# RAG

検索では質問に近い文章を探します。
```

を、

```text
# RAG
検索では質問に近い文章を探します。
```

という1チャンクとして保存している。

見出しも一緒にEmbeddingすることで、

> 「検索では〜」だけではなく、「RAGについての検索の話」

という情報も残すイメージ。

---

## 質問するとき

実行例:

```bash
cabal run rag-lab -- query "RAGではどうやって文章を探しますか？"
```

流れ:

```text
質問
 ↓
Embedding生成
 ↓
pgvectorへ渡す
 ↓
保存済みチャンクとの距離を計算
 ↓
近いものを上位から取る
 ↓
Contextへまとめる
 ↓
Qwen3へ
   「このContextだけを使って答えて」
 ↓
回答
```

今は、

- Top 2
- cosine similarity 0.5以上

を採用している。

0.5は絶対的な正解ではなく、学習用の仮の値。

---

# Retrieval

RAGの中で、

> 質問に関係する文章を探す部分

が Retrieval。

現在の rag-lab は **Dense Search** だけを使っている。

```text
RAG
├── Retrieval
│   └── Dense Search   ← 現在ここまで完成
│
└── Generation
    └── Qwen3
```

---

# Dense Search

## 何をしているか

```text
文章
 ↓
Embedding
 ↓
384個の数字
```

質問も同じように、

```text
質問
 ↓
Embedding
 ↓
384個の数字
```

へ変換する。

あとは、

```text
質問ベクトル
     ↕
文書ベクトル
```

の向きがどれくらい近いかをコサイン類似度で調べる。

つまり、

> 「意味が近い文章は、Embedding空間でも近くなる」

ことを利用した検索。

コサイン類似度の計算自体はかなり機械的。

重要なのは、

> そもそも良いEmbeddingが作れているか

の方。

現在は、

```text
sentence-transformers/all-MiniLM-L6-v2
```

を使っている。

これは学習用として採用しているモデルなので、将来は日本語・多言語向けEmbeddingモデルとの比較もしたい。

---

# これから作る検索

最終的にはこうしたい。

```text
                       ┌─ denseSearch ── 意味で探す
質問 ──────────────────┤
                       └─ sparseSearch ─ 単語で探す
                                │
                                ▼
                          hybridSearch
                                │
                                ▼
                       候補を多めに集める
                                │
                                ▼
                             rerank
                                │
                                ▼
                           最終 Top-K
                                │
                                ▼
                            Context
                                │
                                ▼
                              Qwen3
```

役割を一言で言うと、

```text
denseSearch   意味で探す
sparseSearch  単語で探す
hybridSearch  2つの検索結果を合体する
rerank        候補をもう一度よく読んで順位を付け直す
```

---

# sparseSearch

Dense Searchは意味に強い。

例えば、

```text
質問:
PostgreSQLでベクトル検索するには？

文書:
pgvectorはPostgreSQLでベクトルを保存・検索するための拡張です。
```

のように、完全に同じ文章でなくても近いものを探せる。

一方で、製品名・関数名・エラーコードなどは、

```text
pgvector
HLS
SQLSTATE 22P02
```

のように **その単語そのもの** が重要なことがある。

そこでSparse Searchも使う。

イメージ:

```text
Dense
  「意味が近い？」

Sparse
  「同じ重要単語が入っている？」
```

まずはPostgreSQLの全文検索を使って仕組みを理解する予定。

ただし、日本語の単語分割は英語ほど単純ではない。

そのため、

> まずSparse Searchの仕組みを理解する
> ↓
> 日本語検索を本格化するときに方式を選ぶ

という順番にする。

日本語対応では PGroonga なども候補になるが、ここではまだ決めない。

---

# hybridSearch

DenseとSparseには、それぞれ得意・不得意がある。

```text
Dense
  意味には強い
  固有名詞などを落とすことがある

Sparse
  単語には強い
  言い換えには弱い
```

そこで両方使う。

```text
denseSearch
  1位 A
  2位 B
  3位 C

sparseSearch
  1位 C
  2位 D
  3位 A
```

これをまとめて、

```text
hybridSearch
  A
  C
  B
  D
```

のような候補一覧を作る。

最初は **RRF (Reciprocal Rank Fusion)** を使う予定。

名前は難しいが、考え方は単純。

> DenseでもSparseでも上位にいた候補を高く評価する。

Denseの0.8とSparseの0.8は同じ意味の点数ではないので、

> 生のscoreを無理に足すのではなく、順位を使って合体する

と考えると分かりやすい。

---

# rerank

Hybrid Searchまでで、

> それっぽい候補を広く集める

ところまでできる。

でも、検索は速さを優先するので順位が完璧とは限らない。

そこで最後に rerank する。

```text
検索で集めた候補

A
B
C
D
E
F
G
H
I
J
 ↓
rerankerが
「質問と各文章」をもう一度詳しく見る
 ↓
C
A
F
B
...
```

Dense Searchでは、

```text
質問 → ベクトル
文書 → ベクトル

ベクトル同士を比較
```

だった。

rerankではイメージとして、

```text
質問 + 文書A → この文書はどれくらい答えに近い？
質問 + 文書B → この文書はどれくらい答えに近い？
質問 + 文書C → この文書はどれくらい答えに近い？
```

と、質問と文書をセットで詳しく評価する。

そのため、

- 検索より遅い
- でも細かく判断できる

という特徴がある。

だから、

```text
DB全件
 ↓
Dense / Sparseで高速に絞る
 ↓
候補10〜20件
 ↓
rerank
 ↓
最終2〜5件
```

のように使う。

実装時はPython側でCross-Encoder系のrerankerを使う想定。

具体的なモデルは、その段階で日本語対応も含めて選ぶ。

---

# 今後の組み込み計画

## Step 1: denseSearch

現在の `searchChunks` を整理して、

```haskell
denseSearch
```

という名前にする。

ここは今ある機能を整理するだけ。

```text
質問Embedding
 ↓
pgvector
 ↓
cosine similarity
 ↓
Dense候補
```

---

## Step 2: sparseSearch

別ルートで単語検索を作る。

```text
質問
 ↓
PostgreSQL全文検索
 ↓
Sparse候補
```

まずDenseとは混ぜず、

```text
Denseの結果
Sparseの結果
```

をそれぞれ画面に出して違いを見る。

---

## Step 3: hybridSearch

```text
denseSearch ──┐
              ├─ RRF ─→ Hybrid候補
sparseSearch ─┘
```

を作る。

この段階ではまだLLMへ渡さず、

> 検索順位がどう変わるか

を見ることを優先する。

---

## Step 4: rerank

Hybrid Searchから候補を多めに取る。

例えば、

```text
Hybrid Top 10
 ↓
reranker
 ↓
Top 2
```

にする。

最初の検索順位とrerank後の順位を両方表示する。

```text
Hybrid:  1位 A
Rerank:  3位 A

Hybrid:  4位 C
Rerank:  1位 C
```

のように見えるようにすると、rerankの意味が分かりやすい。

---

## Step 5: Context → LLM

最後に、

```text
Dense
  +
Sparse
  ↓
Hybrid
  ↓
Rerank
  ↓
Top-K
  ↓
Context
  ↓
Qwen3
```

までつなぐ。

この状態が、次の目標となるRAG。

---

# 最終的に目指す形

```text
                       ┌──────────────────┐
                       │ Markdown documents│
                       └────────┬─────────┘
                                │
                         chunk + embedding
                                │
                                ▼
                      PostgreSQL / pgvector
                                │
                                │
                         ┌──────┴──────┐
                         │             │
                         ▼             ▼
                    denseSearch   sparseSearch
                         │             │
                         └──────┬──────┘
                                ▼
                          hybridSearch
                                │
                                ▼
                              rerank
                                │
                                ▼
                             Top-K
                                │
                                ▼
                             Context
                                │
                                ▼
                         Ollama / Qwen3
                                │
                                ▼
                              Answer
```

---

# 覚えておきたいこと

RAGの検索部分は、

```text
良いEmbedding
+
良いチャンク
+
良い検索
+
良い順位付け
```

で決まる。

今回のrag-labでは、まず

```text
Embedding
+
Dense Search
```

を自分で作って仕組みを確認した。

これから、

```text
Sparse
↓
Hybrid
↓
Rerank
```

を一つずつ足していく。

最初から全部混ぜず、

> 1個追加するたびに、検索結果がどう変わったかを見る

ことを優先する。
