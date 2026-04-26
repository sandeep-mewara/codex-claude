import type { Rule, RuleContext } from '../types'

function isInCodeBlock(lineIndex: number, codeBlocks: RuleContext['codeBlocks']): boolean {
  return codeBlocks.some(b => lineIndex >= b.start && lineIndex <= b.end)
}

const LAYOUT_SECTIONS = /\b(project\s*layout|project\s*structure|directory|file\s*structure|folder\s*structure|architecture|structure overview)\b/i

function isUnderLayoutHeader(lineIndex: number, headers: RuleContext['headers']): boolean {
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i].line <= lineIndex) {
      return LAYOUT_SECTIONS.test(headers[i].text)
    }
  }
  return false
}

export const antipatternRules: Rule[] = [
  {
    id: 'multi-step-procedure',
    name: 'Multi-Step Procedure',
    category: 'antipattern',
    severity: 'warning',
    description: 'Multi-step procedures should be Skills, not CLAUDE.md entries',
    docLink: 'https://code.claude.com/docs/en/memory#when-to-add-to-claude-md',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (!/^\s*1[\.\)]\s/.test(line)) return null
      let steps = 0
      for (let i = ctx.lineIndex; i < ctx.totalLines; i++) {
        if (/^\s*\d+[\.\)]\s/.test(ctx.allLines[i])) {
          steps++
        } else if (ctx.allLines[i].trim() === '') {
          continue
        } else {
          break
        }
      }
      if (steps > 3) {
        return {
          message: `Multi-step procedure (${steps} steps) -- should be a Skill instead`,
          suggestion: 'Move this to .claude/skills/<name>/SKILL.md. Skills load on demand and keep CLAUDE.md concise',
        }
      }
      return null
    },
  },
  {
    id: 'path-specific-instruction',
    name: 'Path-Specific Instruction',
    category: 'antipattern',
    severity: 'info',
    description: 'Path-specific instructions belong in .claude/rules/ with paths frontmatter',
    docLink: 'https://code.claude.com/docs/en/memory#path-specific-rules',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (isUnderLayoutHeader(ctx.lineIndex, ctx.headers)) return null
      const hasImperative = /\b(use|always|never|must|ensure|follow|prefer|avoid|require|should|do not|don't)\b/i.test(line)
      const pathPatterns = [
        /\*\*\/\*\.\w+/,                     // **/*.ts
        /`src\/[^`]+`/,                       // `src/...`
        /\b(in|for|under)\s+`[^`]*\/[^`]*`/, // in `path/to/dir`
        /\bwhen editing\s+`[^`]+`/i,          // when editing `file`
      ]
      for (const p of pathPatterns) {
        if (p.test(line)) {
          if (p === pathPatterns[1] && !hasImperative) continue
          return {
            message: 'Path-specific instruction should be in .claude/rules/ with paths frontmatter',
            suggestion: 'Create a .claude/rules/<name>.md with `paths: ["pattern"]` frontmatter so it loads only when Claude works with matching files',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'duplicate-instruction',
    name: 'Near-Duplicate Instruction',
    category: 'antipattern',
    severity: 'warning',
    description: 'Similar instruction appears multiple times',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (line.trim().length < 15 || line.trim() === '' || /^#{1,6}\s/.test(line)) return null
      const normalized = line.trim().toLowerCase().replace(/[^\w\s]/g, '')
      for (let i = 0; i < ctx.lineIndex; i++) {
        if (isInCodeBlock(i, ctx.codeBlocks)) continue
        const other = ctx.allLines[i].trim().toLowerCase().replace(/[^\w\s]/g, '')
        if (other.length < 15) continue
        const shorter = normalized.length < other.length ? normalized : other
        const longer = normalized.length >= other.length ? normalized : other
        if (shorter.length / longer.length > 0.7 && longer.includes(shorter)) {
          return {
            message: `Similar to line ${i + 1} -- possible duplicate instruction`,
            suggestion: 'Remove the duplicate or merge into a single, comprehensive instruction',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'verbose-single-rule',
    name: 'Overly Verbose Rule',
    category: 'antipattern',
    severity: 'info',
    description: 'A single instruction that spans too many lines',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (!/^\s*[-*]\s/.test(line)) return null
      let continuation = 0
      for (let i = ctx.lineIndex + 1; i < ctx.totalLines; i++) {
        const l = ctx.allLines[i]
        if (l.trim() === '' || /^\s*[-*]\s/.test(l) || /^\s*\d+[\.\)]\s/.test(l) || /^#{1,6}\s/.test(l)) break
        if (isInCodeBlock(i, ctx.codeBlocks)) break
        continuation++
      }
      if (continuation >= 3) {
        return {
          message: `Bullet point continues for ${continuation + 1} lines -- too verbose for a single rule`,
          suggestion: 'Split into multiple bullets or move detailed explanation to a Skill',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'personal-preference-in-project',
    name: 'Personal Preference in Project File',
    category: 'antipattern',
    severity: 'info',
    description: 'Personal preferences should be in CLAUDE.local.md or ~/.claude/CLAUDE.md',
    docLink: 'https://code.claude.com/docs/en/memory#choose-where-to-put-claude-md-files',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      const personalPatterns = [
        /\b(I|my)\s+(prefer|like|want|use|always)\b/i,
        /\bmy\s+(editor|ide|terminal|shell|setup)\b/i,
        /\bpersonally\b/i,
      ]
      for (const p of personalPatterns) {
        if (p.test(line)) {
          return {
            message: 'Personal preference detected -- should be in CLAUDE.local.md (add to .gitignore)',
            suggestion: 'Move personal preferences to CLAUDE.local.md so they are not shared with teammates. Project CLAUDE.md should contain team-wide standards only.',
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'missing-import',
    name: 'Referenced File Not Imported',
    category: 'antipattern',
    severity: 'info',
    description: 'References a file that could be imported with @syntax',
    docLink: 'https://code.claude.com/docs/en/memory#import-additional-files',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      const fileRefs = [
        /\b(see|refer to|check|read)\s+`?([A-Z][A-Za-z]+\.md)`?/i,
        /\b(README|CONTRIBUTING|CHANGELOG|AGENTS\.md)\b/,
      ]
      for (const p of fileRefs) {
        const match = p.exec(line)
        if (match && !line.includes('@')) {
          return {
            message: 'References a file that could be imported with @syntax',
            suggestion: `Use @filename to import it. E.g., "See @README.md for project overview" -- imported files load into context automatically`,
            originalText: line.trim(),
          }
        }
      }
      return null
    },
  },
  {
    id: 'contradicting-rules',
    name: 'Potentially Contradicting Rules',
    category: 'antipattern',
    severity: 'critical',
    description: 'Two instructions may contradict each other',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      const contradictions: [RegExp, RegExp, string][] = [
        [/\btabs\b/i, /\bspaces\b/i, 'tabs vs spaces'],
        [/\bsemicolons?\b.*\balways\b/i, /\bno\s+semicolons?\b/i, 'semicollon usage'],
        [/\bsingle quotes?\b/i, /\bdouble quotes?\b/i, 'quote style'],
        [/\bnever\s+use\b/i, /\balways\s+use\b/i, 'never vs always'],
      ]
      const normalized = line.toLowerCase()
      for (let i = 0; i < ctx.lineIndex; i++) {
        if (isInCodeBlock(i, ctx.codeBlocks)) continue
        const otherNorm = ctx.allLines[i].toLowerCase()
        for (const [patA, patB, topic] of contradictions) {
          if ((patA.test(normalized) && patB.test(otherNorm)) ||
              (patB.test(normalized) && patA.test(otherNorm))) {
            return {
              message: `May contradict line ${i + 1} (${topic}) -- Claude may pick one arbitrarily`,
              suggestion: 'Remove the conflicting instruction. When two rules contradict, Claude picks one arbitrarily.',
              originalText: line.trim(),
            }
          }
        }
      }
      return null
    },
  },
  {
    id: 'todo-or-fixme',
    name: 'TODO/FIXME Left In',
    category: 'antipattern',
    severity: 'warning',
    description: 'Incomplete TODO or FIXME left in CLAUDE.md',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) {
        return {
          message: 'Incomplete TODO/FIXME in CLAUDE.md -- Claude may try to resolve it or be confused',
          suggestion: 'Either complete the instruction or remove the placeholder',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'html-comment-waste',
    name: 'HTML Comment in CLAUDE.md',
    category: 'antipattern',
    severity: 'info',
    description: 'HTML comments are stripped from context but still loaded from disk',
    docLink: 'https://code.claude.com/docs/en/memory#how-claude-md-files-load',
    test: (line, ctx) => {
      if (isInCodeBlock(ctx.lineIndex, ctx.codeBlocks)) return null
      if (/<!--[\s\S]*?-->/.test(line)) {
        return {
          message: 'Block-level HTML comments are stripped before injection but still take up file space',
          suggestion: 'HTML comments are fine for human notes. Just know they don\'t consume context tokens but do count toward file lines',
          originalText: line.trim(),
        }
      }
      return null
    },
  },
  {
    id: 'wall-of-rules',
    name: 'Wall of Rules',
    category: 'antipattern',
    severity: 'warning',
    description: 'Many bullet points in a row without section grouping',
    test: (_line, ctx) => {
      if (ctx.lineIndex !== 0) return null
      let maxRun = 0
      let current = 0
      for (let i = 0; i < ctx.totalLines; i++) {
        if (/^\s*[-*]\s/.test(ctx.allLines[i])) {
          current++
          maxRun = Math.max(maxRun, current)
        } else {
          current = 0
        }
      }
      if (maxRun > 15) {
        return {
          message: `${maxRun} consecutive bullet points without a section header`,
          suggestion: 'Group related bullets under descriptive headers (## Section). Claude follows structured sections better',
        }
      }
      return null
    },
  },
]
