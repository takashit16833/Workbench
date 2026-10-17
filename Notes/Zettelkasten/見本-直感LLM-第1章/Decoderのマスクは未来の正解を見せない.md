# Decoderのマスクは未来の正解を見せない

> [!note] 読書ノートの見本
> 『Hands-On Large Language Models』第1章の読書と会話での理解を、自分の言葉で整理した仮のノートです。本文の直訳ではありません。

## 考え

生成用DecoderのMasked Self-attentionは、現在の位置から未来の位置を参照できないようにする。

例えば `Ik → hou → van → lama's` を学ぶとき、`van` の予測に未来の正解 `lama's` を使わせない。学習時には正解の文全体を一度に与えられるので、この制限が重要になる。

推論時は未来のトークンがまだ存在しないが、同じ「過去までを使う」という因果的な制約で生成する。

※ BERTの**隠れた単語を当てる学習**（Masked Language Modeling）とは別物。

## つながり

- [[Self-attentionは同じ系列の位置同士を参照する]]
- [[BERTは隠された単語を予測して学ぶ]]
- [[GPTは次のトークンを予測して文章を生成する]]

## 出典

『Hands-On Large Language Models』第1章（読書した範囲）
