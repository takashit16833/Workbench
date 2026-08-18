---
status: todo
priority: medium
dateCreated: 2026-08-18T18:55:00+09:00
dateModified: 2026-08-18T21:07:00+09:00
tags:
  - task
projects:
  - "[[RAGScope]]"
  - "[[RS-0018 AI推論サービスの共通エラー・構造化ログ基盤を実装する]]"
branch: RS-0018/python-test-foundation
---

## Squash merge commit body

- AI推論サービスのPythonコードと自動テストを管理できる最小プロジェクト構成を追加する
- Python専用Dev Containerを追加し、Python依存・仮想環境・開発キャッシュをホスト環境から分離する
- uv、Ruff、Pyright、pytestと`make check-ai`による再現可能な品質検査基盤を追加する
- Python実装の基本スタイルと型・クラス・副作用・テストの判断基準をコーディング規約として定義する

## 目的

RS-0018のPython実装を開始できる最小の実装・テスト基盤を正本リポジトリへ作る。

後続Subtaskが共通エラー、構造化ログ、Schema適合、出力境界を独立して実装・検証できる状態を作る。

## 現在地

- `RS-0018/python-test-foundation`の最新HEADは`2dc2eea`で、親branch `feat/RS-0018-ai-service-common-error-logging`へSquash mergeする準備ができている
- `ai-service/uv.lock`とDev Containerのlockfileを正本リポジトリで管理している
- AI Service Dev ContainerをRebuildした状態で`make -C .. check-ai`が成功し、Ruff、Pyright、pytestの検査を通過している
- 次の操作は、Squash commit subjectを`AI推論サービスのPython実装・テスト基盤を作る`として親branchへSquash mergeすること
- Squash merge後に親branchへ意図したcommitと変更が反映されていることを確認してから、このSubtaskを完了扱いにする

## 関連Subtask

- 先行: なし
- 後続: [[RS-0018 subtask 共通エラーと例外変換境界を実装する|共通エラーと例外変換境界を実装する]]

## 完了条件

- Pythonコードと自動テストを正本リポジトリで管理できる
- モデルやWebフレームワークなしでテストを実行できる
- AI推論サービス専用のDev ContainerでPython依存、仮想環境、開発キャッシュをホスト環境から分離できる
- Ruff、Pyright、pytestを含む品質検査を`make check-ai`から再現可能に実行できる
- Python実装でAIごとに設計スタイルがぶれやすい判断基準を、Pythonコーディング規約から確認できる
