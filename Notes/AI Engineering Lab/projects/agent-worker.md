# agent-worker — 学習プロジェクト引き継ぎ

最終確認: 2026-10-11
GitHub: https://github.com/takashit16833/agent-worker
仕様: https://github.com/takashit16833/Workbench/blob/main/Notes/ai_app_lab/Agent%20Worker.md

## 目的・進め方

- 模擬システム障害について、LLMが調査ツールを選択し、Haskellが許可・引数を検証して読み取り専用の模擬データを取得し、LLMが根拠つきの報告を作る。
- PythonはOllamaによるLLM呼び出しとTool Calling、Haskellはツールの検証・実行と今後の制御ループを担当する。
- A1を小さく完成させる。実サーバへの変更や任意コマンド実行は行わない。
- ユーザー自身でコード入力・実行しながら情報の流れを理解することを重視。推測による修正より実測、各段階の確認を優先する。

## 最新の実装（GitHub mainで確認）

- **2026-10-11 21:57 JST時点**で main は `912339b71eb22ba836ee420b86be075569cb0bf2`。
- `python/tool_call.py`: Ollama `chat(model="qwen3:1.7b", tools=[get_metrics], think=False)` により、`service-a` のCPU使用率を尋ねる。モデルの `tool_calls` と `content` をJSONにして標準出力へ送る。ツール実行自体はしない。
- `app/Main.hs`: 標準入力のJSONをaesonで読み、`get_metrics` および `service-a` のみ許可。純粋関数 `runTool` が固定の `service-a CPU usage: 85%` を返し、`handleTool` が表示する。未知のツール名・サービス名は拒否する。
- `.dir-locals.el` に `Run Project`（`.venv/bin/python python/tool_call.py | cabal run agent-worker`）、Pythonのlint/format確認・修正コマンド等がある。
- `test/Main.hs` はまだスタブ（実質的なテストなし）。
- **ソースコードで実装を確認しただけで、Python→Haskell連携全体の手元実行は未確認。** 以前ユーザーから報告された実測はPython単体の `Tool: get_metrics / Arguments: {'service': 'service-a'}` まで。

## 現在地・次の一歩

- A1の「LLMがツールを選択 → Haskellが検証 → 模擬メトリクスを返す」はコード上存在する。
- A1の「ツール結果を再びLLMに渡し、観測内容に基づく最終報告を得る」は未実装。
- まずユーザー環境で `Run Project` を実行し、`Tool result: service-a CPU usage: 85%` が表示されるか確認する。未確認のまま次のコード修正はしない。
- 次は、HaskellからPythonにツール結果を渡してLLMを再度呼ぶ最小の流れを学習・実装する。A2（複数ツール、回数制限、Pydantic、承認）に先走らない。
- `get_metrics` はツールの**仕様**であり、モデルの `tool_calls` は実行済みの結果ではなく**提案**。この区別の理解確認はこれから。
