import type { PoolClient } from "pg";

import { log } from "./logger.js";

/**
 * Every helper here takes the `pg` client to use — the one holding the open
 * BEGIN in `sendTemplateMessage` — so a failure's bookkeeping (participant
 * status and stats counters) stays atomic. This path is raw SQL rather than
 * Prisma because it runs at concurrency 250 and Prisma's interactive
 * transactions gave up waiting for a connection with P2028 (see
 * `src/utils/db.ts`). The failure detail itself lives on the message
 * (`WaMessage.logs`), written by handleWaMessages.
 *
 * The hazard of raw SQL: these column and table names are owned by
 * `prisma/schema.prisma`, so a rename there is a silent runtime failure here
 * rather than a compile error.
 */

interface CampaignParticipantUpdate {
  status?: string;
  errorMessage?: string | null;
  sentAt?: Date;
}

/** `SET "a" = $1, "b" = $2 …` plus the values, in the object's key order. */
function buildSetClause(data: object) {
  const entries = Object.entries(data);
  return {
    setClause: entries.map(([column], i) => `"${column}" = $${i + 1}`).join(", "),
    values: entries.map(([, value]) => value),
  };
}

export async function updateCampaignParticipant(
  id: string,
  data: CampaignParticipantUpdate,
  client: PoolClient,
) {
  try {
    const { setClause, values } = buildSetClause(data);
    if (!setClause) return;
    const { rows } = await client.query(
      `UPDATE "CampaignParticipant" SET ${setClause} WHERE "id" = $${values.length + 1}`,
      [...values, id],
    );
    return rows?.[0];
  } catch (e) {
    log.error(e);
  }
}

export async function updateCampaignStats(
  campaignId: string,
  column: "totalFailed",
  client: PoolClient,
) {
  try {
    if (column === "totalFailed") {
      await client.query(
        `UPDATE "CampaignStats" SET "totalSend" = "totalSend" + 1, "totalFailed" = "totalFailed" + 1 WHERE "campaignId" = $1`,
        [campaignId],
      );
    }
  } catch (error) {
    log.error({ err: error }, `Error in updateCampaignStats for column ${column}: `);
  }
}

/**
 * Book a send-time failure against the attempt that produced it.
 *
 * `totalSent` is bumped alongside `totalFailed` for the same reason
 * `updateCampaignStats` does: a rejected message was still an attempt, and the
 * funnel's "attempted" number has to include the ones Meta refused outright.
 */
export async function updateCampaignSendStats(
  campaignSendId: string | undefined | null,
  column: "totalFailed",
  client: PoolClient,
) {
  if (!campaignSendId) return;
  try {
    if (column === "totalFailed") {
      await client.query(
        `UPDATE "CampaignSend" SET "totalSent" = "totalSent" + 1, "totalFailed" = "totalFailed" + 1 WHERE "id" = $1`,
        [campaignSendId],
      );
    }
  } catch (error) {
    log.error({ err: error }, `Error in updateCampaignSendStats for column ${column}: `);
  }
}

export async function updateDripCampaignParticipant(
  id: string,
  data: CampaignParticipantUpdate,
  client: PoolClient,
) {
  try {
    const { setClause, values } = buildSetClause(data);
    if (!setClause) return;
    const { rows } = await client.query(
      `UPDATE "CampaignParticipantDripStage" SET ${setClause} WHERE "id" = $${values.length + 1}`,
      [...values, id],
    );
    return rows?.[0];
  } catch (e) {
    log.error(e);
  }
}

export async function updateDripCampaignStats(
  dripStageId: string,
  column: "totalFailed",
  client: PoolClient,
) {
  try {
    if (column === "totalFailed") {
      await client.query(
        `UPDATE "CampaignDripStage" SET "totalSend" = "totalSend" + 1, "totalFailed" = "totalFailed" + 1 WHERE "id" = $1`,
        [dripStageId],
      );
    }
  } catch (error) {
    log.error({ err: error }, `Error in updateDripCampaignStats for column ${column}: `);
  }
}
