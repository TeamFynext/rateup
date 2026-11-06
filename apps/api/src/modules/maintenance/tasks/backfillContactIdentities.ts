import { ContactIdentityKind } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { attachIdentity, identitiesFromContact } from "../../contact/identity/identity.service.js";
import { resolveChannelId } from "../../channel/channel.service.js";
import type { TaskContext, TaskOutcome } from "../task.js";
import { readTaskCursor, saveTaskCursor } from "../taskCursor.js";

const TASK_ID = "backfill-contact-identities";

const BATCH = 500;
const SCOPED_TO_CHANNEL: ContactIdentityKind[] = [
  ContactIdentityKind.IG_SCOPED,
  ContactIdentityKind.FB_PSID,
  ContactIdentityKind.WA_BSUID,
];

/**
 * Writes a `ContactIdentity` row for every identifier a contact's legacy columns hold —
 * phone, email, BSUID, Instagram id, Messenger id, external_id — marked primary.
 *
 * Instagram/Messenger ids are scoped to the channel the contact last wrote on; one with no
 * known channel is written unscoped and takes its channel on the next inbound message.
 *
 * Contacts that already have identities are skipped and each run resumes where the last
 * stopped, so re-running is safe. Lookups fall back to the columns until this has run, so nothing
 * breaks in between. Stops at the time limit; the background worker runs it again until it
 * reports nothing left.
 */
export async function backfillContactIdentities({
  apply,
  log,
  timeLimitMs,
}: TaskContext): Promise<TaskOutcome> {
  const started = Date.now();
  // Earlier runs turned an Instagram/Messenger id that older code had copied into `phone`
  // into a PHONE identity. Those are platform ids, never numbers (more than 15 digits, or
  // the contact's own Instagram/Messenger id), so they go.
  const bogusPhones = await prisma.$queryRaw<{ id: string }[]>`
    SELECT i.id FROM "ContactIdentity" i
    JOIN "Contact" c ON c.id = i."contactId"
    WHERE i.kind = 'PHONE'
      AND (i.value !~ '^[0-9]{7,15}$' OR i.value = c."igsId" OR i.value = c.psid)
  `;
  if (bogusPhones.length) {
    log(
      `${bogusPhones.length} phone identities that are really Instagram/Messenger ids ` +
        (apply ? "removed" : "to remove"),
    );
    if (apply) {
      await prisma.contactIdentity.deleteMany({
        where: { id: { in: bogusPhones.map((row) => row.id) } },
      });
    }
  }
  // Merges before the fix recorded an Instagram/Messenger id from the old column without its
  // channel, beside the row that has it: the same identity twice. The channel-less copy goes.
  const duplicates = await prisma.$queryRaw<{ id: string }[]>`
    SELECT loose.id FROM "ContactIdentity" loose
    WHERE loose.scope = '' AND loose.kind IN ('IG_SCOPED', 'FB_PSID', 'WEBCHAT')
      AND EXISTS (
        SELECT 1 FROM "ContactIdentity" scoped
        WHERE scoped."contactId" = loose."contactId" AND scoped.kind = loose.kind
          AND scoped.value = loose.value AND scoped.scope <> ''
      )
  `;
  if (duplicates.length) {
    log(
      `${duplicates.length} duplicate channel-less identities ${apply ? "removed" : "to remove"}`,
    );
    if (apply) {
      await prisma.contactIdentity.deleteMany({
        where: { id: { in: duplicates.map((row) => row.id) } },
      });
      // The removed copy may have been the primary one; the oldest remaining takes over.
      await prisma.$executeRaw`
        UPDATE "ContactIdentity" i SET "isPrimary" = true
        WHERE i.kind IN ('IG_SCOPED', 'FB_PSID', 'WEBCHAT')
          AND i.id = (
            SELECT o.id FROM "ContactIdentity" o
            WHERE o."contactId" = i."contactId" AND o.kind = i.kind
            ORDER BY o."createdAt" LIMIT 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM "ContactIdentity" p
            WHERE p."contactId" = i."contactId" AND p.kind = i.kind AND p."isPrimary"
          )
      `;
    }
  }
  let cursor = await readTaskCursor(TASK_ID);
  let contacts = 0;
  let written = 0;
  let finished = false;

  while (Date.now() - started < timeLimitMs) {
    const batch = await prisma.contact.findMany({
      where: { id: { gt: cursor }, identities: { none: {} } },
      orderBy: { id: "asc" },
      take: BATCH,
      select: {
        id: true,
        orgId: true,
        phone: true,
        email: true,
        bsuid: true,
        igsId: true,
        psid: true,
        external_id: true,
        whatsappUserName: true,
        lastMessagePlatform: true,
        lastMessageSourceIdentifier: true,
      },
    });
    if (!batch.length) {
      finished = true;
      break;
    }
    cursor = batch[batch.length - 1].id;

    for (const contact of batch) {
      const inputs = identitiesFromContact(contact);
      if (!inputs.length) continue;
      contacts++;
      if (!apply) {
        written += inputs.length;
        continue;
      }
      const channelId = await resolveChannelId(
        contact.orgId,
        (contact.lastMessagePlatform as never) ?? null,
        contact.lastMessageSourceIdentifier,
      );
      for (const input of inputs) {
        const scoped = SCOPED_TO_CHANNEL.includes(input.kind);
        const result = await attachIdentity(contact.orgId, contact.id, {
          ...input,
          ...(scoped && channelId ? { channelId } : {}),
        });
        if (result && result.status !== "owned_by_other") written++;
      }
    }
    // Saved per batch, so a run cut off by a restart resumes from here.
    if (apply) await saveTaskCursor(TASK_ID, cursor);
    log(`${contacts} contacts, ${written} identities ${apply ? "written" : "to write"}`);
  }
  if (apply && finished) await saveTaskCursor(TASK_ID, null);

  return {
    summary:
      `${written} identities ${apply ? "written" : "would be written"} for ${contacts} contacts` +
      (bogusPhones.length
        ? `; ${bogusPhones.length} wrong phone identities ${apply ? "removed" : "to remove"}`
        : "") +
      (duplicates.length
        ? `; ${duplicates.length} duplicate identities ${apply ? "removed" : "to remove"}`
        : "") +
      (finished ? "." : ". Stopped at the time limit — run again to continue."),
    details: {
      contacts,
      written,
      finished,
      bogusPhonesRemoved: bogusPhones.length,
      duplicatesRemoved: duplicates.length,
    },
  };
}
