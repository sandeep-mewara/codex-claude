import { useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import type { AnalysisResult, Issue, RewriteResult } from '@/engine/types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Copy, Download, Check, ArrowLeftRight, Info, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react'
import { downloadFile } from '@/lib/utils'
import { useTheme } from '@/lib/theme-context'

interface OptimizedOutputProps {
  original: string
  rewrite: RewriteResult
  result: AnalysisResult
}

export function OptimizedOutput({ original, rewrite, result }: OptimizedOutputProps) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'side-by-side' | 'optimized'>('side-by-side')

  const stats = useMemo(() => {
    const origLines = original.split('\n').length
    const optLines = rewrite.optimizedMarkdown.split('\n').length
    const removed = origLines - optLines
    const pct = origLines > 0 ? Math.round((removed / origLines) * 100) : 0
    return { origLines, optLines, removed, pct }
  }, [original, rewrite.optimizedMarkdown])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rewrite.optimizedMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={view === 'side-by-side' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('side-by-side')}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Side by Side
          </Button>
          <Button
            variant={view === 'optimized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('optimized')}
          >
            Optimized Only
          </Button>
          {rewrite.changes.length > 0 && (
            <Badge variant="good">{rewrite.changes.length} changes applied</Badge>
          )}
          {stats.removed > 0 && (
            <Badge variant="secondary">
              {stats.origLines} → {stats.optLines} lines ({stats.removed} removed, {stats.pct}%)
            </Badge>
          )}
          {stats.removed === 0 && rewrite.changes.length > 0 && (
            <Badge variant="secondary">
              {stats.origLines} lines (restructured, no lines removed)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(rewrite.optimizedMarkdown, 'CLAUDE.md')}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>

      {view === 'side-by-side' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground font-medium mb-2 px-1">
              ORIGINAL ({stats.origLines} lines)
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <CodeMirror
                value={original}
                extensions={[markdown(), EditorView.editable.of(false)]}
                theme={theme}
                height="500px"
                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-primary font-medium mb-2 px-1">
              OPTIMIZED ({stats.optLines} lines)
            </div>
            <div className="rounded-lg border border-primary/30 overflow-hidden">
              <CodeMirror
                value={rewrite.optimizedMarkdown}
                extensions={[markdown(), EditorView.editable.of(false)]}
                theme={theme}
                height="500px"
                basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/30 overflow-hidden">
          <CodeMirror
            value={rewrite.optimizedMarkdown}
            extensions={[markdown(), EditorView.editable.of(false)]}
            theme={theme}
            height="600px"
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
          />
        </div>
      )}

      <CompactionInsight
        origLines={stats.origLines}
        optLines={stats.optLines}
        pct={stats.pct}
        changeCount={rewrite.changes.length}
        issues={result.issues}
      />
    </div>
  )
}

interface ActionableItem {
  text: string
  target: string
  lines: number[]
}

function formatLines(lines: number[]): string {
  if (lines.length === 0) return ''
  if (lines.length <= 3) return lines.map(l => `L${l}`).join(', ')
  return `${lines.slice(0, 3).map(l => `L${l}`).join(', ')} +${lines.length - 3} more`
}

