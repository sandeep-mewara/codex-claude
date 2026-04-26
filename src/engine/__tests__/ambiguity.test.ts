import { describe, it, expect } from 'vitest'
import { analyze } from '../analyzer'

function issueIds(markdown: string): string[] {
  return analyze(markdown).issues.map(i => i.ruleId)
}

function hasIssue(markdown: string, ruleId: string): boolean {
  return issueIds(markdown).includes(ruleId)
}

describe('ambiguity rules', () => {
  describe('vague-adjective', () => {
    it('flags "properly"', () => {
      expect(hasIssue('## Rules\n\n- Format code properly', 'vague-adjective')).toBe(true)
    })
    it('flags "nicely"', () => {
      expect(hasIssue('## R\n\nHandle errors nicely', 'vague-adjective')).toBe(true)
    })
    it('flags "clean"', () => {
      expect(hasIssue('## R\n\nWrite clean code', 'vague-adjective')).toBe(true)
    })
    it('does NOT flag inside code blocks', () => {
      expect(hasIssue('## R\n\n```\nFormat code properly\n```', 'vague-adjective')).toBe(false)
    })
    it('does NOT flag in headers', () => {
      expect(hasIssue('## Write good code', 'vague-adjective')).toBe(false)
    })
  })

  describe('open-qualifier', () => {
    it('flags "when needed"', () => {
      expect(hasIssue('## R\n\n- Add tests when needed', 'open-qualifier')).toBe(true)
    })
    it('flags "as necessary"', () => {
      expect(hasIssue('## R\n\nRefactor as necessary', 'open-qualifier')).toBe(true)
    })
    it('flags "if appropriate"', () => {
      expect(hasIssue('## R\n\nUse caching if appropriate', 'open-qualifier')).toBe(true)
    })
    it('does NOT flag inside code blocks', () => {
      expect(hasIssue('## R\n\n```\nAdd tests when needed\n```', 'open-qualifier')).toBe(false)
    })
  })

  describe('no-path-reference', () => {
    it('flags mention of files without paths', () => {
      expect(hasIssue('## R\n\nKeep files organized', 'no-path-reference')).toBe(true)
    })
    it('does NOT flag when backtick path present', () => {
      expect(hasIssue('## R\n\nKeep files in `src/api/`', 'no-path-reference')).toBe(false)
    })
  })

  describe('no-command-in-instruction', () => {
    it('flags "run the build" without a command', () => {
      expect(hasIssue('## R\n\nRun the build before pushing', 'no-command-in-instruction')).toBe(true)
    })
    it('does NOT flag when backtick command present', () => {
      expect(hasIssue('## R\n\nRun `npm run build` before pushing', 'no-command-in-instruction')).toBe(false)
    })
    it('does NOT flag when next line is a code block', () => {
      expect(hasIssue('## R\n\nRun the build:\n```bash\nnpm run build\n```', 'no-command-in-instruction')).toBe(false)
    })
  })

  describe('subjective-style', () => {
    it('flags "readable" without qualification', () => {
      expect(hasIssue('## R\n\nMake code readable', 'subjective-style')).toBe(true)
    })
    it('does NOT flag "readable" with "by" qualification', () => {
      expect(hasIssue('## R\n\nMake code readable by using short functions', 'subjective-style')).toBe(false)
    })
  })

  describe('unquantified-limit', () => {
    it('flags "keep functions short" without number', () => {
      expect(hasIssue('## R\n\nKeep functions short', 'unquantified-limit')).toBe(true)
    })
    it('does NOT flag when a number is present', () => {
      expect(hasIssue('## R\n\nKeep functions under 30 lines', 'unquantified-limit')).toBe(false)
    })
  })

  describe('etc-trailing', () => {
    it('flags lines ending with "etc."', () => {
      expect(hasIssue('## R\n\n- Use React, Vue, etc.', 'etc-trailing')).toBe(true)
    })
    it('flags lines ending with "..."', () => {
      expect(hasIssue('## R\n\n- Handle errors, logging...', 'etc-trailing')).toBe(true)
    })
  })

  describe('should-vs-must', () => {
    it('flags "should" in instructions', () => {
      expect(hasIssue('## R\n\nYou should use TypeScript', 'should-vs-must')).toBe(true)
    })
    it('does NOT flag "should not"', () => {
      expect(hasIssue('## R\n\nYou should not use var', 'should-vs-must')).toBe(false)
    })
  })
})
