import { describe, it, expect } from 'vitest'
import { analyzeSkill } from '../skill-analyzer'
import { rewriteSkill } from '../skill-rewriter'

function rewriteResult(markdown: string) {
  return rewriteSkill(markdown, analyzeSkill(markdown))
}

describe('skill rewriter', () => {
  describe('frontmatter fixes', () => {
    it('adds frontmatter when missing', () => {
      const result = rewriteResult('Deploy the app')
      expect(result.optimizedMarkdown).toContain('---')
      expect(result.optimizedMarkdown).toContain('name: my-skill')
      expect(result.optimizedMarkdown).toContain('description:')
      expect(result.changes.some(c => c.category === 'skill-frontmatter')).toBe(true)
    })

    it('fixes underscored fields to hyphens', () => {
      const md = '---\ndisable_model_invocation: true\n---\n\n- Step 1'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('disable-model-invocation: true')
      expect(result.changes.some(c => c.reason.includes('hyphens'))).toBe(true)
    })

    it('fixes uppercase name to kebab-case', () => {
      const md = '---\nname: My Deploy Skill\ndescription: test\n---\n\n- Step 1'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('name: my-deploy-skill')
    })

    it('adds missing description field', () => {
      const md = '---\nname: my-skill\n---\n\n- Step 1'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('description:')
      expect(result.changes.some(c => c.reason.includes('description'))).toBe(true)
    })

    it('does NOT add description if already present', () => {
      const md = '---\nname: my-skill\ndescription: Does things\n---\n\n- Step 1'
      const result = rewriteResult(md)
      const descCount = (result.optimizedMarkdown.match(/description:/g) || []).length
      expect(descCount).toBe(1)
    })
  })

  describe('vague replacement', () => {
    it('replaces known vague phrases in body', () => {
      const md = '---\nname: test\ndescription: test\n---\n\nDeploy the application properly'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).not.toContain('Deploy the application properly')
      expect(result.changes.some(c => c.category === 'skill-content')).toBe(true)
    })

    it('does NOT modify frontmatter content', () => {
      const md = '---\nname: test\ndescription: deploys things properly\n---\n\n- Run `deploy.sh`'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('deploys things properly')
    })
  })

  describe('structure additions', () => {
    it('adds header for long body without headers', () => {
      const bodyLines = Array(15).fill('Do this task carefully')
      const md = '---\nname: test\ndescription: test\n---\n\n' + bodyLines.join('\n')
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('## Instructions')
      expect(result.changes.some(c => c.category === 'skill-structure')).toBe(true)
    })

    it('does NOT add header for short body', () => {
      const md = '---\nname: test\ndescription: test\n---\n\n- Step 1\n- Step 2'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).not.toContain('## Instructions')
    })
  })

  describe('content preservation', () => {
    it('preserves all original body content', () => {
      const md = '---\nname: my-skill\ndescription: test\n---\n\n- Run `npm test`\n- Check logs in `dist/`'
      const result = rewriteResult(md)
      expect(result.optimizedMarkdown).toContain('Run `npm test`')
      expect(result.optimizedMarkdown).toContain('Check logs in `dist/`')
    })

    it('returns few changes for a well-formed skill', () => {
      const md = `---
name: deploy-app
description: Deploy the application to production
---

## Steps

1. Run \`npm run build\`
2. Run \`npm run deploy\`
3. Verify the health check`

      const result = rewriteResult(md)
      expect(result.changes.length).toBeLessThanOrEqual(1)
    })
  })
})
