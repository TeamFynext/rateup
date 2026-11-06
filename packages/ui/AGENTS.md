# @rateup/ui

shadcn/ui components (style `base-vega`, built on `@base-ui/react`, Tabler icons) shared by
`apps/web` and `apps/admin`. Source-only: the apps' Vite builds compile it, so there is no
build step.

```ts
import { Button } from "@rateup/ui/components/button";
import { useIsMobile } from "@rateup/ui/hooks/use-mobile";
import { getInitials } from "@rateup/ui/lib/initials";
```

- Inside the package, imports are relative (`./button`, `../lib/utils`). Never import from
  an app.
- `cn` comes from the `cn` package (a compiled drop-in for clsx + tailwind-merge).
- Tailwind does not scan this folder automatically: each app's stylesheet has an `@source`
  line for it (web: `styles/app.css` and `styles/base.css`, admin: `styles/app.css`). A new
  component that only the logged-in app may render also needs an `@source not` line in
  web's `base.css`, like `sidebar` and `table`.
- Components that exist in only one app, or that have drifted between web and admin (card,
  chart, checkbox, field, sonner, switch), stay in that app's `src/components/ui/`. Move one
  here only once both copies match.
- Add a shadcn component here with `pnpm dlx shadcn@latest add <name>` from this folder.
