# TokenizerはEncode, Decodeを行う
入力された文章をトークンIDに変換し、LLMが文章を生成するための橋渡しを行う。

なお、Embeddingへの変換は行わない。（Embedding層が行う）

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
トークン化
["apolog", "izing"]
↓
文章化
"apologizing"
```