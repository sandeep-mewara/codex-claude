export interface BestPractice {
  id: string
  title: string
  description: string
  docLink: string
}

export const BEST_PRACTICES: BestPractice[] = [
  {
    id: 'size',
    title: 'Keep under 200 lines',
    description: 'Target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence.',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
  },
  {
    id: 'structure',
    title: 'Use headers and bullets',
    description: 'Use markdown headers and bullets to group related instructions. Claude scans structure the same way readers do.',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
  },
  {
    id: 'specificity',
    title: 'Be concrete and verifiable',
    description: 'Write instructions that are concrete enough to verify. "Use 2-space indentation" instead of "Format code properly".',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
  },
  {
    id: 'consistency',
    title: 'Avoid contradictions',
    description: 'If two rules contradict each other, Claude may pick one arbitrarily. Review periodically to remove conflicts.',
    docLink: 'https://code.claude.com/docs/en/memory#write-effective-instructions',
  },
  {
    id: 'skills',
    title: 'Use Skills for procedures',
    description: 'Multi-step procedures should be Skills, not CLAUDE.md entries. Skills load on demand and keep CLAUDE.md concise.',
    docLink: 'https://code.claude.com/docs/en/skills',
  },
  {
    id: 'rules',
    title: 'Use .claude/rules/ for path-specific instructions',
    description: 'Instructions that apply only to certain file types belong in .claude/rules/ with paths frontmatter.',
    docLink: 'https://code.claude.com/docs/en/memory#path-specific-rules',
  },
  {
    id: 'imports',
    title: 'Use @imports for referenced files',
    description: 'Import additional files using @path/to/file syntax. Imported files are loaded into context at launch.',
    docLink: 'https://code.claude.com/docs/en/memory#import-additional-files',
  },
  {
    id: 'local',
    title: 'Separate personal from project',
    description: 'Personal preferences go in CLAUDE.local.md (add to .gitignore). Project CLAUDE.md is for team-wide standards.',
    docLink: 'https://code.claude.com/docs/en/memory#choose-where-to-put-claude-md-files',
  },
]