function buildActionableItems(issues: Issue[]): ActionableItem[] {
  const items: ActionableItem[] = []
  const pathMap = new Map<string, number[]>()

  const pathIssues = issues.filter(i => i.ruleId === 'path-specific-instruction')
  for (const issue of pathIssues) {
    const pathMatch = issue.originalText?.match(/`([^`]+\/[^`]*)`/)
    const path = pathMatch?.[1] || 'path-specific rule'
    if (!pathMap.has(path)) pathMap.set(path, [])
    pathMap.get(path)!.push(issue.line + 1)
  }
  for (const [path, lines] of pathMap) {
    items.push({
      text: `Move rule${lines.length > 1 ? 's' : ''} referencing \`${path}\``,
      target: `.claude/rules/`,
      lines,
    })
  }

  const multiStepIssues = issues.filter(i => i.ruleId === 'multi-step-procedure')
  const seenMulti = new Set<number>()
  for (const issue of multiStepIssues) {
    if (seenMulti.has(issue.line)) continue
    seenMulti.add(issue.line)
    const stepsMatch = issue.message.match(/(\d+)\s+steps?/)
    const steps = stepsMatch?.[1] || 'multi'
    const snippet = issue.originalText?.slice(0, 50)?.replace(/^\d+[\.\)]\s*/, '') || 'procedure'
    items.push({
      text: `Move ${steps}-step procedure ("${snippet.length >= 50 ? snippet + '...' : snippet}")`,
      target: `.claude/skills/`,
      lines: [issue.line + 1],
    })
  }

  const verboseIssues = issues.filter(i => i.ruleId === 'verbose-single-rule')
  if (verboseIssues.length > 0) {
    items.push({
      text: `${verboseIssues.length} verbose bullet${verboseIssues.length > 1 ? 's' : ''} could be condensed`,
      target: 'split into shorter bullets or Skills',
      lines: verboseIssues.map(i => i.line + 1),
    })
  }

  const wallIssue = issues.find(i => i.ruleId === 'wall-of-rules')
  if (wallIssue) {
    const countMatch = wallIssue.message.match(/(\d+)\s+consecutive/)
    const count = countMatch?.[1] || 'many'
    items.push({
      text: `${count} consecutive bullets without section headers`,
      target: 'group under ## headers',
      lines: [],
    })
  }

  const denseIssues = issues.filter(i => i.ruleId === 'dense-paragraph')
  if (denseIssues.length > 0) {
    items.push({
      text: `${denseIssues.length} dense paragraph${denseIssues.length > 1 ? 's' : ''} without bullet structure`,
      target: 'break into bullet points',
      lines: denseIssues.map(i => i.line + 1),
    })
  }

  return items
}

function CompactionInsight({ origLines, optLines, pct, changeCount, issues }: {
  origLines: number
  optLines: number
  pct: number
  changeCount: number
  issues: Issue[]
}) {
  if (changeCount === 0) return null

  const actionableItems = useMemo(() => buildActionableItems(issues), [issues])

  let icon: React.ReactNode
  let title: string
  let message: string

  if (pct >= 30) {
    icon = <Sparkles className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
    title = 'Significant compaction achieved'
    message = `Reduced from ${origLines} to ${optLines} lines (${pct}% smaller). Check the Learning Summary tab to understand what was removed and why.`
  } else if (optLines > 200) {
    icon = <AlertTriangle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" />
    title = `Still over the 200-line recommendation (${optLines} lines)`
    message = `The optimizer removed redundancies and anti-patterns, but your file is still lengthy. Here are specific opportunities for further reduction:`
  } else if (pct < 15) {
    icon = <Info className="w-4 h-4 text-status-info shrink-0 mt-0.5" />
    title = 'Already well-structured'
    message = `Your file already follows most best practices. The optimizer focused on minor cleanups (${pct > 0 ? `${pct}% reduction` : 'restructuring only'}).`
  } else {
    icon = <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
    title = 'Good compaction'
    message = `Reduced from ${origLines} to ${optLines} lines (${pct}% smaller). Review the Learning Summary tab to see what changed and why.`
  }

  const showActions = actionableItems.length > 0

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {icon}
          <div className="text-sm space-y-2">
            <strong className="text-foreground">{title}</strong>
            <p className="text-muted-foreground">{message}</p>

            {showActions && (
              <div className="mt-3 space-y-1.5">
                {!(optLines > 200) && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Further opportunities
                  </p>
                )}
                <ul className="space-y-1.5">
                  {actionableItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>
                        {item.text}
                        <span className="text-primary font-medium"> → {item.target}</span>
                        {item.lines.length > 0 && (
                          <span className="text-xs opacity-70 ml-1.5">({formatLines(item.lines)})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!showActions && (optLines > 200 || pct < 15) && (
              <p className="text-muted-foreground mt-1">
                Consider moving path-specific rules to <span className="font-mono text-xs">.claude/rules/</span> and
                multi-step procedures to <span className="font-mono text-xs">.claude/skills/</span> for further reduction.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
