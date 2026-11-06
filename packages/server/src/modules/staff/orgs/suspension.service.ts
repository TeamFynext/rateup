import type { FastifyRequest } from "fastify";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { pauseOrgCampaignsForSuspension } from "../../campaign/campaignPause.service.js";
import { clearOrgSuspensionCache } from "../../org/orgSuspension.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";
import type { NoteInput, NoteUpdateInput, ReasonOnlyInput } from "./suspension.schema.js";

const orgNotFound = () => new StaffHttpError(404, "ORG_NOT_FOUND", "Organisation not found.");

async function loadOrg(db: typeof prisma, orgId: string) {
  const org = await db.org.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, suspendedAt: true, suspendedReason: true },
  });
  if (!org) throw orgNotFound();
  return org;
}

/**
 * Switches an account off: the customer's own sessions, their API key and every outbound
 * send stop (src/modules/org/orgSuspension.ts). Campaigns in flight are paused outside the
 * transaction — pausing walks queues and can take seconds, and a slow queue must not roll
 * back a suspension that has already been decided.
 */
export async function suspendOrg(
  request: FastifyRequest,
  orgId: string,
  input: ReasonOnlyInput,
  now = new Date(),
) {
  const existing = await loadOrg(prisma, orgId);
  if (existing.suspendedAt) {
    throw new StaffHttpError(409, "ALREADY_SUSPENDED", "This organisation is already suspended.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.org.update({
      where: { id: orgId },
      data: {
        suspendedAt: now,
        suspendedReason: input.reason,
        suspendedByStaffId: request.staff!.id,
      },
    });
    await recordStaffAction(tx, request, {
      action: "org.suspend",
      targetOrgId: existing.id,
      targetOrgName: existing.name,
      reason: input.reason,
      before: { suspendedAt: null },
      after: { suspendedAt: now, suspendedBy: request.staff!.email },
    });
  });

  await clearOrgSuspensionCache(orgId);

  let campaignsPaused = 0;
  try {
    campaignsPaused = await pauseOrgCampaignsForSuspension(orgId);
  } catch (err) {
    // The account is suspended and every send is refused regardless; a campaign left
    // showing ACTIVE is untidy, not dangerous.
    log.error({ err, orgId }, "Suspended the org but could not pause its campaigns");
  }

  return { suspendedAt: now, campaignsPaused };
}

export async function unsuspendOrg(request: FastifyRequest, orgId: string, input: ReasonOnlyInput) {
  const existing = await loadOrg(prisma, orgId);
  if (!existing.suspendedAt) {
    throw new StaffHttpError(409, "NOT_SUSPENDED", "This organisation is not suspended.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.org.update({
      where: { id: orgId },
      data: { suspendedAt: null, suspendedReason: null, suspendedByStaffId: null },
    });
    await recordStaffAction(tx, request, {
      action: "org.unsuspend",
      targetOrgId: existing.id,
      targetOrgName: existing.name,
      reason: input.reason,
      before: { suspendedAt: existing.suspendedAt, suspendedReason: existing.suspendedReason },
      after: { suspendedAt: null },
    });
  });

  await clearOrgSuspensionCache(orgId);

  // Campaigns are left paused on purpose: they were stopped mid-audience, and whether to
  // send the rest is the customer's call, through the Resume they already have.
  return { suspendedAt: null };
}

/* ── Staff notes ──────────────────────────────────────────────────────────────────────
 * Context staff keep on an account. The note's own text is what the audit row records,
 * so writing one does not ask for a separate reason as the other actions do.
 */

const noteSelect = {
  id: true,
  body: true,
  pinned: true,
  staffEmail: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listOrgNotes(orgId: string) {
  await loadOrg(prisma, orgId);
  return prisma.orgNote.findMany({
    where: { orgId, deletedAt: null },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: noteSelect,
  });
}

export async function addOrgNote(request: FastifyRequest, orgId: string, input: NoteInput) {
  const org = await loadOrg(prisma, orgId);
  return prisma.$transaction(async (tx) => {
    const note = await tx.orgNote.create({
      data: {
        orgId,
        staffUserId: request.staff!.id,
        staffEmail: request.staff!.email,
        body: input.body,
        pinned: input.pinned,
      },
      select: noteSelect,
    });
    await recordStaffAction(tx, request, {
      action: "org.note_add",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: input.body,
      after: { id: note.id, pinned: note.pinned },
    });
    return note;
  });
}

async function loadNote(orgId: string, noteId: string) {
  const note = await prisma.orgNote.findFirst({
    where: { id: noteId, orgId, deletedAt: null },
    select: { ...noteSelect, orgId: true },
  });
  if (!note) throw new StaffHttpError(404, "NOTE_NOT_FOUND", "That note no longer exists.");
  return note;
}

/** Anyone on the console may edit a note; who wrote it, and who changed it, are both logged. */
export async function editOrgNote(
  request: FastifyRequest,
  orgId: string,
  noteId: string,
  input: NoteUpdateInput,
) {
  const org = await loadOrg(prisma, orgId);
  const existing = await loadNote(orgId, noteId);

  return prisma.$transaction(async (tx) => {
    const note = await tx.orgNote.update({
      where: { id: noteId },
      data: { body: input.body ?? undefined, pinned: input.pinned ?? undefined },
      select: noteSelect,
    });
    await recordStaffAction(tx, request, {
      action: "org.note_edit",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: note.body,
      before: { body: existing.body, pinned: existing.pinned },
      after: { body: note.body, pinned: note.pinned },
    });
    return note;
  });
}

/** Soft delete: the note stops showing, and the audit row keeps what it said. */
export async function deleteOrgNote(request: FastifyRequest, orgId: string, noteId: string) {
  const org = await loadOrg(prisma, orgId);
  const existing = await loadNote(orgId, noteId);

  await prisma.$transaction(async (tx) => {
    await tx.orgNote.update({ where: { id: noteId }, data: { deletedAt: new Date() } });
    await recordStaffAction(tx, request, {
      action: "org.note_delete",
      targetOrgId: org.id,
      targetOrgName: org.name,
      reason: existing.body,
      before: { id: existing.id, body: existing.body, pinned: existing.pinned },
    });
  });

  return { id: noteId };
}
