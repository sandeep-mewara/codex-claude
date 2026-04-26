import type { AnalysisResult, RewriteChange, RewriteResult, Issue } from './types'

const VAGUE_REPLACEMENTS: Record<string, string> = {
  'format code properly': 'Use consistent formatting (run `prettier --write .` or your project formatter)',
  'test your changes': 'Run `npm test` (or your project test command) before committing',
  'keep files organized': 'Place files according to the project structure defined above',
  'handle errors properly': 'Wrap async operations in try/catch and return appropriate error responses',
  'write clean code': 'Follow the coding conventions listed above',
  'use good naming': 'Use descriptive camelCase for variables and PascalCase for components/classes',
}

function addMissingSections(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const missingCompleteness = issues.filter(i => i.ruleId.startsWith('missing-'))
  if (missingCompleteness.length === 0) return lines

  const additions: string[] = []
  for (const issue of missingCompleteness) {
    const sectionId = issue.ruleId.replace('missing-', '')
    switch (sectionId) {
      case 'build-commands':
        additions.push('', '## Build Commands', '', '```bash', '# Add your build/run commands here', 'npm run dev    # Start development server', 'npm run build  # Production build', '```')
        break
      case 'test-commands':
        additions.push('', '## Test Commands', '', '```bash', '# Add your test commands here', 'npm test       # Run test suite', '```')
        break
      case 'project-layout':
        additions.push('', '## Project Layout', '', '<!-- Describe your project structure here -->', '- `src/` -- Source code', '- `tests/` -- Test files')
        break
      case 'conventions':
        additions.push('', '## Coding Conventions', '', '- <!-- Add your coding standards here -->')
        break
      case 'workflow':
        additions.push('', '## Workflow', '', '- <!-- Add your git/development workflow here -->')
        break
    }

    changes.push({
      line: lines.length,
      category: 'completeness',
      original: '',
      rewritten: `Added "${issue.message.replace('Missing ', '').split(' --')[0]}" section template`,
      reason: issue.message,
      docLink: issue.docLink,
    })
  }

  return [...lines, ...additions]
}

function addHeadersIfMissing(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const noHeaders = issues.find(i => i.ruleId === 'no-headers')
  if (!noHeaders) return lines

  const result: string[] = ['# CLAUDE.md', '']

  let currentGroup: string[] = []
  const groups: string[][] = []

  for (const line of lines) {
    if (line.trim() === '' && currentGroup.length > 0) {
      groups.push(currentGroup)
      currentGroup = []
    } else if (line.trim() !== '') {
      currentGroup.push(line)
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup)

  for (const group of groups) {
    result.push(...group, '')
  }

  changes.push({
    line: 0,
    category: 'structure',
    original: lines[0] || '',
    rewritten: '# CLAUDE.md',
    reason: 'Added top-level header for structure. Claude scans markdown headers to understand organization.',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
  })

  return result
}

function applyLineReplacements(
  lines: string[],
  issues: Issue[],
  changes: RewriteChange[]
): string[] {
  const result = [...lines]

  for (let i = 0; i < result.length; i++) {
    const lineIssues = issues.filter(issue => issue.line === i && issue.category === 'ambiguity')
    if (lineIssues.length === 0) continue

    const normalized = result[i].trim().toLowerCase()
    for (const [pattern, replacement] of Object.entries(VAGUE_REPLACEMENTS)) {
      if (normalized.includes(pattern)) {
        const indent = result[i].match(/^(\s*)/)?.[1] || ''
        const bullet = /^(\s*[-*]\s)/.exec(result[i])?.[1] || ''
        const prefix = bullet || indent
        const newLine = `${prefix}${replacement}`

        changes.push({
          line: i,
          category: 'ambiguity',
          original: result[i],
          rewritten: newLine,
          reason: `Replaced vague instruction with specific, actionable guidance`,
          docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
        })

        result[i] = newLine
        break
      }
    }
  }

  return result
}

function addSkillSuggestions(
  issues: Issue[],
  changes: RewriteChange[]
) {
  const multiStep = issues.filter(i => i.ruleId === 'multi-step-procedure')
  for (const issue of multiStep) {
    changes.push({
      line: issue.line,
      category: 'antipattern',
      original: issue.originalText || '',
      rewritten: '<!-- Consider moving this procedure to .claude/skills/<name>/SKILL.md -->',
      reason: 'Multi-step procedures are better as Skills. Skills load on demand and keep CLAUDE.md concise.',
      docLink: 'https://code.claude.com/docs/en/skills',
    })
  }
}

export function rewrite(markdown: string, analysis: AnalysisResult): RewriteResult {
  const changes: RewriteChange[] = []
  let lines = markdown.split('\n')

  lines = addHeadersIfMissing(lines, analysis.issues, changes)
  lines = applyLineReplacements(lines, analysis.issues, changes)
  lines = addMissingSections(lines, analysis.issues, changes)
  addSkillSuggestions(analysis.issues, changes)

  return {
    optimizedMarkdown: lines.join('\n'),
    changes,
  }
}
