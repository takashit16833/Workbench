# agent-worker — 学習プロジェクト引き継ぎ

最終確認: 2026-10-11
GitHub: https://github.com/takashit16833/agent-worker
仕様: https://github.com/takashit16833/Workbench/blob/main/Notes/ai_app_lab/Agent%20Worker.md

## 状態（GitHubで確認）

- ユーザーが新しいリポジトリ `takashit16833/agent-worker` を作成した。
- 2026-10-11 19:37頃、main `d73a6a2b0e62b98fed5cadc3f2fb4cd6e24a62ee` で初期Pythonコード実装を確認。`python/tool_call.py` は Ollamaの `chat` と `qwen3:1.7b` を使い、`get_metrics` のツール仕様（Python辞書）を渡す。実行処理はまだなく、ツール選択要求の表示のみ。
- ユーザー提示のローカル実行ログ：`.venv/bin/python python/tool_call.py` が `Tool: get_metrics` / `Arguments: {'service': 'service-a'}` と出力し正常終了。**モデルからツール要求を取得できたことだけ**が確認済み。メトリクス実行、引数検証、ツール結果のLLMへの返送、Agent Loopは未実装・未検証。
- rag-labから、別のAIシステム（Tool Calling・Agent Loop）へ経験を広げる文脈。

## アプリの目的（設計資料から）

- 架空のシステム障害について、ユーザー依頼→LLMによるツール選択→Haskellによる実行可否と引数の検証→ローカルの模擬ログ/メトリクス/デプロイ履歴の取得→LLMによる根拠つき原因候補と対応案の提示。
- LLMからのtool requestは、実行命令ではなく検証対象の**提案**。実サーバや外部サービスは初期スコープ外。実際の変更、再起動、通知はしない。
- 設計上、HaskellはAgent Loop・許可リスト・状態・停止条件、PythonはLLM推論/Tool Calling/構造化出力を担当。詳細は実装段階で判断。

## 次の段階 A1（まだ未着手）

- 最小の模擬データと読み取り専用ツールから始める。
- LLMが選んだツール名・引数・実行回数・結果が追跡でき、最終報告が得られる状態がA1の完了条件。
- いきなりA2以降（承認・複数ツール・評価）へ広げない。
- 最初のTool Calling例をユーザーが手元で実装・実行してpush済み。`get_metrics` は実行関数ではなくツール仕様の辞書、`chat` が返す `tool_calls` は実行前の要求であるとAIが説明した（ユーザーによる理解の確認はまだ）。

## 学習支援上の注意

- rag-labのとき、AIが実験や改善の目的・判断理由・結果の見方を共有せず進めたことでユーザーが全体像を見失った。Agent Workerでは「アプリの目的、今回の作業、終わりの条件」を最初に伝え、必要最小限の実装から始める。
- ユーザー自身がコードを書くことを重視。新規APIは入力・出力・役割と採用理由を説明し、過度な抽象化を避ける。
- 具体的な着手時には最新版の設計メモとリポジトリの最新mainを再確認する。
