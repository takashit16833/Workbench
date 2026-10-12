# agent-worker — 学習プロジェクト引き継ぎ

最終確認: 2026-10-12 JST
GitHub: https://github.com/takashit16833/agent-worker
設計資料: https://github.com/takashit16833/Workbench/blob/main/Notes/ai_app_lab/Agent%20Worker.md

## 目的・進め方
- HaskellとPythonで模擬システム障害の一次調査エージェントを作る。実務相当の品質、実装とテストをセットにする、ユーザーがコードを入力・実行する、重要な設計理由を説明する。
- 過去の実装は2026-10-12に初期化され、新しい設計から再開。LLMツール要求の重複した管理は避け、Haskell側の会話履歴を唯一の情報源とする。PythonはOllama SDK通信を担当する。
- agent-worker自体はユーザーの明示依頼がある場合に編集・pushする。AI共有メモリだけは必要に応じて自発的に更新してよい。
- ユーザー要望: やり取りはサクサク進める。写経の1ステップは細切れにしすぎずまとめる。テストは数合わせを避け、何が壊れたら失敗するのか説明できるものに限定する。

## 2026-10-12 のGitHub mainと実装
- `src/Agent/Tool.hs`: `get_metrics` の仕様、未検証ToolCall、許可・引数検証、`service-a` のCPU使用率85%を返す純粋関数 `runTool`、Ollama応答の解析。
- `src/Agent/RunLog.hs`: JSON値をTextへ変換し、ツール要求・結果ログを整形する。ログとLLMへ戻すtoolメッセージ本文で同じJSON変換を使い、表示と履歴の食い違いを避ける。
- `app/Main.hs`: Haskellが履歴と進行を管理。標準入出力でPythonプロセスを都度呼び出し、初回LLM要求を検証・ツール実行、履歴にassistant+tool結果を追加してもう一度LLMを呼ぶ。最大1件のツール実行。ログには `ツール要求 #1: get_metrics {"service":"service-a"}` のように呼び出し回数と元引数を出す。
- `python/llm.py`: Pydantic `InferenceRequest` で入力を検証し、Ollama `qwen3:1.7b` に1回問い合わせ、メッセージを返す。`JsonValue`を利用し、SDK由来の型警告1件だけ局所抑制。
- `python/test_llm.py`: 現在2件のテスト。SDKの `ChatResponse` を使い、外部通信のみ模擬した正しい引数・出力の確認、不正な会話履歴型の拒否。
- `test/Main.hs`: HUnitでツール実行・拒否条件・LLM応答解析に加え、ログに呼び出し回数とLLM生成引数が残ることを確認する。

## ユーザーからの実測（2026-10-12）
- 15:19 JST: `cabal test` は `Cases: 8 Tried: 8 Errors: 0 Failures: 0`、PASS。`cabal run agent-worker -- service-aのCPU使用率を調べて` はツール要求・結果・最終回答まで成功。Pythonテスト2件もユーザーから「テストOK」と報告済。
- 15:21 JST: `cabal run agent-worker -- "こんにちは。自己紹介を一文でお願いします。"` はツール要求なしで通常回答し、終了コード0。ツールなしの経路も実測済み。
- 17:30頃 JST: LLM向け指示、ツール説明、実行ログを日本語化。ユーザーが `cabal test`、Python unittest、`cabal run agent-worker -- service-aのCPU使用率を調べて` を実行し、問題なしと報告。

## 直近の未確認変更
- 2026-10-12 JST: A1仕上げとして、`Agent.RunLog` を追加し、ツール要求・結果ログに呼び出し回数を付け、要求ログにはLLMが生成した元引数JSONを出すようにした。
- 追加テストは2件: 要求ログが `#1` と元引数を含むこと、結果ログが対応する `#1` を含むこと。これは「観測ログからA1の挙動を追えるか」を守るためのテストで、LLMの非決定的な出力には依存しない。
- まだユーザー環境での実行確認は未実施。次回は `cabal test` と `cabal run agent-worker -- service-aのCPU使用率を調べて` でログ表示を確認する。

## 次の候補
- A1は、今回のログ変更が実測で通れば区切れる見込み。
- 次はA2。いきなりツールを増やすより、まずツール実行ループの安全性を設計する。候補: 複数ツール要求を拒否するか順次処理するか、最大実行回数、拒否時に即停止するかLLMへエラーを返すか。
