import type { Rule } from '../types'

const CRITICAL_SECTIONS = [
  {
    id: 'build-commands',
    name: 'Build/Run Commands',
    patterns: [/\bbuild\b/i, /\bnpm\s+(run\s+)?(build|start|dev)\b/i, /\byarn\s+(build|start|dev)\b/i, /\bpnpm\b/i, /\bmake\b/, /\bcargo\s+build\b/i, /\bgo\s+build\b/i],
    weight: 25,
  },
  {
    id: 'test-commands',
    name: 'Test Commands',
    patterns: [/\btest\b/i, /\bnpm\s+(run\s+)?test\b/i, /\bjest\b/i, /\bpytest\b/i, /\bcargo\s+test\b/i, /\bgo\s+test\b/i, /\bvitest\b/i],
    weight: 25,
  },
  {
    id: 'project-layout',
    name: 'Project Architecture/Layout',
    patterns: [/\b(architecture|layout|structure|directory|folder)\b/i, /\bsrc\//i, /\bpackage\b/i],
    weight: 20,
  },
  {
    id: 'conventions',
    name: 'Coding Conventions',
    patterns: [/\b(convention|style|naming|format|indent|lint)\b/i, /\b(typescript|javascript|python|rust|go)\b/i],
    weight: 15,
  },
  {
    id: 'workflow',
    name: 'Workflow/Git Practices',
    patterns: [/\b(commit|branch|pr|pull request|merge|review|git)\b/i, /\bworkflow\b/i],
    weight: 15,
  },
]

export const completenessRules: Rule[] = CRITICAL_SECTIONS.map(section => ({
  id: `missing-${section.id}`,
  name: `Missing: ${section.name}`,
  category: 'completeness' as const,
  severity: 'warning' as const,
  description: `No ${section.name.toLowerCase()} section detected`,
  docLink: 'https://code.claude.com/docs/en/memory#set-up-a-project-claude-md',
  test: (_line, ctx) => {
    if (ctx.lineIndex !== 0) return null
    const fullText = ctx.allLines.join('\n')
    const found = section.patterns.some(p => p.test(fullText))
    if (!found) {
      return {
        message: `Missing ${section.name} -- this is a key section for effective CLAUDE.md files`,
        suggestion: `Add a section for ${section.name}. Run \`/init\` in Claude Code to auto-generate a starting CLAUDE.md`,
      }
    }
    return null
  },
}))

export { CRITICAL_SECTIONS }
