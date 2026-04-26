import type { AnalysisResult, CategoryScore, Issue, LineAnalysis, Rule, RuleContext } from './types'
import { ambiguityRules } from './rules/ambiguity'
import { structureRules } from './rules/structure'
import { antipatternRules } from './rules/antipatterns'
import { completenessRules, CRITICAL_SECTIONS } from './rules/completeness'

const ALL_RULES: Rule[] = [
  ...ambiguityRules,
  ...structureRules,
  ...antipatternRules,
  ...completenessRules,
]

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
    if (issue.category === 'ambiguity') {
      if (issue.severity === 'critical') score += 1.0
      else if (issue.severity === 'warning') score += 0.6
      else score += 0.3
    }
  }
  return Math.min(1, score)
}

function computeStructureScore(lines: string[], headers: { level: number; text: string; line: number }[], codeBlocks: { start: number; end: number }[]): CategoryScore {
  let score = 100
  const details: string[] = []

  if (headers.length === 0) {
    score -= 40
    details.push('No markdown headers for organization')
  } else if (headers.length === 1) {
    score -= 20
    details.push('Only one section header')
  } else {
    details.push(`${headers.length} section headers found`)
  }

  const hasBullets = lines.some(l => /^\s*[-*+]\s/.test(l))
  if (!hasBullets) {
    score -= 20
    details.push('No bullet points or lists')
  } else {
    details.push('Uses bullet points for structure')
  }

  if (codeBlocks.length === 0 && lines.length > 10) {
    score -= 15
    details.push('No code blocks for commands')
  } else if (codeBlocks.length > 0) {
    details.push(`${codeBlocks.length} code block(s) found`)
  }

  let maxDenseParagraph = 0
  let current = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed !== '' && !/^[-*+]\s/.test(trimmed) && !/^\d+[\.\)]\s/.test(trimmed) && !/^#{1,6}\s/.test(trimmed) && !/^```/.test(trimmed)) {
      current++
      maxDenseParagraph = Math.max(maxDenseParagraph, current)
    } else {
      current = 0
    }
  }
  if (maxDenseParagraph >= 5) {
    score -= 15
    details.push(`Dense paragraph block (${maxDenseParagraph} lines)`)
  }

  return { category: 'structure', label: 'Structure', score: Math.max(0, score), maxScore: 100, details }
}

function computeSpecificityScore(lineAnalyses: LineAnalysis[]): CategoryScore {
  const details: string[] = []
  const nonEmptyLines = lineAnalyses.filter(l => l.text.trim() !== '')
  if (nonEmptyLines.length === 0) {
    return { category: 'specificity', label: 'Specificity', score: 0, maxScore: 100, details: ['No content to analyze'] }
  }

  const ambiguousLines = nonEmptyLines.filter(l => l.ambiguityScore > 0)
  const ambiguityRate = ambiguousLines.length / nonEmptyLines.length
  let score = Math.round((1 - ambiguityRate) * 100)

  if (ambiguousLines.length === 0) {
    details.push('All instructions are specific and actionable')
  } else {
    details.push(`${ambiguousLines.length} of ${nonEmptyLines.length} lines have ambiguity issues`)
    const highAmbiguity = ambiguousLines.filter(l => l.ambiguityScore >= 0.6)
    if (highAmbiguity.length > 0) {
      details.push(`${highAmbiguity.length} lines are highly ambiguous (red)`)
    }
  }

  score = Math.max(0, Math.min(100, score))
  return { category: 'specificity', label: 'Specificity', score, maxScore: 100, details }
}

function computeCompletenessScore(lines: string[]): CategoryScore {
  const fullText = lines.join('\n')
  const details: string[] = []
  let found = 0

  for (const section of CRITICAL_SECTIONS) {
    const present = section.patterns.some(p => p.test(fullText))
    if (present) {
      found++
      details.push(`${section.name} -- present`)
    } else {
      details.push(`${section.name} -- missing`)
    }
  }

  const score = Math.round((found / CRITICAL_SECTIONS.length) * 100)
  return { category: 'completeness', label: 'Completeness', score, maxScore: 100, details }
}

function computeLengthScore(totalLines: number): CategoryScore {
  const details: string[] = []
  let score: number

  if (totalLines <= 100) {
    score = 100
    details.push(`${totalLines} lines -- well within the 200-line recommendation`)
  } else if (totalLines <= 150) {
    score = 85
    details.push(`${totalLines} lines -- good length`)
  } else if (totalLines <= 200) {
    score = 60
    details.push(`${totalLines} lines -- approaching the 200-line limit`)
  } else if (totalLines <= 300) {
    score = 30
    details.push(`${totalLines} lines -- exceeds the recommended 200-line limit`)
  } else {
    score = 10
    details.push(`${totalLines} lines -- significantly over the 200-line recommendation`)
  }

  if (totalLines < 10) {
    score = Math.min(score, 40)
    details.push('Very short -- may be missing important sections')
  }

  return { category: 'length', label: 'Length', score, maxScore: 100, details }
}

export function analyze(markdown: string): AnalysisResult {
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

    for (const rule of ALL_RULES) {
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

  const structureScore = computeStructureScore(lines, headers, codeBlocks)
  const specificityScore = computeSpecificityScore(lineAnalyses)
  const completenessScore = computeCompletenessScore(lines)
  const lengthScore = computeLengthScore(lines.length)

  const overall = Math.round(
    structureScore.score * 0.25 +
    specificityScore.score * 0.30 +
    completenessScore.score * 0.25 +
    lengthScore.score * 0.20
  )

  return {
    lines: lineAnalyses,
    issues: allIssues,
    scores: {
      structure: structureScore,
      specificity: specificityScore,
      completeness: completenessScore,
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
