# SystemsLab

## 概要

SystemsLabは、コンピュータシステムについて座学で得た知識を、実際の観測・操作・実験・問題解決の経験と結びつけるための個人学習Lab。

単にコマンドや設定方法を覚えるのではなく、実際にシステムを動かし、観測し、予想と比較し、必要に応じて壊れた状態や攻撃・防御を体験し、その後に仕組みへ戻って理解することを重視する。

SadServersやTryHackMeなどの優れた学習サービス・問題設計は積極的に参考にするが、それらのコピーを作ること自体は目的としない。

## 主な学習領域

当初は次の2領域を中心とする。

### Network

ネットワークの知識と経験を結びつける。

TCP/IP、Ethernet、ARP、IP、subnet、routing、NAT、DNS、TCP/UDP、HTTP、TLS、VLANなどについて、座学で学んだ仕組みが実際のパケット、インターフェース、routing table、socket、通信結果としてどう現れるかを体験する。

正常系の観測・構築だけでなく、通信障害を意図的に発生させて調査・復旧するScenarioも扱う。

### Security

セキュリティの知識と経験を結びつける。

攻撃者・防御者・調査者それぞれの視点から、脆弱性、認証・認可、権限、暗号、Web Security、Linux Security、ログ、ネットワーク境界などが実際のシステムでどのような意味を持つかを体験する。

Recon、Enumeration、Offensive、Defensive、Privilege Escalation、Detection、Incident Investigation / Responseなどを扱う。

## Troubleshootingの位置づけ

TroubleshootingはNetworkやSecurityと同列の学習領域ではなく、Scenarioの種類・問題解決方法として扱う。

例えば「DNS障害を調査・復旧する」はNetworkのTroubleshooting Scenarioであり、「セキュリティ設定が原因の接続障害を調査する」はSecurityの知識を使ったTroubleshooting Scenarioになり得る。

旧SadServersプロジェクトで重視していた次の思考プロセスはSystemsLab全体に継承する。

> 現象 → 仮説 → 観測 → 切り分け → 原因特定 → 修正 / 対応 → 検証

## Scenario

Scenarioは、1つ以上の知識を実際の経験と結びつけるための、自己完結した学習単位とする。

主なIDは次の形式を想定する。

- `TUT-0001`, `TUT-0002`, ... : SystemsLabの進め方や基礎ツールを学ぶGuided Tutorial
- `NET-0001`, `NET-0002`, ... : Network
- `SEC-0001`, `SEC-0002`, ... : Security
- `INT-0001`, `INT-0002`, ... : Integrated

Scenarioの性質は固定せず、目的に応じてExperiment、Build / Configuration、Troubleshooting、Offensive、Defensive、Incident Investigationなどを使い分ける。

Tutorialは通常Scenarioとは異なり、SystemsLabでの学び方や基本的なツール操作を身につけるためのGuided Scenarioとして扱う。コマンドや観測ポイントを段階的に案内してよいが、単なるコマンド入力ではなく、実際の観測を座学上の概念と結びつけることを重視する。

### Integrated Scenario

Integratedは独立した学習領域ではなく、Network / Securityその他の知識や複数のScenario形式を横断する総合問題として扱う。

総合問題では、何の分野の問題か、原因が何個あるか、障害か攻撃かといった分類そのものを学習者へ明示しない場合がある。個別Scenarioで得た知識・経験を、より実務に近い曖昧な状況で統合することを目的とする。

## Scenarioのゴール / Definition of Done

Scenarioの完了は大きく2段階に分ける。

### 1. Technical Completion

Scenarioごとに定義された実践上のGoalを達成し、AIの技術レビューを通過する。

Goalの内容はScenarioによって異なる。例えば、通信の観測、ネットワーク構築、障害復旧、flag取得、攻撃検知、侵害経路の特定などがあり得る。

自動checkを用意できる場合はcheckで期待する外部挙動を確認する。ただしcheck PASSだけでは完了としない。

Repository変更を伴うScenarioではbranch差分を、変更を伴わないScenarioではコマンド出力、packet capture、ログ、調査記録などのEvidenceをAIがレビューし、手法・判断・結果が技術的に妥当か確認する。

### 2. Learning Completion

Technical Completion後、User自身がWorkbench Task内に学習成果を記録し、AIレビューを通過する。

成果物はScenarioに応じて、実験・観測レポート、障害報告書、Security Write-up、調査・対応レポート、Incident Reportなどを使い分ける。

形式よりも、次の点を自分の言葉で説明できることを重視する。

- 何を観測・操作したか
- 何が分かったか
- なぜその結果になったか
- どの座学上の概念と結びついたか
- 別の状況でどう応用できるか

## Workbench と SystemsLab の役割

- **Workbench**: 学習・調査・知見を蓄積するKnowledge Base / Control Plane
- **SystemsLab**: Docker、Linux VM、network namespace、各種設定、必要に応じてCloudなど、実際に動かす環境を管理するExecution Environment

原則として1 Scenarioを1つのWorkbench Taskとして管理する。

Taskには、問題・目的、SystemsLabへのSource、調査・実験ログ、Technical Review、学習成果物、Learning Reviewをまとめて残す。

## 実務で使える道具を身につける

SystemsLabでは、概念だけでなく実務で使える観測・調査ツールの経験を増やすことも明確な目的とする。

例:

- Wireshark
- tcpdump
- nmap
- curl
- dig
- ss / ip / lsof
- traceroute / ping
- openssl
- journalctl / systemctl
- ps / top / free / df / du
- grep / sed / awk / find

ただし、最初からツール一覧を暗記するのではなく、現在のScenarioで必要な観測・操作のために導入し、何を見る道具なのか、なぜ使うのか、出力のどこを見るのかを理解しながら使う。

## AIの役割

AIはScenarioに応じて、教師、出題者、環境構築者、先輩エンジニア、攻撃・防御演習の進行役、レビュー担当、解説者を担う。

未知の問題を解いている途中では、根本原因、正しい設定値、具体的な修正箇所、flag取得経路などの答えを不用意に明かさない。Userの観測から何が分かるか、どの仮説が強く・弱くなったか、何がまだ不明かを整理し、必要なら次の観測につながる支援をする。

## 学習環境

Scenarioごとに、学習対象を自然に再現できる最小の環境を選ぶ。

Docker / Composeに限らず、Linux VM、network namespace、ネットワークLab用ツール、必要に応じてAWSなどを使用してよい。

可能な限り安全・再現可能・低コストな環境を優先し、初期状態へresetして再挑戦できるようにする。

## 資格との関係

資格取得はSystemsLabの主目的ではなく、裏テーマ・学習上のマイルストーンとして扱う。

特に次を意識する。

- ネットワークスペシャリスト
- CCNA
- 情報処理安全確保支援士

資格のシラバスや過去問は学習領域の地図として利用し、座学で学んだ内容のうち実際に体験すると理解が深まるものをScenario化する。

一方で、法律・規格・純粋な理論などLab化に向かない内容を無理に実験へ変換しない。

最終的な目的は問題数や資格取得そのものではなく、コンピュータシステムについて知っていることを、実際の現象を見て考え、観測・操作・問題解決に使える知識へ変えることである。
