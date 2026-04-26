import { useCallback, useRef, useState, useEffect } from 'react'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { Button } from './ui/button'
import { SAMPLE_CLAUDE_MD } from '@/data/sample-claude-md'
import { SAMPLE_SKILL_MD } from '@/data/sample-skill-md'
import { Upload, Play, FileText, FileCode } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import type { AnalysisMode } from '@/App'

interface UploadAreaProps {
  value: string
  onChange: (value: string) => void
  onAnalyze: () => void
  mode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
}

export function UploadArea({ value, onChange, onAnalyze, mode, onModeChange }: UploadAreaProps) {
  const { theme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<ReactCodeMirrorRef>(null)
  const [focused, setFocused] = useState(false)

  const showEditor = !!value || focused

  useEffect(() => {
    if (focused) {
      requestAnimationFrame(() => {
        editorRef.current?.view?.focus()
      })
    }
  }, [focused])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result
        if (typeof text === 'string') onChange(text)
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result
        if (typeof text === 'string') onChange(text)
      }
      reader.readAsText(file)
    },
    [onChange]
  )

  const handleLoadSample = useCallback(() => {
    onChange(mode === 'claude-md' ? SAMPLE_CLAUDE_MD : SAMPLE_SKILL_MD)
  }, [mode, onChange])

  const handleBlur = useCallback(() => {
    if (!value) {
      setTimeout(() => setFocused(false), 150)
    }
  }, [value])

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold tracking-tight">
          Optimize your{' '}
          <span className="text-primary">
            {mode === 'claude-md' ? 'CLAUDE.md' : 'SKILL.md'}
          </span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {mode === 'claude-md'
            ? 'Paste your CLAUDE.md below or upload the file. The analyzer checks against official best practices and rewrites it for maximum effectiveness.'
            : 'Paste your SKILL.md below or upload the file. The analyzer validates frontmatter, checks instruction quality and ensures your skill follows best practices.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
        <button
          onClick={() => onModeChange('claude-md')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'claude-md'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            CLAUDE.md
          </span>
        </button>
        <button
          onClick={() => onModeChange('skill-md')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            mode === 'skill-md'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" />
            SKILL.md
          </span>
        </button>
      </div>

      <div
        className="border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {showEditor ? (
          <CodeMirror
            ref={editorRef}
            value={value}
            onChange={onChange}
            onBlur={handleBlur}
            extensions={[markdown()]}
            theme={theme}
            height="400px"
            className="rounded-lg overflow-hidden"
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
            }}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center py-20 text-muted-foreground cursor-text"
            onClick={() => setFocused(true)}
          >
            <Upload className="w-10 h-10 mb-4 opacity-40" />
            <p className="text-lg font-medium">
              Drop your {mode === 'claude-md' ? 'CLAUDE.md' : 'SKILL.md'} here
            </p>
            <p className="text-sm mt-1">or click to paste / use the buttons below</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </Button>
        <Button
          variant="outline"
          onClick={handleLoadSample}
        >
          <FileText className="w-4 h-4" />
          Load Sample
        </Button>
        <Button
          onClick={onAnalyze}
          disabled={!value.trim()}
          className="min-w-[160px]"
        >
          <Play className="w-4 h-4" />
          Analyze
        </Button>
      </div>
    </div>
  )
}
