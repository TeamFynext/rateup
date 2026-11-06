import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    $transaction: vi.fn(async (ops: unknown[]) => ops),
    teamMember: { deleteMany: vi.fn((args: unknown) => ({ op: "team", args })) },
    orgMember: {
      deleteMany: vi.fn((args: unknown) => ({ op: "org", args })),
      count: vi.fn(),
    },
    user: { update: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock("supertokens-node/recipe/session/index.js", () => ({
  default: {
    revokeAllSessionsForUser: vi.fn(),
    getAllSessionHandlesForUser: vi.fn(),
    revokeMultipleSessions: vi.fn(),
  },
}));
vi.mock("../../authz/actor.js", () => ({
  bustActorsForUser: vi.fn(),
  loadActor: vi.fn(),
}));
vi.mock("../../utils/supertoken/supertoken.js", () => ({
  deleteSuperTokenUserForId: vi.fn(),
  getUserInfo: vi.fn(),
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../workers/bullmq/queues/index.js", () => ({ notificationQueue: { add: vi.fn() } }));
vi.mock("../subscription/subscription.service.js", () => ({ createFreePlanSubscription: vi.fn() }));
vi.mock("../survey/survey.service.js", () => ({ cloneSurvey: vi.fn() }));
vi.mock("../referrals/referrals.service.js", () => ({ updateReferral: vi.fn() }));
vi.mock("../../utils/hubspot.js", () => ({
  createHubSpotCompany: vi.fn(),
  createHubSpotContact: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import Session from "supertokens-node/recipe/session/index.js";
import { bustActorsForUser } from "../../authz/actor.js";
import { deleteSuperTokenUserForId } from "../../utils/supertoken/supertoken.js";
import { pauseUser, removeMemberFromOrg, revokeUserSessions } from "./user.service.js";
import { userPublicRoutes } from "./user.public.routes.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  orgMember: { count: Mock; deleteMany: Mock };
  teamMember: { deleteMany: Mock };
  user: { update: Mock; findUnique: Mock };
};
const session = Session as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
  db.user.update.mockResolvedValue({ id: "user-2" });
  db.user.findUnique.mockResolvedValue({ email: "member@acme.com" });
});

describe("removeMemberFromOrg", () => {
  test("removes only this org's membership and team places", async () => {
    db.orgMember.count.mockResolvedValue(1);

    const result = await removeMemberFromOrg("user-2", "org-a");

    expect(db.teamMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2", team: { orgId: "org-a" } },
    });
    expect(db.orgMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-2", orgId: "org-a" },
    });
    expect(bustActorsForUser).toHaveBeenCalledWith("user-2");
    expect(result.accountDeleted).toBe(false);
  });

  test("keeps the login of someone who still belongs to another org, ending their sessions", async () => {
    db.orgMember.count.mockResolvedValue(1);

    await removeMemberFromOrg("user-2", "org-a");

    expect(deleteSuperTokenUserForId).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(session.revokeAllSessionsForUser).toHaveBeenCalledWith("user-2");
  });

  test("deletes the account when this was their last org", async () => {
    db.orgMember.count.mockResolvedValue(0);

    const result = await removeMemberFromOrg("user-2", "org-a");

    expect(result.accountDeleted).toBe(true);
    expect(deleteSuperTokenUserForId).toHaveBeenCalledWith("user-2");
  });
});

describe("pauseUser", () => {
  test("records the signed-in pauser, not the client's claim, and ends the sessions", async () => {
    await pauseUser("user-2", { isPaused: true, pausedBy: "someone-else" }, "admin-1");

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { isPaused: true, pausedBy: "admin-1" },
    });
    expect(bustActorsForUser).toHaveBeenCalledWith("user-2");
    expect(session.revokeAllSessionsForUser).toHaveBeenCalledWith("user-2");
  });

  test("unpausing clears the pauser and revokes nothing", async () => {
    await pauseUser("user-2", { isPaused: false, pausedBy: "x" }, "admin-1");

    expect(db.user.update.mock.calls[0][0].data).toEqual({ isPaused: false, pausedBy: null });
    expect(session.revokeAllSessionsForUser).not.toHaveBeenCalled();
  });
});

describe("revokeUserSessions", () => {
  test("keeps the named session and revokes the rest", async () => {
    session.getAllSessionHandlesForUser.mockResolvedValue(["h-1", "h-2", "h-3"]);

    await revokeUserSessions("user-2", "h-2");

    expect(session.revokeMultipleSessions).toHaveBeenCalledWith(["h-1", "h-3"]);
  });
});

describe("userPublicRoutes", () => {
  test("no longer exposes DELETE /delete-user, and rate limits check-email", async () => {
    const routes: { method: string; url: string; opts: any }[] = [];
    const server: any = {
      post: vi.fn((url, opts) => routes.push({ method: "POST", url, opts })),
      delete: vi.fn((url, opts) => routes.push({ method: "DELETE", url, opts })),
      get: vi.fn(),
      put: vi.fn(),
    };

    await userPublicRoutes(server);

    expect(routes.map((r) => `${r.method} ${r.url}`)).toEqual(["POST /check-email"]);
    expect(server.delete).not.toHaveBeenCalled();
    expect(routes[0].opts.preHandler).toHaveLength(2);
  });
});
