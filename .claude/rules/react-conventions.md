---
paths:
  - "src/components/**/*.tsx"
---

# React Component Conventions

- One component per file, named export matching the filename
- Props interface defined above the component, named `<ComponentName>Props`
- Use shadcn/ui primitives from `./ui/` for Cards, Badges, Tabs, etc.
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes
- Keep components under 150 lines; extract sub-components when larger
- Event handlers named `handle<Action>` (e.g., `handleClick`, `handleFileUpload`)
- Memoize expensive computations with `useMemo` and callbacks with `useCallback`
