---
status: todo
projects:
  - "[[文書取り込み機能作成]]"
  - "[[OtelLens]]"
branch: document-ingestion/generate-embeddings
dateCreated: 2026-09-29T06:43:00+09:00
tags:
  - task
dateModified: 2026-09-29T10:27:46.326+09:00
---

## 実装

- [ ] Pythonで `sentence-transformers` と `jinaai/jina-embeddings-v2-small-en` を使ってEmbeddingを生成する
- [ ] Python側で8192トークンの入力上限を確認する
- [ ] Haskellから `python3 python/embedding.py` を子プロセスとして実行する
- [ ] 全文書断片を `texts` として1回のJSONリクエストで渡す
- [ ] `embeddings` をJSONで受け取る
- [ ] 件数と各Embeddingの512次元を検証する
- [ ] Pythonの異常終了や不正なJSONを失敗として扱う

## テスト

- [ ] Pythonが文書断片から512次元のEmbeddingを返す
- [ ] 複数の入力に対して同じ件数・同じ順序で返す
- [ ] 8192トークンを超える入力を失敗にできる
- [ ] HaskellからPythonへJSONを渡して結果を受け取れる
- [ ] Python異常終了時に失敗する
- [ ] JSON、件数、次元数が不正な場合に失敗する
