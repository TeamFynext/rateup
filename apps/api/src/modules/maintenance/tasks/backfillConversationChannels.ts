import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";
import { readTaskCursor, saveTaskCursor } from "../taskCursor.js";

const TASK_ID = "backfill-conversation-channels";

const BATCH = 2000;

/**
 * Gives every ticket the channel it runs on (`Conversation.channelId`), taken from its
 * newest message that names one: Instagram/Messenger by the channel's account id, WhatsApp
 * by the phone number id or the number's digits (however either side is formatted).
 *
 * A ticket whose messages name no connected channel (a removed number, or no messages)
 * stays null, which the inbox treats as "any channel" — exactly the old behaviour.
 * Idempotent: only null tickets are touched. Stops at the time limit and remembers where;
 * Apply hands it to the background worker, which runs it again until it reports finished.
 */
export async function backfillConversationChannels({
  apply,
  log,
  timeLimitMs,
}: TaskContext): Promise<TaskOutcome> {
  let cursor = await readTaskCursor(TASK_ID);
  let scanned = 0;
  let matched = 0;
  const started = Date.now();
  let finished = false;

  for (;;) {
    if (Date.now() - started > timeLimitMs) break;
    const batch = await prisma.$queryRaw<{ id: string; channelId: string | null }[]>`
      SELECT b.id, pick."channelId"
      FROM (
        SELECT conv.id, COALESCE(conv."orgId", ct."orgId") AS "orgId"
        FROM "Conversation" conv
        JOIN "Contact" ct ON ct.id = conv."contactId"
        WHERE conv."channelId" IS NULL AND conv.id > ${cursor}::uuid
        ORDER BY conv.id
        LIMIT ${BATCH}
      ) b
      -- The newest message that names one of the org's channels. Not simply the newest
      -- message: older echoes were stamped with the customer's number, which names none.
      -- WhatsApp numbers compare by digits, since a channel's address is a display string
      -- ("+1555-132-3034") while messages hold "15551323034" and other spellings.
      LEFT JOIN LATERAL (
        SELECT ch.id AS "channelId"
        FROM "WaMessage" m
        JOIN "Channel" ch
          ON ch."orgId" = b."orgId"
          AND ch.platform = m."sourcePlatform"
          AND (
            ch."accountId" = m."sourceIdentifier"
            OR (
              ch.platform = 'WHATSAPP'
              AND regexp_replace(ch.address, '[^0-9]', '', 'g') <> ''
              AND regexp_replace(ch.address, '[^0-9]', '', 'g')
                = regexp_replace(m."sourceIdentifier", '[^0-9]', '', 'g')
            )
          )
        WHERE m."conversationId" = b.id
          AND m."sourceIdentifier" IS NOT NULL
          AND m."sourcePlatform" IS NOT NULL
          AND m."sourcePlatform" <> 'INTERNAL'
        ORDER BY m."waCreatedAt" DESC NULLS LAST, m."createdAt" DESC
        LIMIT 1
      ) pick ON TRUE
      ORDER BY b.id
    `;
    if (!batch.length) {
      finished = true;
      break;
    }
    scanned += batch.length;
    cursor = batch[batch.length - 1].id;

    const hits = batch.filter((row) => row.channelId);
    matched += hits.length;
    if (apply && hits.length) {
      await prisma.$executeRaw`
        UPDATE "Conversation" c
        SET "channelId" = v."channelId"::uuid
        FROM jsonb_to_recordset(${JSON.stringify(hits)}::jsonb) AS v(id text, "channelId" text)
        WHERE c.id = v.id::uuid AND c."channelId" IS NULL
      `;
    }
    // Saved per batch, so a run cut off by a restart resumes from here.
    if (apply) await saveTaskCursor(TASK_ID, cursor);
    log(`${scanned} tickets scanned, ${matched} matched to a channel`);
  }
  if (apply && finished) await saveTaskCursor(TASK_ID, null);

  return {
    summary:
      `${matched} of ${scanned} tickets ${apply ? "given" : "would get"} a channel; ${
        scanned - matched
      } stay channel-less (no connected channel in their messages)` +
      (finished ? "." : ". Stopped at the time limit — run again to continue."),
    details: { scanned, matched, finished },
  };
}
