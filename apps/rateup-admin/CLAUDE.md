# rateup-admin

RateUp Admin, the staff console: a static Vite + React SPA (TanStack Router file routes, TanStack
Query, Tailwind 4, shadcn on Base UI) talking to rateup-api's `/api/staff` through a
same-origin proxy. Plan: `i-want-to-redesign-glittery-pony.md`.

Commands: `npm run dev` (port 4000), `npm run typecheck`, `npm run lint`, `npm run build`,
`npx oxfmt`. `VITE_STAFF_MOCK=true` in `.env.local` signs in as a fake staff user (dev only).

## Design language: RateUp Design System V2

The console uses the same system as rateup-ui (`rateup-ui/src/styles/foundation.css`). Tokens
live in `src/styles/theme.css` (light + dark) and mirror foundation.css; change both together.

- **Shell** (`components/shell/`): a navy icon rail (`bg-rail`, idle `text-rail-foreground/55`,
  active `bg-rail-foreground/14`), then a white nav panel (`w-72`, `bg-sidebar`), then the page
  (`max-w-280`). `nav.ts` is the one source: each rail section declares its `panel`, either
  its page links, `"orgs"` (the organisation directory), or `"none"` (full width, Overview).
  Phones get `MobileHeader` + a sheet listing every section and page.
- **Organisations**: the directory (`components/org/org-directory.tsx`) _is_ the navigation. Its
  filters are URL search params validated on the `/orgs` layout route, so they survive moving
  between orgs; `/orgs` itself is an empty state on desktop and the directory on phones.
  An org page's Overview tab shows the whole account; the other tabs are the full versions.
- **Colour**: brand navy `primary` (#1C518E) is the accent; `accent` (blue-50) is the soft
  selected state. Admin-only names map onto DS V2: `tone-{sky,mint,peach,slate}` are the
  blue/green/amber/neutral -50 tints with their ink in `-accent`, `positive` is green,
  `negative` is `destructive`. Charts use the `chart-1..4` navy ramp with amber `chart-5` as
  the single contrast. No raw `gray-*`/`red-*`/`bg-white` classes.
- **Type**: Instrument Sans for UI (`font-sans`), Figtree for display (`font-display`). Page
  titles use `PageHeading` / `PAGE_TITLE` and section titles `SectionHeading`
  (`components/ds/page-heading.tsx`, ported from rateup-ui); no new title sizes.
- **Shape**: cards are `rounded-xl bg-card ring-1 ring-foreground/10 shadow-xs` (`Panel`),
  controls `h-9 rounded-lg`, badges `rounded-md` (`Pill`). No `rounded-3xl` slabs.
- **Building blocks** (`src/components/ds/`): `Panel`, `PageHeading`/`SectionHeading`,
  `StatCard` (after rateup-ui's `StatTile`; `tone="brand"` for the featured one), `UsageMeter`,
  `BlockChart` (single-series columns), `StatFigure`, `Pill`, `FilterChips`, `SegmentedBar`.
  Use these before inventing new ones; new ones go in the same folder.
