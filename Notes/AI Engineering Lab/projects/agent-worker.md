# agent-worker — 学習プロジェクト引き継ぎ

最終確認: 2026-10-12 JST
GitHub: https://github.com/takashit16833/agent-worker
設計資料: https://github.com/takashit16833/Workbench/blob/main/Notes/ai_app_lab/Agent%20Worker.md

## 目的・進め方
- HaskellとPythonで模擬システム障害の一次調査エージェントを作る。実務相当の品質、実装とテストをセットにする、ユーザーがコードを入力・実行する、重要な設計理由を説明する。
- 過去の実装は2026-10-12に初期化され、新しい設計から再開。LLMツール要求の重複した管理は避け、Haskell側の会話履歴を唯一の情報源とする。PythonはOllama SDK通信を担当する。
- agent-worker自体はユーザーの明示依頼がない限りAIから編集・pushしない。

## 2026-10-12 のGitHub mainと実装
- 最終GitHub main確認: `e9c083e605e1221ba0e8a0683d8f7fa5feb475d4`。
- `src/Agent/Tool.hs`: `get_metrics` の仕様、未検証ToolCall、許可・引数検証、`service-a` のCPU使用率85%を返す純粋関数 `runTool`、Ollama応答の解析。
- `app/Main.hs`: Haskellが履歴と進行を管理。標準入出力でPythonプロセスを都度呼び出し、初回LLM要求を検証・ツール実行、履歴にassistant+tool結果を追加してもう一度LLMを呼ぶ。最大1件のツール実行。
- `python/llm.py`: Pydantic `InferenceRequest` で入力を検証し、Ollama `qwen3:1.7b` に1回問い合わせ、メッセージを返す。`JsonValue`を利用し、SDK由来の型警告1件だけ局所抑制。
- `python/test_llm.py`: 現在2件のテスト。SDKの `ChatResponse` を使い、外部通信のみ模擬した正しい引数・出力の確認、不正な会話履歴型の拒否。
- `test/Main.hs`: HUnitで正常ツール実行、未知のツール・サービス、必須/型/余分な引数、LLM通常回答/ツール解析の計8件。

## ユーザーからの実測（2026-10-12 15:19 JST）
- `cabal test`: GHC 9.10.3、`Cases: 8 Tried: 8 Errors: 0 Failures: 0`、PASS。
- `cabal run agent-worker -- service-aのCPU使用率を調べて`: `Tool request: get_metrics`、`Tool result: {"cpu_percent":85,"service":"service-a"}`、`Answer: service-aの現在のCPU使用率は85%です。`。ビルド・実行終了成功。
- Pythonテスト2件もユーザーから「テストOK」と報告済。basedpyrightの複数診断を整理し、残ったOllama SDKの部分的な未知型警告に局所ignoreを適用、ユーザーがpush。
- **確認済みなのは正常系の一連の通信1件と純粋処理の単体テスト。** LLMがツールを呼ばないケースと実システムでの拒否/複数呼び出しは未実測。

## 次の候補
- A1設計資料の「ツールなしで回答可能なケース」と「ツール選択の引数・回数の追跡」を確認してA1を区切る。その後A2の複数ツール、上限、エラー時停止に進む。
- テストは数合わせを避け、何が壊れたら失敗するのかが説明可能なものに限定。LLMの非決定的な結果は単体テストへ依存させない。
