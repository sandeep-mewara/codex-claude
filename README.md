# Codex Claude

A client-side tool that analyzes and optimizes your **CLAUDE.md** and **SKILL.md** files against [official best practices](https://code.claude.com/docs/en/memory). Built for beginners learning to work with Claude Code and Cursor.

Paste your file, hit **Analyze**, and get instant feedback: efficiency scores, an ambiguity heatmap, anti-pattern detection, an optimized rewrite, and a learning summary explaining every change.

## Features

- **Efficiency Check** -- four score cards (Structure, Specificity, Completeness, Length) with a weighted overall score.
- **Ambiguity Heatmap** -- line-by-line color coding (green/yellow/red) showing how specific your instructions are. Click any line for an explanation and suggested fix.
- **Anti-Patterns Detection** -- detects multi-step procedures that should be Skills, path-specific instructions that belong in `.claude/rules/`, contradictions, duplicates, and more.
- **Optimized Output** -- side-by-side diff of your original vs. the rule-based rewrite with copy and download buttons.
- **Learning Summary** -- every change explained with a "why" and a link to the relevant official documentation.
- **SKILL.md Mode** -- toggle to analyze SKILL.md files with frontmatter validation, content quality checks, and structure analysis.

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

## Build

```bash
# Production build (outputs to dist/)
npm run build

# Single-file HTML for offline use (outputs to dist-single/)
npm run build:single

# Preview the production build locally
npm run preview
```

## Build for Offline Use

The single-file build compiles the entire app into one self-contained HTML file:

```bash
npm run build:single
```

Open `dist-single/index.html` directly in any browser -- no server needed, works completely offline.

## Deploy to GitHub Pages

The repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that automatically builds and deploys to GitHub Pages on every push to `main`. It also includes the single-file HTML as a downloadable asset in the deployed site.

To enable: go to your repo Settings > Pages > Source > GitHub Actions.

## Tests

```bash
# Run the full test suite
npm test

# Watch mode during development
npm run test:watch
```

Tests cover the analysis engine (all rule modules, the orchestrator, and the rewriter) to ensure changes don't break detection logic.

## Project Structure

```
codex-claude/
├── CLAUDE.md                      # Project's own CLAUDE.md (dog-fooding)
├── .claude/
│   ├── skills/add-analysis-rule/  # Skill: guide for adding new analysis rules
│   └── rules/                     # Path-scoped conventions for this project
├── src/
│   ├── engine/                    # Analysis engine (pure TS, no React deps)
│   │   ├── analyzer.ts            # CLAUDE.md analysis orchestrator
│   │   ├── skill-analyzer.ts      # SKILL.md analysis orchestrator
│   │   ├── rewriter.ts            # Rule-based rewrite engine
│   │   ├── types.ts               # Shared types
│   │   └── rules/                 # Rule modules (ambiguity, structure, etc.)
│   ├── components/                # React UI components
│   │   ├── ui/                    # Primitives (Button, Card, Badge, Tabs, etc.)
│   │   └── *.tsx                  # Feature components (Heatmap, AntiPatterns, etc.)
│   ├── data/                      # Sample files and best-practice reference data
│   └── lib/utils.ts               # Utility functions
├── .github/workflows/deploy.yml   # GitHub Pages auto-deploy
├── vite.config.ts                 # Standard build config
└── vite.config.singlefile.ts      # Single-file build config
```

## How It Works

The engine is entirely client-side -- no backend, no API keys. It parses the markdown into lines, runs ~40 detection rules across four categories, and produces a scored analysis:

| Category | Weight | What it checks |
|---|---|---|
| Structure | 25% | Headers, bullets, code blocks, paragraph density |
| Specificity | 30% | Vague language, missing paths/commands, subjective guidance |
| Completeness | 25% | Build commands, test commands, project layout, conventions, workflow |
| Length | 20% | Line count vs. the 200-line recommendation |

The rewriter applies structural fixes, replaces vague instructions with concrete alternatives, appends missing section templates, and actively compacts the file by removing duplicates, HTML comments, TODOs, personal preferences, and contradictions. It also extracts path-specific rules and multi-step procedures with guidance on where to relocate them. Every change is logged in the Learning Summary.

## Claude Code & Cursor Compatibility

The tool is built around the CLAUDE.md spec, which is read by both **Claude Code** and **Cursor**. All analysis and optimization applies universally -- a well-structured CLAUDE.md benefits both tools equally.

Where the tools diverge is in how they organize rules and skills:

| Feature | Claude Code | Cursor |
|---|---|---|
| `CLAUDE.md` | `.claude/rules/` with `paths:` frontmatter | `.cursor/rules/` |
| Skills | `.claude/skills/*/SKILL.md` | `.cursor/skills/` |
| Local overrides | `CLAUDE.local.md` (gitignored) | Not applicable |

When the optimizer recommends moving content to `.claude/rules/` or `.claude/skills/`, Cursor users should use the `.cursor/` equivalents instead. The tool includes these notes automatically in the Optimized Output and Learning Summary.

## Adding New Rules

This project includes a Claude Code Skill for adding rules:

```
.claude/skills/add-analysis-rule/SKILL.md
```

Follow the steps in that Skill, or see `src/engine/rules/ambiguity.ts` for examples of the `Rule` interface.

## Versioning

The app uses standard semver (`MAJOR.MINOR.PATCH`) in `package.json` but displays only two digits (`v1.0`) in the footer.

- **Major** bump (`1.x.x` → `2.0.0`): breaking changes or major overhaul
- **Minor** bump (`1.0.x` → `1.1.0`): new features, rule additions, bug fixes
- **Patch** bump (`1.0.0` → `1.0.1`): minor tweaks (not shown in UI)

To release a new version:

1. Update `"version"` in `package.json` (e.g., `"1.0.0"` → `"1.1.0"`)
2. Commit and push your changes
3. Tag the release: `git tag v1.1`
4. Push the tag: `git push --tags`

## Tech Stack

- [Vite](https://vite.dev) + [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- [CodeMirror 6](https://codemirror.net) via `@uiw/react-codemirror` (editor + heatmap decorations)
- [Vitest](https://vitest.dev) for testing
- [vite-plugin-singlefile](https://github.com/nickreese/vite-plugin-singlefile) for offline HTML build
