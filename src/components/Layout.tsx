import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/favicon.svg" alt="Codex Claude" className="w-8 h-8" />
            <h1 className="text-lg font-semibold tracking-tight">
              Codex Claude
            </h1>
          </a>
          <a
            href="https://github.com/sandeep-mewara/codex-claude"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub Repo
          </a>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Built for beginners learning to work with Claude Code.
        Rules derived from the{' '}
        <a href="https://code.claude.com/docs/en/memory" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          official documentation
        </a>.
      </footer>
    </div>
  )
}
