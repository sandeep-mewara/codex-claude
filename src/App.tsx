import { useState, useCallback } from 'react'
import type { AnalysisResult, RewriteResult } from './engine/types'
import { analyze } from './engine/analyzer'
import { analyzeSkill } from './engine/skill-analyzer'
import { rewrite } from './engine/rewriter'
import { rewriteSkill } from './engine/skill-rewriter'
import { Layout } from './components/Layout'
import { UploadArea } from './components/UploadArea'
import { ResultsDashboard } from './components/ResultsDashboard'

export type AnalysisMode = 'claude-md' | 'skill-md'

type AppState =
  | { view: 'upload' }
  | { view: 'results'; markdown: string; analysis: AnalysisResult; rewriteResult: RewriteResult; mode: AnalysisMode }

export default function App() {
  const [markdown, setMarkdown] = useState('')
  const [mode, setMode] = useState<AnalysisMode>('claude-md')
  const [state, setState] = useState<AppState>({ view: 'upload' })

  const handleAnalyze = useCallback(() => {
    if (!markdown.trim()) return
    const analysis = mode === 'claude-md' ? analyze(markdown) : analyzeSkill(markdown)
    const rewriteResult = mode === 'claude-md' ? rewrite(markdown, analysis) : rewriteSkill(markdown, analysis)
    setState({ view: 'results', markdown, analysis, rewriteResult, mode })
  }, [markdown, mode])

  const handleBack = useCallback(() => {
    setMarkdown('')
    setState({ view: 'upload' })
  }, [])

  const handleModeChange = useCallback((newMode: AnalysisMode) => {
    setMode(newMode)
    setMarkdown('')
  }, [])

  return (
    <Layout>
      {state.view === 'upload' ? (
        <UploadArea
          value={markdown}
          onChange={setMarkdown}
          onAnalyze={handleAnalyze}
          mode={mode}
          onModeChange={handleModeChange}
        />
      ) : (
        <ResultsDashboard
          originalMarkdown={state.markdown}
          result={state.analysis}
          rewrite={state.rewriteResult}
          mode={state.mode}
          onBack={handleBack}
        />
      )}
    </Layout>
  )
}
