import { useState, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { type Extension, RangeSetBuilder } from '@codemirror/state'
import type { AnalysisResult, LineAnalysis } from '@/engine/types'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface AmbiguityHeatmapProps {
  originalMarkdown: string
  result: AnalysisResult
}

function createHeatmapExtension(lines: LineAnalysis[]): Extension {
  const greenDeco = Decoration.line({ class: 'heat-line-green' })
  const yellowDeco = Decoration.line({ class: 'heat-line-yellow' })
  const redDeco = Decoration.line({ class: 'heat-line-red' })

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = this.build(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view)
        }
      }
      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        for (let i = 0; i < view.state.doc.lines; i++) {
          const lineData = lines[i]
          if (!lineData || lineData.text.trim() === '') continue
          const line = view.state.doc.line(i + 1)
          if (lineData.ambiguityScore >= 0.6) {
            builder.add(line.from, line.from, redDeco)
          } else if (lineData.ambiguityScore >= 0.3) {
            builder.add(line.from, line.from, yellowDeco)
          } else if (lineData.issues.length === 0 && lineData.text.trim().length > 0) {
            builder.add(line.from, line.from, greenDeco)
          }
        }
        return builder.finish()
      }
    },
    { decorations: (v) => v.decorations }
  )
}

export function AmbiguityHeatmap({ originalMarkdown, result }: AmbiguityHeatmapProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const selectedLineData = selectedLine !== null ? result.lines[selectedLine] : null

  const heatmapExt = useMemo(
    () => createHeatmapExtension(result.lines),
    [result.lines]
  )

  const clickHandler = useMemo(
    () =>
      EditorView.domEventHandlers({
        click: (_event, view) => {
          const pos = view.state.selection.main.head
          const line = view.state.doc.lineAt(pos)
          setSelectedLine(line.number - 1)
          return false
        },
      }),
    []
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[rgba(34,197,94,0.3)]" /> Specific
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[rgba(234,179,8,0.3)]" /> Somewhat vague
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[rgba(239,68,68,0.3)]" /> Highly ambiguous
            </span>
          </div>
          <CodeMirror
            value={originalMarkdown}
            extensions={[markdown(), heatmapExt, clickHandler, EditorView.editable.of(false)]}
            theme="dark"
            height="500px"
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {selectedLine !== null ? `Line ${selectedLine + 1}` : 'Click a line to inspect'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLineData && selectedLineData.issues.length > 0 ? (
              <div className="space-y-4">
                {selectedLineData.issues.map((issue) => (
                  <div key={issue.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge
                        variant={
                          issue.severity === 'critical'
                            ? 'critical'
                            : issue.severity === 'warning'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {issue.severity}
                      </Badge>
                      <span className="text-sm">{issue.message}</span>
                    </div>
                    <div className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-3">
                      <strong className="text-foreground">Fix:</strong> {issue.suggestion}
                    </div>
                    {issue.docLink && (
                      <a
                        href={issue.docLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Learn more in the docs
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedLineData ? (
              <p className="text-sm text-muted-foreground">
                No issues on this line.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click on any highlighted line in the editor to see issue details and suggested fixes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Heatmap Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clean lines</span>
              <span className="text-green-400">
                {result.lines.filter((l) => l.text.trim() && l.ambiguityScore === 0).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Somewhat vague</span>
              <span className="text-yellow-400">
                {result.lines.filter((l) => l.ambiguityScore > 0 && l.ambiguityScore < 0.6).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Highly ambiguous</span>
              <span className="text-red-400">
                {result.lines.filter((l) => l.ambiguityScore >= 0.6).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
