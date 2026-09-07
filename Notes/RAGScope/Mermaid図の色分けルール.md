---
fileClass: Note
type: note
projects:
  - "[[RAGScope]]"
created: 2026-09-08
---

# Mermaid図の色分けルール

静的依存図では、公開状態を文字で重複表示せず、色で区別する。Obsidianの`retro-hacker-blue.css`に合わせ、明るいベタ塗りを避けて、暗い面色と枠色の組み合わせで状態を示す。文字は暗い背景上で十分なコントラストを保つ。

- 公開library / module: 背景 `#052A59`、枠 `#5EAFFF`、文字 `#DDF0FF`
- 非公開library / module: 背景 `#211536`、枠 `#8A5EC0`、文字 `#DDF0FF`
- 別package / 外部package: 背景 `#001947`、枠 `#316CBD`、文字 `#A6CAFF`
- Cabal packageの外枠: 背景は透明、枠 `#153A75`、ラベル `#4C9EEB`

Mermaidでは原則として次のclassを使う。

```mermaid
classDef public fill:#052A59,stroke:#5EAFFF,color:#DDF0FF,stroke-width:2px
classDef private fill:#211536,stroke:#8A5EC0,color:#DDF0FF,stroke-width:2px
classDef external fill:#001947,stroke:#316CBD,color:#A6CAFF,stroke-width:2px
```

各図には、色の意味を短い凡例として残す。色分けの目的は公開・非公開・外部の状態を判別できるようにすることであり、図全体の配色を目立たせることではない。

参照するObsidianテーマ: `takashit16833/dotfiles/obsidian/css/retro-hacker-blue.css`
