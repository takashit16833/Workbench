# TokenizerとEmbedding層は別の仕事をする

> [!note] 読書ノートの見本
> 『Hands-On Large Language Models』第1章の読書と会話での理解を、自分の言葉で整理した仮のノートです。本文の直訳ではありません。

## 考え

自然言語をニューラルネットワークへ渡す前には、少なくとも二つの別の処理がある。

- **Tokenizer**：文章をトークンに分け、各トークンをIDにする。
- **Embedding層**：IDに対応する学習済みの数値ベクトルを取り出す。

例えば `I love llamas` は、トークンIDの列を経て、トークンごとの初期Embeddingの列になる。**Tokenizer自体がEmbeddingを計算するわけではない**。

※ Embedding層という呼び方は、読書中の図を理解するために補った一般的な名称。

## つながり

- [[同じ単語でも文脈によって表現を変える必要がある]]
- [[Encoderブロックを重ねて表現を加工する]]

## 出典

『Hands-On Large Language Models』第1章（読書した範囲）
