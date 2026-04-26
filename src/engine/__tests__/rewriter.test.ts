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

  it('preserves all original content (no deletions)', () => {
    const md = '## Build\n\n```bash\nnpm run build\n```\n\n## Rules\n\n- Use TypeScript\n- Always test'
    const result = rewrite(md, analyze(md))
    expect(result.optimizedMarkdown).toContain('npm run build')
    expect(result.optimizedMarkdown).toContain('Use TypeScript')
  })

  it('returns empty changes for a perfect file', () => {
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

  it('adds skill suggestions for multi-step procedures', () => {
    const md = '## Deploy\n\n1. Pull\n2. Build\n3. Test\n4. Deploy\n5. Verify'
    const result = rewrite(md, analyze(md))
    expect(result.changes.some(c =>
      c.category === 'antipattern' && c.reason.includes('Skill')
    )).toBe(true)
  })
})
