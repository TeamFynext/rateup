import { Prisma, type LeadChannel } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * How long one run spends placing leads before it stops and reports that work remains.
 * The request that started it is still waiting, so this leaves room for the final batch to
 * finish and the response to serialise.
 */
const PLACE_LEADS_BUDGET_MS = 20_000;
const PLACE_LEADS_BATCH = 500;

/** Contact channels we can name; anything else is a lead with no channel. */
const CHANNEL_BY_SOURCE: Record<string, "WHATSAPP" | "INSTAGRAM" | "MESSENGER"> = {
  whatsapp: "WHATSAPP",
  instagram: "INSTAGRAM",
  messenger: "MESSENGER",
};

/** What the backfill needs off a contact to decide where its lead goes. */
export interface PlaceableContact {
  id: string;
  orgId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  createdAt: Date;
  lastReceivedMessageTimeStamp: Date | null;
  lastSentMessageTimeStamp: Date | null;
  Lifecycle: { name: string } | null;
}

/** One org's board, reduced to what matching needs. */
export interface PlaceableBoard {
  id: string;
  stages: { id: string; name: string; status: "OPEN" | "WON" | "LOST" }[];
}

/**
 * Decides which column a contact's lead belongs on, or why it gets none.
 *
 * Matching is by **name**, trimmed and case-insensitive, because `seedPipelines` copies
 * lifecycle names verbatim. A lifecycle renamed after seeding no longer matches, and that
 * contact is reported as unmatched rather than dropped on an arbitrary column.
 *
 * The board passed in is the one belonging to the contact's own org — the caller looks it
 * up by `contact.orgId`, so a contact can only ever land on its own org's columns.
 */
export function leadRowForContact(
  contact: PlaceableContact,
  board: PlaceableBoard | undefined,
): Prisma.LeadCreateManyInput | "no-pipeline" | "unmatched" {
  if (!board) return "no-pipeline";

  const wanted = contact.Lifecycle?.name.trim().toLowerCase();
  const stage = board.stages.find((candidate) => candidate.name.trim().toLowerCase() === wanted);
  if (!stage) return "unmatched";

  const known = CHANNEL_BY_SOURCE[contact.source?.trim().toLowerCase() ?? ""];
  const channel: LeadChannel = known ?? "NONE";
  // The board measures rotting from `lastActivityAt`, so a lead that really has sat
  // untouched for months should read that way rather than looking new.
  const lastTouch =
    contact.lastReceivedMessageTimeStamp ?? contact.lastSentMessageTimeStamp ?? contact.createdAt;

  return {
    pipelineId: board.id,
    stageId: stage.id,
    contactId: contact.id,
    name: contact.name ?? "Unnamed contact",
    phone: contact.phone,
    email: contact.email,
    // The contact's channel is the closest thing to where the lead came from; MANUAL
    // would claim someone typed it in, which nobody did.
    source: known ?? "MANUAL",
    channel,
    // Nobody opened this by hand and no team has claimed it yet.
    teamId: null,
    ownerId: null,
    status: stage.status,
    closedAt: stage.status === "OPEN" ? null : lastTouch,
    stageEnteredAt: lastTouch,
    lastActivityAt: lastTouch,
  };
}

/**
 * Puts every classified contact on the board column matching the lifecycle it already sits
 * in — the second half of the migration, after `seedPipelines` has created columns of the
 * same names.
 *
 * Matching is **by name**, case-insensitively, because the seeder copies lifecycle names
 * verbatim. A contact whose lifecycle has no column of that name — its lifecycle was
 * renamed after seeding, say — is counted as unmatched and left alone rather than dropped
 * somewhere arbitrary.
 *
 * Only contacts with a lifecycle get a lead. That is the whole rule: a lead is what holds a
 * stage, so a contact with no lifecycle stays off the board, exactly as it has no lifecycle
 * today.
 *
 * **Resumable.** One run works for {@link PLACE_LEADS_BUDGET_MS} and reports
 * `done: false` if contacts remain; run it again until that says true. Re-running is safe:
 * the `(contactId, pipelineId)` unique index means an already-placed contact is skipped
 * rather than duplicated.
 *
 * Timestamps come from the contact, not from now, so a lead that has genuinely been sitting
 * untouched for months reads as stalled on the board rather than looking freshly worked.
 */
export async function placeLeadsFromLifecycles({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const started = Date.now();
  const details = {
    done: false,
    scanned: 0,
    placed: 0,
    alreadyOnBoard: 0,
    unmatchedLifecycle: 0,
    skippedNoPipeline: 0,
  };

  // One board per org, with its columns, looked up once rather than per contact.
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { order: "asc" },
    select: { id: true, orgId: true, stages: { select: { id: true, name: true, status: true } } },
  });
  const boardByOrg = new Map<string, (typeof pipelines)[number]>();
  for (const pipeline of pipelines) {
    if (!boardByOrg.has(pipeline.orgId)) boardByOrg.set(pipeline.orgId, pipeline);
  }
  log(`${boardByOrg.size} org(s) have a board to place onto`);

  let cursor: string | undefined;

  for (;;) {
    const contacts = await prisma.contact.findMany({
      where: { lifecycleId: { not: null } },
      orderBy: { id: "asc" },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: PLACE_LEADS_BATCH,
      select: {
        id: true,
        orgId: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        createdAt: true,
        lastReceivedMessageTimeStamp: true,
        lastSentMessageTimeStamp: true,
        Lifecycle: { select: { name: true } },
      },
    });
    if (!contacts.length) {
      details.done = true;
      break;
    }
    cursor = contacts.at(-1)?.id;
    details.scanned += contacts.length;

    const rows: Prisma.LeadCreateManyInput[] = [];
    const contactIds: string[] = [];

    for (const contact of contacts) {
      const row = leadRowForContact(contact, boardByOrg.get(contact.orgId));
      if (typeof row === "string") {
        if (row === "no-pipeline") details.skippedNoPipeline++;
        else details.unmatchedLifecycle++;
        continue;
      }
      contactIds.push(contact.id);
      rows.push(row);
    }

    if (!apply) {
      // Nothing is written, so nothing can be "already on the board" — a dry run reports
      // what a first apply would place.
      const existing = contactIds.length
        ? await prisma.lead.count({ where: { contactId: { in: contactIds } } })
        : 0;
      details.alreadyOnBoard += existing;
      details.placed += rows.length - existing;
    } else if (rows.length) {
      // `skipDuplicates` leans on the (contactId, pipelineId) unique index, so a contact
      // already on the board is passed over rather than duplicated.
      const created = await prisma.lead.createManyAndReturn({
        data: rows,
        skipDuplicates: true,
        select: { id: true },
      });
      details.placed += created.length;
      details.alreadyOnBoard += rows.length - created.length;

      if (created.length) {
        await prisma.leadActivity.createMany({
          data: created.map((lead) => ({
            leadId: lead.id,
            userId: null,
            type: "CREATED",
            details: { sourceLabel: "MIGRATION", automated: true },
          })),
        });
      }
    }

    log(`scanned ${details.scanned} contact(s), ${details.placed} lead(s) so far`);

    if (contacts.length < PLACE_LEADS_BATCH) {
      details.done = true;
      break;
    }
    if (Date.now() - started > PLACE_LEADS_BUDGET_MS) break;
  }

  if (!details.done) log("time budget reached — run the task again to continue");

  const verb = apply ? "Placed" : "Would place";
  const tail = details.done ? "" : " Run it again to continue.";
  return {
    summary: `${verb} ${details.placed} lead(s) from ${details.scanned} classified contact(s).${tail}`,
    details,
  };
}
