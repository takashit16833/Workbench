---
status: todo
projects:
  - "[[文書取り込み機能作成]]"
branch: document-ingestion/integrate-ingest-command
dateCreated: 2026-09-29T06:44:00+09:00
tags:
  - task
---

## 実装

- [ ] `otellens ingest PATH` から一連の処理を呼び出す
- [ ] 成功時に文書数・文書断片数を標準出力へ表示する
- [ ] 失敗時に原因を標準エラー出力へ表示する
- [ ] 成功時は終了コード0、失敗時は終了コード1にする

## テスト

- [ ] `otellens ingest` で文書列挙からDB保存まで通る
- [ ] 成功時の表示と終了コードを確認する
- [ ] 失敗時の表示と終了コードを確認する
- [ ] DB保存より前に失敗した場合、現在の検索対象が変更されない
- [ ] DB保存に失敗した場合、現在の検索対象が変更されない
