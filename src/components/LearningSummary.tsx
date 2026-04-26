import type { RewriteResult } from '@/engine/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { BEST_PRACTICES } from '@/data/best-practices'
import { BookOpen, Lightbulb, ArrowRight } from 'lucide-react'

interface LearningSummaryProps {
  rewrite: RewriteResult
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

export function LearningSummary({ rewrite }: LearningSummaryProps) {
  const grouped = rewrite.changes.reduce((acc, change) => {
    const key = change.category
    if (!acc[key]) acc[key] = []
    acc[key].push(change)
    return acc
  }, {} as Record<string, typeof rewrite.changes>)

  return (
    <div className="space-y-6">
      {rewrite.changes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium text-green-400">No changes needed!</p>
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
                {rewrite.changes.length} optimization{rewrite.changes.length !== 1 ? 's' : ''} applied.
                Each change below explains the problem and links to the relevant best practice.
              </CardDescription>
            </CardHeader>
          </Card>

          {Object.entries(grouped).map(([category, changes]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span>{CATEGORY_ICONS[category] || '📝'}</span>
                {CATEGORY_LABELS[category] || category}
                <Badge variant="secondary">{changes.length}</Badge>
              </h3>

              {changes.map((change, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Line {change.line + 1}</span>
                    </div>

                    {change.original && (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 text-sm font-mono bg-red-500/10 rounded-md p-2 text-red-300 overflow-x-auto">
                          {change.original}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
                        <div className="flex-1 text-sm font-mono bg-green-500/10 rounded-md p-2 text-green-300 overflow-x-auto">
                          {change.rewritten}
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Why:</strong> {change.reason}
                    </div>

                    {change.docLink && (
                      <a
                        href={change.docLink}
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
          ))}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
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
