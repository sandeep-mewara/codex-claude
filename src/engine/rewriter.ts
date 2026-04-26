import type { AnalysisResult, RewriteChange, RewriteResult, Issue } from './types'

const VAGUE_REPLACEMENTS: Record<string, string> = {
  'format code properly': 'Use consistent formatting (run `prettier --write .` or your project formatter)',
  'test your changes': 'Run `npm test` (or your project test command) before committing',
  'keep files organized': 'Place files according to the project structure defined above',
  'handle errors properly': 'Wrap async operations in try/catch and return appropriate error responses',
  'write clean code': 'Follow the coding conventions listed above',
  'use good naming': 'Use descriptive camelCase for variables and PascalCase for components/classes',
}

const REMOVED = Symbol('removed')
type MaybeLine = string | typeof REMOVED

function isInCodeBlock(lineIndex: number, lines: MaybeLine[]): boolean {
  let inBlock = false
  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i]
    if (line === REMOVED) continue
    if (/^```/.test(line.trim())) inBlock = !inBlock
  }
  return inBlock
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
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]

  for (let i = 0; i < result.length; i++) {
    if (result[i] === REMOVED) continue
    const lineIssues = issues.filter(issue => issue.line === i && issue.category === 'ambiguity')
    if (lineIssues.length === 0) continue

    const normalized = (result[i] as string).trim().toLowerCase()
    for (const [pattern, replacement] of Object.entries(VAGUE_REPLACEMENTS)) {
      if (normalized.includes(pattern)) {
        const line = result[i] as string
        const indent = line.match(/^(\s*)/)?.[1] || ''
        const bullet = /^(\s*[-*]\s)/.exec(line)?.[1] || ''
        const prefix = bullet || indent
        const newLine = `${prefix}${replacement}`

        changes.push({
          line: i,
          category: 'ambiguity',
          original: line,
          rewritten: newLine,
          reason: 'Replaced vague instruction with specific, actionable guidance',
          docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
        })

        result[i] = newLine
        break
      }
    }
  }

  return result
}

function removeDuplicateLines(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const dupes = issues.filter(i => i.ruleId === 'duplicate-instruction')
  for (const issue of dupes) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed)',
      reason: `Removed duplicate instruction (similar to an earlier line) -- keep CLAUDE.md DRY`,
      docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    })
    result[idx] = REMOVED
  }
  return result
}

function removeHtmlComments(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const commentIssues = issues.filter(i => i.ruleId === 'html-comment-waste')
  for (const issue of commentIssues) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed)',
      reason: "Removed HTML comment -- these don't reach Claude's context but consume file space",
      docLink: 'https://code.claude.com/docs/en/memory#how-claude-md-files-load',
    })
    result[idx] = REMOVED
  }
  return result
}

function removeTodosAndFixmes(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const todoIssues = issues.filter(i => i.ruleId === 'todo-or-fixme')
  for (const issue of todoIssues) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed)',
      reason: 'Removed incomplete TODO/FIXME -- resolve the item or remove the placeholder before shipping',
      docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    })
    result[idx] = REMOVED
  }
  return result
}

function removePersonalPreferences(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const personalIssues = issues.filter(i => i.ruleId === 'personal-preference-in-project')
  for (const issue of personalIssues) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed -- move to CLAUDE.local.md)',
      reason: 'Removed personal preference -- move to CLAUDE.local.md (gitignored) so team members keep their own preferences',
      docLink: 'https://code.claude.com/docs/en/memory#choose-where-to-put-claude-md-files',
    })
    result[idx] = REMOVED
  }
  return result
}

function extractPathSpecificRules(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const pathIssues = issues.filter(i => i.ruleId === 'path-specific-instruction')
  for (const issue of pathIssues) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed -- move to .claude/rules/)',
      reason: 'Extracted path-specific instruction -- create a .claude/rules/<name>.md with paths frontmatter so it loads only when Claude works with matching files',
      docLink: 'https://code.claude.com/docs/en/memory#path-specific-rules',
    })
    result[idx] = REMOVED
  }
  return result
}

function extractMultiStepProcedures(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const multiStepIssues = issues.filter(i => i.ruleId === 'multi-step-procedure')

  for (const issue of multiStepIssues) {
    const startIdx = issue.line
    if (result[startIdx] === REMOVED) continue

    let endIdx = startIdx
    for (let i = startIdx; i < result.length; i++) {
      if (result[i] === REMOVED) continue
      const line = result[i] as string
      if (/^\s*\d+[\.\)]\s/.test(line)) {
        endIdx = i
      } else if (line.trim() === '') {
        continue
      } else {
        break
      }
    }

    const stepCount = endIdx - startIdx + 1
    const removedLines: string[] = []
    for (let i = startIdx; i <= endIdx; i++) {
      if (result[i] !== REMOVED) {
        removedLines.push(result[i] as string)
        result[i] = REMOVED
      }
    }

    changes.push({
      line: startIdx,
      category: 'antipattern',
      original: removedLines.join('\n'),
      rewritten: '(removed -- move to .claude/skills/)',
      reason: `Extracted ${stepCount}-step procedure -- move to .claude/skills/<name>/SKILL.md. Skills load on demand and keep CLAUDE.md concise.`,
      docLink: 'https://code.claude.com/docs/en/skills',
    })
  }

  return result
}

function removeContradictions(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const contradictions = issues.filter(i => i.ruleId === 'contradicting-rules')
  for (const issue of contradictions) {
    const idx = issue.line
    if (result[idx] === REMOVED) continue
    changes.push({
      line: idx,
      category: 'antipattern',
      original: result[idx] as string,
      rewritten: '(removed)',
      reason: `Removed contradicting instruction (${issue.message.split(' -- ')[0]}) -- when two rules conflict, Claude picks one arbitrarily`,
      docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    })
    result[idx] = REMOVED
  }
  return result
}

function collapseVerboseBullets(
  lines: MaybeLine[],
  issues: Issue[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  const verboseIssues = issues.filter(i => i.ruleId === 'verbose-single-rule')

  for (const issue of verboseIssues) {
    const startIdx = issue.line
    if (result[startIdx] === REMOVED) continue

    const collapsedLines: string[] = []
    for (let i = startIdx + 1; i < result.length; i++) {
      if (result[i] === REMOVED) continue
      const line = result[i] as string
      if (line.trim() === '' || /^\s*[-*]\s/.test(line) || /^\s*\d+[\.\)]\s/.test(line) || /^#{1,6}\s/.test(line)) break
      if (isInCodeBlock(i, result)) break
      collapsedLines.push(line)
      result[i] = REMOVED
    }

    if (collapsedLines.length > 0) {
      changes.push({
        line: startIdx,
        category: 'antipattern',
        original: `${result[startIdx]}\n${collapsedLines.join('\n')}`,
        rewritten: result[startIdx] as string,
        reason: `Condensed verbose bullet (${collapsedLines.length + 1} lines to 1) -- move detailed explanation to a Skill if needed`,
        docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
      })
    }
  }

  return result
}

function stripExcessiveBlankLines(
  lines: MaybeLine[],
  changes: RewriteChange[]
): MaybeLine[] {
  const result = [...lines]
  let blankRun = 0
  let removedCount = 0

  for (let i = 0; i < result.length; i++) {
    if (result[i] === REMOVED) continue
    if ((result[i] as string).trim() === '') {
      blankRun++
      if (blankRun > 1) {
        result[i] = REMOVED
        removedCount++
      }
    } else {
      blankRun = 0
    }
  }

  if (removedCount > 0) {
    changes.push({
      line: 0,
      category: 'structure',
      original: `${removedCount} excessive blank lines`,
      rewritten: '(removed)',
      reason: `Removed ${removedCount} excessive blank line${removedCount > 1 ? 's' : ''} -- collapsed to single blank lines between sections`,
    })
  }

  return result
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

function materialize(lines: MaybeLine[]): string[] {
  return lines.filter((l): l is string => l !== REMOVED)
}

export function rewrite(markdown: string, analysis: AnalysisResult): RewriteResult {
  const changes: RewriteChange[] = []
  let rawLines = markdown.split('\n')

  rawLines = addHeadersIfMissing(rawLines, analysis.issues, changes)

  let lines: MaybeLine[] = rawLines
  lines = applyLineReplacements(lines, analysis.issues, changes)
  lines = removeDuplicateLines(lines, analysis.issues, changes)
  lines = removeHtmlComments(lines, analysis.issues, changes)
  lines = removeTodosAndFixmes(lines, analysis.issues, changes)
  lines = removePersonalPreferences(lines, analysis.issues, changes)
  lines = extractPathSpecificRules(lines, analysis.issues, changes)
  lines = extractMultiStepProcedures(lines, analysis.issues, changes)
  lines = removeContradictions(lines, analysis.issues, changes)
  lines = collapseVerboseBullets(lines, analysis.issues, changes)
  lines = stripExcessiveBlankLines(lines, changes)

  let finalLines = materialize(lines)
  finalLines = addMissingSections(finalLines, analysis.issues, changes)

  return {
    optimizedMarkdown: finalLines.join('\n'),
    changes,
  }
}
