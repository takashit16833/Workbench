# agent-worker — 学習プロジェクト引き継ぎ

最終確認: 2026-10-12 JST
GitHub: https://github.com/takashit16833/agent-worker
設計資料: https://github.com/takashit16833/Workbench/blob/main/Notes/ai_app_lab/Agent%20Worker.md

## 目的と合意済みスコープ
- HaskellとPythonで「模擬システム障害の一次調査エージェント」を作る。LLMが読み取り専用ツールを選び、Haskellが検証・実行、結果をLLMに返して報告させる。
- ユーザーは以前の実装を流用せず、最初から設計し直すことを明示。実務相当のコード品質、実装とテストをセット、ユーザー自身でコード入力・実行、設計理由の説明を重視。
- 以前の重複状態の設計を踏襲しない。実行中の会話履歴は一元管理し、LLMのツール要求はそこから読み取る。
- agent-workerリポジトリ自体はユーザーの明示指示がない限り編集・pushしない。

## GitHubの実際の状態（2026-10-12の確認結果）
- 最新 main: `22be53b2da7e7448d37d132d539105b364fac9e5`（コミット日時 2026-10-12 10:09頃JST）。
- 直近のリセットにより初期雛形の状態。Python実装は無し（`python/.gitkeep` のみ）。
- `app/Main.hs` / `src/MyLib.hs` は雛形、`test/Main.hs` は未実装、`agent-worker.cabal` にライブラリ・実行・テストの枠組みのみ存在。
- 前回の記録（2026-10-11, `912339b...`）にある実装状態は**過去の状態**であり、現在の main ではない。ローカル作業の有無・内容は未確認。

## 第1回の設計提案（未適用・未コミット）
- A1として一回のTool Callingを縦に接続する。最初は `get_metrics(service-a)` → CPU 85% 模擬値 → LLM最終報告。1ツール・最大1実行・LLM呼び出し最大2回。無制限ループは作らない。
- Haskellがツール仕様JSON、サービス許可条件、`runTool`、会話履歴、実行回数の制限を持つ。PythonはOllamaへの問い合わせのみ。Pythonプロセスには `messages` と `tools` を入力し、LLMのassistantメッセージ1件だけを返す。履歴を別フィールドへ重複保持しない。
- Haskell: `ToolCall` = 名前 + 未検証のJSON引数、`ToolError` = 未知のツール/不正引数/未知のサービス。正当な呼び出しは固定JSON結果を返す。
- LLMへのツール仕様と実行時のチェックは同じHaskellモジュールから提供する。Pythonはツール仕様をハードコードしない。
- 提案コード: `src/Agent/Tool.hs`, `app/Main.hs`, `test/Main.hs`, `python/llm.py`, `python/test_llm.py`, `requirements.txt`, cabal依存修正。**ユーザー環境へは未反映**。

## 検証と次の対応
- Python側の3件の単体テストは、Ollama SDK部分を模擬して手元で実行済み。実SDKとの通信は未実行。
- HaskellコンパイルとHUnitテストは未実行（AI側環境にGHCが無い）。
- ユーザーにコードとテストを提示し、`python -m unittest` → `cabal test` → 実Ollamaで `cabal run` を実測してもらう。結果を受け取るまでは動作確定しない。
