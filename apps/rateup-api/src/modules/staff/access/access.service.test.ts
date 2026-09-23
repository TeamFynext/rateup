import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    staffUser: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    staffSession: { updateMany: vi.fn() },
    staffAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

import type { FastifyRequest } from "fastify";
import {
  addStaffMember,
  deactivateStaffMember,
  revokeStaffSessions,
  updateStaffMember,
} from "./access.service.js";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-09-23T10:00:00Z");
const DOMAIN = "rateup.app";

const requestAs = (isOwner: boolean) =>
  ({
    staff: { id: ME, email: "ann@rateup.app", isOwner },
    method: "POST",
    url: "/api/staff/staff-users",
    routeOptions: { url: "/api/staff/staff-users" },
    headers: {},
    ip: "127.0.0.1",
    body: {},
  }) as unknown as FastifyRequest;
const owner = requestAs(true);
const member = requestAs(false);

const row = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: OTHER,
  email: "bob@rateup.app",
  name: "Bob",
  active: true,
  isOwner: false,
  ...overrides,
});
const reason = { reason: "Joining support rota" };
const audit = () => db.staffAuditLog.create.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffAuditLog.create.mockResolvedValue({});
  db.staffSession.updateMany.mockResolvedValue({ count: 0 });
});

describe("addStaffMember", () => {
  test("a non-owner may not add anyone", async () => {
    await expect(
      addStaffMember(member, { email: "bob@rateup.app", isOwner: false, ...reason }, DOMAIN),
    ).rejects.toMatchObject({ statusCode: 403, code: "NOT_OWNER" });
    expect(db.staffUser.create).not.toHaveBeenCalled();
  });

  test("refuses an address off the Workspace domain before touching the database", async () => {
    await expect(
      addStaffMember(owner, { email: "bob@gmail.com", isOwner: false, ...reason }, DOMAIN),
    ).rejects.toMatchObject({ statusCode: 422, code: "WRONG_DOMAIN" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  test("creates the row, recording who added them", async () => {
    db.staffUser.findUnique.mockResolvedValue(null);
    db.staffUser.create.mockResolvedValue(row({ isOwner: true }));

    await addStaffMember(
      owner,
      { email: "bob@rateup.app", name: "Bob", isOwner: true, ...reason },
      DOMAIN,
    );

    expect(db.staffUser.create.mock.calls[0][0].data).toEqual({
      email: "bob@rateup.app",
      name: "Bob",
      isOwner: true,
      createdById: ME,
    });
    expect(audit()).toMatchObject({
      action: "staff.add",
      targetUserId: OTHER,
      reason: reason.reason,
      before: null,
      after: { email: "bob@rateup.app", isOwner: true },
    });
  });

  test("brings back a deactivated member instead of duplicating them", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ active: false, deactivatedAt: NOW }));
    db.staffUser.update.mockResolvedValue(row());

    await addStaffMember(owner, { email: "bob@rateup.app", isOwner: false, ...reason }, DOMAIN);

    expect(db.staffUser.update.mock.calls[0][0].data).toMatchObject({
      active: true,
      deactivatedAt: null,
      isOwner: false,
    });
    expect(audit().action).toBe("staff.reactivate");
  });

  test("an active member cannot be added twice", async () => {
    db.staffUser.findUnique.mockResolvedValue(row());
    await expect(
      addStaffMember(owner, { email: "bob@rateup.app", isOwner: false, ...reason }, DOMAIN),
    ).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_STAFF" });
  });
});

describe("updateStaffMember", () => {
  test("promotes to owner and audits the role change", async () => {
    db.staffUser.findUnique.mockResolvedValue(row());
    db.staffUser.update.mockResolvedValue(row({ isOwner: true }));

    await updateStaffMember(owner, OTHER, { isOwner: true, ...reason });

    expect(db.staffUser.update.mock.calls[0][0].data).toEqual({ isOwner: true });
    expect(audit()).toMatchObject({
      action: "staff.role_change",
      before: { isOwner: false },
      after: { isOwner: true },
    });
  });

  test("will not demote the last owner", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ isOwner: true }));
    db.staffUser.count.mockResolvedValue(0);

    await expect(
      updateStaffMember(owner, OTHER, { isOwner: false, ...reason }),
    ).rejects.toMatchObject({ statusCode: 409, code: "LAST_OWNER" });
    expect(db.staffUser.update).not.toHaveBeenCalled();
  });

  test("you cannot change your own role", async () => {
    await expect(updateStaffMember(owner, ME, { isOwner: false, ...reason })).rejects.toMatchObject(
      { statusCode: 422, code: "CANNOT_EDIT_SELF" },
    );
  });

  test("renaming is allowed on your own row", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ id: ME }));
    db.staffUser.update.mockResolvedValue(row({ id: ME, name: "Ann B" }));

    await updateStaffMember(owner, ME, { name: "Ann B", ...reason });

    expect(audit().action).toBe("staff.rename");
  });
});

describe("deactivateStaffMember", () => {
  test("switches them off and ends every open session in the same transaction", async () => {
    db.staffUser.findUnique.mockResolvedValue(row());
    db.staffUser.update.mockResolvedValue(row({ active: false }));
    db.staffSession.updateMany.mockResolvedValue({ count: 2 });

    const result = await deactivateStaffMember(owner, OTHER, reason, NOW);

    expect(db.staffUser.update.mock.calls[0][0].data).toEqual({
      active: false,
      deactivatedAt: NOW,
    });
    expect(db.staffSession.updateMany.mock.calls[0][0]).toEqual({
      where: { staffUserId: OTHER, revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(result.sessionsEnded).toBe(2);
    expect(audit()).toMatchObject({ action: "staff.deactivate", after: { sessionsEnded: 2 } });
  });

  test("refuses to deactivate the last owner", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ isOwner: true }));
    db.staffUser.count.mockResolvedValue(0);

    await expect(deactivateStaffMember(owner, OTHER, reason, NOW)).rejects.toMatchObject({
      code: "LAST_OWNER",
    });
  });

  test("refuses to deactivate yourself", async () => {
    await expect(deactivateStaffMember(owner, ME, reason, NOW)).rejects.toMatchObject({
      code: "CANNOT_EDIT_SELF",
    });
  });

  test("already deactivated is a conflict, not a silent success", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ active: false }));
    await expect(deactivateStaffMember(owner, OTHER, reason, NOW)).rejects.toMatchObject({
      statusCode: 409,
      code: "ALREADY_INACTIVE",
    });
  });
});

describe("revokeStaffSessions", () => {
  test("anyone may sign themselves out everywhere", async () => {
    db.staffUser.findUnique.mockResolvedValue(row({ id: ME, email: "ann@rateup.app" }));
    db.staffSession.updateMany.mockResolvedValue({ count: 3 });

    const result = await revokeStaffSessions(member, ME, reason, NOW);

    expect(result.sessionsEnded).toBe(3);
    expect(audit()).toMatchObject({ action: "staff.revoke_sessions", targetUserId: ME });
  });

  test("only an owner may sign out someone else", async () => {
    await expect(revokeStaffSessions(member, OTHER, reason, NOW)).rejects.toMatchObject({
      code: "NOT_OWNER",
    });
    expect(db.staffSession.updateMany).not.toHaveBeenCalled();
  });
});
