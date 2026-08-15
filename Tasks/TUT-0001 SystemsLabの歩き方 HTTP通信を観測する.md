---
status: todo
projects:
  - "[[SystemsLab]]"
dateCreated: 2026-08-15T17:24:00+09:00
dateModified: 2026-08-15T17:24:00+09:00
tags:
  - task
priority: medium
source: https://github.com/takashit16833/SystemsLab/tree/main/scenarios/TUT-0001
---

# 目的

SystemsLabの最初のGuided Tutorialとして、正常なHTTP通信を実際に発生させ、Linuxコマンド、tcpdump、Wiresharkで観測する。

Scenarioの手順・GoalはSourceのREADMEを正本とする。このTaskには自分のEvidence、Technical Review、観測レポート、Learning Reviewを残す。

# Definition of Done

## Technical Completion

- [ ] ScenarioのGuided手順を最後まで実施した
- [ ] `bash check.sh` がPASSした
- [ ] 必要なEvidenceを整理した
- [ ] AIのTechnical ReviewがOKになった

## Learning Completion

- [ ] Technical Review後、自分で観測レポートを書いた
- [ ] AIのLearning ReviewがOKになった

# Evidence

## client / server

- client IP:
- server IP:
- serverのLISTEN socket:

## HTTP

- curlで観測したrequest / response:

## Packet capture / Wireshark

### TCP three-way handshake


### HTTP GET / response


## Check


# Technical Review

AIによる技術レビューの結果をここに残す。


# 観測レポート

Technical ReviewがOKになった後、自分の言葉で記入する。

## 1. 何を観測・操作したか


## 2. 何が分かったか


## 3. なぜその結果になったか


## 4. 座学上の知識とどう結びついたか


## 5. 別の状況でどう応用できそうか


# Learning Review

AIによる学習成果レビューの結果と、必要なら修正点をここに残す。
