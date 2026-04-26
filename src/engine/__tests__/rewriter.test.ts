import { describe, it, expect } from 'vitest'
import { analyze } from '../analyzer'
import { rewrite } from '../rewriter'

describe('rewriter', () => {
  it('adds headers when none exist', () => {
    const md = 'Just plain text\nwith no headers'
    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('# CLAUDE.md')
    expect(result.changes.some(c => c.category === 'structure')).toBe(true)
  })

  it('replaces known vague phrases', () => {
    const md = '## Rules\n\n- Always format code properly'
    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('format code properly')
    expect(result.optimizedMarkdown).toContain('formatting')
  })

  it('adds missing section templates', () => {
    const md = '# Project\n\n- A rule'
    const analysis = analyze(md)
    const missingWorkflow = analysis.issues.some(i => i.ruleId === 'missing-workflow')
    if (missingWorkflow) {
      const result = rewrite(md, analysis)
      expect(result.optimizedMarkdown).toContain('## Workflow')
      expect(result.changes.some(c => c.category === 'completeness')).toBe(true)
    }
  })

  it('returns few changes for a well-structured file', () => {
    const md = `# Project

## Build Commands

\`\`\`bash
npm run build
\`\`\`

## Test Commands

\`\`\`bash
npm test
\`\`\`

## Project Layout

- \`src/\` -- Source code

## Coding Conventions

- Use 2-space indentation

## Workflow

- Create branches from \`main\``

    const result = rewrite(md, analyze(md))
    expect(result.changes.length).toBeLessThanOrEqual(2)
  })
})

describe('removeDuplicateLines', () => {
  it('removes near-duplicate instructions', () => {
    const md = `## Rules

- Use consistent formatting for all code
- Some other rule that is different
- Use consistent formatting for all code files`

    const result = rewrite(md, analyze(md))
    const dupeChanges = result.changes.filter(c => c.reason.includes('duplicate'))
    expect(dupeChanges.length).toBeGreaterThanOrEqual(1)
    const lines = result.optimizedMarkdown.split('\n').filter(l => l.includes('consistent formatting'))
    expect(lines.length).toBe(1)
  })

  it('does not remove non-duplicate lines', () => {
    const md = `## Rules

- Use TypeScript for all new files
- Run prettier before committing`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('Use TypeScript')
    expect(result.optimizedMarkdown).toContain('Run prettier')
  })
})

describe('removeHtmlComments', () => {
  it('removes HTML comments from output', () => {
    const md = `## Build

<!-- this is an HTML comment that wastes space -->

- Run npm build`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('<!-- this is an HTML comment')
    expect(result.changes.some(c => c.reason.includes('HTML comment'))).toBe(true)
  })

  it('preserves comments inside code blocks', () => {
    const md = `## Build

\`\`\`html
<!-- valid HTML comment in code -->
\`\`\`

- Run npm build`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('<!-- valid HTML comment in code -->')
  })
})

describe('removeTodosAndFixmes', () => {
  it('removes TODO/FIXME lines', () => {
    const md = `## Rules

- Use TypeScript strict mode
- TODO: add linting rules later
- FIXME: this section is incomplete`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('TODO:')
    expect(result.optimizedMarkdown).not.toContain('FIXME:')
    expect(result.changes.some(c => c.reason.includes('TODO'))).toBe(true)
  })

  it('preserves real instructions alongside', () => {
    const md = `## Rules

- Use TypeScript strict mode
- TODO: maybe update this`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('Use TypeScript strict mode')
  })
})

describe('removePersonalPreferences', () => {
  it('removes personal preference lines', () => {
    const md = `## Rules

- Use TypeScript for all files
- I prefer using vim for editing`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('I prefer using vim')
    expect(result.changes.some(c => c.reason.includes('personal preference') || c.reason.includes('Personal preference'))).toBe(true)
  })
})

