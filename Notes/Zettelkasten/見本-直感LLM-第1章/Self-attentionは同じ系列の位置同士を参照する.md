# Self-attentionは同じ系列の位置同士を参照する

> [!note] 読書ノートの見本
> 『Hands-On Large Language Models』第1章の読書と会話での理解を、自分の言葉で整理した仮のノートです。本文の直訳ではありません。

## 考え

Self-attentionは、**同じ入力系列の各位置**から関連する情報を集めるAttentionである。翻訳でDecoderがEncoderの出力を参照するAttentionとは、参照先が異なる。

例えば `The animal ran because it was scared` では、`it` の表現を計算するときに `animal` の情報を利用できる。

EncoderのSelf-attentionでは通常、前後両方向の位置を参照できる。生成用Decoderでは未来の位置を隠す。

## つながり

- [[Attentionは必要な入力情報を選んで使う]]
- [[Decoderのマスクは未来の正解を見せない]]
- [[TransformerはRNNの順番待ちを減らす]]

## 出典

『Hands-On Large Language Models』第1章（読書した範囲）
