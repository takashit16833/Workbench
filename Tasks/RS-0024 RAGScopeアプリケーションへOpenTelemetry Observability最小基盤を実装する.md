---
status: doing
projects:
  - "[[RAGScope]]"
source: https://github.com/takashit16833/RAGScope/blob/main/project-docs/project-management/milestones/v0.0/error-logging/RS-0024%20RAGScope%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%B8OpenTelemetry%20Observability%E6%9C%80%E5%B0%BA%E5%9F%BA%E7%9B%A4%E3%82%92%E5%AE%9F%E8%A3%85%E3%81%99%E3%82%8B.md
branch: feat/RS-0024-opentelemetry-observability-foundation
dateCreated: 2026-09-07T21:22:00+09:00
dateModified: 2026-09-07T21:22:00+09:00
tags:
  - task
---

## Current

RS-0024へ着手済み。実装へ入る前に、RAGScopeアプリケーションのHaskell package / library / module依存構造をWorkbench Noteで設計・レビューする。

成果物はMermaid中心の依存図とし、依存方向を一方向に保つ。Cabalのprivate / internal library、`build-depends`、`exposed-modules`、`other-modules`を使い、禁止する依存をGHC / Cabalが可能な範囲で静的に検出できる構造を検討する。

この設計Noteがレビュー済みになるまでは、RS-0024のコードやCabal設定を変更しない。

## Next

- Workbench Noteにpackage / library / module依存図を作成する
- 各境界の責務、公開範囲、許可する依存、禁止する依存と、その強制方法を整理する
- 設計レビュー後に実装Subtaskへ着手し、必要ならSubtask構成を追加・見直す
