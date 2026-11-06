# @rateup/worker-bullmq

The bullmq worker: BullMQ queue consumers (`src/processors`) and the wall-clock schedule. Entry: `src/index.ts`. Shared code (services, queues, Prisma) comes
from `@rateup/api` (imported as `@rateup/api/<path under src>.js`); see [apps/api/AGENTS.md](../api/AGENTS.md) for the backend guide,
deployment topology and worker health and metrics.

```bash
pnpm run dev        # tsx watch, loads @rateup/api from source
pnpm run build      # type-check, then emit dist/
pnpm run start      # node dist/index.js
vp test             # tests (vp lint for lint; rules in vite.config.ts)
```

Railway: `railway.json` here is this service's config-as-code; the service builds from the
repo root. Env comes from `.env` in this folder (same variables as `apps/api`).
