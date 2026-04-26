import { useMemo } from 'react'
import type { AnalysisResult, Issue, RewriteChange, RewriteResult } from '@/engine/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { BEST_PRACTICES } from '@/data/best-practices'
import { BookOpen, Lightbulb, ArrowRight, AlertTriangle } from 'lucide-react'

interface LearningSummaryProps {
  rewrite: RewriteResult
  result?: AnalysisResult
}

const CATEGORY_LABELS: Record<string, string> = {
  ambiguity: 'Specificity Improvements',
  structure: 'Structural Changes',
  antipattern: 'Anti-Pattern Fixes',
  completeness: 'Missing Sections Added',
  'skill-frontmatter': 'Frontmatter Fixes',
  'skill-content': 'Content Quality',
  'skill-structure': 'Skill Structure',
}

const CATEGORY_ICONS: Record<string, string> = {
  ambiguity: '🎯',
  structure: '📐',
  antipattern: '🚫',
  completeness: '📋',
  'skill-frontmatter': '⚙️',
  'skill-content': '📝',
  'skill-structure': '🏗️',
}

const REWRITER_HANDLED_RULES = new Set([
  'duplicate-instruction',
  'html-comment-waste',
  'todo-or-fixme',
  'personal-preference-in-project',
  'path-specific-instruction',
  'multi-step-procedure',
  'contradicting-rules',
  'verbose-single-rule',
])

interface GroupedLearning {
  reason: string
  docLink?: string
  items: RewriteChange[]
}

interface UnresolvedGroup {
  ruleId: string
  ruleName: string
  suggestion: string
  docLink?: string
  issues: Issue[]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function buildUnresolved(result: AnalysisResult | undefined, changes: RewriteChange[]): UnresolvedGroup[] {
  if (!result) return []

  const fixedLines = new Set(changes.map(c => c.line))

  const unfixed = result.issues.filter(issue =>
    !fixedLines.has(issue.line) && (
      !REWRITER_HANDLED_RULES.has(issue.ruleId) ||
      issue.severity === 'info'
    )
  )

  const grouped = new Map<string, UnresolvedGroup>()
  for (const issue of unfixed) {
    if (!grouped.has(issue.ruleId)) {
      grouped.set(issue.ruleId, {
        ruleId: issue.ruleId,
        ruleName: issue.message.split(' -- ')[0],
        suggestion: issue.suggestion,
        docLink: issue.docLink,
        issues: [],
      })
    }
    grouped.get(issue.ruleId)!.issues.push(issue)
  }

  return Array.from(grouped.values())
}

export function LearningSummary({ rewrite, result }: LearningSummaryProps) {
  const grouped = useMemo(() => {
    const byCategory: Record<string, GroupedLearning[]> = {}

    for (const change of rewrite.changes) {
      const cat = change.category
      if (!byCategory[cat]) byCategory[cat] = []

      const existing = byCategory[cat].find(g => g.reason === change.reason)
      if (existing) {
        existing.items.push(change)
      } else {
        byCategory[cat].push({
          reason: change.reason,
          docLink: change.docLink,
          items: [change],
        })
      }
    }

    return byCategory
  }, [rewrite.changes])

  const unresolved = useMemo(
    () => buildUnresolved(result, rewrite.changes),
    [result, rewrite.changes]
  )

  const totalUnique = Object.values(grouped).reduce(
    (sum, learnings) => sum + learnings.length, 0
  )

  return (
    <div className="space-y-6">
      {rewrite.changes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium text-status-success">No changes needed!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your CLAUDE.md is already well-optimized.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                What Changed and Why
              </CardTitle>
              <CardDescription>
                {rewrite.changes.length} optimization{rewrite.changes.length !== 1 ? 's' : ''} applied
                {totalUnique < rewrite.changes.length && ` across ${totalUnique} unique learning${totalUnique !== 1 ? 's' : ''}`}.
                Each card explains the problem and links to the relevant best practice.
              </CardDescription>
            </CardHeader>
          </Card>

          {Object.entries(grouped).map(([category, learnings]) => {
            const totalInCategory = learnings.reduce((s, l) => s + l.items.length, 0)
            return (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] || '📝'}</span>
                  {CATEGORY_LABELS[category] || category}
                  <Badge variant="secondary">{totalInCategory}</Badge>
                </h3>

                {learnings.map((learning, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm">
                          <strong className="text-foreground">Why:</strong>{' '}
                          <span className="text-muted-foreground">{learning.reason}</span>
                        </div>
                        {learning.items.length > 1 && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            x{learning.items.length}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {learning.items.map((change, j) => (
                          <div key={j}>
                            {change.original && (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 text-sm font-mono bg-diff-removed-bg rounded-md p-2 text-diff-removed overflow-x-auto">
                                  {truncate(change.original, 200)}
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
                                <div className="flex-1 text-sm font-mono bg-diff-added-bg rounded-md p-2 text-diff-added overflow-x-auto">
                                  {truncate(change.rewritten, 200)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {learning.docLink && (
                        <a
                          href={learning.docLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Read the best practice
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })}
        </>
      )}

      {unresolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            Needs Manual Attention
            <Badge variant="warning">
              {unresolved.reduce((s, g) => s + g.issues.length, 0)}
            </Badge>
          </h3>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                These are potential improvements detected but not auto-fixed. Review them to decide if they need a change or are fine as-is:
              </p>
              <div className="space-y-3">
                {unresolved.map((group) => (
                  <div key={group.ruleId} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{group.ruleName}</span>
                      {group.issues.length > 1 && (
                        <Badge variant="outline" className="text-xs">x{group.issues.length}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{group.suggestion}</p>
                    {group.issues.some(i => i.originalText) && (
                      <div className="space-y-1">
                        {group.issues.filter(i => i.originalText).map((issue, j) => (
                          <div key={j} className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded px-2 py-1 overflow-x-auto">
                            L{issue.line + 1}: {truncate(issue.originalText!, 120)}
                          </div>
                        ))}
                      </div>
                    )}
                    {group.docLink && (
                      <a
                        href={group.docLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Learn more
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-status-warning" />
            Tips for Next Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BEST_PRACTICES.map((bp) => (
              <a
                key={bp.id}
                href={bp.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded-md bg-secondary/50 hover:bg-secondary/80 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium group-hover:text-primary transition-colors">
                    {bp.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{bp.description}</div>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
