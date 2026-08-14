---
status: todo
projects:
  - "[[SadServers]]"
dateCreated: 2026-08-15T08:20:00+09:00
dateModified: 2026-08-15T08:20:00+09:00
tags:
  - task
priority: medium
source: https://github.com/takashit16833/SadServers-Lab/tree/main/scenarios/SS-0001
---

# 問題

開発環境のAPIコンテナを起動したが、Macから次のリクエストが成功しない。

```bash
curl http://localhost:18080/health
```

APIを正常に利用できる状態へ復旧する。

## 開始

```bash
cd scenarios/SS-0001
bash start.sh
```

## 完了条件

```bash
bash check.sh
```

がPASSすること。

# 調査ログ

調査中は、できる範囲で次の流れを残す。

> 現象 → 仮説 → 観測 → 判断 → 次の仮説

コマンドを知らない場合は、AIに観測方法やコマンドの使い方を聞いてよい。ただし、原則として根本原因や修正方法そのものは解決前に聞かない。

## 現象


## 仮説・観測・判断


# 障害報告書

復旧後に記入し、AIレビューを受ける。

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


# AIレビュー

障害報告書のレビュー結果と修正ポイントをここに残す。
