import type { Rule } from '../types'

function isInCodeBlock(lineIndex: number, codeBlocks: { start: number; end: number }[]): boolean {
  return codeBlocks.some(b => lineIndex >= b.start && lineIndex <= b.end)
}

function isHeaderOrEmpty(line: string): boolean {
  return line.trim() === '' || /^#{1,6}\s/.test(line)
}

const VALID_FRONTMATTER_FIELDS = [
  'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
  'disable-model-invocation', 'user-invocable', 'allowed-tools',
  'model', 'effort', 'context', 'agent', 'hooks', 'paths', 'shell',
]

export const skillFrontmatterRules: Rule[] = [
  {
    id: 'skill-no-frontmatter',
    name: 'Missing Frontmatter',
    category: 'skill-frontmatter',
    severity: 'critical',
    description: 'SKILL.md has no YAML frontmatter delimiters (---)',
    docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.allLines[0]?.trim() !== '---') {
        return {
          message: 'No YAML frontmatter found -- SKILL.md files should start with --- delimiters',
          suggestion: 'Add frontmatter at the top of the file:\n---\nname: my-skill\ndescription: What this skill does\n---',
        }
      }
      return null
    },
  },
  {
    id: 'skill-no-description',
    name: 'Missing Description',
    category: 'skill-frontmatter',
    severity: 'warning',
    description: 'No description field in frontmatter',
    docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd < 0) return null
      const frontmatter = ctx.allLines.slice(1, frontmatterEnd).join('\n')
      if (!/^description\s*:/m.test(frontmatter)) {
        return {
          message: 'Missing "description" field -- Claude uses this to decide when to load the skill',
          suggestion: 'Add a description that explains what the skill does and when to use it. Front-load the key use case.',
        }
      }
      return null
    },
  },
  {
    id: 'skill-bad-name',
    name: 'Invalid Name Format',
    category: 'skill-frontmatter',
    severity: 'warning',
    description: 'Name field must be lowercase letters, numbers, and hyphens only (max 64 chars)',
    docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      const match = /^name\s*:\s*(.+)$/.exec(line)
      if (!match) return null
      const name = match[1].trim().replace(/^['"]|['"]$/g, '')
      if (/[A-Z\s]/.test(name) || name.length > 64) {
        return {
          message: `Name "${name}" has invalid characters -- must be lowercase, numbers, hyphens only, max 64 chars`,
          suggestion: `Use lowercase with hyphens: "${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64)}"`,
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'skill-misspelled-field',
    name: 'Misspelled Frontmatter Field',
    category: 'skill-frontmatter',
    severity: 'warning',
    description: 'Unknown frontmatter field -- likely a typo',
    docLink: 'https://code.claude.com/docs/en/skills#frontmatter-reference',
    test: (line, ctx) => {
      if (ctx.lineIndex === 0 || line.trim() === '---') return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd < 0 || ctx.lineIndex >= frontmatterEnd) return null
      const fieldMatch = /^(\w[\w-]*)\s*:/.exec(line)
      if (!fieldMatch) return null
      const field = fieldMatch[1]
      if (!VALID_FRONTMATTER_FIELDS.includes(field)) {
        const closest = VALID_FRONTMATTER_FIELDS.find(f =>
          f.startsWith(field.slice(0, 3)) || levenshteinClose(f, field)
        )
        return {
          message: `Unknown frontmatter field "${field}"${closest ? ` -- did you mean "${closest}"?` : ''}`,
          suggestion: `Valid fields: ${VALID_FRONTMATTER_FIELDS.join(', ')}`,
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'skill-underscore-field',
    name: 'Underscore in Frontmatter Field',
    category: 'skill-frontmatter',
    severity: 'warning',
    description: 'Frontmatter fields use hyphens, not underscores',
    test: (line, ctx) => {
      if (ctx.lineIndex === 0 || line.trim() === '---') return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd < 0 || ctx.lineIndex >= frontmatterEnd) return null
      const fieldMatch = /^(\w+_\w+)\s*:/.exec(line)
      if (fieldMatch) {
        const field = fieldMatch[1]
        const hyphenated = field.replace(/_/g, '-')
        return {
          message: `Field "${field}" uses underscores -- frontmatter fields use hyphens`,
          suggestion: `Use "${hyphenated}" instead of "${field}"`,
          originalText: line.trim(),
        }
      }
      return null
    },
  },
]

export const skillContentRules: Rule[] = [
  {
    id: 'skill-vague-instruction',
    name: 'Vague Instruction in Skill',
    category: 'skill-content',
    severity: 'warning',
    description: 'Skill body contains vague language',
    docLink: 'https://code.claude.com/docs/en/skills#types-of-skill-content',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd >= 0 && ctx.lineIndex <= frontmatterEnd) return null
      const vaguePatterns = [
        { pattern: /\bproperly\b/i, word: 'properly' },
        { pattern: /\bcorrectly\b/i, word: 'correctly' },
        { pattern: /\bappropriate(ly)?\b/i, word: 'appropriately' },
        { pattern: /\bnicely\b/i, word: 'nicely' },
      ]
      for (const { pattern, word } of vaguePatterns) {
        if (pattern.test(line)) {
          return {
            message: `Vague word "${word}" in skill body -- Claude needs specific instructions`,
            suggestion: 'Replace with concrete steps. Skills should give Claude a clear playbook, not vague guidance.',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'skill-open-qualifier',
    name: 'Open Qualifier in Skill',
    category: 'skill-content',
    severity: 'warning',
    description: 'Open-ended qualifier in skill instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd >= 0 && ctx.lineIndex <= frontmatterEnd) return null
      const qualifiers = [
        { pattern: /\bwhen needed\b/i, phrase: 'when needed' },
        { pattern: /\bas necessary\b/i, phrase: 'as necessary' },
        { pattern: /\bif appropriate\b/i, phrase: 'if appropriate' },
      ]
      for (const { pattern, phrase } of qualifiers) {
        if (pattern.test(line)) {
          return {
            message: `Open qualifier "${phrase}" -- skills should be explicit about when and how`,
            suggestion: 'Specify the exact condition or remove the qualifier for a clear instruction',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'skill-etc-trailing',
    name: 'Trailing etc. in Skill',
    category: 'skill-content',
    severity: 'info',
    description: 'Instruction trails off with etc. or ellipsis',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd >= 0 && ctx.lineIndex <= frontmatterEnd) return null
      if (/\betc\.?\s*$/i.test(line.trim()) || /\.\.\.\s*$/.test(line.trim())) {
        return {
          message: 'Instruction trails off -- Claude needs complete instructions in skills',
          suggestion: 'List all items explicitly or describe the pattern to follow',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'skill-fork-no-task',
    name: 'Fork Context Without Task',
    category: 'skill-content',
    severity: 'warning',
    description: 'context: fork is set but body has no actionable task',
    docLink: 'https://code.claude.com/docs/en/skills#run-skills-in-a-subagent',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd < 0) return null
      const frontmatter = ctx.allLines.slice(1, frontmatterEnd).join('\n')
      if (!/context\s*:\s*fork/i.test(frontmatter)) return null
      const body = ctx.allLines.slice(frontmatterEnd + 1).join('\n')
      const hasNumberedSteps = /^\s*\d+[\.\)]\s/m.test(body)
      const hasActionVerbs = /\b(create|run|build|deploy|analyze|generate|write|read|check|find)\b/i.test(body)
      if (!hasNumberedSteps && !hasActionVerbs) {
        return {
          message: 'context: fork is set but body has no explicit task -- the subagent will have no actionable prompt',
          suggestion: 'Add concrete steps for the subagent: numbered instructions, commands to run, or explicit deliverables',
        }
      }
      return null
    },
  },
]

export const skillStructureRules: Rule[] = [
  {
    id: 'skill-exceeds-500-lines',
    name: 'Skill Exceeds 500 Lines',
    category: 'skill-structure',
    severity: 'warning',
    description: 'SKILL.md exceeds the recommended 500-line limit',
    docLink: 'https://code.claude.com/docs/en/skills#add-supporting-files',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.totalLines > 500) {
        return {
          message: `Skill is ${ctx.totalLines} lines -- keep SKILL.md under 500 lines`,
          suggestion: 'Move detailed reference material to separate files in the skill directory. Reference them from SKILL.md.',
        }
      }
      return null
    },
  },
  {
    id: 'skill-no-body-headers',
    name: 'No Headers in Body',
    category: 'skill-structure',
    severity: 'info',
    description: 'Skill body has no markdown headers for structure',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      const bodyStart = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0
      const bodyHeaders = ctx.headers.filter(h => h.line >= bodyStart)
      const bodyLines = ctx.allLines.slice(bodyStart).filter(l => l.trim() !== '')
      if (bodyHeaders.length === 0 && bodyLines.length > 10) {
        return {
          message: 'Skill body has no headers -- longer skills benefit from section structure',
          suggestion: 'Add headers like ## Usage, ## Steps, ## Examples to organize the skill content',
        }
      }
      return null
    },
  },
  {
    id: 'skill-dense-body',
    name: 'Dense Skill Body',
    category: 'skill-structure',
    severity: 'info',
    description: 'Long paragraph blocks in skill body',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      if (/^\s*[-*]\s/.test(line) || /^\s*\d+[\.\)]\s/.test(line)) return null
      const frontmatterEnd = ctx.allLines.indexOf('---', 1)
      if (frontmatterEnd >= 0 && ctx.lineIndex <= frontmatterEnd) return null
      let consecutiveText = 0
      for (let i = ctx.lineIndex; i >= Math.max(0, (frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0)); i--) {
        const l = ctx.allLines[i].trim()
        if (l === '' || /^[-*]\s/.test(l) || /^\d+[\.\)]\s/.test(l) || /^#{1,6}\s/.test(l) || /^```/.test(l)) break
        consecutiveText++
      }
      if (consecutiveText >= 4) {
        return {
          message: `Dense paragraph (${consecutiveText} lines) -- skills work better with structured steps`,
          suggestion: 'Break into numbered steps or bullet points for clarity',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
]

export const allSkillRules: Rule[] = [
  ...skillFrontmatterRules,
  ...skillContentRules,
  ...skillStructureRules,
]

function levenshteinClose(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 2) return false
  let diff = 0
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) diff++
  }
  return diff + Math.abs(a.length - b.length) <= 2
}
