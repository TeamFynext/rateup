# @rateup/server

Shared backend code for `apps/api`, `apps/worker-bullmq` and `apps/worker-kafka`: services
(`src/modules`), utils, types, authz, the external API, email templates, BullMQ queue
definitions (`src/workers/bullmq/queues`), worker shared code and the generated Prisma client
(`src/generated/prisma`, written by `@rateup/db`).

The backend guide is [apps/api/AGENTS.md](../../apps/api/AGENTS.md); its `src/...` paths
point here unless it says otherwise.

- Inside this package, imports stay relative with a `.js` extension.
- Apps import it as `@rateup/server/<path under src>.js`. The `source` export condition
  serves TypeScript in dev, tests and type checks; production Node loads `dist/`.
- Never import from an app. Code that needs the HTTP server or a worker entry belongs in
  that app.
- `pnpm run test` here runs most of the backend tests; `pnpm run email:dev` previews emails.
