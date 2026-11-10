/**
 * Repair WhatsApp Business app echoes (replies typed in the WhatsApp Business
 * app on a coexistence number) stored before `fix/wa-echo-saving`:
 *
 *   1. Time — echoes were stamped with the time the webhook was processed, not
 *      the time they were sent. `waCreatedAt` is reset from Meta's own
 *      `timestamp`, which is still on the stored body.
 *   2. Ticket — an echo to a contact with no ticket was stored with no
 *      `conversationId`, so no inbox view could ever show it. It is filed onto
 *      the contact's first ticket opened after it (the conversation the reply
 *      started), else their latest ticket, else a new CLOSED ticket — closed,
 *      because these are old messages and must not flood the open inbox. The
 *      counters of every ticket touched are then recomputed.
 *   3. Images (`--media` only) — an echoed image kept only Meta's media id,
 *      which the inbox cannot draw. The file is copied to S3, the same way the
 *      webhook now does. Meta media ids expire (about 30 days), so older ones
 *      fail and are left as they are.
 *
 * Echoes already on a closed ticket are left there: that is the ticket that was
 * current when they were sent, and reopening old chats now would be wrong.
 *
 *   pnpm run backfill:wa-echoes                      # dry run: counts only
 *   pnpm run backfill:wa-echoes --apply
 *   pnpm run backfill:wa-echoes --apply --media
 *   pnpm run backfill:wa-echoes --org <orgId> --apply
 *
 * Every step is idempotent, so it can be re-run after an interruption.
 * Needs DATABASE_URL in the environment (and Meta/S3 credentials for --media).
 */
import "dotenv/config";

import { Prisma } from "../src/generated/prisma/client.js";
import prisma from "../src/utils/prisma.js";

const CHUNK = 1_000;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const media = args.includes("--media");
const orgIndex = args.indexOf("--org");
const orgId = orgIndex === -1 ? undefined : args[orgIndex + 1];
if (orgIndex !== -1 && !orgId) throw new Error("--org takes an org id");

/**
 * A stored echo: an outbound WhatsApp message no RateUp user sent, whose body is
 * Meta's echo (it names the business number in `from` and carries `timestamp`).
 * Messages RateUp sends itself are its own send payloads and have neither.
 */
const isEcho = Prisma.sql`
  m."sourcePlatform" = 'WHATSAPP'
  AND m."sendBy" IS NULL
  AND m."messageBody"->>'exchangeProcess' = 'send'
  AND m."messageBody"->'send'->>'from' IS NOT NULL
  AND m."messageBody"->'send'->>'timestamp' ~ '^[0-9]+$'
`;
const inOrg = orgId ? Prisma.sql`AND c."orgId" = ${orgId}::uuid` : Prisma.empty;

interface EchoRow {
  id: string;
  contactId: string | null;
  orgId: string;
  conversationId: string | null;
  sentAt: Date;
  storedAt: Date | null;
  type: string | null;
  imageId: string | null;
  imageLink: string | null;
}

async function* echoes(): AsyncGenerator<EchoRow[]> {
  let cursor = NIL_UUID;
  for (;;) {
    const batch = await prisma.$queryRaw<EchoRow[]>`
      SELECT m.id,
             m."contactId",
             c."orgId",
             m."conversationId",
             (to_timestamp((m."messageBody"->'send'->>'timestamp')::bigint) AT TIME ZONE 'UTC') AS "sentAt",
             m."waCreatedAt" AS "storedAt",
             m."messageBody"->'send'->>'type' AS type,
             m."messageBody"->'send'->'image'->>'id' AS "imageId",
             m."messageBody"->'send'->'image'->>'link' AS "imageLink"
      FROM "WaMessage" m
      JOIN "Contact" c ON c.id = m."contactId"
      WHERE m.id > ${cursor}::uuid
        AND ${isEcho}
        ${inOrg}
      ORDER BY m.id
      LIMIT ${CHUNK}
    `;
    if (batch.length === 0) return;
    yield batch;
    cursor = batch[batch.length - 1].id;
    if (batch.length < CHUNK) return;
  }
}

