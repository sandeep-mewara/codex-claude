import type { Rule, RuleContext } from '../types'

const ALWAYS_VAGUE = [
  { pattern: /\bproperly\b/i, word: 'properly' },
  { pattern: /\bnicely\b/i, word: 'nicely' },
  { pattern: /\bcorrectly\b/i, word: 'correctly' },
  { pattern: /\bappropriate(ly)?\b/i, word: 'appropriate(ly)' },
  { pattern: /\bclean(ly)?\b/i, word: 'clean' },
  { pattern: /\bbetter\b/i, word: 'better' },
  { pattern: /\breasonable\b/i, word: 'reasonable' },
  { pattern: /\bsimple\b/i, word: 'simple' },
]

const CONTEXT_DEPENDENT_VAGUE = [
  { pattern: /\bgood\b/i, word: 'good' },
  { pattern: /\bbest\b/i, word: 'best' },
]

const OPEN_QUALIFIERS = [
  { pattern: /\bwhen needed\b/i, phrase: 'when needed' },
  { pattern: /\bas necessary\b/i, phrase: 'as necessary' },
  { pattern: /\bif appropriate\b/i, phrase: 'if appropriate' },
  { pattern: /\bwhere applicable\b/i, phrase: 'where applicable' },
  { pattern: /\bas required\b/i, phrase: 'as required' },
  { pattern: /\bwhen possible\b/i, phrase: 'when possible' },
  { pattern: /\bif possible\b/i, phrase: 'if possible' },
]

const DESCRIPTIVE_SECTIONS = /\b(about|overview|description|features|introduction|summary|what|how it works|tech stack|background)\b/i

function isInCodeBlock(lineIndex: number, codeBlocks: { start: number; end: number }[]): boolean {
  return codeBlocks.some(b => lineIndex >= b.start && lineIndex <= b.end)
}

function isHeaderOrEmpty(line: string): boolean {
  return line.trim() === '' || /^#{1,6}\s/.test(line)
}

function isUnderDescriptiveHeader(lineIndex: number, headers: RuleContext['headers']): boolean {
  let currentHeader: string | null = null
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i].line <= lineIndex) {
      currentHeader = headers[i].text
      break
    }
  }
  if (!currentHeader) return false
  return DESCRIPTIVE_SECTIONS.test(currentHeader)
}

