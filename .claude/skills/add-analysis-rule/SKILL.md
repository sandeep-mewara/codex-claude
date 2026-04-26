---
name: add-analysis-rule
description: Add a new analysis rule to the CLAUDE.md optimizer engine. Use when creating a new detection rule for ambiguity, structure, anti-patterns, or completeness checking.
---

# Adding a New Analysis Rule

Follow these steps to add a new rule to the analysis engine.

## 1. Choose the right rule module

Pick the module based on what the rule detects:
- `src/engine/rules/ambiguity.ts` -- Vague or unverifiable language
- `src/engine/rules/structure.ts` -- Markdown formatting and organization
- `src/engine/rules/antipatterns.ts` -- Known bad patterns in CLAUDE.md files
- `src/engine/rules/completeness.ts` -- Missing critical sections

## 2. Define the rule object

Add a new entry to the module's exported array. Every rule must conform to the `Rule` interface from `src/engine/types.ts`:

```typescript
{
  id: 'kebab-case-unique-id',       // Unique across all modules
  name: 'Human-Readable Name',
  category: 'ambiguity',             // Must match the module's category
  severity: 'warning',               // 'critical' | 'warning' | 'info'
  description: 'One-line description for documentation',
  docLink: 'https://code.claude.com/docs/en/memory#relevant-section',  // Optional
  test: (line, ctx) => { ... }       // Returns RuleMatch | null
}
```

## 3. Write the test function

The `test` function receives:
- `line`: The current line text
- `ctx`: A `RuleContext` with `lineIndex`, `allLines`, `totalLines`, `headers`, `codeBlocks`

Important patterns:
- Return `null` for no match, or a `{ message, suggestion, originalText? }` object
- Always check `isInCodeBlock()` to avoid false positives inside code fences
- For file-level rules (run once), guard with `if (ctx.lineIndex !== 0) return null`
- Include `originalText: line.trim()` when the flagged text helps the user understand

## 4. Verify the rule

Run `npm run build` to type-check. Then test with the dev server:
1. `npm run dev`
2. Paste a CLAUDE.md that should trigger the rule
3. Confirm it appears in the correct tab (Heatmap, Anti-Patterns, etc.)
4. Verify the suggestion text is clear and actionable
