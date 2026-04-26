import type { AnalysisResult, CategoryScore } from '@/engine/types'
import type { AnalysisMode } from '@/App'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { scoreToLabel } from '@/lib/utils'

interface EfficiencyCheckProps {
  result: AnalysisResult
  mode?: AnalysisMode
}

function ScoreCard({ score }: { score: CategoryScore }) {
  const label = scoreToLabel(score.score)
  const variant = label === 'good' ? 'good' : label === 'ok' ? 'warning' : 'critical'
  const indicatorColor =
    label === 'good' ? 'bg-green-500' : label === 'ok' ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{score.label}</CardTitle>
          <Badge variant={variant}>
            {label === 'good' ? 'Good' : label === 'ok' ? 'Needs Work' : 'Poor'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold">{score.score}</span>
          <span className="text-sm text-muted-foreground">/ {score.maxScore}</span>
        </div>
        <Progress value={score.score} max={score.maxScore} indicatorClassName={indicatorColor} />
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {score.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              {detail}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const CLAUDE_WEIGHTS = [
  { label: 'Structure', weight: '25%' },
  { label: 'Specificity', weight: '30%' },
  { label: 'Completeness', weight: '25%' },
  { label: 'Length', weight: '20%' },
]

const SKILL_WEIGHTS = [
  { label: 'Frontmatter', weight: '30%' },
  { label: 'Content Quality', weight: '30%' },
  { label: 'Structure', weight: '20%' },
  { label: 'Length', weight: '20%' },
]

export function EfficiencyCheck({ result, mode = 'claude-md' }: EfficiencyCheckProps) {
  const { scores } = result
  const weights = mode === 'skill-md' ? SKILL_WEIGHTS : CLAUDE_WEIGHTS

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreCard score={scores.structure} />
        <ScoreCard score={scores.specificity} />
        <ScoreCard score={scores.completeness} />
        <ScoreCard score={scores.length} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How the score is calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {weights.map(({ label, weight }) => (
              <div key={label} className="text-center p-3 rounded-md bg-secondary/50">
                <div className="text-muted-foreground">{label}</div>
                <div className="text-lg font-bold mt-1">{weight}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
