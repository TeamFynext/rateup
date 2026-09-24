import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  org: { findUnique: vi.fn() },
  order: { count: vi.fn(), findMany: vi.fn() },
  user: { findMany: vi.fn() },
  staffAuditLog: { create: vi.fn(), update: vi.fn() },
}));
const orgServices = vi.hoisted(() => ({
  deleteOrg: vi.fn(),
  orgMemberFate: vi.fn(),
  sendDeletionMailToOrgOwner: vi.fn(),
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../org/org.services.js", () => orgServices);

import type { FastifyRequest } from "fastify";
import { deleteOrgAsStaff, warnOrgDeletion } from "./deletion.service.js";

const ORG = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
const requestSignedIn = (minutesAgo: number) =>
  ({
    staff: { id: "staff-1", email: "ann@rateup.app" },
    staffSession: { authenticatedAt: new Date(Date.now() - minutesAgo * 60_000) },
    method: "DELETE",
    url: `/api/staff/orgs/${ORG}`,
    routeOptions: { url: "/api/staff/orgs/:id" },
    headers: {},
    ip: "127.0.0.1",
    body: {},
  }) as unknown as FastifyRequest;
const fresh = requestSignedIn(2);
const body = { confirm: "Acme", reason: "Customer asked to close" };

beforeEach(() => {
  vi.clearAllMocks();
  db.org.findUnique.mockResolvedValue({
    id: ORG,
    name: "Acme",
    createdAt: new Date("2025-01-01"),
    owner: { id: "u1", email: "owner@acme.test", name: "Owner" },
    Subscription: { basePlan: { name: "Growth" }, expiresAt: new Date("2026-12-01") },
    _count: { members: 3, teams: 1 },
  });
  db.order.count.mockResolvedValue(0);
  db.staffAuditLog.create.mockResolvedValue({});
  db.staffAuditLog.update.mockResolvedValue({});
  orgServices.deleteOrg.mockResolvedValue({
    orgName: "Acme",
    usersDeleted: ["u1", "u2"],
    usersKept: ["u3"],
  });
});

describe("deleteOrgAsStaff", () => {
  test("needs a Google sign-in from the last 15 minutes", async () => {
    await expect(deleteOrgAsStaff(requestSignedIn(20), ORG, body)).rejects.toMatchObject({
      code: "REAUTH_REQUIRED",
    });
    expect(orgServices.deleteOrg).not.toHaveBeenCalled();
  });

  test("the name must be typed back exactly", async () => {
    await expect(deleteOrgAsStaff(fresh, ORG, { ...body, confirm: "acme" })).rejects.toMatchObject({
      code: "CONFIRM_MISMATCH",
    });
    expect(orgServices.deleteOrg).not.toHaveBeenCalled();
  });

  test("refused while a gateway is still billing", async () => {
    db.order.count.mockResolvedValue(1);
    await expect(deleteOrgAsStaff(fresh, ORG, body)).rejects.toMatchObject({
      statusCode: 409,
      code: "LIVE_SUBSCRIPTION",
    });
    expect(orgServices.deleteOrg).not.toHaveBeenCalled();
  });

  test("records what the org was before deleting it, then the outcome", async () => {
    const result = await deleteOrgAsStaff(fresh, ORG, body);
    expect(result.usersKept).toEqual(["u3"]);
    expect(db.staffAuditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "org.delete",
      targetOrgName: "Acme",
      reason: body.reason,
      before: { owner: "owner@acme.test", plan: "Growth", members: 3 },
    });
    expect(db.staffAuditLog.update.mock.calls[0][0].data.after).toEqual({
      status: "deleted",
      usersDeleted: 2,
      usersKept: 1,
    });
  });

  test("a failed delete is a 500 and says so on the audit row", async () => {
    orgServices.deleteOrg.mockRejectedValueOnce(new Error("FK violation"));
    await expect(deleteOrgAsStaff(fresh, ORG, body)).rejects.toMatchObject({
      statusCode: 500,
      code: "DELETE_FAILED",
    });
    expect(db.staffAuditLog.update.mock.calls[0][0].data.after).toMatchObject({
      status: "failed",
      error: "FK violation",
    });
  });
});

test("the deletion warning goes to the owner and is audited", async () => {
  const result = await warnOrgDeletion(fresh, ORG, { reason: "Inactive for 90 days" });
  expect(orgServices.sendDeletionMailToOrgOwner).toHaveBeenCalledWith(
    expect.objectContaining({ ownerEmail: "owner@acme.test", orgName: "Acme", delayInDays: 7 }),
  );
  expect(result).toEqual({ sentTo: "owner@acme.test" });
  expect(db.staffAuditLog.create.mock.calls[0][0].data.action).toBe("org.deletion_warning");
});
