# RateUp

The RateUp platform in one repository: the API and its two workers, the customer dashboard,
the staff console, the public docs site, the mobile app, and a local mock of Meta's Graph
API. It is a pnpm workspace run with [Vite+](https://viteplus.dev) (`vp`).

| Folder               | What it is                                             | Local URL             |
| -------------------- | ------------------------------------------------------ | --------------------- |
| `apps/api`           | HTTP API (Fastify, Prisma, SuperTokens)                | http://localhost:3001 |
| `apps/worker-bullmq` | Background jobs: campaign sends, imports, schedules    | health on :3002       |
| `apps/worker-kafka`  | WhatsApp webhooks and message statuses (Kafka)         | health on :3003       |
| `apps/web`           | Customer dashboard and marketing site (TanStack Start) | http://localhost:3000 |
| `apps/admin`         | Staff console (TanStack Start)                         | http://localhost:4000 |
| `apps/docs`          | Public docs site (TanStack Start + Fumadocs)           | http://localhost:3005 |
| `apps/mobile`        | Mobile app (Expo / React Native)                       | Expo dev server       |
| `packages/db`        | Prisma schema and migrations                           |                       |
| `packages/ui`        | Shared shadcn components and theme (web + admin)       |                       |
| `packages/utils`     | Small helpers shared by any app                        |                       |
| `packages/tsconfig`  | Shared TypeScript configs                              |                       |
| `tools/meta-mock`    | Local stand-in for Meta's Graph API                    | http://localhost:8081 |

[AGENTS.md](AGENTS.md) has the conventions; each app has its own `AGENTS.md` with the details.

## Prerequisites

| Tool                  | Version    | Needed for                                             |
| --------------------- | ---------- | ------------------------------------------------------ |
| Node.js               | 26.x       | everything (`.nvmrc`)                                  |
| Vite+ (`vp`)          | 1.5        | installs, dev servers, checks: https://viteplus.dev    |
| pnpm                  | 12.16.1    | `vp` downloads it; or `corepack enable`                |
| Docker                | any recent | Redis and Kafka (and optionally Postgres, SuperTokens) |
| PostgreSQL            | 16+        | the API and workers                                    |
| Java 17 + Android SDK | Temurin 17 | building the mobile app for Android                    |
| Xcode                 | latest     | building the mobile app for iOS (macOS only)           |

Never run `npm` in this repo: it would write a second lockfile.

## First-time setup

### 1. Install

```bash
vp install                 # the workspace, the git hooks, and `prisma generate`
pnpm run install:mobile    # apps/mobile is a separate install (see "Mobile" below)
```

### 2. Environment files

Every app reads `.env` from its own folder. None are committed; copy the examples and fill
them in (ask a teammate for development keys).

```bash
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.example apps/worker-bullmq/.env      # the workers use the API's variables
cp apps/api/.env.example apps/worker-kafka/.env
cp packages/db/.env.example packages/db/.env          # DATABASE_URL, for Prisma commands
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/docs/.env.example apps/docs/.env
cp apps/mobile/.env.example apps/mobile/.env
cp tools/meta-mock/.env.example tools/meta-mock/.env  # only if you use the mock
```

The values that matter first, in `apps/api/.env` (and the two worker copies):

| Variable               | Local value                                             |
| ---------------------- | ------------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://user:password@localhost:5432/rateup`      |
| `REDIS_URL`            | `redis://localhost:6379`                                |
| `KAFKA_URL`            | `localhost:9092`                                        |
| `SUPERTOKEN_URI`       | `http://localhost:3567`                                 |
| `FRONTEND_URL`         | `http://localhost:3000`                                 |
| `API_URL`              | `http://localhost:3001`                                 |
| `STAFF_CONSOLE_ORIGIN` | `http://localhost:4000` (only to use the staff console) |

`apps/web/.env` and `apps/admin/.env` need `VITE_API_URL=http://localhost:3001`.
`apps/mobile/.env` needs `EXPO_PUBLIC_API_URL` set to an address your phone or emulator can
reach: your machine's LAN IP (`http://192.168.x.x:3001`), or `http://10.0.2.2:3001` from the
Android emulator.

### 3. Services: Postgres, Redis, Kafka, SuperTokens

Redis and Kafka come from the API's compose file. Start them from the root with Docker or
Podman (waits until both are healthy); stop them with `pnpm run infra:down`:

```bash
pnpm run infra:up
```

Postgres: use a local install, or run one in Docker:

```bash
docker run -d --name rateup-postgres -p 5432:5432 \
  -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=rateup \
  postgres:17
```

Authentication needs a SuperTokens core at `SUPERTOKEN_URI`. Run one against the same
Postgres (it keeps its own tables), or point `SUPERTOKEN_URI`/`SUPERTOKEN_KEY` at a shared
development core:

```bash
docker run -d --name rateup-supertokens -p 3567:3567 \
  --add-host=host.docker.internal:host-gateway \
  -e POSTGRESQL_CONNECTION_URI="postgresql://user:password@host.docker.internal:5432/rateup" \
  registry.supertokens.io/supertokens/supertokens-postgresql
```

### 4. Database

```bash
vp run @rateup/db#migrate:deploy     # apply every migration to your database
vp run @rateup/db#generate           # regenerate the Prisma client (also runs on install)
```

### 5. Staff console access (optional)

The console signs in with a Google Workspace account on the staff allowlist. Add yourself
once, with `STAFF_CONSOLE_ORIGIN` set in `apps/api/.env`:

```bash
pnpm -C apps/api run staff:add you@rateup.app --owner
```

To skip Google sign-in while developing the console, set `VITE_STAFF_MOCK=true` in
`apps/admin/.env.local`.

## Running

Start what you are working on; each command runs at the repository root.

```bash
pnpm run dev                          # API + dashboard together
pnpm run dev:workers                  # both workers together

vp run @rateup/api#dev                # API, http://localhost:3001
vp run @rateup/worker-bullmq#dev      # BullMQ worker
vp run @rateup/worker-kafka#dev       # Kafka worker
vp -C apps/web dev                    # dashboard, http://localhost:3000
vp -C apps/admin dev                  # staff console, http://localhost:4000
vp -C apps/docs dev                   # docs site, http://localhost:3005
vp run @rateup/api#email:dev          # email template preview, http://localhost:3004
```

In VS Code, **Terminal → Run Build Task** (`Launch All`) starts the API, dashboard and both
workers in separate terminals (`.vscode/tasks.json`).

The API sends campaign messages through the BullMQ worker and processes WhatsApp webhooks in
the Kafka worker, so run both workers when you work on messaging.

Every dev server has a fixed port and refuses to start if it is taken, instead of drifting
onto another app's: web 3000, API 3001, BullMQ worker 3002, Kafka worker 3003, email preview
3004, docs 3005, admin 4000, Meta mock 8081. If one fails with "port in use", stop whatever
holds it (`lsof -i :3000`).

### WhatsApp without Meta

`tools/meta-mock` answers the Graph API calls the backend makes and can replay Meta's webhook
payloads, so messaging works offline:

```bash
vp run @rateup/meta-mock#dev          # http://localhost:8081
```

Then set `META_API_BASE_URL=http://localhost:8081` in `apps/api/.env` and both worker
`.env` files (honoured only outside production). [tools/meta-mock/README.md](tools/meta-mock/README.md)
covers stubbing errors and sending test webhooks.

### Mobile

`apps/mobile` is its own pnpm install with a flat (hoisted) `node_modules`, which Expo needs.
It has its own `pnpm-workspace.yaml` and `pnpm-lock.yaml`; run its commands inside the folder:

```bash
cd apps/mobile
pnpm install                 # after its dependencies change (or `pnpm run install:mobile` at the root)
pnpm start                   # Expo dev server
source use-java17.sh         # Android builds need Java 17
npx expo prebuild            # first time: generates android/ and ios/ (gitignored)
pnpm run android             # build and run on a device or emulator
pnpm run ios                 # macOS only
```

Shared code reaches mobile through `link:` dependencies (`@rateup/utils`), which
`metro.config.js` watches. OTA updates and store builds: see
[apps/mobile/AGENTS.md](apps/mobile/AGENTS.md).

## Everyday commands

```bash
pnpm run typecheck                    # every package, mobile included (also the pre-push hook)
vp check                              # format + lint with the root vite.config.ts
vp fmt                                # format everything
vp run -r build                       # build every package, in dependency order
vp run --filter "@rateup/api..." build   # one app and what it depends on

vp -C apps/api test                   # backend tests; also apps/worker-bullmq, apps/worker-kafka
vp -C apps/web test                   # dashboard tests (any app: vp -C <folder> test)
vp -C apps/api lint                   # backend lint with its own rules
pnpm -C apps/mobile test              # mobile tests
```

### Dependencies

```bash
vp add <pkg> --filter @rateup/web     # add to one package
vp add -D <pkg> --filter @rateup/api  # as a dev dependency
pnpm -C apps/mobile add <pkg>         # mobile (separate install); prefer `npx expo install <pkg>`
```

A dependency used by two or more packages takes its version from the catalog in
`pnpm-workspace.yaml` (`"catalog:"` in `package.json`); upgrade it there. Packages inside the
repo are referenced as `"workspace:*"`.

### Database changes

Edit `packages/db/prisma/schema.prisma`, then:

```bash
vp run @rateup/db#migrate:dev         # create and apply a migration
```

Migrations deploy from CI: `.github/workflows/prisma-migrate-dev.yml` on pushes to `dev`,
`prisma-migrate-prod.yml` on pushes to `main`, when `packages/db/prisma/**` changes.

## Git

- **Branches:** work branches off `dev`; `dev` is merged into `main` for production.
- **Hooks** (installed by `vp install`): pre-commit formats and lints staged files
  (`vp staged`); pre-push type-checks every package.
- **History:** each app's full history came along from its old repository, so
  `git log --follow <file>` and `git blame` go back to the first commit. Branches from the
  old repositories that were never merged are kept as `legacy/<repo>/<branch>`.

## Deployment

- **Railway:** each service has config-as-code in its app folder:
  `apps/api/railway.json`, `apps/worker-bullmq/railway.json`, `apps/worker-kafka/railway.json`.
  Services build from the repository root (leave Railway's root directory empty) and point
  their config path at that file.
- **Web, admin, docs:** `vp run --filter <package>... build`, then `pnpm -C apps/<app> start`
  serves `.output/`.
- **Mobile:** EAS builds run from `apps/mobile` (`eas.json`), which has its own lockfile.

## Troubleshooting

- **`Cannot find module` after pulling:** run `vp install` (and `pnpm run install:mobile` if
  mobile changed).
- **Prisma types missing or stale:** `vp run @rateup/db#generate`.
- **API exits at start with a Kafka or Redis error:** the containers are not running;
  `docker compose -f apps/api/docker-compose.yaml up -d`.
- **Sign-in fails locally:** check `SUPERTOKEN_URI` points at a running SuperTokens core.
- **Admin cannot reach the API:** `STAFF_CONSOLE_ORIGIN=http://localhost:4000` in
  `apps/api/.env`, and the console must run on port 4000 (it does not pick another).
- **Mobile cannot reach the API:** `EXPO_PUBLIC_API_URL` must be reachable from the device,
  not `localhost`.
