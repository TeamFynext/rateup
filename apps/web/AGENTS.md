# rateup-ui

The RateUp web app: the customer dashboard and marketing site, built on TanStack Start with a
Nitro server. This file covers the conventions, commands and design rules for working in it.

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Project Overview

- **Framework:** TanStack Start + TanStack Router, React 19, TypeScript
- **Build Tooling:** Vite+ (Vite 8, Vitest, Oxlint, Oxfmt) + Nitro runtime output
- **UI:** Tailwind CSS + shadcn/ui on Base UI, against Design System V2 tokens (`packages/ui/src/styles/theme.css`, shared with admin)
- **Monorepo:** No (single app)

## Commands

Tooling is [Vite+](https://viteplus.dev) (`vp`, installed globally); see the Vite+ section at the
end. `package.json` only keeps scripts that do something extra.

```bash
vp install                    # run at the monorepo root; installs every app + the git hooks
vp dev                        # dev server
vp check                      # format + lint + type check (--fix to fix)
vp check --no-fmt --no-lint   # type check only
vp test run                   # tests (config: the `test` block in vite.config.ts)
pnpm run build                # vp build, then copies instrument.server.mjs into .output/server
vp preview                    # preview the production build
pnpm run start                # serve .output/ with Sentry instrumentation
pnpm run check:layers         # import-layer rules (scripts/check-layers.mjs)
pnpm run check:tokens         # design-token colour debt (scripts/check-design-tokens.mjs)
pnpm run translate            # extract i18n keys and auto-translate locales
```

Git hooks live at the monorepo root (`.vite-hooks/`, rules in the root `vite.config.ts`):
pre-commit runs `vp staged` (formats this app's staged files); pre-push runs every package's
`typecheck` (here `vp check --no-fmt --no-lint`). Format and lint settings also live in the
root `vite.config.ts`; this app's `vite.config.ts` only holds build, dev and test settings.

## Key Conventions

- **Routing Root:** Route tree lives under `src/routes/` (not `routes/`).
- **Router APIs:** For TanStack Router links, use `to` (not `href`) on `Link`.
- **Component Library:** Prefer existing local patterns in the touched area; for new UI, prefer shadcn/ui composition where practical.
- **Styling:** Use Tailwind utility classes with **shadcn semantic tokens** for color (see "Styling & Design Tokens" below). Do not introduce scoped design-token CSS files or per-feature CSS Modules for colors/layout.
- **React/TypeScript:** Prefer immutable props (`Readonly<Props>` or readonly fields) and avoid syncing query data to local state through effect-based copies.
- **File Structure:**
  - `src/routes/` — Route tree and route modules
  - `src/components/` — Unified UI/features layer (merged former components/modules)
  - `src/backend/` — API clients and backend logic
  - `src/config/` — App configuration (theme, frontend, etc.)
  - `src/context/` — React context providers
  - `src/hooks/`, `src/store/`, `src/types/`, `src/utils/` — Hooks, state, types, utilities

## TypeScript

`tsconfig.json` runs with `"strict": true` (which turns on `strictNullChecks`, `noImplicitAny`
and the rest), plus `noUnusedLocals`/`noUnusedParameters`. **Never relax a strictness flag to make
code compile** — fix the type instead. `vp check` must report zero errors before a change ships.

- **Do not add `any`.** Prefer `unknown` plus a type guard, a generic, or a real interface. If a
  value is genuinely opaque, `unknown` is the correct type — it forces the narrowing to happen at
  the point of use. (There is still legacy `any` in the tree; replace it opportunistically in code
  you are already touching, and don't bulk-strip it — the annotations are load-bearing until each
  site gets a real type.)
- **No `@ts-ignore` / `@ts-expect-error`.** There are currently zero in `src/`; keep it that way.
  A suppression hides the next bug on that line, not just this one.
- **Avoid `as` and `!`.** Use them only where the invariant is provable and local, and say why in a
  comment. Never `as unknown as T` to bridge unrelated types.
- **Opaque request bodies** use `RequestPayload` (`src/types/api.ts`, an alias for `unknown`) rather
  than `any` — e.g. `export async function updateQr(data: RequestPayload)`.
- **Errors from axios/react-query are `unknown`/`Error`, not axios shapes.** Reading
  `error.response.data.message` off them does not type-check and throws when the rejection isn't an
  axios error. Use the helpers in `src/utils/apiError.ts`: `getApiErrorMessage(error, fallback)`,
  `getApiErrorData(error)`, `asApiError(error)`.
- **Domain shapes live in `src/types/global.d.ts`** (ambient, mirrors the API). When adding or
  correcting one, check the source of truth in `rateup-api` — `prisma/schema.prisma` for columns and
  the module's `*.schema.ts` (zod) for JSON payload shapes — rather than inferring from one caller.
- **Base UI hands back `null`, not `undefined`.** `Select`/`Combobox` `onValueChange` is
  `(value: string | null) => void`; coalesce at the handler (`onChange(value ?? "")`) instead of
  widening the field's own type.
- **Prefer fixing the signature over patching the call site.** If a function legitimately accepts an
  absent value, widen its parameter (`string | undefined`) once rather than `?? ""`-ing at every
  caller.

## shadcn/ui Usage

- Use `pnpm dlx shadcn@latest` for component management
- Always check for existing components before creating new ones
- Compose UI using provided patterns (see shadcn skill)
- shadcn/ui primitives are built on `@base-ui/react` (not Radix). The ones shared with the staff console (button, dialog, select, sidebar, table and 21 more) live in `packages/ui` and are imported as `@rateup/ui/components/<name>`; the rest stay in `src/components/ui/`. There is no direct `@radix-ui/*` dependency in `package.json`; don't add one or reintroduce `cmdk`/`Command`-based patterns.
- For select-style fields prefer `Select` (`@rateup/ui/components/select`) for single choice and `MultiSelect` (`src/components/ui/multi-select.tsx`, a thin wrapper over `Combobox` in `src/components/ui/combobox.tsx`) for multi choice. Always pass `items` on `<Select>`/`<Combobox>` roots so the trigger renders the correct label.
- **`ScrollArea` needs a bounded height, not a `max-h-*`.** Base UI puts `overflow: scroll` on an
  inner viewport that is `size-full`, so in an auto-height parent the viewport grows to its content
  and a `max-h-*` on the `<ScrollArea>` root never scrolls — it just overflows, and gets silently
  clipped if an ancestor (e.g. `Card`) is `overflow-hidden`. Either give the root a definite height
  (`h-96`, or `flex-1 min-h-0` inside a fixed-height flex column — how the working usages in
  `NotificationList.tsx` and sheets do it), or drop `ScrollArea` for a plain `div` carrying both
  `max-h-*` and `overflow-y-auto` (plus `overscroll-contain`), which keeps the cap and the overflow
  on one element. `whats-new/WhatsNewButton.tsx` is an example of the plain-`div` form.

## Stylesheets

There is no `src/globals.css` any more. The Tailwind source scan is split by surface,
because `@import "tailwindcss"` scans the whole of `src` — one stylesheet meant every marketing
visitor downloaded the dashboard, the survey editor and the admin panel (563 KB).

| File                        | Loaded by                                                                | Scans                                                     |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `src/styles/foundation.css` | imported by all of the below                                             | nothing — imports the shared theme, adds web-only globals |
| `src/styles/base.css`       | `__root.tsx`, so every page                                              | the shell + `components/ui` minus the app-only primitives |
| `src/styles/marketing.css`  | `routes/(marketing)/route.tsx`                                           | the marketing component tree                              |
| `src/styles/app.css`        | the `dashboard`, `admin`, `(auth)`, `auth` and `(public-facing)` layouts | everything (Tailwind's default scan)                      |
| `src/styles/shop.css`       | `routes/(shop)/route.tsx` — the buyer storefront `/s` and checkout `/c`  | `components/shop-public`, `routes/(shop)`, lib, utils     |

- **Adding a marketing component in a new directory?** Add its directory to `marketing.css`'s
  `@source` list, or it renders unstyled. The same goes for `shop.css` and the buyer pages. The
  app is on a full scan and needs nothing.
- **Design tokens go in `packages/ui/src/styles/theme.css`**, shared with admin; `foundation.css`
  imports it and keeps only web-only globals. `components.json` points `tailwind.css` at the
  shared file, so `pnpm dlx shadcn add` writes component variables there. Do not repoint it at
  `app.css` — tokens written there never reach the marketing site or admin.
- Marketing HTML is edge-cacheable (`s-maxage`) from the `(marketing)` layout, which also sets
  `Vary: Accept` because those routes serve Markdown to clients that ask for it.

## Page shells and shared controls

Reach for the existing component before writing a new header, back link or empty block. The
audit that produced these rules found 8 page-shell families, 13 page-title treatments and 13
back-button treatments, several of them written the same week.

- **Page title** → `PageHeading` (`src/components/common/page-heading.tsx`), or its exported
  `PAGE_TITLE` / `SECTION_TITLE` class when the screen states its own heading. Not a bare
  `<h1>`, and not a new font size.
- **Back to a parent page** → `BackLink` (`src/components/common/back-link.tsx`). It names the
  destination and renders a real `<Link>`.
- **List pages** → the kit in `src/components/common/list-page-layout.tsx`.
- **Empty state** → `@rateup/ui/components/empty`. Not a hand-rolled centred div, and not the
  older `NothingFound`.
- **Loading** → `Skeleton` when the shape is known, `Spinner` otherwise. Never `return null`,
  and never a bare `Loading...`.
- **Pending buttons** → `<Button loading={mutation.isPending}>`. Do not hand-roll a spinner or
  swap the label.
- **Destructive confirm** → `useConfirm()` (`src/context/confirm-provider.tsx`). Not a
  hand-rolled Dialog or `window.confirm`.
- **A clickable element that cannot be a `<button>`** → `pressable()`
  (`src/components/common/pressable.ts`), which adds the role, the tab stop and the Enter/Space
  handler. Anything that goes to a URL is an `<a>`, so it opens in a new tab.
- **An icon-only button needs `aria-label`.** The icon is not its name.

The page container is `mx-auto w-full max-w-265`. The app shell already applies `p-4`, so pages
must not add their own outer padding.

## Styling & Design Tokens

`pnpm run check:tokens` guards this section. It fails when the app surface gains colour debt, and
its baseline may only go down. Run it before committing UI work; `--list` prints the offending
lines. There is one type face (`font-display`), one danger colour (`--destructive`), and the V1
aliases (`ink-*`, `rateup-orange`, `rateup-graytext`, `rateup-darkblue`, `rateup-blue-4`,
`font-nunito`, `font-heading`) are gone — Tailwind emits nothing for them, so a reappearance is
silent.

**Interpolation is `{name}`, not `{{name}}`.** `src/i18n.ts` loads `i18next-icu`, so a message is
ICU MessageFormat, not i18next's own syntax: single braces, and `{count, plural, one {…} other {…}}`
where a count changes the wording. A double brace is not a placeholder here and renders verbatim.

Color and styling go through **Tailwind utilities + shadcn semantic tokens**, never a bespoke
scoped-token CSS system. (The inbox's old `inbox-v2.css` `.inbox-v2` token scope and its
per-feature `*.module.css` files were deliberately removed and migrated to this model — do not
reintroduce them.)

- **Do not create scoped design-token CSS** (e.g. a `.some-feature { --fg-1: … }` block) or
  feature `*.module.css` files for colors/layout. Style with Tailwind classes.
- **Do not put colors in inline `style={{ color: "var(--…)" }}`.** Express color and spacing as
  Tailwind classes. Inline `style` is only for genuinely dynamic values (data-driven hex like a
  user-chosen label color, or a computed dimension).
- **Use shadcn semantic tokens** so light/dark both work automatically:
  - text: `text-foreground` (primary), `text-muted-foreground` (secondary/tertiary)
  - surfaces: `bg-background`, `bg-muted`, `bg-card`
  - brand: `primary` / `text-primary` / `bg-primary/10` (the app `--primary` ≈ the RateUp brand blue)
  - borders: `border-border`
- **Accents use the Tailwind palette with explicit `dark:` variants**, not custom tokens: warm/star →
  `amber-*` (e.g. `text-amber-700 dark:text-amber-500`, `bg-amber-50 dark:bg-amber-950/40`);
  success → `green-600` / `bg-green-600/10`. Only truly brand-specific one-offs (channel colors) use
  literal hex, and only when consumed as a dynamic `style` value.
- **`pnpm run check:tokens` enforces this** on the authenticated app: absolute colours, raw
  neutral palette, `bg-primary` with `text-white`, accents with no `dark:`, and hexes that are
  already a token. It runs against a baseline that may only go down — see
  `scripts/design-tokens.baseline.json`. Marketing is deliberately out of scope, because those
  pages carry per-product sub-brands and are light-only by design.
- **Prefer shadcn components over custom styled markup:** callouts/banners → `Alert`, status/count
  chips → `Badge`, actions → `Button`. Extend components with `cva` variants, never with `className`
  color/typography overrides.

## Permissions and roles

What a signed-in user may do is a permission list from `GET /user/info`, not a role name.

- Ask with `usePermissions()` / `useCan("inbox.delete")` (`src/hooks/usePermission.ts`) or wrap markup in
  `<Can permission="…">` (`src/components/common/Can.tsx`). Never compare `user.role` to a string.
- The catalogue and the six system roles are mirrored in `src/utils/authz/` from
  `rateup-api/src/authz/`; when the API changes them, change the mirror in the same PR.
  `resolvePermissions` falls back to the role's bundle when an older API answers without a list.
- Role pickers use `RoleSelect` with `usePermissions().grantableRoles`; roles render with `RoleBadge`.
- Which sidebar sections and routes a user reaches is derived from permissions in
  `src/utils/authz/features.ts` and consumed through `TeamFeaturesContext` / `RouteAccessGuard`.

## Internationalization

- Uses `react-i18next` with locale files in `src/locales/`

## Product Announcements ("What's new")

User-visible changes are announced in-app from the megaphone button in the icon rail
(`src/components/Layout/Navbar/whats-new/`). Ship the announcement in the same PR as the change.

- **Any big UI change must ship with an announcement.** If a change alters how a screen looks or
  works enough that a returning user would notice — a new feature or tab, a restructured page or
  panel, a moved/renamed/removed control, a changed default or workflow — add an announcement entry
  in the same change. When in doubt, announce it; when the change is invisible to users (refactors,
  token/styling parity work, tests, internal types, pure bug fixes with no behaviour shift), don't.
- **Add an entry to `src/config/announcements.ts`** — that file is the only source. Order does not
  matter; the list is sorted by `publishedAt`, newest first.
- **Keep `summary` to one or two sentences.** These are read by customers, not by us: they want to
  know what changed and roughly what it means for them, not how it was built. Name the change and
  its one consequence, then stop. Leave out the reasoning, the edge cases, the before-and-after,
  the internal component and file names, and the list of everything else that moved with it — all
  of that belongs in the PR description. If a change really is too big for two sentences, it is
  usually two announcements. Same for `title`: under ~50 characters, since the card clamps to two
  lines.
- **Never reuse or renumber an `id`.** Read state is a list of ids in the reader's `localStorage`
  (`rateup:whats-new:read`), so a changed id resurfaces as unread for everyone, and an entry
  inheriting a retired id is never seen. Convention: `YYYY-MM-DD-short-slug`.
- **`kinds`** (`new` / `improvement` / `fix`) and the optional one-or-two-word `area` render as
  chips; `link` deep-links into the app via TanStack `Link` (`{ to, search?, label? }`).
- Read state is per browser and not synced — there is no announcements API in `rateup-api`. Do not
  add a second read-state store; extend `useAnnouncements` if that changes.

## Additional Notes

- For custom scripts, see `package.json` scripts section.
- For Tailwind and theme-related config, see `src/config/`.

---

**For more details, see:**

- [shadcn skill](.agents/skills/shadcn/SKILL.md)
- [package.json](package.json)
- [vite.config.ts](vite.config.ts)
- [src/config/](src/config/)

---

If you are unsure about a pattern, prefer linking to the relevant skill or config file rather than duplicating content here.

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
