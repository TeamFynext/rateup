# rateup-ui

rateup-ui is a React 19 + TypeScript web application built with TanStack Start and TanStack Router.
The project uses Vite for development/build, Nitro for server output, and Tailwind CSS with a mixed UI stack (shadcn/ui and existing Mantine components).

## Tech Stack

- TanStack Start + TanStack Router
- React 19 + TypeScript
- Vite 8 + Nitro runtime output
- Tailwind CSS
- shadcn/ui built on Base UI (`@base-ui/react`, preferred for new UI) + existing Mantine components
- Vitest for tests
- OXC (oxlint + oxfmt) for linting/formatting
- Husky for pre-commit hooks

## Prerequisites

- Node.js 24.x
- npm

## Install

```bash
npm install
```

## Scripts

```bash
npm run dev        # Start development server (Vite)
npm run build      # Build production output
npm run preview    # Preview production build locally
npm run start      # Start Nitro server from .output/server/index.mjs
npm run test       # Run tests with Vitest
npm run lint       # Run oxlint
npm run lint:fix   # Run oxlint with auto-fix
npm run fmt        # Format with oxfmt (oxfmt)
npm run fmt:check  # Check formatting (oxfmt --check)
npm run typecheck  # Run TypeScript type checking (tsc --noEmit)
npm run translate  # Extract i18n keys and auto-translate locales
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
with `noUnusedLocals` and `noUnusedParameters`. `npm run typecheck` should report zero errors, and
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
