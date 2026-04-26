import { describe, it, expect } from 'vitest'
import { analyze } from '../analyzer'

function hasIssue(markdown: string, ruleId: string): boolean {
  return analyze(markdown).issues.some(i => i.ruleId === ruleId)
}

describe('anti-pattern rules', () => {
  describe('multi-step-procedure', () => {
    it('flags numbered lists with >3 steps', () => {
      const md = '## Deploy\n\n1. Pull code\n2. Build\n3. Test\n4. Deploy\n5. Verify'
      expect(hasIssue(md, 'multi-step-procedure')).toBe(true)
    })
    it('does NOT flag numbered lists with <=3 steps', () => {
      const md = '## Steps\n\n1. Build\n2. Test\n3. Deploy'
      expect(hasIssue(md, 'multi-step-procedure')).toBe(false)
    })
    it('does NOT flag numbered lists inside code blocks', () => {
      const md = '## Steps\n\n```\n1. Build\n2. Test\n3. Deploy\n4. Verify\n5. Done\n```'
      expect(hasIssue(md, 'multi-step-procedure')).toBe(false)
    })
  })

  describe('path-specific-instruction', () => {
    it('flags **/*.ts pattern', () => {
      const md = '## Rules\n\n- Use strict mode for **/*.ts files'
      expect(hasIssue(md, 'path-specific-instruction')).toBe(true)
    })
    it('flags `src/...` paths', () => {
      const md = '## Rules\n\n- Handlers in `src/api/handlers` must validate input'
      expect(hasIssue(md, 'path-specific-instruction')).toBe(true)
    })
  })

  describe('duplicate-instruction', () => {
    it('flags near-duplicate lines', () => {
      const md = '## Rules\n\n- Always use TypeScript strict mode\n- You must always use TypeScript strict mode'
      expect(hasIssue(md, 'duplicate-instruction')).toBe(true)
    })
    it('does NOT flag short lines', () => {
      const md = '## Rules\n\n- Use TS\n- Use TS'
      expect(hasIssue(md, 'duplicate-instruction')).toBe(false)
    })
  })

  describe('personal-preference-in-project', () => {
    it('flags "I prefer" language', () => {
      const md = '## Prefs\n\nI prefer using Vim for editing'
      expect(hasIssue(md, 'personal-preference-in-project')).toBe(true)
    })
    it('flags "my editor" language', () => {
      const md = '## Prefs\n\nMy editor uses specific keybindings'
      expect(hasIssue(md, 'personal-preference-in-project')).toBe(true)
    })
  })

  describe('contradicting-rules', () => {
    it('flags tabs vs spaces contradiction', () => {
      const md = '## Rules\n\n- Use tabs for indentation\n- Use spaces for indentation in all files'
      expect(hasIssue(md, 'contradicting-rules')).toBe(true)
    })
  })

  describe('todo-or-fixme', () => {
    it('flags TODO comments', () => {
      const md = '## Notes\n\nTODO: Add more documentation'
      expect(hasIssue(md, 'todo-or-fixme')).toBe(true)
    })
    it('flags FIXME comments', () => {
      const md = '## Notes\n\nFIXME: This section is incomplete'
      expect(hasIssue(md, 'todo-or-fixme')).toBe(true)
    })
    it('does NOT flag inside code blocks', () => {
      const md = '## Notes\n\n```\n// TODO: fix this\n```'
      expect(hasIssue(md, 'todo-or-fixme')).toBe(false)
    })
  })

  describe('missing-import', () => {
    it('flags "See README.md" without @', () => {
      const md = '## Info\n\nSee README.md for more details'
      expect(hasIssue(md, 'missing-import')).toBe(true)
    })
    it('does NOT flag when @import is used', () => {
      const md = '## Info\n\nSee @README.md for more details'
      expect(hasIssue(md, 'missing-import')).toBe(false)
    })
  })

  describe('html-comment-waste', () => {
    it('flags HTML comments', () => {
      const md = '## Rules\n\n<!-- This is a reminder -->'
      expect(hasIssue(md, 'html-comment-waste')).toBe(true)
    })
  })
})
