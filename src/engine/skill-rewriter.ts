import type { AnalysisResult, RewriteChange, RewriteResult, Issue } from './types'

const VAGUE_SKILL_REPLACEMENTS: Record<string, string> = {
  'deploy the application properly': '1. Run `npm run build`\n2. Run `npm run deploy:staging`\n3. Verify staging at the staging URL\n4. Run `npm run deploy:production`',
  'handle any errors': 'Wrap each step in error handling. If a step fails, log the error and abort the remaining steps.',
  'make sure everything is working': 'Run the test suite (`npm test`) and verify all checks pass before proceeding.',
  'deploy properly': 'Execute the deploy script (`./deploy.sh`) and verify the health check endpoint returns 200.',
  'handle errors properly': 'Wrap async operations in try/catch. Log the error context and re-throw with a descriptive message.',
  'test your changes': 'Run the test suite with `npm test` and confirm all assertions pass.',
}

function findFrontmatterEnd(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return i
  }
  return -1
}

function fixFrontmatter(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const fmEnd = findFrontmatterEnd(lines)

  if (issues.some(i => i.ruleId === 'skill-no-frontmatter')) {
    changes.push({
      line: 0,
      category: 'skill-frontmatter',
      original: lines[0] || '',
      rewritten: '---\nname: my-skill\ndescription: Describe what this skill does and when to use it\n---',
      reason: 'Added YAML frontmatter block. Skills need frontmatter so Claude knows when to load them.',
      docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    })
    return ['---', 'name: my-skill', 'description: Describe what this skill does and when to use it', '---', ...lines]
  }

  if (fmEnd < 0) return lines

  const result = [...lines]

  for (let i = 1; i < fmEnd; i++) {
    const underscoreMatch = /^(\w+_\w+)\s*:(.*)$/.exec(result[i])
    if (underscoreMatch) {
      const oldField = underscoreMatch[1]
      const hyphenated = oldField.replace(/_/g, '-')
      const value = underscoreMatch[2]
      changes.push({
        line: i,
        category: 'skill-frontmatter',
        original: result[i],
        rewritten: `${hyphenated}:${value}`,
        reason: `Frontmatter fields use hyphens, not underscores. Changed "${oldField}" to "${hyphenated}".`,
        docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
      })
      result[i] = `${hyphenated}:${value}`
    }

    const nameMatch = /^name\s*:\s*(.+)$/.exec(result[i])
    if (nameMatch) {
      const rawName = nameMatch[1].trim().replace(/^['"]|['"]$/g, '')
      if (/[A-Z\s]/.test(rawName)) {
        const fixed = rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64)
        changes.push({
          line: i,
          category: 'skill-frontmatter',
          original: result[i],
          rewritten: `name: ${fixed}`,
          reason: `Skill names must be lowercase with hyphens. Changed "${rawName}" to "${fixed}".`,
          docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
        })
        result[i] = `name: ${fixed}`
      }
    }
  }

  const fmText = result.slice(1, fmEnd).join('\n')
  if (!/^description\s*:/m.test(fmText)) {
    changes.push({
      line: fmEnd,
      category: 'skill-frontmatter',
      original: '',
      rewritten: 'description: Describe what this skill does and when to use it',
      reason: 'Added missing description field. Claude uses this to decide when to load the skill.',
      docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    })
    result.splice(fmEnd, 0, 'description: Describe what this skill does and when to use it')
  }

  return result
}

function replaceVagueSkillInstructions(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const result = [...lines]
  const fmEnd = findFrontmatterEnd(result)
  const bodyStart = fmEnd >= 0 ? fmEnd + 1 : 0

  for (let i = bodyStart; i < result.length; i++) {
    const contentIssues = issues.filter(issue => issue.line === i && issue.category === 'skill-content')
    if (contentIssues.length === 0) continue

    const normalized = result[i].trim().toLowerCase()
    for (const [pattern, replacement] of Object.entries(VAGUE_SKILL_REPLACEMENTS)) {
      if (normalized.includes(pattern)) {
        const indent = result[i].match(/^(\s*)/)?.[1] || ''
        const newLine = replacement.split('\n').map(l => `${indent}${l}`).join('\n')
        changes.push({
          line: i,
          category: 'skill-content',
          original: result[i],
          rewritten: newLine,
          reason: 'Replaced vague instruction with concrete, actionable steps for the skill.',
          docLink: 'https://code.claude.com/docs/en/skills#types-of-skill-content',
        })
        result[i] = newLine
        break
      }
    }
  }

  return result
}

function addSkillStructure(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const hasNoBodyHeaders = issues.some(i => i.ruleId === 'skill-no-body-headers')
  if (!hasNoBodyHeaders) return lines

  const fmEnd = findFrontmatterEnd(lines)
  const bodyStart = fmEnd >= 0 ? fmEnd + 1 : 0
  const bodyLines = lines.slice(bodyStart).filter(l => l.trim() !== '')

  if (bodyLines.length <= 10) return lines

  const result = [...lines]
  result.splice(bodyStart, 0, '', '## Instructions', '')
  changes.push({
    line: bodyStart,
    category: 'skill-structure',
    original: '',
    rewritten: '## Instructions',
    reason: 'Added a section header to organize the skill body. Longer skills benefit from clear structure.',
    docLink: 'https://code.claude.com/docs/en/skills#types-of-skill-content',
  })

  return result
}

export function rewriteSkill(markdown: string, analysis: AnalysisResult): RewriteResult {
  const changes: RewriteChange[] = []
  let lines = markdown.split('\n')

  lines = fixFrontmatter(lines, analysis.issues, changes)
  lines = replaceVagueSkillInstructions(lines, analysis.issues, changes)
  lines = addSkillStructure(lines, analysis.issues, changes)

  return {
    optimizedMarkdown: lines.join('\n'),
    changes,
  }
}
