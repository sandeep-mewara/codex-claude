import { describe, it, expect } from 'vitest'
import { analyzeSkill } from '../skill-analyzer'

function hasIssue(markdown: string, ruleId: string): boolean {
  return analyzeSkill(markdown).issues.some(i => i.ruleId === ruleId)
}

describe('skill analyzer', () => {
  describe('frontmatter rules', () => {
    it('flags missing frontmatter', () => {
      expect(hasIssue('# My Skill\n\nDo something', 'skill-no-frontmatter')).toBe(true)
    })

    it('does NOT flag when frontmatter present', () => {
      expect(hasIssue('---\nname: my-skill\n---\n\nDo something', 'skill-no-frontmatter')).toBe(false)
    })

    it('flags missing description', () => {
      expect(hasIssue('---\nname: my-skill\n---\n\nDo something', 'skill-no-description')).toBe(true)
    })

    it('does NOT flag when description present', () => {
      expect(hasIssue('---\nname: my-skill\ndescription: Does things\n---\n\nDo something', 'skill-no-description')).toBe(false)
    })

    it('flags name with uppercase or spaces', () => {
      expect(hasIssue('---\nname: My Deploy Skill\ndescription: test\n---\n\nContent', 'skill-bad-name')).toBe(true)
    })

    it('does NOT flag valid kebab-case name', () => {
      expect(hasIssue('---\nname: my-deploy-skill\ndescription: test\n---\n\nContent', 'skill-bad-name')).toBe(false)
    })

    it('flags misspelled frontmatter fields', () => {
      expect(hasIssue('---\ndescrption: deploys app\n---\n\nContent', 'skill-misspelled-field')).toBe(true)
    })

    it('flags underscored frontmatter fields', () => {
      expect(hasIssue('---\ndisable_model_invocation: true\n---\n\nContent', 'skill-underscore-field')).toBe(true)
    })
  })

  describe('content rules', () => {
    it('flags vague instructions in body', () => {
      expect(hasIssue('---\nname: test\n---\n\nDeploy the app properly', 'skill-vague-instruction')).toBe(true)
    })

    it('does NOT flag vague words in frontmatter', () => {
      const md = '---\nname: test\ndescription: deploys properly\n---\n\n- Run `deploy.sh`'
      expect(hasIssue(md, 'skill-vague-instruction')).toBe(false)
    })

    it('flags open qualifiers in body', () => {
      expect(hasIssue('---\nname: test\n---\n\nRun tests as necessary', 'skill-open-qualifier')).toBe(true)
    })

    it('flags trailing etc.', () => {
      expect(hasIssue('---\nname: test\n---\n\nHandle errors, retries, etc.', 'skill-etc-trailing')).toBe(true)
    })
  })

  describe('structure rules', () => {
    it('flags skill over 500 lines', () => {
      const long = '---\nname: test\n---\n\n' + Array(510).fill('- step').join('\n')
      expect(hasIssue(long, 'skill-exceeds-500-lines')).toBe(true)
    })

    it('does NOT flag skill under 500 lines', () => {
      const short = '---\nname: test\n---\n\n- step 1\n- step 2'
      expect(hasIssue(short, 'skill-exceeds-500-lines')).toBe(false)
    })

    it('flags no headers in long body', () => {
      const lines = Array(15).fill('Do this thing')
      const md = '---\nname: test\n---\n\n' + lines.join('\n')
      expect(hasIssue(md, 'skill-no-body-headers')).toBe(true)
    })

    it('does NOT flag short body without headers', () => {
      const md = '---\nname: test\n---\n\n- Step 1\n- Step 2'
      expect(hasIssue(md, 'skill-no-body-headers')).toBe(false)
    })
  })

  describe('scoring', () => {
    it('handles empty input gracefully', () => {
      const result = analyzeSkill('')
      expect(result.scores.overall).toBeGreaterThanOrEqual(0)
    })

    it('gives high scores to well-formed skill', () => {
      const good = `---
name: deploy-app
description: Deploy the application to production. Use when deploying or releasing.
disable-model-invocation: true
---

# Deploy Application

## Prerequisites

- Ensure all tests pass with \`npm test\`
- Verify the build with \`npm run build\`

## Steps

1. Run \`git pull origin main\`
2. Execute \`npm run deploy:staging\`
3. Verify staging at https://staging.example.com
4. Execute \`npm run deploy:production\`
5. Verify production at https://example.com`

      const result = analyzeSkill(good)
      expect(result.scores.overall).toBeGreaterThanOrEqual(60)
      expect(result.stats.criticalCount).toBe(0)
    })

    it('gives low scores to the sample bad skill', () => {
      const bad = `---
Name: My Deploy Skill
descrption: deploys the app
disable_model_invocation: true
context: fork
---

Deploy the application properly.

Make sure everything is working correctly before deploying.
Handle any errors that come up as necessary.`

      const result = analyzeSkill(bad)
      expect(result.stats.issueCount).toBeGreaterThan(3)
      expect(result.scores.overall).toBeLessThan(70)
    })

    it('produces weighted overall score', () => {
      const md = '---\nname: test\ndescription: test\n---\n\n- Step 1'
      const result = analyzeSkill(md)
      const expected = Math.round(
        result.scores.completeness.score * 0.30 +
        result.scores.specificity.score * 0.30 +
        result.scores.structure.score * 0.20 +
        result.scores.length.score * 0.20
      )
      expect(result.scores.overall).toBe(expected)
    })
  })
})
