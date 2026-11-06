# @rateup/db

Prisma schema (`prisma/schema.prisma`), migrations and `prisma.config.ts`. No runtime code.

`prisma generate` (run on every install) writes the client into
`apps/api/src/generated/prisma`: the client's types depend on the API's global `PrismaJson`
declarations (`src/types/global.d.ts`), so it lives next to them. The workers import it as
`@rateup/api/generated/prisma/client.js`.

```bash
pnpm run generate          # after a schema change
pnpm run migrate:dev       # create and apply a migration locally
pnpm run migrate:deploy    # what CI runs (.github/workflows/prisma-migrate-*.yml)
```

`prisma.config.ts` reads `DATABASE_URL` from this folder's `.env` (see `.env.example`).
