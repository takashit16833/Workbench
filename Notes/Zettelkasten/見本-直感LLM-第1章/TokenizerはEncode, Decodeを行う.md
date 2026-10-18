# TokenizerはEncode, Decodeを行う
Tokenizerは、入力文章をトークンIDに変換するEncodeと、トークンIDを文章に戻すDecodeを行う。

なお、Embeddingへの変換は行わない。これはEmbedding層の役割である。

## Encode
```text
入力
"apologizing"
↓
トークン化
["apolog", "izing"]
↓
トークンID化
[27746, 5281]
```
## Decode
```text
トークンID
[27746, 5281]
↓
IDからトークンを復元
["apolog", "izing"]
↓
文章化
"apologizing"
```