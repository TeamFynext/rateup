# rateup-ui

This is a modern web application built with Next.js 16, React 19, and TypeScript. It uses shadcn/ui, Mantine, and Tailwind CSS for its UI and styling.

## Project Structure

- `app/` — Next.js app directory (routes, layouts, pages)
- `components/` — Shared React components
- `backend/` — API clients and backend logic
- `config/` — App configuration (theme, frontend, etc.)
- `context/` — React context providers
- `hooks/`, `store/`, `types/`, `utils/` — Custom hooks, state, types, utilities

## Getting Started

### Prerequisites

- Node.js 24.x
- npm (v9+ recommended)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Start (Production)

```bash
npm run start
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Prettier

```bash
npm run prettier:check   # Check formatting
npm run prettier:write   # Auto-format
```

### Full Test (all checks)

```bash
npm run test
```

## UI & Styling

- Use **shadcn/ui** components for all new UI. Prefer composition and semantic tokens.
- Tailwind CSS is used for styling. Avoid raw color values; use semantic tokens.
- **Migration note:** The project previously used Mantine. New development should use shadcn/ui. See `.agents/skills/shadcn/SKILL.md` for usage rules.

## Internationalization

- Uses `next-intl` and `dictionaries/` for locale messages.

## Error Handling & Monitoring

- Sentry is integrated (see `sentry.edge.config.ts`, `sentry.server.config.ts`).

## More Information

- See `.agents/skills/shadcn/SKILL.md` for shadcn/ui usage rules.
- See `.agents/skills/next-best-practices/SKILL.md` for Next.js conventions.
- See `config/mantineTheme.ts` for legacy Mantine theme config (for reference only).

---

For AI coding agent instructions, see [AGENTS.md](AGENTS.md).