describe('extractPathSpecificRules', () => {
  it('removes path-specific instructions', () => {
    const md = `## Rules

- Use TypeScript strict mode
- When editing \`src/components/\` always use functional components`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('src/components/')
    expect(result.changes.some(c => c.reason.includes('path-specific') || c.reason.includes('Path-specific'))).toBe(true)
  })
})

describe('extractMultiStepProcedures', () => {
  it('removes multi-step procedures (>3 steps)', () => {
    const md = `## Deploy

1. Pull the latest code
2. Run the build command
3. Run all tests
4. Deploy to production
5. Verify deployment

## Rules

- Use TypeScript`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toContain('Pull the latest code')
    expect(result.optimizedMarkdown).not.toContain('Deploy to production')
    expect(result.optimizedMarkdown).toContain('Use TypeScript')
    expect(result.changes.some(c => c.reason.includes('procedure') || c.reason.includes('Skill'))).toBe(true)
  })

  it('keeps short numbered lists (<=3 steps)', () => {
    const md = `## Deploy

1. Build the project
2. Run tests
3. Deploy

## Rules

- Use TypeScript`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('Build the project')
  })
})

describe('removeContradictions', () => {
  it('removes contradicting rules', () => {
    const md = `## Formatting

- Use tabs for indentation
- Use spaces for indentation`

    const result = rewrite(md, analyze(md))
    const contradictionChanges = result.changes.filter(c => c.reason.includes('contradicting') || c.reason.includes('Contradicting'))
    expect(contradictionChanges.length).toBeGreaterThanOrEqual(1)
  })
})

describe('collapseVerboseBullets', () => {
  it('collapses verbose bullet continuations', () => {
    const md = `## Rules

- Use TypeScript strict mode
  this is a very long continuation line that explains why
  and this is another continuation line with more details
  and yet another continuation line that goes on and on
  and a fourth line just to be extra verbose about it`

    const result = rewrite(md, analyze(md))
    const collapseChanges = result.changes.filter(c => c.reason.includes('Condensed') || c.reason.includes('verbose'))
    expect(collapseChanges.length).toBeGreaterThanOrEqual(1)
  })
})

describe('stripExcessiveBlankLines', () => {
  it('collapses multiple blank lines to one', () => {
    const md = `## Rules


- First rule



- Second rule`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).not.toMatch(/\n{4,}/)
    expect(result.optimizedMarkdown).toContain('First rule')
    expect(result.optimizedMarkdown).toContain('Second rule')
  })

  it('preserves single blank lines', () => {
    const md = `## Rules

- First rule

- Second rule`

    const analysis = analyze(md)
    const result = rewrite(md, analysis)
    const blankChanges = result.changes.filter(c => c.reason.includes('blank line'))
    expect(blankChanges.length).toBe(0)
  })
})

describe('full pipeline integration', () => {
  it('compacts a bloated CLAUDE.md significantly', () => {
    const md = `# My Project

<!-- Draft instructions -- do not share -->

## Rules

- Always format code properly
- Use consistent formatting for everything
- Use consistent formatting for all project code
- I prefer dark themes in my editor
- TODO: add more rules later

## Path Rules

- When editing \`src/api/\` use REST conventions
- For files in \`src/components/\` use functional React

## Deploy Process

1. Checkout main
2. Pull latest changes
3. Run build
4. Run tests
5. Deploy to staging
6. Verify staging
7. Deploy to production



`

    const result = rewrite(md, analyze(md))
    const originalLines = md.split('\n').length
    const optimizedLines = result.optimizedMarkdown.split('\n').length
    expect(optimizedLines).toBeLessThan(originalLines)
    expect(result.changes.length).toBeGreaterThan(3)
    expect(result.optimizedMarkdown).toContain('# My Project')
  })

  it('preserves code blocks untouched', () => {
    const md = `## Build

\`\`\`bash
npm run build
npm test
\`\`\`

## Rules

- Use TypeScript`

    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('npm run build')
    expect(result.optimizedMarkdown).toContain('npm test')
    expect(result.optimizedMarkdown).toContain('Use TypeScript')
  })
})
