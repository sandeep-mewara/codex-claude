import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import type { RewriteResult } from '@/engine/types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Copy, Download, Check, ArrowLeftRight } from 'lucide-react'
import { downloadFile } from '@/lib/utils'
import { useTheme } from '@/lib/theme-context'

interface OptimizedOutputProps {
  original: string
  rewrite: RewriteResult
}

export function OptimizedOutput({ original, rewrite }: OptimizedOutputProps) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'side-by-side' | 'optimized'>('side-by-side')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rewrite.optimizedMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
            <div className="text-xs text-muted-foreground font-medium mb-2 px-1">ORIGINAL</div>
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
            <div className="text-xs text-primary font-medium mb-2 px-1">OPTIMIZED</div>
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
    </div>
  )
}
