# AI Coding Agent Instructions for rateup-ui

This file provides essential guidance for AI coding agents working in this codebase. It summarizes key conventions, build/test commands, and links to further documentation and skills for productivity.

## Project Overview

- **Framework:** TanStack Start + TanStack Router, React 19, TypeScript
- **Build Tooling:** Vite 8 + Nitro runtime output
- **UI:** Tailwind CSS with a mixed component stack (shadcn/ui and existing Mantine)
- **Monorepo:** No (single app)

## Build & Test Commands

- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Start:** `npm run start`
- **Lint:** `npm run lint`
- **Format (write):** `npm run format`
- **Format (check):** `npm run check`
- **Tests:** `npm run test`

## Key Conventions

- **Routing Root:** Route tree lives under `src/routes/` (not `routes/`).
- **Router APIs:** For TanStack Router links, use `to` (not `href`) on `Link`.
- **Component Library:** Prefer existing local patterns in the touched area; for new UI, prefer shadcn/ui composition where practical.
- **Styling:** Use Tailwind utility classes and project tokens; avoid introducing one-off raw color values.
- **React/TypeScript:** Prefer immutable props (`Readonly<Props>` or readonly fields) and avoid syncing query data to local state through effect-based copies.
- **File Structure:**
  - `src/routes/` — Route tree and route modules
  - `src/components/` — Unified UI/features layer (merged former components/modules)
  - `src/backend/` — API clients and backend logic
  - `src/config/` — App configuration (theme, frontend, etc.)
  - `src/context/` — React context providers
  - `src/hooks/`, `src/store/`, `src/types/`, `src/utils/` — Hooks, state, types, utilities

## TanStack Best Practices

- Follow `.agents/skills/tanstack-start-best-practices/SKILL.md` for server functions, middleware, SSR, and deployment patterns.
- Follow `.agents/skills/tanstack-router-best-practices/SKILL.md` for type-safe routing, loaders, search params, and navigation.

## shadcn/ui Usage

- Use `npx shadcn@latest` for component management
- Always check for existing components before creating new ones
- Compose UI using provided patterns (see shadcn skill)
- Do not perform broad Mantine-to-shadcn rewrites unless explicitly requested.

## Error Handling & Monitoring

- Sentry is integrated (see `sentry.edge.config.ts`, `sentry.server.config.ts`)

## Internationalization

- Uses `react-i18next` and `dictionaries/` for locale messages

## Additional Notes

- For custom scripts, see `package.json` scripts section
- For Tailwind and theme-related config, see `src/config/`.
- `next.config.ts` may exist for legacy/transition context; prefer active TanStack Start + Vite conventions for new work.

---

**For more details, see:**

- [shadcn skill](.agents/skills/shadcn/SKILL.md)
- [TanStack Start best practices skill](.agents/skills/tanstack-start-best-practices/SKILL.md)
- [TanStack Router best practices skill](.agents/skills/tanstack-router-best-practices/SKILL.md)
- [package.json](package.json)
- [vite.config.ts](vite.config.ts)
- [src/config/mantineTheme.ts](src/config/mantineTheme.ts)

---

If you are unsure about a pattern, prefer linking to the relevant skill or config file rather than duplicating content here.
