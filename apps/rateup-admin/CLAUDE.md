# rateup-admin

RateUp Admin, the staff console: a static Vite + React SPA (TanStack Router file routes, TanStack
Query, Tailwind 4, shadcn on Base UI) talking to rateup-api's `/api/staff` through a
same-origin proxy. Plan: `i-want-to-redesign-glittery-pony.md`.

Commands: `npm run dev` (port 4000), `npm run typecheck`, `npm run lint`, `npm run build`,
`npx oxfmt`. `VITE_STAFF_MOCK=true` in `.env.local` signs in as a fake staff user (dev only).

## Design language: follow this, not rateup-ui

The reference is `docs/design-reference.png`. Every screen follows it; rateup-ui's navy design
system does not apply here. Tokens live in `src/styles/theme.css` (light + dark).

- **Frame**: full-bleed white (`bg-background`), no grey backdrop or floating canvas: the grey
  around the reference image is only its presentation backdrop. An ink-black icon rail pinned on
  the left (`bg-rail`, `rounded-3xl`, inset `md:p-3`), generous whitespace (`px-12` on desktop).
- **Theme**: light is the default; dark is opt-in from the account menu or the rail toggle.
- **Navigation**: the rail holds one icon per section (Customers, Billing, Operations, Staff) plus
  search, theme and account. The top bar shows the wordmark and the active section's pages as
  UPPERCASE links (13px, `tracking-[0.04em]`); the active one is bold with the ✦ `Sparkle`.
  Both read `components/shell/nav.ts`. On phones the menu sheet is the rail: the same four
  sections plus theme and account, never the full page list. Page headings, the browser tab
  and the menu link all use the nav item's `title` (`ComingSoon` reads it by path).
- **Colour**: monochrome. Ink (`primary`) is the accent: black buttons, black highlight tiles,
  black featured stat card. Colour only comes from the pastel stat tones (`tone-peach`,
  `tone-mint`, `tone-sky`, `tone-slate`, each with an `-accent` for its arrow), `positive` /
  `negative` for trends, and the pink/purple/blue chart dots (`chart-3..5`).
- **Type**: Inter throughout. Page titles `text-[26px] font-medium tracking-tight`; section
  titles `text-lg font-semibold`; big KPI figures `text-[34px] font-medium`; secondary figures
  `text-[22px] font-light`; labels small and muted. Numbers use `tabular`.
- **Shape**: large, soft radii: cards and panels `rounded-3xl`, controls `rounded-xl` /
  `rounded-2xl`, pills `rounded-full`. Hairline borders (`border`), no heavy shadows.
- **Building blocks** (`src/components/ds/`): `StatCard` (pastel KPI tile, `tone="ink"` for the
  featured one), `Panel` + `SectionTitle`, `BlockChart` (stacked rounded tiles, ink cap with the
  value, striped cap for a partial period), `StatFigure` / `StatFigureRow` (the figures under a
  chart), `SegmentedBar`. Use these before inventing new ones; new ones go in the same folder.
- Lists (top performers style): avatar, name over a muted sub-line, figures right-aligned.
