# RS-0022 logging設計メモ

作業メモ。正本ではない。

Canvas: [[RAGScope実行追跡・構造化ログ基盤.canvas]]

## 確定

- 1 log = 1 event
- log: timestamp / component / event / level / TraceId / SpanId / message? / attributes?
- `error_type` = attribute
- 1 use case = 1 trace
- logは発生時spanへ関連付ける
- feature event → common loggingへ変換可能
- common loggingはfeature固有のevent名・attributes・`error_type`を決めない
- Runtime / Sinkは差し替え可能
- logging failureを同じlogging経路へ再帰記録しない
- OTelはRAGScope設計の実装手段

## 候補

- feature側が閉じたevent型を持つ
- feature側がevent → logの変換詳細を持つ
- logging側は変換方法だけ知り、個別eventを知らない
- feature本体は生のevent名・attributesを組み立てない
- OTel SDK依存はapplication setupへ寄せ、利用側/共通境界はOTel APIまたはRAGScope adapter越しに使う

## 未決定

- module構成 / 公開API
- event → log変換のHaskell表現
- common log中間型
- component / timestamp / TraceId・SpanId / filteringの担当
- JSON / Sink境界
- logging failureの扱い
- tracking ↔ loggingの依存方向
- OTel adapterの要否
