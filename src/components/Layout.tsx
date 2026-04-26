import type { ReactNode } from 'react'
import { useTheme } from '@/lib/theme-context'
import { Sun, Moon } from 'lucide-react'

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href={import.meta.env.BASE_URL} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Codex Claude" className="w-8 h-8" />
            <h1 className="text-lg font-semibold tracking-tight">
              Codex Claude
            </h1>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sandeep-mewara/codex-claude"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub Repo
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-center">
            Built for beginners learning to work with Claude Code.
            Rules derived from the{' '}
            <a href="https://code.claude.com/docs/en/memory" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              official documentation
            </a>.
          </div>
          <div className="flex-1 text-right text-xs text-muted-foreground/60">
            v{__APP_VERSION__.split('.').slice(0, 2).join('.')}
          </div>
        </div>
      </footer>
    </div>
  )
}
