---
status: todo
projects:
  - "[[RS-0024 RAGScopeアプリケーションへOpenTelemetry Observability最小基盤を実装する]]"
blockedBy:
  - "[[RS-0024 subtask OpenTelemetry SDKライフサイクルとMetrics基盤を実装する]]"
  - "[[RS-0024 subtask 未処理例外のEventRecordをexactly-onceで記録する]]"
branch: RS-0024/telemetry-failure-isolation
dateCreated: 2026-09-08T15:43:45+09:00
dateModified: 2026-09-08T15:43:45+09:00
tags:
  - task
---

## Scope

- Telemetryの記録・export・cleanup失敗を、囲まれた機能処理の結果や元例外から分離する
- Telemetry失敗時に本体を再実行せず、成功した機能結果を機能上の失敗へ変更しない
- 機能処理から逃げた元例外をTelemetry側の失敗で上書きしない
- Telemetry基盤自身の失敗を、失敗した同じTelemetry経路へ再帰的に記録しない

## Verification

- controlled exporter failureでも成功した機能結果が変わらない
- Telemetry失敗時にも囲まれた本体の実行回数が1回である
- 機能処理の元例外がTelemetry記録・cleanup失敗で置き換わらない
- Telemetry基盤の失敗が同じTelemetry経路へ再帰記録されない
- 失敗注入後もContextが適切に復元される

## Squash merge commit body

- Telemetryの記録・export・cleanup失敗を機能処理の結果から隔離した
- Telemetry失敗時にも本体を再実行せず、元の機能結果・例外を保持するようにした
- controlled exporter failureと再帰記録防止を自動テストで確認した
