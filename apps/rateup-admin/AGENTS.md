# rateup-admin

RateUp Admin, the staff console: a TanStack Start app (TanStack Router file routes, TanStack
Query, Tailwind 4, shadcn on Base UI) served by Nitro like rateup-ui, calling rateup-api's
`/api/staff` directly from the browser (`VITE_API_URL`). Plan: `i-want-to-redesign-glittery-pony.md`.

**Routes render in the browser only** (`defaultSsr: false` in `src/start.ts`); the server sends
just the `<html>` shell from `__root.tsx`'s `shellComponent`, plus the security headers in
`start.ts`. The staff session cookie belongs to the API's origin, so this server never sees it:
don't turn SSR on for a route, or fetch staff data in a server function, without solving that.
`getRouter()` (`src/router.tsx`) builds the router and its QueryClient; the theme is applied
before paint by `THEME_INIT_SCRIPT` in `<head>`.

## Commands

Tooling is [Vite+](https://viteplus.dev) (`vp`, installed globally); see the Vite+ section at the
end. `package.json` only keeps scripts that do something extra.

```bash
vp install                    # run at the monorepo root; installs every app + the git hooks
vp dev                        # dev server on port 4000 (fixed: the API's STAFF_CONSOLE_ORIGIN)
vp check                      # format + lint + type check (--fix to fix)
vp test run                   # pure src/**/*.test.ts modules, node environment
pnpm run build                # production build to .output/
pnpm run start                # serve the build on $PORT
```

Tests are configured by the `test` block in `vite.config.ts`; the app plugins are skipped while
Vitest runs. `VITE_STAFF_MOCK=true` in `.env.local` signs in as a fake staff user (dev only).

Git hooks live at the monorepo root (`.vite-hooks/`, rules in the root `vite.config.ts`):
pre-commit runs `vp check --fix` on this app's staged files; pre-push runs every package's
`typecheck` (here `vp check --no-fmt --no-lint`). Format and lint settings also live in the
root `vite.config.ts`; this app's `vite.config.ts` only holds build, dev and test settings.

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

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
