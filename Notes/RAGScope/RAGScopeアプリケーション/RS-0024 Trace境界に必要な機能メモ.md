---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-09
---

# RS-0024 Trace境界に必要な機能メモ

> [!note]
> RS-0024のTrace境界を検討するためのWorkbench上の学習メモ。RAGScopeの正本ではない。

## RAGScopeとして欲しい機能

- TracerPraviderを作成する
	- `createTracerProvider :: MonadIO m => [SpanProcessor] -> TracerProviderOptions -> m TracerProvider`
- root Spanを作成する
- child Spanを作成できる
- Spanの実行範囲を開始・終了できる
- Span実行中はそのSpanを現在のSpanとして扱い、終了後は元へ戻せる
- Spanを`Unset`または`Error`として扱える
- `error.type`など必要な属性をSpanへ付けられる
- 未処理の同期例外がSpan外へ出るとき、Spanへ失敗情報を残しつつ元の例外を再throwできる
- 不要な例外Span Eventを重複して記録しない
- 現在のTrace Contextを後続処理へ引き継げる

### TracerProvider関連
#### TracerProviderを作成する
Initialize a new tracer provider
You should generally use getGlobalTracerProvider for most applications.
```haskell
createTracerProvider
:: MonadIO m
=> [SpanProcessor]
-> TracerProviderOptions
-> m TracerProvider
```

```haskell
getGlobalTracerProvider :: MonadIO m => m TracerProvider
```
 Access the globally configured TracerProvider. Once the the global tracer provider is initialized via the OpenTelemetry SDK, Tracers created from this TracerProvider will export spans to their configured exporters. Prior to that, any Tracers acquired from the uninitialized TracerProvider will create no-op spans.
#### TracerProviderをシャットダウンする
```haskell
shutdownTracerProviderSource#
:: MonadIO m	 
=> TracerProvider	 
-> Maybe Int           Optional timeout in microseconds, defaults to 5,000,000 (5s)
-> m ShutdownResult
```
This method provides a way for provider to do any cleanup required.
This will also trigger shutdowns on all internal processors.
### Tracer関連
#### Tracerを作成する
```haskell
makeTracer :: TracerProvider -> InstrumentationLibrary -> TracerOptions -> Tracer
```
Construct a Tracer from a provider, library, and options.

Prefer a non-empty libraryName per the OpenTelemetry specification; use getTracer if you want a warning when the name is empty.
```haskell
getTracer :: MonadIO m => TracerProvider -> InstrumentationLibrary -> TracerOptions -> m Tracer
```
Like makeTracer but caches by InstrumentationLibrary, so repeated calls with the same scope return the same Tracer instance. Spec: implementations SHOULD return a single Tracer per InstrumentationScope.
### root Spanを作成する




The action to perform. inSpan will record the time spent on the action without forcing strict evaluation of the result. Any uncaught exceptions will be recorded and rethrown.
```haskell
inSpan
:: (MonadUnliftIO m, HasCallStack)
=> Tracer
-﻿> Text                 The name of the span. This may be updated later via updateName
-﻿> SpanArguments        Additional options for creating the span, such as Spankind, span links, 
                        astarting attributes, etc.
-﻿> m a                  The action to perform. inSpan will record the time spent on the action
                        without forcing strict evaluation of the result. Any uncaught exceptions 
                        will be recorded and rethrown 
-> m a
```
The simplest function for annotating code with trace information.


---
## 必要な知識
### 用語

#### Telemetry

システムの実行状態を観測するためのデータの総称。
RAGScopeでは主にTrace・Logs・Metricsを指す。

#### Instrumentation Scope

Telemetryを生成した計装コードを識別する情報。
Tracerに紐づき、名前やversionなどを持つ。

- Instrumentation Scope: 誰がTelemetryを生成したか
- Trace Context: どのTrace / Spanの親子関係にいるか

両者は別の概念。
#### TracerProvider
ここは **TracerProvider が全Tracerに共通で持たせる設定** ですね。

それぞれかなりざっくり言うと、

- **processors**  
    Spanが終わったとき等に、そのSpanをどう処理するか。たとえばExporterへ渡す前段。
    
- **sampler**  
    そのTrace/Spanを記録対象にするかどうかを決めるもの。
    
- **resource**  
    そのTelemetryが「どの実行環境・サービスから出たか」を表す共通属性。サービス名や環境情報など。
    
- **limits**  
    Spanに持てる属性数やEvent数などの上限。
    
- **propagators**  
    Trace ContextなどをHTTP header等へ載せたり、取り出したりする仕組み。
    

つまり、

> TracerProvider = Tracerを作るFactory + 全Tracerで共有するObservability設定の置き場

という理解でいいです。
#### Tracer
**Tracer = Spanを作るための入口となるオブジェクト**です。

ざっくり関係はこうです。

```text
TracerProvider
  ↓ Tracerを作る
Tracer
  ↓ Spanを作る
Span
```

Tracer自体が「1回の処理」ではありません。**同じ計装コードからSpanを作るための生成元**です。

今回の文脈だと、

```text
RAGScope.Telemetry.OpenTelemetry
  ↓
Tracerを持つ
  ↓
必要な場所でSpanを作る
```

というイメージです。

あと、さっきのInstrumentation ScopeはこのTracerに紐づく、と考えるとつながります。

> Tracer = Spanを作るもの  
> Instrumentation Scope = そのTracerがどの計装コードに属するかを表す情報
### 型・関数など
---
## ChatGPTへ質問するときのプロンプト

次の用語・型・関数について、Haddockを自分で読みながら理解したいです。
質問した範囲だけ、必要最小限で説明してください。

- まず一文で何かを説明する
- RAGScopeでなぜ関係するかを短く説明する
- 正確な理解に必要なら、混同しやすい概念との差を1つだけ補足する
- 私が求めるまで、候補関数名・検索語・実装方法などのネタバレは出さない
- 次に調べるものを先回りして列挙しない
- 私の理解が誤っている場合は、その点だけ明確に指摘する
