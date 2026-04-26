import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreToLabel(score: number): 'good' | 'ok' | 'bad' {
  if (score >= 70) return 'good'
  if (score >= 40) return 'ok'
  return 'bad'
}

export function scoreToColor(score: number): string {
  if (score >= 70) return 'var(--color-score-good)'
  if (score >= 40) return 'var(--color-score-ok)'
  return 'var(--color-score-bad)'
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
