# @rateup/worker-bullmq

The bullmq worker: BullMQ queue consumers (`src/processors`) and the wall-clock schedule. Entry: `src/index.ts`. Shared code (services, queues, Prisma) comes
from `@rateup/server`; see [apps/api/AGENTS.md](../api/AGENTS.md) for the backend guide,
deployment topology and worker health and metrics.

```bash
pnpm run dev        # tsx watch, loads @rateup/server from source
pnpm run build      # type-check, then emit dist/
pnpm run start      # node dist/index.js
pnpm run test
```

Railway: `railway.json` here is this service's config-as-code; the service builds from the
repo root. Env comes from `.env` in this folder (same variables as `apps/api`).
