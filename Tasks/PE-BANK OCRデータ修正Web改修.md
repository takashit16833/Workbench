---
status: todo
projects:
  - "[[案件管理]]"
agent: PE-BANK
priority: high
dateCreated: 2026-09-17T17:54:00+09:00
dateModified: 2026-09-17T18:15:00+09:00
tags:
  - task
  - job
---

# データ修正Webアプリケーションおよびバッチプログラム改修開発

## 概要
GPTモデルでOCR処理された蓄積データを確認・修正するWebアプリと、関連バッチを改修。Webのフロント／バック双方、バッチ性能改善、AIによる処理の改良が対象。
- 紹介元: PE-BANK（担当: 熊島氏）
- 紹介日: 2026-09-17

## 主な業務
- データ確認・修正Webアプリのフロントエンド／バックエンド機能追加・改修
- バッチプログラムの改修および性能改善
- Azure OpenAI等を用いるデータ処理ロジックの改修・改善
- アジャイル（スクラム等）体制での設計、実装、単体テスト
- 仕様変更・改善への能動的な提案とチーム内の協働

## 開発環境
- Node.js、Python
- Azure OpenAI Service
- Amazon RDS（PostgreSQL）
- AWS: EC2、CloudFront、S3、Lambda
- アジャイル（スクラム等）

## 必須経験
- Node.js**および**PythonによるWebアプリケーション／バッチ開発の実務経験
- RDBMS（PostgreSQL等）でのテーブル設計、SQL作成
- AWS環境（EC2／Lambda等）での開発・運用
- Gitを用いたチーム開発

## 歓迎経験
- Azure OpenAI等のLLM APIの組み込み・開発
- アジャイル（スクラム）でのスプリント運用
- CI/CDパイプラインを利用した自動テスト・デプロイ

## 条件
- 開始: 2026年10月〜
- 共同受注額: 70万円（税込）。本人の取り分は85%＝59万5,000円（税込）。本人確認済み、今回この条件で応募希望。
- 勤務形態: 基本リモート（出社頻度・勤務地は未記載）
- 精算幅、勤務時間、商談回数、契約期間: 未記載

## マッチ度評価
**総合: B（相性良い）／応募希望あり（2026-09-17、PE-BANKへの連絡は未送信のためstatusはtodo）**

| 必須条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| Node.jsおよびPythonによるWeb／バッチ実務 | ◎ | Node.jsとPython/DjangoそれぞれのWebアプリ・API実務。本人確認：パチンコ案件でNode.jsバッチ作成を主担当。Pythonでのバッチ実務と両言語同一案件併用は申告しておらず、要件がそこまで要求する場合は別途照合。 |
| RDBMSテーブル設計・SQL | ◎ | MySQLテーブル設計・SQL、PostgreSQL使用、パチンコ案件のSQL性能改善実務。 |
| AWS開発・運用 | ◎ | 本人確認：Python案件でAWS Lambdaのロジック修正・本番デプロイ。AWS上へのアプリリリース、コンソールでログ確認・障害調査、Session Managerを使ったSQLチューニング。EC2・CloudFront・S3の個別担当経験は未確認。 |
| Gitチーム開発 | ◎ | GitHubによるチーム開発経験。 |

| 歓迎条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| Azure OpenAI等LLM API組み込み | × | 本人確認：LLM APIの組み込み・開発経験なし。個人開発を実務と扱わない。 |
| スクラムでのスプリント運用 | × | 本人確認：アジャイル開発経験なし。 |
| CI/CDによる自動テスト・デプロイ | ◎ | GitHub Actionsを用いた自動テスト・デプロイ・DBマイグレーションの実務。 |

**強み:** Node.jsとPythonのWeb開発、Node.jsバッチ作成主担当、RDBMS・SQL性能改善、AWS Lambda修正・本番デプロイ、AWSでのログ調査、CI/CD。AI実務は必須でない。

**リスク:** Azure OpenAI API連携とアジャイル経験なし。ただし両者は歓迎条件。Pythonでのバッチ開発やNode/Pythonの同一案件併用が厳密な必須なら未確認。フロント作業割合は未記載。

**応募判断・連絡方針:** 本人は両案件エントリー希望。確認されたバッチ・Lambda実務を明示し、LLM APIとアジャイル経験なしを率直に伝える。メールは未送信、送信確認後statusをdoingへ変更。

**追加確認:** フロント／バック／バッチの作業比率、Azure OpenAI部分の期待水準、基本リモートの出社頻度、商談回数、精算幅。

参考: https://github.com/takashit16833/Portfolio 、https://github.com/takashit16833/RAGScope

## 会社情報
発注企業・エンド企業名は未記載。
