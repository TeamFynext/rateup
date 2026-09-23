import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    org: { findUnique: vi.fn(), update: vi.fn() },
    orgNote: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    staffAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
const pauseCampaigns = vi.hoisted(() => vi.fn());
const clearCache = vi.hoisted(() => vi.fn());
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../campaign/campaignPause.service.js", () => ({
  pauseOrgCampaignsForSuspension: pauseCampaigns,
}));
vi.mock("../../org/orgSuspension.js", () => ({ clearOrgSuspensionCache: clearCache }));

import type { FastifyRequest } from "fastify";
import {
  addOrgNote,
  deleteOrgNote,
  editOrgNote,
  suspendOrg,
  unsuspendOrg,
} from "./suspension.service.js";

const ORG_ID = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
const NOTE_ID = "5d7c3b1a-8e2f-4c6d-9b0a-1f2e3d4c5b6a";
const NOW = new Date("2026-09-23T10:00:00Z");

const request = {
  staff: { id: "staff-1", email: "ann@rateup.app" },
  method: "POST",
  url: "/api/staff/orgs/x/suspend",
  routeOptions: { url: "/api/staff/orgs/:id/suspend" },
  headers: {},
  ip: "127.0.0.1",
  body: {},
} as unknown as FastifyRequest;

const org = (suspendedAt: Date | null = null) => ({
  id: ORG_ID,
  name: "Acme",
  suspendedAt,
  suspendedReason: suspendedAt ? "Chargeback" : null,
});

const audit = () => db.staffAuditLog.create.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffAuditLog.create.mockResolvedValue({});
  pauseCampaigns.mockResolvedValue(2);
});

describe("suspendOrg", () => {
  test("records who, why and when, then stops the campaigns in flight", async () => {
    db.org.findUnique.mockResolvedValue(org());

    const result = await suspendOrg(request, ORG_ID, { reason: "Chargeback, unpaid" }, NOW);

    expect(db.org.update.mock.calls[0][0].data).toEqual({
      suspendedAt: NOW,
      suspendedReason: "Chargeback, unpaid",
      suspendedByStaffId: "staff-1",
    });
    expect(audit()).toMatchObject({ action: "org.suspend", reason: "Chargeback, unpaid" });
    expect(clearCache).toHaveBeenCalledWith(ORG_ID);
    expect(result).toEqual({ suspendedAt: NOW, campaignsPaused: 2 });
  });

  test("the suspension stands even when pausing the campaigns fails", async () => {
    db.org.findUnique.mockResolvedValue(org());
    pauseCampaigns.mockRejectedValue(new Error("queue down"));

    const result = await suspendOrg(request, ORG_ID, { reason: "Chargeback, unpaid" }, NOW);

    expect(result.suspendedAt).toEqual(NOW);
    expect(db.org.update).toHaveBeenCalled();
  });

  test("suspending twice is refused, so the first reason and date are not overwritten", async () => {
    db.org.findUnique.mockResolvedValue(org(new Date("2026-09-01T00:00:00Z")));
    await expect(
      suspendOrg(request, ORG_ID, { reason: "Again please" }, NOW),
    ).rejects.toMatchObject({ code: "ALREADY_SUSPENDED" });
    expect(db.org.update).not.toHaveBeenCalled();
  });
});

describe("unsuspendOrg", () => {
  test("clears the fields and the cache, and keeps the old reason in the audit row", async () => {
    db.org.findUnique.mockResolvedValue(org(new Date("2026-09-01T00:00:00Z")));

    await unsuspendOrg(request, ORG_ID, { reason: "Paid the invoice" });

    expect(db.org.update.mock.calls[0][0].data).toEqual({
      suspendedAt: null,
      suspendedReason: null,
      suspendedByStaffId: null,
    });
    expect(audit()).toMatchObject({
      action: "org.unsuspend",
      before: { suspendedReason: "Chargeback" },
    });
    expect(clearCache).toHaveBeenCalledWith(ORG_ID);
  });

  test("an org that is not suspended is refused", async () => {
    db.org.findUnique.mockResolvedValue(org());
    await expect(unsuspendOrg(request, ORG_ID, { reason: "Paid up" })).rejects.toMatchObject({
      code: "NOT_SUSPENDED",
    });
  });
});

describe("notes", () => {
  const note = {
    id: NOTE_ID,
    body: "Owner asked for a call in October",
    pinned: false,
    staffEmail: "ann@rateup.app",
    createdAt: NOW,
    updatedAt: NOW,
  };

  test("a note stores its author, and its own text is the audit reason", async () => {
    db.org.findUnique.mockResolvedValue(org());
    db.orgNote.create.mockResolvedValue(note);

    await addOrgNote(request, ORG_ID, { body: note.body, pinned: false });

    expect(db.orgNote.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG_ID,
      staffUserId: "staff-1",
      staffEmail: "ann@rateup.app",
    });
    expect(audit()).toMatchObject({ action: "org.note_add", reason: note.body });
  });

  test("an edit records what it said before", async () => {
    db.org.findUnique.mockResolvedValue(org());
    db.orgNote.findFirst.mockResolvedValue({ ...note, orgId: ORG_ID });
    db.orgNote.update.mockResolvedValue({ ...note, body: "Called; happy", pinned: true });

    await editOrgNote(request, ORG_ID, NOTE_ID, { body: "Called; happy", pinned: true });

    expect(audit()).toMatchObject({
      action: "org.note_edit",
      before: { body: note.body, pinned: false },
      after: { body: "Called; happy", pinned: true },
    });
  });

  test("deleting hides the note but keeps the row", async () => {
    db.org.findUnique.mockResolvedValue(org());
    db.orgNote.findFirst.mockResolvedValue({ ...note, orgId: ORG_ID });

    await deleteOrgNote(request, ORG_ID, NOTE_ID);

    expect(db.orgNote.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    expect(audit()).toMatchObject({ action: "org.note_delete", before: { body: note.body } });
  });

  test("a note from another org is not reachable through this one", async () => {
    db.org.findUnique.mockResolvedValue(org());
    db.orgNote.findFirst.mockResolvedValue(null);
    await expect(deleteOrgNote(request, ORG_ID, NOTE_ID)).rejects.toMatchObject({
      code: "NOTE_NOT_FOUND",
    });
  });
});
