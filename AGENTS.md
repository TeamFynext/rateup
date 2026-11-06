# RateUp monorepo

One pnpm workspace managed with Vite+ (`vp`). Each app and package has its own `AGENTS.md`;
read it before working there. The backend guide is [apps/api/AGENTS.md](apps/api/AGENTS.md).

## Layout

| Folder               | Package                 | What it is                                                       |
| -------------------- | ----------------------- | ---------------------------------------------------------------- |
| `apps/api`           | `@rateup/api`           | HTTP API (Fastify): entry, route registry, HTTP plugins, scripts |
| `apps/worker-bullmq` | `@rateup/worker-bullmq` | BullMQ worker: queue processors and scheduled jobs               |
| `apps/worker-kafka`  | `@rateup/worker-kafka`  | Kafka worker: WhatsApp webhook and message-status consumers      |
| `apps/web`           | `@rateup/web`           | Customer dashboard and marketing site (TanStack Start)           |
| `apps/admin`         | `@rateup/admin`         | Staff console (TanStack Start)                                   |
| `apps/docs`          | `@rateup/docs`          | Public docs site (TanStack Start + Fumadocs)                     |
| `apps/mobile`        | `@rateup/mobile`        | Mobile app (Expo / React Native)                                 |
| `packages/server`    | `@rateup/server`        | Backend code shared by the API and both workers, Prisma client   |
| `packages/db`        | `@rateup/db`            | Prisma schema, migrations and config                             |
| `packages/ui`        | `@rateup/ui`            | shadcn components shared by web and admin                        |
| `packages/utils`     | `@rateup/utils`         | Pure helpers shared by any app                                   |
| `packages/tsconfig`  | `@rateup/tsconfig`      | Shared TypeScript configs (`vite-react.json`, `node.json`)       |
| `tools/meta-mock`    | `@rateup/meta-mock`     | Local mock of Meta's Graph API for development and tests         |

Dependencies point one way: apps → packages, never packages → apps, never app → app.

## Commands (run at the root)

```bash
vp install                        # install everything, git hooks, prisma generate (never npm)
pnpm run dev                      # API + dashboard; `pnpm run dev:workers` for both workers
vp run @rateup/api#dev            # one package's script
vp -C apps/web dev                # a Vite app's dev server
vp run -r typecheck               # every package (the pre-push hook)
vp run -r build                   # every package, in dependency order
vp run --filter "@rateup/api..." build   # one app and the packages it needs
vp check                          # format + lint (root vite.config.ts)
```

## Rules

- **One lockfile.** `pnpm-lock.yaml` and `pnpm-workspace.yaml` live only at the root. Add a
  dependency from the package folder (`vp add <pkg>`), or `vp add <pkg> --filter <name>`.
  Internal packages use `"workspace:*"`.
- **`nodeLinker: hoisted`** is workspace-wide because the Expo app needs it.
- **Internal packages ship TypeScript source.** `ui` and `utils` are compiled by the app that
  imports them. `server` exports source under the `source` condition (dev, tests, type
  checks) and its compiled `dist/` to plain Node in production.
- **Format and lint settings live only in the root `vite.config.ts`.** Vite+ ignores `fmt` and
  `lint` blocks in package configs; use `overrides` there for per-package rules. App
  `vite.config.ts` files keep their build, dev and test settings. The backend packages and
  apps/mobile still lint with plain oxlint and their own `.oxlintrc.json`.
- **Git hooks** are in `.vite-hooks/`: pre-commit runs `vp staged`, pre-push runs
  `vp run -r typecheck`.
- **Local env files** are not committed. Each app reads `.env` from its own folder;
  `packages/server` and `packages/db` have one too, for tests and Prisma commands.
- **History.** Every file's history was imported from its old repo, so `git log --follow`
  and `git blame` reach back through the moves. Unmerged branches from the old repos are
  kept as `legacy/<repo>/<branch>`.
