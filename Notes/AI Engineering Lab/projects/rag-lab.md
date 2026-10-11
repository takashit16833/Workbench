# rag-lab — 学習・評価の引き継ぎ

確認日: 2026-10-11
GitHub: https://github.com/takashit16833/rag-lab
確認したmain: `ac57cd9242c8299e9bd899778957b3e95a686a25`
重要: このメモはスナップショット。再開時は必ず最新mainとユーザーのローカル実行結果を確認する。

## 何を学んだか

- Markdown→チャンク分割→Embedding→PostgreSQL/pgvector→検索→LLM回答というRAGの最小構成を実装。
- Dense、PGroonga+MeCabによるSparse、RRFによるHybrid、Cross-EncoderによるRerankを比較。
- Haskellの`eval/Main.hs`に12問の`evaluationCases`。Hit@K、Recall@K、RR/MRR@Kを`src/Rag/Evaluation.hs`で算出。
- `Miss@1`と`Miss@2`を表示し、質問単位の失敗を確認。

## 実験観測（2026-10-11にユーザーが提示した実行結果）

検索の`K=1`成功数 / `K=2`成功数（12問）:
- Dense: 11/12, 11/12
- Sparse: 12/12, 12/12
- Hybrid: 11/12, 11/12
- Rerank: 11/12, 12/12

具体例:
- `DenseとSparseの結果を組み合わせる仕組みは？`: DenseとHybridはK=2で失敗。閾値を外した全チャンク順位の別調査ではDenseの正解は10位（類似度0.1790）。SparseはK=1成功。
- `検索では何を探しますか？`: RerankだけK=1失敗、正解は2位。
- 多言語Embeddingモデル`paraphrase-multilingual-MiniLM-L12-v2`を試した。別の質問`RRFはスコアと順位のどちらを使いますか？`は正解1位・類似度0.4867で、以前の閾値0.5を適用すると除外されていた。
- `src/Rag/Search.hs`に`minimumSimilarity = 0.5`の定義が残るが、確認したmainの`searchByVector` SQLには類似度閾値のWHEREがない。定義だけで閾値が有効だと判断しないこと。

## 解釈上の注意

- 数値の良し悪しは学習用の小規模12問に対する結果であり、未知の質問への一般化は未確認。
- Denseの低順位とHybridの順位悪化は同一質問で観察されたが、RRFの詳細な影響を断定するならSparse/Hybridの全順位を確認する。
- 改善策を選ぶ前に、何を優先して測るのかと、各実験の観測目的を明示する。
- ユーザーはrag-labの精度追求や完全な理解を必須とは考えていない。**次の学習テーマへの移行可**。会話の続きを自動的にrag-lab改善と決めつけない。

## 関連ノート（AIの書き込み禁止）

- `Notes/Zettelkasten/Dense Search.md`
- `Notes/Zettelkasten/Sparse Search.md`
- `Notes/Zettelkasten/Retrieval Evaluation.md`
