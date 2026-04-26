import { describe, it, expect } from 'vitest'
import { analyze } from '../analyzer'

describe('analyzer orchestrator', () => {
  it('handles empty string gracefully', () => {
    const result = analyze('')
    expect(result.stats.totalLines).toBe(1)
    expect(result.scores.overall).toBeGreaterThanOrEqual(0)
    expect(result.scores.overall).toBeLessThanOrEqual(100)
  })

  it('returns correct line count', () => {
    const result = analyze('line 1\nline 2\nline 3')
    expect(result.stats.totalLines).toBe(3)
    expect(result.lines).toHaveLength(3)
  })

  it('detects issues in the sample bad CLAUDE.md', () => {
    const bad = `# My Project

This is my project. It does stuff properly and handles things nicely.
Make sure to test your changes when needed.

## Some Rules

- Always format code properly
- Handle errors when possible

## Deployment Steps

1. Pull latest changes
2. Run the build
3. Deploy to staging
4. Test on staging
5. Deploy to production

TODO: Add more documentation

- Use tabs for indentation in Python files
- Use 2-space indentation in all files`

    const result = analyze(bad)
    expect(result.stats.issueCount).toBeGreaterThan(5)
    expect(result.stats.warningCount).toBeGreaterThan(0)
  })

  it('gives high scores to a well-written CLAUDE.md', () => {
    const good = `# My Project

## Build Commands

\`\`\`bash
npm run dev    # Start development server
npm run build  # Production build
\`\`\`

## Test Commands

\`\`\`bash
npm test       # Run test suite
\`\`\`

## Project Layout

- \`src/api/\` -- API handlers
- \`src/lib/\` -- Shared utilities
- \`tests/\` -- Test files

## Coding Conventions

- Use 2-space indentation
- Use TypeScript strict mode
- Name components with PascalCase

## Git Workflow

- Create feature branches from \`main\`
- Run \`npm test\` before committing
- Use conventional commit messages`

    const result = analyze(good)
    expect(result.scores.overall).toBeGreaterThanOrEqual(60)
    expect(result.scores.structure.score).toBeGreaterThanOrEqual(70)
    expect(result.scores.completeness.score).toBe(100)
  })

  it('produces correct weighted overall score', () => {
    const result = analyze('# Title\n\n## Build\n\n```bash\nnpm build\n```\n\n- Rule')
    const expected = Math.round(
      result.scores.structure.score * 0.25 +
      result.scores.specificity.score * 0.30 +
      result.scores.completeness.score * 0.25 +
      result.scores.length.score * 0.20
    )
    expect(result.scores.overall).toBe(expected)
  })

  it('categorizes issues by severity correctly', () => {
    const result = analyze('# T\n\nTODO: fix\n\n- Use tabs\n- Use spaces')
    const { criticalCount, warningCount, infoCount, issueCount } = result.stats
    expect(criticalCount + warningCount + infoCount).toBe(issueCount)
  })

  it('assigns ambiguity scores per line', () => {
    const result = analyze('# R\n\n- Format code properly\n- Use 2-space indentation')
    const properlyLine = result.lines.find(l => l.text.includes('properly'))
    const specificLine = result.lines.find(l => l.text.includes('2-space'))
    expect(properlyLine?.ambiguityScore).toBeGreaterThan(0)
    expect(specificLine?.ambiguityScore).toBe(0)
  })
})
