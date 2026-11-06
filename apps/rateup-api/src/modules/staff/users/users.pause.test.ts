import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    staffAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

import type { FastifyRequest } from "fastify";
import { setUserPaused } from "./users.service.js";

const USER_ID = "33333333-3333-4333-8333-333333333333";
const request = {
  staff: { id: "staff-1", email: "ann@rateup.app" },
  method: "PUT",
  url: "/api/staff/users/x/pause",
  routeOptions: { url: "/api/staff/users/:id/pause" },
  headers: {},
  ip: "127.0.0.1",
  body: {},
} as unknown as FastifyRequest;

const user = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: "sam@example.com",
  name: "Sam",
  isPaused: false,
  pausedBy: null,
  deletedAt: null,
  ...overrides,
});
const audit = () => db.staffAuditLog.create.mock.calls[0][0].data;

beforeEach(() => {
  vi.clearAllMocks();
  db.staffAuditLog.create.mockResolvedValue({});
});

describe("setUserPaused", () => {
  test("pausing marks the platform as the one who did it, so the customer screen says so", async () => {
    db.user.findUnique.mockResolvedValue(user());
    db.user.update.mockResolvedValue({ id: USER_ID, isPaused: true, pausedBy: "rateup" });

    const result = await setUserPaused(request, USER_ID, { paused: true, reason: "Abuse report" });

    expect(db.user.update.mock.calls[0][0].data).toEqual({ isPaused: true, pausedBy: "rateup" });
    expect(result).toEqual({ paused: true });
    expect(audit()).toMatchObject({
      action: "user.pause",
      targetUserId: USER_ID,
      reason: "Abuse report",
      before: { isPaused: false },
      after: { isPaused: true, pausedBy: "rateup" },
    });
  });

  test("resuming clears a pause whoever set it, including the org's own admin", async () => {
    db.user.findUnique.mockResolvedValue(user({ isPaused: true, pausedBy: "org" }));
    db.user.update.mockResolvedValue({ id: USER_ID, isPaused: false, pausedBy: null });

    await setUserPaused(request, USER_ID, { paused: false, reason: "Cleared with owner" });

    expect(db.user.update.mock.calls[0][0].data).toEqual({ isPaused: false, pausedBy: null });
    expect(audit().action).toBe("user.unpause");
  });

  test("pausing twice is a conflict", async () => {
    db.user.findUnique.mockResolvedValue(user({ isPaused: true, pausedBy: "rateup" }));
    await expect(
      setUserPaused(request, USER_ID, { paused: true, reason: "Abuse report" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "ALREADY_PAUSED" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  test("a deleted user reads as not found", async () => {
    db.user.findUnique.mockResolvedValue(user({ deletedAt: new Date() }));
    await expect(
      setUserPaused(request, USER_ID, { paused: true, reason: "Abuse report" }),
    ).rejects.toMatchObject({ statusCode: 404, code: "USER_NOT_FOUND" });
  });
});