/** The ticket an echo with none belongs on; creates a closed one when the contact has none. */
async function ticketFor(echo: EchoRow, created: Map<string, string>): Promise<string> {
  const contactId = echo.contactId!;
  const after = await prisma.conversation.findFirst({
    where: { contactId, createdAt: { gte: echo.sentAt } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (after) return after.id;
  const latest = await prisma.conversation.findFirst({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) return latest.id;

  const reused = created.get(contactId);
  if (reused) return reused;
  const ticket = await prisma.conversation.create({
    data: {
      contactId,
      orgId: echo.orgId,
      status: "CLOSED",
      createdAt: echo.sentAt,
      closedAt: echo.sentAt,
    },
    select: { id: true },
  });
  created.set(contactId, ticket.id);
  return ticket.id;
}

/** Same recompute as the 20260710142904_inbox_conversation migration, for the tickets named. */
async function recomputeTickets(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.$executeRaw`
    UPDATE "Conversation" c
    SET "messageCount"          = m."messageCount",
        "lastMessageAt"         = m."lastMessageAt",
        "lastCustomerMessageAt" = m."lastCustomerMessageAt",
        "lastAgentMessageAt"    = m."lastAgentMessageAt"
    FROM (
      SELECT "conversationId",
             COUNT(*)::INTEGER                                                             AS "messageCount",
             MAX(COALESCE("waCreatedAt", "createdAt"))                                     AS "lastMessageAt",
             MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NULL)     AS "lastCustomerMessageAt",
             MAX(COALESCE("waCreatedAt", "createdAt")) FILTER (WHERE "sendBy" IS NOT NULL) AS "lastAgentMessageAt"
      FROM "WaMessage"
      WHERE "conversationId" = ANY(${ids}::uuid[])
        AND ("sourcePlatform" IS NULL OR "sourcePlatform" <> 'INTERNAL')
      GROUP BY "conversationId"
    ) m
    WHERE m."conversationId" = c.id
  `;
}

async function main() {
  console.log(
    `${apply ? "APPLYING" : "DRY RUN (pass --apply to write)"}${media ? " with --media" : ""}${orgId ? ` for org ${orgId}` : ""}`,
  );

  const downloadAndUpload = media
    ? (await import("../src/modules/meta/whatsapp/webhook/whatsapp.utils.js")).downloadAndUpload
    : undefined;

  const created = new Map<string, string>();
  const touched = new Set<string>();
  const counts = {
    echoes: 0,
    retimed: 0,
    refiled: 0,
    ticketsCreated: 0,
    noContact: 0,
    images: 0,
    imagesCopied: 0,
    imagesFailed: 0,
  };

  for await (const batch of echoes()) {
    counts.echoes += batch.length;

    // 1. Time.
    const retime = batch.filter(
      (echo) => echo.storedAt?.getTime() !== new Date(echo.sentAt).getTime(),
    );
    counts.retimed += retime.length;
    if (apply && retime.length) {
      await prisma.$executeRaw`
        UPDATE "WaMessage"
        SET "waCreatedAt" = to_timestamp(("messageBody"->'send'->>'timestamp')::bigint) AT TIME ZONE 'UTC'
        WHERE id = ANY(${retime.map((echo) => echo.id)}::uuid[])
      `;
      for (const echo of retime) if (echo.conversationId) touched.add(echo.conversationId);
    }

    // 2. Ticket.
    for (const echo of batch) {
      if (echo.conversationId) continue;
      if (!echo.contactId) {
        counts.noContact += 1;
        continue;
      }
      counts.refiled += 1;
      if (!apply) continue;
      const before = created.size;
      const ticketId = await ticketFor(echo, created);
      if (created.size > before) counts.ticketsCreated += 1;
      await prisma.waMessage.update({
        where: { id: echo.id },
        data: { conversationId: ticketId },
      });
      touched.add(ticketId);
    }

    // 3. Images.
    for (const echo of batch) {
      if (echo.type !== "image" || !echo.imageId || echo.imageLink) continue;
      counts.images += 1;
      if (!apply || !downloadAndUpload) continue;
      try {
        const key = await downloadAndUpload(echo.orgId, echo.imageId);
        if (!key) throw new Error("upload returned no key");
        await prisma.$executeRaw`
          UPDATE "WaMessage"
          SET "messageBody" = jsonb_set("messageBody", '{send,image,link}', to_jsonb(${key}::text))
          WHERE id = ${echo.id}::uuid
        `;
        counts.imagesCopied += 1;
      } catch (error) {
        counts.imagesFailed += 1;
        console.warn(`image ${echo.imageId} (message ${echo.id}): ${(error as Error).message}`);
      }
    }

    console.log(`scanned ${counts.echoes} echoes`);
  }

  if (apply) {
    const ids = [...touched];
    for (let i = 0; i < ids.length; i += CHUNK) await recomputeTickets(ids.slice(i, i + CHUNK));
  }

  console.log({ ...counts, ticketsRecomputed: apply ? touched.size : 0 });
  if (!apply) {
    console.log(
      `would retime ${counts.retimed}, file ${counts.refiled} onto a ticket, ` +
        `and ${media ? "copy" : "(with --media) copy"} ${counts.images} images`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // --media loads the send service, which holds open Redis/Kafka handles.
    process.exit();
  });
