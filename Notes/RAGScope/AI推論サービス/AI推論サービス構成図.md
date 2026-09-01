---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-01
---

# AI推論サービス構成図

`ragscope_ai_service`の共通エラー周辺のmodule依存を示す。

```mermaid
flowchart LR
    subgraph service["ragscope_ai_service"]
        subgraph error_pkg["ragscope_ai_service.error — 共通エラー"]
            types["error/types.py<br/>ErrorCategory<br/>ErrorValue / ErrorContext<br/>AppError"]
            boundary["error/boundary.py<br/>想定外例外の最外側境界<br/>run_with_unexpected_exception_boundary"]
            init["error/__init__.py<br/>package公開入口<br/>現在は空"]
        end

        result["result.py<br/>Success[T] / Failure / AppResult[T]<br/>FailureはAppErrorを保持"]
    end

    result -->|AppError| types
    boundary -->|AppResult / Failure| result
    boundary -->|AppError / ErrorCategory| types
```

`code`の意味は機能側が決め、`cause`は内部原因を保持する。最外側境界では`AppResult[T]`をそのまま通し、漏れた`Exception`だけを`internal.unexpected`の`Failure(AppError)`へ変換し、元例外はその`cause`のみに保持する。
