---
status: todo
projects:
  - "[[SadServers]]"
dateCreated: 2026-08-15T08:20:00+09:00
dateModified: 2026-08-15T09:55:37.869+09:00
tags:
  - task
priority: medium
source: https://github.com/takashit16833/SadServers-Lab/tree/main/scenarios/SS-0001
timeEntries:
  - startTime: 2026-08-15T00:22:27.779Z
    description: Work session
    endTime: 2026-08-15T00:47:27.851Z
  - startTime: 2026-08-15T00:55:37.869Z
    description: Work session
---

# 問題

開発環境のAPIコンテナを起動したが、Macから次のリクエストが成功しない。

```bash
curl http://localhost:18080/health
```

APIを正常に利用できる状態へ復旧する。

## 開始

SadServers-Labで、このScenario専用のfixブランチを作成する。

```bash
git switch -c fix/SS-0001
cd scenarios/SS-0001
bash start.sh
```

`main` は壊れた問題原本として維持するため、fixブランチを `main` へマージしない。

# Definition of Done

このScenarioは、次のすべてを満たしたときに完了とする。

- [ ] `fix/SS-0001` ブランチ上で復旧作業を行った
- [ ] `bash check.sh` がPASSした
- [ ] AIによる `main...fix/SS-0001` のfixレビューがOKになった
- [ ] 障害報告書を作成した
- [ ] AIによる障害報告書レビューがOKになった

`check.sh` のPASSだけではScenario Completeではない。

# 調査ログ

調査中は、できる範囲で次の流れを残す。

> 現象 → 仮説 → 観測 → 判断 → 次の仮説

コマンドを知らない場合は、AIに観測方法やコマンドの使い方を聞いてよい。ただし、原則として根本原因や修正方法そのものは解決前に聞かない。

## 現象


## 仮説・観測・判断


# Fixレビュー

`bash check.sh` がPASSしたら、障害報告書を書く前にAIへ `main...fix/SS-0001` のレビューを依頼する。

AIレビューでは、正常状態へ戻っているだけでなく、修正が原因に対して妥当か、不要・過剰な変更がないか、別の問題を生んでいないかを確認する。

## レビュー結果


# 障害報告書

Fixレビューで技術的復旧がOKになった後に記入し、AIレビューを受ける。

## 1. 概要


## 2. 影響


## 3. 発生した現象


## 4. タイムライン


## 5. 調査内容


## 6. 直接原因


## 7. 根本原因


## 8. 復旧対応


## 9. 復旧確認


## 10. 再発防止策


## 11. 今回の学び


# 障害報告書 AIレビュー

障害報告書のレビュー結果と修正ポイントをここに残す。
