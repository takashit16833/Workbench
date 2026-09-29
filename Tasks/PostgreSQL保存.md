---
status: todo
projects:
  - "[[文書取り込み機能作成]]"
branch: document-ingestion/save-postgresql
dateCreated: 2026-09-29T06:43:00+09:00
tags:
  - task
---

## 実装

- [ ] pgvectorを有効にする
- [ ] `document_chunks` テーブルを作成する
- [ ] `DATABASE_URL` から接続先を取得する
- [ ] 1つのトランザクションで既存データを全削除して今回の文書断片を保存する
- [ ] 保存失敗時にロールバックする

## テスト

- [ ] 文書断片と512次元のEmbeddingを保存できる
- [ ] 再取り込みで既存データが今回のデータに置き換わる
- [ ] 保存失敗時に既存データが残る
- [ ] `DATABASE_URL` で指定したDBへ接続する
