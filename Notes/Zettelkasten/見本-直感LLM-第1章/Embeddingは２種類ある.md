# Embeddingは２種類ある
## 入力Embedding
Tokenizerが文章を受け取り、トークンとトークンIDを出力する。
そのトークンIDがLLMに入力され、トークンIDに対応する入力EmbeddingをEmbedding行列から取得する。

## 文脈を考慮したEmbedding
入力EmbeddingはTransformerのEncoderブロックを順番に通過する。
この過程で周囲のトークン情報を取り込む。

最終的に、文脈を考慮したEmbeddingが生成される。