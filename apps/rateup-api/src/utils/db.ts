import { Pool } from "pg";

import { log } from "./logger.js";

/**
 * Size of every `pg` pool this process opens — the raw pool below and the one
 * Prisma's driver adapter builds (`prisma.ts`). Left at `pg`'s default of 10
 * unless `DB_POOL_MAX` says otherwise, because the ceiling that matters is
 * Postgres' `max_connections` shared across every replica of `api`, `bullmq` and
 * `kafka`, not anything this file can work out on its own.
 */
export const DB_POOL_MAX = Number.parseInt(process.env.DB_POOL_MAX || "10", 10);

/**
 * Prisma interactive-transaction limits, applied in `prisma.ts`. `maxWait` is
 * the time a transaction may spend waiting for a pooled connection; `timeout`
 * is how long it may then run. Both in milliseconds.
 */
export const DB_TRANSACTION_MAX_WAIT_MS = Number.parseInt(
  process.env.DB_TRANSACTION_MAX_WAIT_MS || "15000",
  10,
);
export const DB_TRANSACTION_TIMEOUT_MS = Number.parseInt(
  process.env.DB_TRANSACTION_TIMEOUT_MS || "30000",
  10,
);

/**
 * Raw `pg` pool, used by the campaign dispatch path only.
 *
 * That path runs at concurrency 250 (see `waMessage.processor.ts`) and each job
 * ends in a short read-modify-write transaction. Prisma's interactive
 * `$transaction` gives up waiting for a free connection after a few seconds and
 * throws P2028, so under a real campaign every send's bookkeeping failed. A
 * plain pool queues instead of erroring, which is what this path needs; the rest
 * of the API keeps using Prisma.
 */
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: DB_POOL_MAX,
});

dbPool.on("error", (err) => {
  // An idle client erroring must not take the process down.
  log.error({ err }, "pg pool error");
});

export default dbPool;
