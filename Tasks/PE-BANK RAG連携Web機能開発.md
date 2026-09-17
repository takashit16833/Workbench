---
status: todo
projects:
  - "[[案件管理]]"
agent: PE-BANK
priority: medium
dateCreated: 2026-09-17T17:54:00+09:00
dateModified: 2026-09-17T17:54:00+09:00
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
- 共同受注額: 70万円（本人受取額・手数料の扱いは未確認）
- 勤務形態: 基本リモート（出社頻度・勤務地は未記載）
- 精算幅、勤務時間、商談回数、契約期間: 未記載

## マッチ度評価
**総合: C（条件付き）／応募前優先度: 中**

| 必須条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| Node.jsまたはPythonによるWeb／バッチ実務 | ◎ | 2025年にNode.js、2023〜2024年にPython／DjangoのWebアプリ・API開発実務。バッチそのものの具体実績は別途確認。 |
| Azure OpenAIまたはOpenAI APIの開発・プロンプト設計実務 | △ | 経歴書では該当する**実務経験を確認できない**。RAGScopeは個人開発であり、必須の実務年数・実績には算入しない。 |
| RDBMSテーブル設計・SQL | ◎ | MySQLでのテーブル設計等、PostgreSQLの利用、SQL性能改善の実務。 |
| AWS開発・運用 | ○ | AWSのEC2等へのリリースやAWS利用の実務あり。Lambda・CloudFrontの個別実務は未確認。直近のTerraformによるGCP構築はAWS実務と同一視しない。 |
| Gitチーム開発 | ◎ | 複数案件でGitHubを用いたチーム開発経験。 |

| 歓迎条件 | 評価 | 根拠・懸念 |
| --- | :---: | --- |
| RAG設計・実装 | △ | 個人開発RAGScopeで要求整理・アーキテクチャ・検索設計を進めている。2026-09-17時点の公開マイルストーンはv0.0進行中で、完成した一連のRAG実装とは主張しない。 |
| ベクトル検索・チャンク設計の知見 | ○ | RAGScopeのpgvector／文書分割／Embeddingの設計資料が説明材料になる。ただし最小検索経路は公開進捗上未完了。 |
| スクラムでのスプリント運用 | ? | 経歴書からスプリント運用の実績を確定できない。 |

**強み:** Web API・Python／Node.js・SQL、設計から実装、RAGScopeでの要求／責務分離／検索設計の知識。生成AIやアーキテクチャの志向と業務内容が近い。

**重要リスク:** 生成AI API連携とプロンプト設計の実務経験が必須。個人開発では要件を満たしたことにならないため、企業が厳密に判定する場合は書類通過リスクが高い。AWS Lambdaの実務も未確認。

**応募判断:** 挑戦枠としてエントリー検討可。紹介元に「生成AI実務未経験だが、RAGScopeの設計・開発中の成果で代替提案できるか」を先に確認したい。

**追加確認:** Azure OpenAIとBedrockの役割分担、生成AI実務必須条件の厳格さ、実際に担当するAWSサービス、70万円の受取額、出社条件・商談回数・精算幅。

参考: https://github.com/takashit16833/Portfolio 、https://github.com/takashit16833/RAGScope

## 会社情報
発注企業・エンド企業名は未記載。
