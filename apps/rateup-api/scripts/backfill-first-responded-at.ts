/**
 * Backfill Conversation."firstRespondedByUserAt" for conversations that predate the
 * column being maintained on send.
 *
 *   npm run backfill:first-responded
 *   npm run backfill:first-responded -- --chunk 20000
 *
 * The analytics queries used to recompute the first agent reply on every load, from a
 * MIN() over every agent message of every org; they now fall back to the messages of a
 * conversation only while its column is still NULL, so once this has run the fallback
 * finds nothing to do.
 *
 * It lives here rather than in `20260918120000_analytics_indexes` because Prisma runs a
 * migration in one transaction: on a large "WaMessage" table that aggregate holds write
 * locks on "Conversation" for as long as it takes. This walks the conversations in id
 * order instead, one committed statement per chunk, so it can be run against a live
 * database and re-run after an interruption — the IS NULL guard makes repeats no-ops.
 *
 * Needs DATABASE_URL in the environment.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";

const DEFAULT_CHUNK = 10_000;

function chunkSize(): number {
  const index = process.argv.indexOf("--chunk");
  if (index === -1) return DEFAULT_CHUNK;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("--chunk takes a positive integer");
  }
  return value;
}

async function main() {
  const chunk = chunkSize();
  let cursor = "00000000-0000-0000-0000-000000000000";
  let filled = 0;

  for (;;) {
    const batch = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Conversation"
      WHERE id > ${cursor}::uuid
      ORDER BY id
      LIMIT ${chunk}
    `;
    if (batch.length === 0) break;

    const ids = batch.map((row) => row.id);
    const updated = await prisma.$executeRaw`
      UPDATE "Conversation" c
      SET "firstRespondedByUserAt" = f."firstAgentMessageAt"
      FROM (
        SELECT "conversationId", MIN("waCreatedAt") AS "firstAgentMessageAt"
        FROM "WaMessage"
        WHERE "sendBy" IS NOT NULL
          AND "conversationId" = ANY(${ids}::uuid[])
        GROUP BY "conversationId"
      ) f
      WHERE c.id = f."conversationId"
        AND c."firstRespondedByUserAt" IS NULL
        AND f."firstAgentMessageAt" IS NOT NULL
    `;

    cursor = ids[ids.length - 1];
    filled += updated;
    console.log(`filled ${filled} conversations, scanned up to ${cursor}`);
    if (batch.length < chunk) break;
  }

  console.log("done");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
