import type { AnalysisResult, CategoryScore, Issue, LineAnalysis, Rule, RuleContext } from './types'
import { allSkillRules } from './rules/skill-rules'

function parseHeaders(lines: string[]): { level: number; text: string; line: number }[] {
  const headers: { level: number; text: string; line: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+)/.exec(lines[i])
    if (match) {
      headers.push({ level: match[1].length, text: match[2], line: i })
    }
  }
  return headers
}

function parseCodeBlocks(lines: string[]): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = []
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) {
      if (start === -1) {
        start = i
      } else {
        blocks.push({ start, end: i })
        start = -1
      }
    }
  }
  if (start !== -1) {
    blocks.push({ start, end: lines.length - 1 })
  }
  return blocks
}

function computeAmbiguityScore(issues: Issue[]): number {
  if (issues.length === 0) return 0
  let score = 0
  for (const issue of issues) {
    if (issue.category === 'skill-content') {
      if (issue.severity === 'critical') score += 1.0
      else if (issue.severity === 'warning') score += 0.6
      else score += 0.3
    }
  }
  return Math.min(1, score)
}

function computeFrontmatterScore(issues: Issue[]): CategoryScore {
  let score = 100
  const details: string[] = []
  const fmIssues = issues.filter(i => i.category === 'skill-frontmatter')

  if (fmIssues.length === 0) {
    details.push('Frontmatter is well-formed')
  } else {
    for (const issue of fmIssues) {
      if (issue.severity === 'critical') score -= 40
      else if (issue.severity === 'warning') score -= 20
      else score -= 10
      details.push(issue.message.split(' -- ')[0])
    }
  }

  return { category: 'frontmatter', label: 'Frontmatter', score: Math.max(0, score), maxScore: 100, details }
}

function computeContentScore(lineAnalyses: LineAnalysis[], lines: string[]): CategoryScore {
  const details: string[] = []
  const frontmatterEnd = lines.indexOf('---', 1)
  const bodyStart = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0
  const bodyLines = lineAnalyses.slice(bodyStart).filter(l => l.text.trim() !== '')

  if (bodyLines.length === 0) {
    return { category: 'content', label: 'Content Quality', score: 0, maxScore: 100, details: ['No body content found'] }
  }

  const vagueLines = bodyLines.filter(l => l.ambiguityScore > 0)
  const vagueRate = vagueLines.length / bodyLines.length
  let score = Math.round((1 - vagueRate) * 100)

  if (vagueLines.length === 0) {
    details.push('All instructions are specific and actionable')
  } else {
    details.push(`${vagueLines.length} of ${bodyLines.length} body lines have quality issues`)
  }

  score = Math.max(0, Math.min(100, score))
  return { category: 'content', label: 'Content Quality', score, maxScore: 100, details }
}

function computeSkillStructureScore(lines: string[], headers: { level: number; text: string; line: number }[]): CategoryScore {
  let score = 100
  const details: string[] = []
  const frontmatterEnd = lines.indexOf('---', 1)
  const bodyStart = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0
  const bodyHeaders = headers.filter(h => h.line >= bodyStart)
  const bodyLines = lines.slice(bodyStart).filter(l => l.trim() !== '')

  if (bodyHeaders.length === 0 && bodyLines.length > 10) {
    score -= 20
    details.push('No headers in body for organization')
  } else if (bodyHeaders.length > 0) {
    details.push(`${bodyHeaders.length} section header(s) in body`)
  }

  const hasBullets = lines.slice(bodyStart).some(l => /^\s*[-*+]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l))
  if (!hasBullets && bodyLines.length > 5) {
    score -= 15
    details.push('No bullet points or numbered steps')
  } else if (hasBullets) {
    details.push('Uses structured lists')
  }

  return { category: 'structure', label: 'Structure', score: Math.max(0, score), maxScore: 100, details }
}

function computeSkillLengthScore(totalLines: number): CategoryScore {
  const details: string[] = []
  let score: number

  if (totalLines <= 100) {
    score = 100
    details.push(`${totalLines} lines -- concise and focused`)
  } else if (totalLines <= 300) {
    score = 80
    details.push(`${totalLines} lines -- reasonable length`)
  } else if (totalLines <= 500) {
    score = 50
    details.push(`${totalLines} lines -- approaching the 500-line limit`)
  } else {
    score = 20
    details.push(`${totalLines} lines -- exceeds the recommended 500-line limit`)
  }

  if (totalLines < 5) {
    score = Math.min(score, 30)
    details.push('Very short -- may be missing important instructions')
  }

  return { category: 'length', label: 'Length', score, maxScore: 100, details }
}

export function analyzeSkill(markdown: string): AnalysisResult {
  const lines = markdown.split('\n')
  const headers = parseHeaders(lines)
  const codeBlocks = parseCodeBlocks(lines)
  const allIssues: Issue[] = []

  const lineAnalyses: LineAnalysis[] = lines.map((text, i) => ({
    line: i,
    text,
    ambiguityScore: 0,
    issues: [],
  }))

  for (let i = 0; i < lines.length; i++) {
    const ctx: RuleContext = {
      lineIndex: i,
      allLines: lines,
      totalLines: lines.length,
      headers,
      codeBlocks,
    }

    for (const rule of allSkillRules as Rule[]) {
      const match = rule.test(lines[i], ctx)
      if (match) {
        const issue: Issue = {
          id: `${rule.id}-${i}`,
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          line: i,
          message: match.message,
          suggestion: match.suggestion,
          docLink: rule.docLink,
          originalText: match.originalText,
        }
        allIssues.push(issue)
        lineAnalyses[i].issues.push(issue)
      }
    }

    lineAnalyses[i].ambiguityScore = computeAmbiguityScore(lineAnalyses[i].issues)
  }

  const frontmatterScore = computeFrontmatterScore(allIssues)
  const contentScore = computeContentScore(lineAnalyses, lines)
  const structureScore = computeSkillStructureScore(lines, headers)
  const lengthScore = computeSkillLengthScore(lines.length)

  const overall = Math.round(
    frontmatterScore.score * 0.30 +
    contentScore.score * 0.30 +
    structureScore.score * 0.20 +
    lengthScore.score * 0.20
  )

  return {
    lines: lineAnalyses,
    issues: allIssues,
    scores: {
      structure: structureScore,
      specificity: contentScore,
      completeness: frontmatterScore,
      length: lengthScore,
      overall,
    },
    stats: {
      totalLines: lines.length,
      issueCount: allIssues.length,
      criticalCount: allIssues.filter(i => i.severity === 'critical').length,
      warningCount: allIssues.filter(i => i.severity === 'warning').length,
      infoCount: allIssues.filter(i => i.severity === 'info').length,
    },
  }
}
