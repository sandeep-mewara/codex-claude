import type { AnalysisResult } from '@/engine/types'
import { Badge } from './ui/badge'
import { scoreToColor } from '@/lib/utils'

interface ScoreSummaryBarProps {
  result: AnalysisResult
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreToColor(score)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

export function ScoreSummaryBar({ result }: ScoreSummaryBarProps) {
  const { scores, stats } = result

  return (
    <div className="flex flex-wrap items-center gap-6 p-4 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-4">
        <ScoreRing score={scores.overall} />
        <div>
          <div className="text-sm text-muted-foreground">Overall Score</div>
          <div className="text-2xl font-bold">{scores.overall}/100</div>
        </div>
      </div>

      <div className="h-12 w-px bg-border hidden sm:block" />

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Lines:</span>
          <span className="font-medium">{stats.totalLines}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Issues:</span>
          <span className="font-medium">{stats.issueCount}</span>
        </div>
        {stats.criticalCount > 0 && (
          <Badge variant="critical">{stats.criticalCount} Critical</Badge>
        )}
        {stats.warningCount > 0 && (
          <Badge variant="warning">{stats.warningCount} Warning</Badge>
        )}
        {stats.infoCount > 0 && (
          <Badge variant="info">{stats.infoCount} Info</Badge>
        )}
      </div>
    </div>
  )
}
