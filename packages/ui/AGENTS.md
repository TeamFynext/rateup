# @rateup/ui

The RateUp design system for `apps/web` and `apps/admin`: the shadcn components (style
`base-vega`, built on `@base-ui/react`, Tabler icons), the theme provider and the shared theme
CSS. Change something here and both apps change. Source-only: the apps' Vite builds compile
it, so there is no build step.

```ts
import { Button } from "@rateup/ui/components/button";
import { ThemeProvider, useTheme } from "@rateup/ui/components/theme-provider";
import { useIsMobile } from "@rateup/ui/hooks/use-mobile";
import { getInitials } from "@rateup/ui/lib/initials";
```

```css
@import "@rateup/ui/styles/theme.css"; /* in each app stylesheet, after @import "tailwindcss" */
```

- **Theme:** `src/styles/theme.css` holds every token (light and dark), the DS V2 ramps, the
  `@theme` mapping, the custom utilities and the base layer. Apps add only what is theirs:
  web's `styles/foundation.css` (marketing palettes, animations, page rules), admin's
  `styles/theme.css` (white nav panel, rail, `tone-*`, `positive`/`negative`).
- **Theme provider:** `ThemeProvider` stores the choice under `storageKey` and renders the
  no-flash script with `ScriptOnce`; a client-only app also puts `themeInitScript()` in
  `<head>` (admin does). Cmd/Ctrl+Shift+D toggles dark mode.
- Inside the package, imports are relative (`./button`, `../lib/utils`). Never import from
  an app.
- `cn` comes from the `cn` package (a compiled drop-in for clsx + tailwind-merge).
- Tailwind does not scan this folder automatically: each app's stylesheet has an `@source`
  line for it (web: `styles/app.css` and `styles/base.css`, admin: `styles/app.css`). A
  component only the logged-in app may render also needs an `@source not` line in web's
  `base.css`, like `chart`, `sidebar` and `table`.
- Components only one app uses stay in that app's `src/components/ui/`. Move one here when a
  second app needs it.
- Add a shadcn component here with `pnpm dlx shadcn@latest add <name>` from this folder.
