import { describe, it, expect } from 'vitest'
import { analyze } from '../analyzer'

function hasIssue(markdown: string, ruleId: string): boolean {
  return analyze(markdown).issues.some(i => i.ruleId === ruleId)
}

describe('structure rules', () => {
  describe('no-headers', () => {
    it('flags content with no headers', () => {
      expect(hasIssue('Just some text\nwith no headers\nat all', 'no-headers')).toBe(true)
    })
    it('does NOT flag content with headers', () => {
      expect(hasIssue('# Title\n\nSome content', 'no-headers')).toBe(false)
    })
  })

  describe('single-header', () => {
    it('flags content with exactly one header', () => {
      expect(hasIssue('# Title\n\nSome content here\n- A rule\n- Another', 'single-header')).toBe(true)
    })
    it('does NOT flag content with multiple headers', () => {
      expect(hasIssue('# Title\n\n## Section\n\n- Content', 'single-header')).toBe(false)
    })
  })

  describe('exceeds-200-lines', () => {
    it('flags files over 200 lines', () => {
      const long = '# Title\n\n' + Array(210).fill('- A rule').join('\n')
      expect(hasIssue(long, 'exceeds-200-lines')).toBe(true)
    })
    it('does NOT flag files under 200 lines', () => {
      const short = '# Title\n\n' + Array(50).fill('- A rule').join('\n')
      expect(hasIssue(short, 'exceeds-200-lines')).toBe(false)
    })
  })

  describe('approaching-limit', () => {
    it('flags files between 151-200 lines', () => {
      const md = '# Title\n\n' + Array(160).fill('- A rule').join('\n')
      expect(hasIssue(md, 'approaching-limit')).toBe(true)
    })
  })

  describe('no-code-blocks', () => {
    it('flags files without code blocks', () => {
      const lines = Array(15).fill('- Some instruction')
      expect(hasIssue('# Title\n\n' + lines.join('\n'), 'no-code-blocks')).toBe(true)
    })
    it('does NOT flag files with code blocks', () => {
      expect(hasIssue('# Title\n\n```bash\nnpm test\n```\n\n- Rule', 'no-code-blocks')).toBe(false)
    })
  })

  describe('no-bullet-points', () => {
    it('flags files with no bullets or lists', () => {
      const lines = Array(8).fill('Some plain text.')
      expect(hasIssue('# Title\n\n' + lines.join('\n'), 'no-bullet-points')).toBe(true)
    })
    it('does NOT flag files with bullets', () => {
      expect(hasIssue('# Title\n\n- A bullet\n- Another', 'no-bullet-points')).toBe(false)
    })
  })

  describe('missing-blank-lines', () => {
    it('flags header without blank line after', () => {
      expect(hasIssue('## Section\nContent right after', 'missing-blank-lines')).toBe(true)
    })
    it('does NOT flag header with blank line after', () => {
      expect(hasIssue('## Section\n\nContent after blank', 'missing-blank-lines')).toBe(false)
    })
  })

  describe('scores', () => {
    it('gives high structure score to well-structured content', () => {
      const good = '# Project\n\n## Build\n\n```bash\nnpm run build\n```\n\n## Rules\n\n- Use TypeScript\n- Use 2-space indent'
      const result = analyze(good)
      expect(result.scores.structure.score).toBeGreaterThanOrEqual(70)
    })

    it('gives low structure score to unstructured content', () => {
      const bad = 'Just some text\nwithout any structure\nat all.'
      const result = analyze(bad)
      expect(result.scores.structure.score).toBeLessThan(50)
    })
  })
})
