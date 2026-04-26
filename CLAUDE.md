# Codex Claude

A client-side React app that analyzes and optimizes CLAUDE.md files against official best practices.

## Build Commands

```bash
npm run dev          # Start Vite dev server on localhost:5173
npm run build        # TypeScript check + production build to dist/
npm run build:single # Build single-file HTML to dist-single/
npm run lint         # Run ESLint
```

## Test Commands

```bash
npm test             # Run Vitest test suite
npm run test:watch   # Watch mode during development
```

Tests live in `src/engine/__tests__/` and cover all rule modules, the analyzer orchestrator, and the rewriter.

## Project Layout

- `src/engine/` -- Analysis engine (pure TypeScript, no React dependencies)
  - `types.ts` -- Shared types for rules, issues, scores, rewrites
  - `analyzer.ts` -- Orchestrator that runs all rule modules
  - `rewriter.ts` -- Applies rule-based transforms to produce optimized output
  - `rules/` -- Individual rule modules (ambiguity, structure, antipatterns, completeness)
- `src/components/` -- React UI components
  - `ui/` -- Primitive components (Button, Card, Badge, Tabs, Progress, Alert)
  - Top-level files are feature components (UploadArea, AmbiguityHeatmap, etc.)
- `src/data/` -- Static data (sample CLAUDE.md, best practices reference)
- `src/lib/utils.ts` -- Utility functions (cn, scoring helpers, file download)

## Coding Conventions

- Use TypeScript strict mode; never use `any`
- Import aliases: `@/` maps to `src/`
- Components use named exports; one component per file
- Engine code must be pure functions with no side effects
- Use `cn()` from `@/lib/utils` for conditional class merging
- Tailwind CSS for all styling; no inline style objects except for dynamic values
- Rule modules export arrays of `Rule` objects following the interface in `types.ts`

## Architecture Decisions

- Pure client-side: no backend, no API keys, all analysis runs in the browser
- Rules-based engine: deterministic, fast, no AI dependency for analysis
- Dual build: standard `dist/` for GitHub Pages + single-file HTML for offline use
- CodeMirror 6 for editor with custom ViewPlugin decorations for heatmap
