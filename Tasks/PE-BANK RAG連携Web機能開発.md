---
status: todo
projects:
  - "[[案件管理]]"
agent: PE-BANK
priority: medium
dateCreated: 2026-09-17T17:54:00+09:00
dateModified: 2026-09-17T18:15:00+09:00
tags:
  - task
  - job
---

# Azure OpenAI（GPT）連携 Webアプリケーション機能開発・改修

## 概要
既存システムの蓄積データをAmazon Bedrock上の既存RAGへ連携し、要約・検索・分析・インサイトなどをWeb画面で提供する機能を開発・改修する。案件名はAzure OpenAI連携だが、概要ではAmazon Bedrockを使用しており、両サービスの担当範囲は未確認。
- 紹介元: PE-BANK（担当: 熊島氏）
- 紹介日: 2026-09-17

## 主な業務
- PostgreSQL等から文脈情報を抽出し、既存RAGに問い合わせるバッチの実装・改修
- RAGの処理結果を利用者に表示するWeb画面の実装・改修
- RAG構成・出力形式・ハルシネーション抑制などのプロンプト設計と精度調整
- アジャイル体制での設計、実装、単体テスト
- 仕様変更や機能改善に能動的に対応し、チームと協働して作業を進める

## 開発環境
- Node.js、Python
- Azure OpenAI Service、Amazon Bedrock（既存RAG）
- Amazon RDS（PostgreSQL）
- AWS: EC2、CloudFront、S3、Lambda
- アジャイル

## 必須経験
- Node.jsまたはPythonによるWebアプリケーション／バッチ開発の実務経験
- Azure OpenAI ServiceまたはOpenAI APIを活用したシステム開発とプロンプト設計の実務経験
- RDBMS（PostgreSQL等）でのテーブル設計、SQL作成
- AWS環境（EC2／Lambda等）での開発・運用
- Gitによるチーム開発

## 歓迎経験
- RAGの設計・実装
- ベクトル検索、チャンク設計の知見
- アジャイル（スクラム）でのスプリント運用

## 条件
- 開始: 2026年10月〜
- 共同受注額: 70万円（税込）。本人の取り分は85%＝59万5,000円（税込）。本人確認済み、今回この条件で応募希望。
- 勤務形態: 基本リモート（出社頻度・勤務地は未記載）
- 精算幅、勤務時間、商談回数、契約期間: 未記載

## マッチ度評価
**総合: C（条件付き）／応募希望あり（2026-09-17、PE-BANKへの連絡は未送信のためstatusはtodo）**

| 必須条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| Node.jsまたはPythonによるWeb／バッチ実務 | ◎ | Node.jsとPython/DjangoによるWebアプリ・API実務。本人確認：パチンコ案件でNode.jsのバッチ作成を主担当。Pythonでのバッチ実績は申告していないが本案件は「または」。 |
| Azure OpenAIまたはOpenAI APIの開発・プロンプト設計実務 | × | 本人確認：システム開発・プロンプト設計の実務経験なし。必須を満たさないと紹介元に明示する。RAGScopeは実務に算入しない。 |
| RDBMSテーブル設計・SQL | ◎ | MySQLテーブル設計、PostgreSQL利用、パチンコ案件でSQL性能改善の実務。 |
| AWS開発・運用 | ◎ | 本人確認：Python案件でAWS Lambdaのロジック修正と本番デプロイ。AWS環境へのアプリリリース、コンソールでログ確認・障害調査、Session Managerを用いたSQLチューニング。EC2・CloudFront・S3それぞれの個別担当は確認できていない。 |
| Gitチーム開発 | ◎ | GitHubを用いたチーム開発経験。 |

| 歓迎条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| RAG設計・実装 | × | 本人確認：実務経験なし。RAGScopeも該当フェーズ未到達。 |
| ベクトル検索・チャンク設計の知見 | △ | RAGScopeで検討中だが実装・検証未了。実践的知見が確立しているとは主張しない。 |
| スクラムでのスプリント運用 | × | 本人確認：アジャイル開発経験なし。 |

**強み:** Node.jsバッチ作成主担当、Node.js/Python Web開発、SQL性能改善、AWS Lambdaのロジック修正・本番デプロイ、AWS運用の具体的作業。個人開発RAGScopeは興味・学習の補足材料に限る。

**重要リスク:** OpenAI API等を用いたシステム開発とプロンプト設計の実務経験という必須項目を満たさない。RAG設計・実装とスクラム経験もなし。

**応募判断・連絡方針:** 不足する生成AI実務経験を明示して本人はエントリー希望。メールは未送信。送信確認後にstatusをdoingへ変更する。

**追加確認:** Azure OpenAIとBedrockの役割分担、出社条件・商談回数・精算幅。

参考: https://github.com/takashit16833/Portfolio 、https://github.com/takashit16833/RAGScope

## 会社情報
発注企業・エンド企業名は未記載。
