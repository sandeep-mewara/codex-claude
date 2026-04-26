import type { Rule } from '../types'

export const structureRules: Rule[] = [
  {
    id: 'no-headers',
    name: 'No Markdown Headers',
    category: 'structure',
    severity: 'critical',
    description: 'CLAUDE.md has no markdown headers for organization',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.headers.length === 0) {
        return {
          message: 'No markdown headers found -- Claude scans structure like readers do',
          suggestion: 'Add headers to organize instructions: ## Build Commands, ## Code Conventions, ## Project Layout, etc.',
        }
      }
      return null
    },
  },
  {
    id: 'single-header',
    name: 'Only One Section',
    category: 'structure',
    severity: 'warning',
    description: 'Only one header found -- content needs more organization',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.headers.length === 1) {
        return {
          message: 'Only one section header -- content likely needs more organization',
          suggestion: 'Break content into logical sections: Build, Test, Conventions, Architecture, Workflows',
        }
      }
      return null
    },
  },
  {
    id: 'dense-paragraph',
    name: 'Dense Paragraph',
    category: 'structure',
    severity: 'warning',
    description: 'Dense block of text without bullets or breaks',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (line.trim() === '' || /^[-*]|\d+\./.test(line.trim()) || /^#{1,6}\s/.test(line) || /^```/.test(line)) return null
      const isInCode = ctx.codeBlocks.some(b => ctx.lineIndex >= b.start && ctx.lineIndex <= b.end)
      if (isInCode) return null

      let consecutiveText = 0
      for (let i = ctx.lineIndex; i >= 0; i--) {
        const l = ctx.allLines[i].trim()
        if (l === '' || /^[-*]|\d+\./.test(l) || /^#{1,6}\s/.test(l) || /^```/.test(l)) break
        consecutiveText++
      }
      if (consecutiveText >= 4 && ctx.lineIndex > 0 && ctx.allLines[ctx.lineIndex - 1].trim() !== '') {
        return null
      }
      if (consecutiveText >= 4) {
        return {
          message: `Dense paragraph (${consecutiveText} consecutive lines without bullets or breaks)`,
          suggestion: 'Break into bullet points. Claude follows structured lists better than dense paragraphs',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'exceeds-200-lines',
    name: 'Exceeds 200 Lines',
    category: 'structure',
    severity: 'critical',
    description: 'CLAUDE.md exceeds the recommended 200-line limit',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.totalLines > 200) {
        return {
          message: `File is ${ctx.totalLines} lines (recommended: under 200). Longer files consume more context and reduce adherence`,
          suggestion: 'Move path-specific instructions to .claude/rules/ and multi-step procedures to Skills',
        }
      }
      return null
    },
  },
  {
    id: 'approaching-limit',
    name: 'Approaching Line Limit',
    category: 'structure',
    severity: 'warning',
    description: 'CLAUDE.md is approaching the 200-line limit',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.totalLines > 150 && ctx.totalLines <= 200) {
        return {
          message: `File is ${ctx.totalLines} lines -- approaching the 200-line recommendation`,
          suggestion: 'Consider splitting content into .claude/rules/ files for path-specific instructions',
        }
      }
      return null
    },
  },
  {
    id: 'no-code-blocks',
    name: 'No Code Blocks',
    category: 'structure',
    severity: 'warning',
    description: 'No code blocks found for commands or examples',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      if (ctx.codeBlocks.length === 0 && ctx.totalLines > 10) {
        return {
          message: 'No code blocks found -- build/test commands should be in fenced code blocks',
          suggestion: 'Wrap commands in ```bash blocks so Claude can execute them directly',
        }
      }
      return null
    },
  },
  {
    id: 'no-bullet-points',
    name: 'No Bullet Points',
    category: 'structure',
    severity: 'warning',
    description: 'No bullet points or lists found',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      const hasBullets = ctx.allLines.some(l => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l))
      if (!hasBullets && ctx.totalLines > 5) {
        return {
          message: 'No bullet points or lists found',
          suggestion: 'Use markdown bullets (- item) to organize instructions. Claude follows structured lists more reliably',
        }
      }
      return null
    },
  },
  {
    id: 'missing-blank-lines',
    name: 'Missing Blank Lines After Headers',
    category: 'structure',
    severity: 'info',
    description: 'Headers should be followed by a blank line for readability',
    test: (line, ctx) => {
      if (!/^#{1,6}\s/.test(line)) return null
      const nextLine = ctx.allLines[ctx.lineIndex + 1]
      if (nextLine !== undefined && nextLine.trim() !== '' && !/^#{1,6}\s/.test(nextLine)) {
        return {
          message: 'Header not followed by a blank line',
          suggestion: 'Add a blank line after headers for better markdown rendering and readability',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
]
