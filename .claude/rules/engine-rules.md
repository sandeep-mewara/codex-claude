---
paths:
  - "src/engine/**/*.ts"
---

# Analysis Engine Conventions

- All functions must be pure: no side effects, no DOM access, no imports from React
- Rule IDs are kebab-case and unique across all modules
- Severity levels: `critical` for structural/contradiction issues, `warning` for actionable improvements, `info` for suggestions
- Every rule must check `isInCodeBlock()` to avoid false positives inside code fences
- File-level rules (that analyze the whole document once) guard with `if (ctx.lineIndex !== 0) return null`
- Suggestions must be concrete and actionable -- include example rewrites when possible
- Include `docLink` pointing to the relevant section of https://code.claude.com/docs/en/memory
- The rewriter may remove redundant content (duplicates, HTML comments, TODOs, personal preferences, contradictions) and extract path-specific rules and multi-step procedures, logging each removal as a change
