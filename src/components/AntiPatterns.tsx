import type { AnalysisResult, Issue, Severity } from '@/engine/types'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface AntiPatternsProps {
  result: AnalysisResult
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

function SeverityIcon({ severity }: { severity: Severity }) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-red-400" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    case 'info':
      return <Info className="w-4 h-4 text-blue-400" />
  }
}

function IssueCard({ issue }: { issue: Issue }) {
  const variant = issue.severity === 'critical' ? 'critical' : issue.severity === 'warning' ? 'warning' : 'info'

  return (
    <Card className="border-l-2" style={{
      borderLeftColor:
        issue.severity === 'critical' ? 'var(--color-destructive)' :
        issue.severity === 'warning' ? '#eab308' : '#3b82f6'
    }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <SeverityIcon severity={issue.severity} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={variant}>{issue.severity}</Badge>
              <span className="text-xs text-muted-foreground">Line {issue.line + 1}</span>
            </div>
            <p className="text-sm font-medium mt-2">{issue.message}</p>
          </div>
        </div>

        {issue.originalText && (
          <div className="text-xs font-mono bg-muted/50 rounded-md p-2 text-muted-foreground overflow-x-auto">
            {issue.originalText}
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-3">
          <strong className="text-foreground">Recommendation:</strong> {issue.suggestion}
        </div>

        {issue.docLink && (
          <a
            href={issue.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Learn more
          </a>
        )}
      </CardContent>
    </Card>
  )
}

export function AntiPatterns({ result }: AntiPatternsProps) {
  const sorted = [...result.issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const grouped = {
    critical: sorted.filter(i => i.severity === 'critical'),
    warning: sorted.filter(i => i.severity === 'warning'),
    info: sorted.filter(i => i.severity === 'info'),
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-lg font-medium text-green-400">No issues found!</p>
          <p className="text-sm text-muted-foreground mt-2">Your CLAUDE.md looks great.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.critical.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-red-400">
              Critical ({grouped.critical.length})
            </h3>
          </div>
          {grouped.critical.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {grouped.warning.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-medium text-yellow-400">
              Warnings ({grouped.warning.length})
            </h3>
          </div>
          {grouped.warning.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}

      {grouped.info.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-blue-400">
              Info ({grouped.info.length})
            </h3>
          </div>
          {grouped.info.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}
