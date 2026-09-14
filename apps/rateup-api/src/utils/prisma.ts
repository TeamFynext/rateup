import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { DB_POOL_MAX, DB_TRANSACTION_MAX_WAIT_MS, DB_TRANSACTION_TIMEOUT_MS } from "./db.js";

const connectionString = `${process.env.DATABASE_URL}`;

// `max` is the pool size. Until it was passed here the adapter built its pool
// from the connection string alone and `DB_POOL_MAX` — imported, read, and
// never applied — was decorative: every process ran on pg's default of ten
// connections whatever the variable said.
const adapter = new PrismaPg({ connectionString, max: DB_POOL_MAX });
const prisma = new PrismaClient({
  adapter,
  // How long a `$transaction` waits for a free pooled connection before giving
  // up with P2028, and how long it may then hold it. Prisma's defaults are 2s
  // and 5s. The campaign store runs behind a worker at concurrency 250 and, in
  // production, across a region boundary — a two-second wait for one of ten
  // connections is exactly what lost the row for every accepted message in the
  // 2026-09-12 send. Waiting longer costs nothing when the pool is free.
  transactionOptions: {
    maxWait: DB_TRANSACTION_MAX_WAIT_MS,
    timeout: DB_TRANSACTION_TIMEOUT_MS,
  },
});

export default prisma;

/**
 * Returns a new object without the specified fields
 *
 * Prisma does not allow us to exclude fields from the query (If we specify a field to exlcude, then we must specify all other fields to include).
 * This function allows us to exclude fields from the response in  a type-safe way.
 * @param obj
 * @param fields
 * @returns
 */
export function excludeFields<T, K extends keyof T>(obj: T, fields: K[]): Omit<T, K> {
  const newObj = { ...obj };
  fields.forEach((field) => {
    delete newObj[field];
  });
  return newObj;
}
