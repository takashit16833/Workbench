# RS-0022 logging設計メモ

このNoteは、RS-0022でloggingと実行追跡の新しい構造を設計するための作業メモである。正本ではない。確定した内容は、必要に応じてRAGScope正本リポジトリのコード、Contract、Schema、テスト、設計へ反映する。

対応するCanvas: [[RAGScope実行追跡・構造化ログ基盤.canvas]]

## Canvasの役割

Canvasはmodule / 責務候補と依存方向だけを扱う。確定事項、設計判断、議論中の問い、比較案はこのNoteへ置く。

必要になれば、処理順序やfailure flowなど別の軸は別Canvasへ分ける。

## 正本ですでに確定していること

- 構造化ログ1件は、ある時点で起きた1つのイベントを記録する。
- 構造化ログ1件は、timestamp、component、event、level、TraceId、SpanIdを必須情報として持ち、messageとattributesを任意に持つ。
- levelはdebug、info、warn、error、fatalを扱う。
- attributesはstring、number、boolean、array、objectを再帰的に扱い、論理上のnullを持たない。
- error_typeは専用エラーobjectではなく通常のattributeとして扱う。
- 1回のuse case実行を1 traceとして追跡し、logはTraceId / SpanIdで発生時のspanへ関連付ける。
- 同じfailureをspanとlogの両方へ記録する場合は同じerror_typeを使う。
- 機能固有の閉じたevent表現から共通logging表現へ変換できること。
- 共通logging基盤は、機能固有のevent名、attributes、error_typeを任意に決定しないこと。
- Logging Runtime / Sinkはテストから差し替え可能であること。
- logging自身のfailureを、失敗した同じlogging経路へ再帰的に記録しないこと。
- OpenTelemetryはRAGScopeが決めた実行追跡を実現するために利用し、OpenTelemetry側の都合をRAGScopeの要求や公開APIへ昇格させないこと。

## 現時点で有力な設計アイデア

次は旧実装に存在したアイデアだが、旧実装を残す理由ではなく、白紙から見ても責務分離として有力な候補として扱う。

- 利用側が機能固有の閉じたevent型を所有する。
- eventをどのevent名、level、message、attributesとして記録するかという変換詳細を利用側が所有する。
- logging側は個別eventの詳細を知らず、eventを共通loggingへ変換する仕組みだけを知る。
- 通常の機能コードに任意のevent文字列やattributesをその都度組み立てさせない。

この考え方の採否と、Haskellでどう表現するかは分けて判断する。

## 未決定

- 最終的なmodule構成とmodule名。
- event → common logging変換をtypeclass、純粋関数、明示的なmapping valueなどのどれで表すか。
- 共通loggingの中間表現を独立した型・moduleとして持つか。
- componentを利用側のevent mappingが決めるか、application / logging runtimeが持つか。
- timestampをどの境界で取得するか。
- current span / TraceId / SpanIdをloggingへどう渡すか。
- level filteringをどこが担当するか。
- JSON projectionとSinkの順序・境界、およびSinkが論理recordとencoded bytesのどちらを受け取るか。
- logging failureをどこまで戻り値として扱い、application executionのsuccess / failureへどう影響させるか。
- execution trackingとloggingのmodule依存をどの向きにするか。
- OpenTelemetry adapterを独立moduleとして置く必要があるか。

## 設計の進め方

1. Canvas上でmodule / 責務候補と依存方向だけを整理する。
2. 1つの境界について議論し、決まった内容をこのNoteの未決定から採用内容へ移す。
3. 責務が十分に固まってから具体的なHaskell module名、公開API、中核型を決める。
4. 新設計が一度成立した後で旧実装を確認し、独立して有用なアイデアだけを再評価する。
5. OpenTelemetryの具体APIはRAGScope側の境界を決めた後に調査する。
