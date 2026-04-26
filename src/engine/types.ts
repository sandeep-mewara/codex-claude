export type Severity = 'critical' | 'warning' | 'info'
export type Category = 'ambiguity' | 'structure' | 'antipattern' | 'completeness' | 'skill-frontmatter' | 'skill-content' | 'skill-structure'

export interface Issue {
  id: string
  ruleId: string
  category: Category
  severity: Severity
  line: number
  lineEnd?: number
  message: string
  suggestion: string
  docLink?: string
  originalText?: string
}

export interface LineAnalysis {
  line: number
  text: string
  ambiguityScore: number
  issues: Issue[]
}

export interface CategoryScore {
  category: string
  label: string
  score: number
  maxScore: number
  details: string[]
}

export interface AnalysisResult {
  lines: LineAnalysis[]
  issues: Issue[]
  scores: {
    structure: CategoryScore
    specificity: CategoryScore
    completeness: CategoryScore
    length: CategoryScore
    overall: number
  }
  stats: {
    totalLines: number
    issueCount: number
    criticalCount: number
    warningCount: number
    infoCount: number
  }
}

export interface RewriteChange {
  line: number
  lineEnd?: number
  category: Category
  original: string
  rewritten: string
  reason: string
  docLink?: string
}

export interface RewriteResult {
  optimizedMarkdown: string
  changes: RewriteChange[]
}

export interface Rule {
  id: string
  name: string
  category: Category
  severity: Severity
  description: string
  docLink?: string
  test: (line: string, context: RuleContext) => RuleMatch | null
}

export interface RuleContext {
  lineIndex: number
  allLines: string[]
  totalLines: number
  headers: { level: number; text: string; line: number }[]
  codeBlocks: { start: number; end: number }[]
}

export interface RuleMatch {
  message: string
  suggestion: string
  originalText?: string
}
