# RateUp monorepo

One pnpm workspace managed with Vite+ (`vp`). Each app keeps its own `AGENTS.md` with the
details for that app; read it before working there.

| Folder            | Package             | What it is                                               |
| ----------------- | ------------------- | -------------------------------------------------------- |
| `apps/api`        | `rateup-api`        | Fastify + Prisma API, BullMQ and Kafka workers           |
| `apps/web`        | `rateup-ui`         | Customer dashboard (TanStack Start)                      |
| `apps/admin`      | `rateup-admin`      | Staff console (TanStack Start)                           |
| `apps/docs`       | `rateup-docs`       | Public docs site (TanStack Start + Fumadocs)             |
| `apps/mobile`     | `rateup`            | Mobile app (Expo / React Native)                         |
| `tools/meta-mock` | `@rateup/meta-mock` | Local mock of Meta's Graph API for development and tests |
| `packages/`       |                     | Shared libraries (none yet)                              |

## Commands (run at the root)

```bash
vp install                        # install every package + git hooks (never npm)
vp run @rateup/api#dev             # one package's script; `vp -C apps/web dev` also works
pnpm run dev                      # API + dashboard together
vp run -r typecheck               # type-check every package (the pre-push hook)
vp run -r build                   # build every package
vp check                          # format + lint (root vite.config.ts)
```

## Rules

- **One lockfile.** `pnpm-lock.yaml` and `pnpm-workspace.yaml` live only at the root. Add a
  dependency from the package folder (`vp add <pkg>`) or with `vp add <pkg> --filter <name>`.
- **`nodeLinker: hoisted`** is workspace-wide because the Expo app needs it.
- **Format and lint settings live only in the root `vite.config.ts`.** Vite+ ignores `fmt` and
  `lint` blocks in package configs; use `overrides` there for per-package rules. App
  `vite.config.ts` files keep their build, dev and test settings. rateup-api and rateup-app
  still lint with plain oxlint and their own `.oxlintrc.json`.
- **Git hooks** are in `.vite-hooks/`: pre-commit runs `vp staged`, pre-push runs
  `vp run -r typecheck`.
- **History.** Each app's full history was imported from its old repo, so `git log` and
  `git blame` reach back past the merge. Unmerged branches from the old repos are kept as
  `legacy/<repo>/<branch>`.
