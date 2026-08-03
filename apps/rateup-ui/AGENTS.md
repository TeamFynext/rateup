<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `npx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# AI Coding Agent Instructions for rateup-ui

This file provides essential guidance for AI coding agents working in this codebase. It summarizes key conventions, build/test commands, and links to further documentation and skills for productivity.

## Project Overview

- **Framework:** TanStack Start + TanStack Router, React 19, TypeScript
- **Build Tooling:** Vite 8 + Nitro runtime output
- **UI:** Tailwind CSS with a mixed component stack (shadcn/ui on Base UI, and existing Mantine)
- **Monorepo:** No (single app)

## Build & Test Commands

- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Start:** `npm run start`
- **Lint:** `npm run lint`
- **Lint (auto-fix):** `npm run lint:fix`
- **Format (write):** `npm run fmt`
- **Format (check):** `npm run fmt:check`
- **Type check:** `npm run typecheck`
- **Tests:** `npm run test`
- **Translate:** `npm run translate`

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
code compile** — fix the type instead. `npm run typecheck` must be clean before a change ships.

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

- Use `npx shadcn@latest` for component management
- Always check for existing components before creating new ones
- Compose UI using provided patterns (see shadcn skill)
- Do not perform broad Mantine-to-shadcn rewrites unless explicitly requested.
- shadcn/ui primitives in `src/components/ui/` are built on `@base-ui/react` (not Radix). There is no direct `@radix-ui/*` dependency in `package.json`; don't add one or reintroduce `cmdk`/`Command`-based patterns.
- For select-style fields prefer `Select` (`src/components/ui/select.tsx`) for single choice and `MultiSelect` (`src/components/ui/multi-select.tsx`, a thin wrapper over `Combobox` in `src/components/ui/combobox.tsx`) for multi choice. Always pass `items` on `<Select>`/`<Combobox>` roots so the trigger renders the correct label.
- **`ScrollArea` needs a bounded height, not a `max-h-*`.** Base UI puts `overflow: scroll` on an
  inner viewport that is `size-full`, so in an auto-height parent the viewport grows to its content
  and a `max-h-*` on the `<ScrollArea>` root never scrolls — it just overflows, and gets silently
  clipped if an ancestor (e.g. `Card`) is `overflow-hidden`. Either give the root a definite height
  (`h-96`, or `flex-1 min-h-0` inside a fixed-height flex column — how the working usages in
  `NotificationList.tsx` and sheets do it), or drop `ScrollArea` for a plain `div` carrying both
  `max-h-*` and `overflow-y-auto` (plus `overscroll-contain`), which keeps the cap and the overflow
  on one element. `whats-new/WhatsNewButton.tsx` is an example of the plain-`div` form.

## Styling & Design Tokens

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
- **Prefer shadcn components over custom styled markup:** callouts/banners → `Alert`, status/count
  chips → `Badge`, actions → `Button`. Extend components with `cva` variants, never with `className`
  color/typography overrides.

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
- Pre-commit hooks managed via Husky.

---

**For more details, see:**

- [shadcn skill](.agents/skills/shadcn/SKILL.md)
- [package.json](package.json)
- [vite.config.ts](vite.config.ts)
- [src/config/](src/config/)

---

If you are unsure about a pattern, prefer linking to the relevant skill or config file rather than duplicating content here.