export const ambiguityRules: Rule[] = [
  {
    id: 'vague-adjective',
    name: 'Vague Adjective',
    category: 'ambiguity',
    severity: 'warning',
    description: 'Uses vague adjectives that Claude cannot verify or measure',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      for (const { pattern, word } of ALWAYS_VAGUE) {
        if (pattern.test(line)) {
          return {
            message: `Vague adjective "${word}" -- Claude cannot verify this`,
            suggestion: `Replace "${word}" with a specific, measurable criterion. E.g., "Format code properly" -> "Use 2-space indentation and Prettier formatting"`,
            originalText: line.trim(),
          }
        }
      }
      if (!isUnderDescriptiveHeader(ctx.lineIndex, ctx.headers)) {
        for (const { pattern, word } of CONTEXT_DEPENDENT_VAGUE) {
          if (pattern.test(line)) {
            return {
              message: `Vague adjective "${word}" -- Claude cannot verify this`,
              suggestion: `Replace "${word}" with a specific, measurable criterion. E.g., "Follow best practices" -> "Follow the conventions listed in ## Coding Conventions"`,
              originalText: line.trim(),
            }
          }
        }
      }
      return null
    },
  },
  {
    id: 'open-qualifier',
    name: 'Open-Ended Qualifier',
    category: 'ambiguity',
    severity: 'warning',
    description: 'Uses open-ended qualifiers without defining criteria',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      for (const { pattern, phrase } of OPEN_QUALIFIERS) {
        if (pattern.test(line)) {
          return {
            message: `Open qualifier "${phrase}" without defined criteria`,
            suggestion: `Specify the exact condition. E.g., "Add tests when needed" -> "Add tests for any function with >3 branches"`,
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'no-path-reference',
    name: 'Missing Path Reference',
    category: 'ambiguity',
    severity: 'info',
    description: 'Mentions files or directories without specifying actual paths',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const mentionsFiles = /\b(files?|directory|directories|folder|module|component|handler|controller|service)\b/i.test(line)
      const hasPath = /[`"']([\w/.-]+\/[\w/.-]+)[`"']/.test(line) || /`[^`]+`/.test(line)
      if (mentionsFiles && !hasPath) {
        return {
          message: 'Mentions files/directories without specifying actual paths',
          suggestion: 'Add the specific path. E.g., "Keep files organized" -> "API handlers live in `src/api/handlers/`"',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'no-command-in-instruction',
    name: 'Missing Command',
    category: 'ambiguity',
    severity: 'warning',
    description: 'Instructs to run something without providing the actual command',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const mentionsAction = /\b(run|execute|start|build|test|deploy|lint|format|install)\b/i.test(line)
      const hasCommand = /`[^`]+`/.test(line)
      const nextLineIsCodeBlock = ctx.lineIndex + 1 < ctx.totalLines && /^```/.test(ctx.allLines[ctx.lineIndex + 1])
      if (mentionsAction && !hasCommand && !nextLineIsCodeBlock) {
        return {
          message: 'Tells Claude to run something without the actual command',
          suggestion: 'Include the exact command in backticks. E.g., "Test your changes" -> "Run `npm test` before committing"',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'subjective-style',
    name: 'Subjective Style Guidance',
    category: 'ambiguity',
    severity: 'info',
    description: 'Style guidance without measurable criteria',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const subjectivePatterns = [
        /\breadable\b/i,
        /\bmaintainable\b/i,
        /\belegant\b/i,
        /\bintuitive\b/i,
        /\buser.?friendly\b/i,
        /\brobust\b/i,
      ]
      for (const pattern of subjectivePatterns) {
        if (pattern.test(line) && !/\b(because|by|using|via|with)\b/i.test(line)) {
          return {
            message: 'Subjective quality goal without actionable criteria',
            suggestion: 'Add specific criteria. E.g., "Write readable code" -> "Limit functions to 30 lines, use descriptive variable names, add JSDoc for public APIs"',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'unquantified-limit',
    name: 'Unquantified Limit',
    category: 'ambiguity',
    severity: 'info',
    description: 'Sets a limit or threshold without a number',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      const patterns = [
        /\b(keep|limit).*(short|small|minimal|brief)\b/i,
        /\bdon'?t make.*(too|overly) (long|big|large|complex)\b/i,
        /\bavoid.*(long|large|complex|deep)\b/i,
      ]
      for (const p of patterns) {
        if (p.test(line) && !/\d/.test(line)) {
          return {
            message: 'Sets a limit without specifying a number',
            suggestion: 'Quantify the limit. E.g., "Keep functions short" -> "Limit functions to 30 lines"',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'etc-trailing',
    name: 'Trailing "etc." or Ellipsis',
    category: 'ambiguity',
    severity: 'info',
    description: 'Ends with "etc." or "..." leaving the instruction open-ended',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      if (/\betc\.?\s*$/i.test(line.trim()) || /\.\.\.\s*$/.test(line.trim())) {
        return {
          message: 'Instruction trails off with "etc." or "..." -- Claude may guess wrong',
          suggestion: 'List all items explicitly, or specify the pattern Claude should follow',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'should-vs-must',
    name: 'Weak "should" Language',
    category: 'ambiguity',
    severity: 'info',
    description: 'Uses "should" where "must" or "always" would be clearer',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks) || isHeaderOrEmpty(line)) return null
      if (/\bshould\b/i.test(line) && !/\bshould not\b/i.test(line)) {
        return {
          message: '"should" is ambiguous -- Claude may treat it as optional',
          suggestion: 'Use "always", "must", or "never" for strict rules; keep "should" only for soft preferences',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
]
