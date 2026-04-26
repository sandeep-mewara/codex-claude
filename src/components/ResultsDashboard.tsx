import type { AnalysisResult, RewriteResult } from '@/engine/types'
import type { AnalysisMode } from '@/App'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Badge } from './ui/badge'
import { ScoreSummaryBar } from './ScoreSummaryBar'
import { AmbiguityHeatmap } from './AmbiguityHeatmap'
import { EfficiencyCheck } from './EfficiencyCheck'
import { AntiPatterns } from './AntiPatterns'
import { OptimizedOutput } from './OptimizedOutput'
import { LearningSummary } from './LearningSummary'
import { Button } from './ui/button'
import { ArrowLeft } from 'lucide-react'

interface ResultsDashboardProps {
  originalMarkdown: string
  result: AnalysisResult
  rewrite: RewriteResult
  mode: AnalysisMode
  onBack: () => void
}

export function ResultsDashboard({ originalMarkdown, result, rewrite, mode, onBack }: ResultsDashboardProps) {
  const isSkill = mode === 'skill-md'
  const hasRewriteChanges = rewrite.changes.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">
          {isSkill ? 'SKILL.md' : 'CLAUDE.md'} Analysis Results
        </h2>
      </div>

      <ScoreSummaryBar result={result} />

      <Tabs defaultValue="efficiency">
        <TabsList className="flex-wrap">
          <TabsTrigger value="efficiency">
            {isSkill ? 'Skill Assessment' : 'Efficiency Check'}
          </TabsTrigger>
          <TabsTrigger value="heatmap">
            {isSkill ? 'Quality Heatmap' : 'Ambiguity Heatmap'}
          </TabsTrigger>
          <TabsTrigger value="antipatterns">
            <span className="flex items-center gap-1.5">
              {isSkill ? 'Issues' : 'Anti-Patterns'}
              {result.stats.issueCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {result.stats.issueCount}
                </Badge>
              )}
            </span>
          </TabsTrigger>
          {hasRewriteChanges && (
            <TabsTrigger value="optimized">
              Optimized Output
            </TabsTrigger>
          )}
          {hasRewriteChanges && (
            <TabsTrigger value="learning">
              Learning Summary
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="efficiency">
          <EfficiencyCheck result={result} mode={mode} />
        </TabsContent>

        <TabsContent value="heatmap">
          <AmbiguityHeatmap originalMarkdown={originalMarkdown} result={result} />
        </TabsContent>

        <TabsContent value="antipatterns">
          <AntiPatterns result={result} />
        </TabsContent>

        {hasRewriteChanges && (
          <TabsContent value="optimized">
            <OptimizedOutput original={originalMarkdown} rewrite={rewrite} result={result} />
          </TabsContent>
        )}

        {hasRewriteChanges && (
          <TabsContent value="learning">
            <LearningSummary rewrite={rewrite} result={result} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
