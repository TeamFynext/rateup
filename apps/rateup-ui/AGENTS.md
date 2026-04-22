# AI Coding Agent Instructions for rateup-ui

This file provides essential guidance for AI coding agents working in this codebase. It summarizes key conventions, build/test commands, and links to further documentation and skills for productivity.

## Project Overview

- **Framework:** Next.js 16, React 19, TypeScript
- **UI:** shadcn/ui, Tailwind CSS (migrated from Mantine)
- **Monorepo:** No (single app)

## Build & Test Commands

- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Start:** `npm run start`
- **Typecheck:** `npm run typecheck`
- **Lint:** `npm run lint`
- **Prettier:** `npm run prettier:check` / `npm run prettier:write`
- **Test (all checks):** `npm run test`

## Key Conventions

- **Component Library:** Use shadcn/ui components. Prefer composition and semantic tokens. See `.agents/skills/shadcn/SKILL.md` for rules. (Mantine is deprecated; use shadcn/ui for all new UI.)
- **Styling:** Tailwind CSS with semantic tokens. Avoid raw color values. See shadcn skill for details.
- **File Structure:**
  - `app/` — Next.js app directory (routes, layouts, pages)
  - `components/` — Shared React components
  - `backend/` — API clients and backend logic
  - `config/` — App configuration (theme, frontend, etc.)
  - `context/` — React context providers
  - `hooks/`, `store/`, `types/`, `utils/` — Custom hooks, state, types, utilities

## Next.js Best Practices

- Follow `.agents/skills/next-best-practices/SKILL.md` for:
  - File conventions, RSC boundaries, async patterns, runtime selection, directives, navigation, and server functions
- Use [file-conventions.md], [rsc-boundaries.md], [async-patterns.md], etc. in `.agents/skills/next-best-practices/` for advanced topics

## shadcn/ui Usage

- Use `npx shadcn@latest` for component management
- Always check for existing components before creating new ones
- Compose UI using provided patterns (see shadcn skill)
- For legacy Mantine code, migrate to shadcn/ui as needed.

## Error Handling & Monitoring

- Sentry is integrated (see `sentry.edge.config.ts`, `sentry.server.config.ts`)

## Internationalization

- Uses `next-intl` and `dictionaries/` for locale messages

## Additional Notes

- For custom scripts, see `package.json` scripts section
- For Tailwind config, see `config/`. For legacy Mantine theme config, see `config/mantineTheme.ts` (reference only).

---

**For more details, see:**

- [shadcn skill](.agents/skills/shadcn/SKILL.md)
- [Next.js best practices skill](.agents/skills/next-best-practices/SKILL.md)
- [package.json](package.json)
- [next.config.ts](next.config.ts)
- [config/mantineTheme.ts](config/mantineTheme.ts)

---

If you are unsure about a pattern, prefer linking to the relevant skill or config file rather than duplicating content here.
