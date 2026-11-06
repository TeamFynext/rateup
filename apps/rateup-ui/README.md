# rateup-ui

rateup-ui is a React 19 + TypeScript web application built with TanStack Start and TanStack Router.
The project uses Vite for development/build, Nitro for server output, and Tailwind CSS with a mixed UI stack (shadcn/ui and existing Mantine components).

## Tech Stack

- TanStack Start + TanStack Router
- React 19 + TypeScript
- Vite+ (`vp`): Vite 8, Vitest, Oxlint and Oxfmt behind one CLI, with Nitro runtime output
- Tailwind CSS
- shadcn/ui built on Base UI (`@base-ui/react`, preferred for new UI) + existing Mantine components
- Git hooks in `.vite-hooks/` (pre-commit formats staged files, pre-push type-checks)

## Prerequisites

- Node.js 26.x (LTS)
- pnpm 12 (version pinned by `packageManager` in package.json)
- Vite+ CLI installed globally (`vp`), see https://viteplus.dev/guide/

## Install

```bash
vp install   # also installs the git hooks via the `prepare` script
```

## Scripts

```bash
vp dev             # Start development server
pnpm run build     # Build production output (vp build + copy Sentry instrument file)
vp preview         # Preview production build locally
pnpm run start     # Start Nitro server from .output/server/index.mjs
vp test run        # Run tests
vp check           # Format check + lint + type check (vp check --fix to fix)
vp lint            # Lint only (--fix to auto-fix)
vp fmt             # Format (--check to check only)
pnpm run translate # Extract i18n keys and auto-translate locales
```

### Useful Commands

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```

Kill the process running on port 3000 (Windows PowerShell)

## Project Structure

- `src/routes/` - TanStack Router route tree and route modules
- `src/components/` - Shared and feature components
- `src/backend/` - API clients and backend-oriented logic
- `src/config/` - Frontend/theme/app configuration
- `src/context/` - React context providers
- `src/hooks/`, `src/store/`, `src/types/`, `src/utils/` - Hooks, state, types, utilities
- `public/` - Static assets
- `src/locales/` - Localization message dictionaries

## Development Notes

- Routing lives under `src/routes/` (not `routes/`).
- For TanStack Router links, use `to` instead of `href` on `Link`.
- Prefer existing local patterns in touched areas.
- For new UI, prefer shadcn/ui composition where practical; avoid broad Mantine-to-shadcn rewrites unless explicitly requested.
- Use Tailwind utility classes and project tokens; avoid introducing one-off raw color values.
- shadcn/ui primitives (`src/components/ui/`) are built on `@base-ui/react`, not Radix — there is no direct `@radix-ui/*` dependency in `package.json`. For a multi-select field, use `MultiSelect` (`src/components/ui/multi-select.tsx`), a thin wrapper over `Combobox` (`src/components/ui/combobox.tsx`); don't reintroduce `cmdk`/`Command`-based patterns.

## TypeScript

The project compiles under `"strict": true` (including `strictNullChecks` and `noImplicitAny`),
with `noUnusedLocals` and `noUnusedParameters`. `vp check` should report zero errors, and
strictness flags are not relaxed to make code compile.

- Don't add `any` — prefer `unknown` with a type guard, a generic, or a real interface. Legacy
  `any` still exists; replace it site by site with a real type, not with a bulk find-and-replace.
- No `@ts-ignore` / `@ts-expect-error`; there are none in `src/`.
- Opaque request bodies use `RequestPayload` (`src/types/api.ts`).
- Read failed-request messages through `src/utils/apiError.ts` (`getApiErrorMessage`,
  `getApiErrorData`, `asApiError`) — react-query hands you an `Error`, not an axios error.
- Shared domain shapes live in `src/types/global.d.ts` and mirror the `rateup-api` schema.

## Internationalization

- Uses `react-i18next` with locale files in `src/locales/`.

## Reference Docs

- [AGENTS.md](AGENTS.md)
- [.agents/skills/shadcn/SKILL.md](.agents/skills/shadcn/SKILL.md)
