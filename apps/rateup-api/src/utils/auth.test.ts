import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./prisma.js", () => ({
  default: {
    surveyTeamMap: { findMany: vi.fn() },
    teamMember: { findFirst: vi.fn() },
    orgMember: { findFirst: vi.fn() },
    subscription: { create: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("./logger.js", () => ({
  log: {
    debug: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../modules/subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../modules/subscription/subscription.data.js", () => ({
  FreePlanSubscriptionFeatures: { whatsapp: { active: true } },
}));
vi.mock("../../generated/prisma/client.js", () => ({
  ContactGroupType: { STATIC: "STATIC", DYNAMIC: "DYNAMIC" },
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", MEMBER: "MEMBER" },
}));

import prisma from "./prisma.js";
import { getSubscription } from "../modules/subscription/subscription.service.js";
import { log } from "./logger.js";
import { SubscriptionFeaturePathName } from "../types/enums.js";
import {
  assertRootOrg,
  getVerifySubscriptionForPublicHandler,
  getVerifySubscriptionHandler,
  hasAccessOfTeamAdmin,
  hasAccessToSurvey,
  hasAccessToTeam,
  verifyRole,
  verifySubscription,
} from "./auth.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  surveyTeamMap: { findMany: Mock };
  teamMember: { findFirst: Mock };
  orgMember: { findFirst: Mock };
  subscription: { create: Mock };
};

const getSubscriptionMock = getSubscription as unknown as Mock;

/** A subscription that is live and has everything switched on. */
function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    features: {
      whatsapp: { active: true, conversation: { active: true } },
      team: { active: true },
    },
    ...overrides,
  };
}

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    send: vi.fn((p?: unknown) => {
      reply.payload = p;
      return reply;
    }),
  };
  return reply;
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    body: {},
    user: { userId: "user-1", orgId: "org-1", role: "MEMBER" },
    ...overrides,
  } as any;
}

const originalRootOrg = process.env.ROOT_ORG;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  db.surveyTeamMap.findMany.mockResolvedValue([]);
  db.teamMember.findFirst.mockResolvedValue(null);
  db.orgMember.findFirst.mockResolvedValue(null);
  db.subscription.create.mockResolvedValue(subscription());
  getSubscriptionMock.mockResolvedValue(subscription());
  process.env.ROOT_ORG = "root-org";
});

describe("hasAccessToSurvey", () => {
  test("grants access when the user is on one of the survey's teams", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ team: { id: "team-1" } }]);
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await expect(hasAccessToSurvey("survey-1", "user-1")).resolves.toBe(true);
  });

  test("checks every team the survey is shared with", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([
      { team: { id: "team-1" } },
      { team: { id: "team-2" } },
    ]);
    db.teamMember.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "tm-2" });

    await expect(hasAccessToSurvey("survey-1", "user-1")).resolves.toBe(true);
    expect(db.teamMember.findFirst).toHaveBeenCalledTimes(2);
  });

  test("denies access when the user is on none of the teams", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ team: { id: "team-1" } }]);

    await expect(hasAccessToSurvey("survey-1", "user-1")).resolves.toBeFalsy();
  });

  test.each([
    ["a missing survey id", "", "user-1"],
    ["a missing user id", "survey-1", ""],
  ])("denies access for %s", async (_name, surveyId, userId) => {
    await expect(hasAccessToSurvey(surveyId, userId)).resolves.toBeFalsy();
    expect(db.surveyTeamMap.findMany).not.toHaveBeenCalled();
  });

  test("denies access when the lookup fails", async () => {
    db.surveyTeamMap.findMany.mockRejectedValue(new Error("db down"));

    await expect(hasAccessToSurvey("survey-1", "user-1")).resolves.toBe(false);
  });

  // The deny path returns false explicitly, so a caller comparing `=== false` denies
  // rather than silently granting access.
  test("returns false, not undefined, when access is denied", async () => {
    db.surveyTeamMap.findMany.mockResolvedValue([{ team: { id: "team-1" } }]);

    await expect(hasAccessToSurvey("survey-1", "user-1")).resolves.toBe(false);
  });
});

describe("hasAccessToTeam", () => {
  test("grants access to a member of the team", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await expect(hasAccessToTeam("team-1", "user-1")).resolves.toBe(true);
    expect(db.teamMember.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", teamId: "team-1" },
    });
  });

  test("denies access to someone outside the team", async () => {
    await expect(hasAccessToTeam("team-1", "user-1")).resolves.toBe(false);
  });
});

describe("hasAccessOfTeamAdmin", () => {
  test("grants access to a super admin of the team's org", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });
    db.orgMember.findFirst.mockResolvedValue({ id: "om-1", role: "SUPER_ADMIN" });

    await expect(hasAccessOfTeamAdmin("team-1", "user-1")).resolves.toBe(true);
  });

  test("grants access to an org admin of the team's org", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });
    db.orgMember.findFirst.mockResolvedValue({ id: "om-1", role: "ADMIN" });

    await expect(hasAccessOfTeamAdmin("team-1", "user-1")).resolves.toBe(true);
  });

  test("denies a team member who is neither an owner nor an admin", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await expect(hasAccessOfTeamAdmin("team-1", "user-1")).resolves.toBe(false);
  });

  test("denies a super admin who is not on the team", async () => {
    db.teamMember.findFirst.mockResolvedValue(null);

    await expect(hasAccessOfTeamAdmin("team-1", "user-1")).resolves.toBe(false);
    expect(db.orgMember.findFirst).not.toHaveBeenCalled();
  });

  test("looks for a managing role within the org owning that team", async () => {
    db.teamMember.findFirst.mockResolvedValue({ id: "tm-1" });

    await hasAccessOfTeamAdmin("team-1", "user-1");

    expect(db.orgMember.findFirst.mock.calls[0][0].where).toMatchObject({
      userId: "user-1",
      role: { in: ["SUPER_ADMIN", "ADMIN"] },
      org: { teams: { some: { id: "team-1" } } },
    });
  });
});

describe("verifyRole", () => {
  test("confirms a matching role", () => {
    expect(verifyRole(makeRequest({ user: { role: "SUPER_ADMIN" } }), "SUPER_ADMIN" as any)).toBe(
      true,
    );
  });

  test("rejects a different role", () => {
    expect(verifyRole(makeRequest({ user: { role: "MEMBER" } }), "SUPER_ADMIN" as any)).toBe(false);
  });

  test("rejects rather than throwing when the request carries no user", () => {
    expect(verifyRole({ user: undefined } as any, "SUPER_ADMIN" as any)).toBe(false);
    expect(log.fatal).toHaveBeenCalled();
  });
});

describe("getVerifySubscriptionHandler", () => {
  test("lets a request through when the plan covers the feature", async () => {
    const request = makeRequest();
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
    expect(request.subscription).toMatchObject({ id: "sub-1" });
  });

  test("resolves a nested feature path", async () => {
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp.conversation"] as any)(makeRequest(), reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  test("refuses with a 403 when the plan lacks the feature", async () => {
    getSubscriptionMock.mockResolvedValue(
      subscription({ features: { whatsapp: { active: false } } }),
    );
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      message: "This feature is not included in your subscription",
      // The client shows "upgrade your plan" off this, not "contact your admin".
      reason: "subscription",
      missingFeatures: ["whatsapp"],
    });
  });

  test("refuses when the feature path is not in the plan at all", async () => {
    getSubscriptionMock.mockResolvedValue(subscription({ features: {} }));
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(makeRequest(), reply);

    // A feature path absent from the plan is now reported as a missing feature rather
    // than crashing the lookup and falling through to the catch's generic message.
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      message: "This feature is not included in your subscription",
      // The client shows "upgrade your plan" off this, not "contact your admin".
      reason: "subscription",
      missingFeatures: ["whatsapp"],
    });
  });

  // Every method that changes data is gated on expiry, not just POST and PUT.
  test.each([["POST"], ["PUT"], ["PATCH"], ["DELETE"]])(
    "blocks a %s once the subscription has expired",
    async (method) => {
      getSubscriptionMock.mockResolvedValue(subscription({ expiresAt: new Date("2020-01-01") }));
      const reply = makeReply();

      await getVerifySubscriptionHandler(["whatsapp"] as any)(makeRequest({ method }), reply);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.payload).toMatchObject({ message: "Subscription expired" });
    },
  );

  // A lapsed org can still read its own data, just not change it.
  test("still allows a GET on an expired subscription", async () => {
    getSubscriptionMock.mockResolvedValue(subscription({ expiresAt: new Date("2020-01-01") }));
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(makeRequest({ method: "GET" }), reply);

    expect(reply.code).not.toHaveBeenCalledWith(403);
  });

  // This used to create a free-plan subscription expiring in 100 years. It now refuses,
  // matching getVerifySubscriptionForPublicHandler, so the two paths agree.
  test("refuses an org that has no subscription rather than creating one", async () => {
    getSubscriptionMock.mockResolvedValue(null);
    const request = makeRequest();
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(request, reply);

    expect(db.subscription.create).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toMatchObject({ message: "No active subscription" });
    expect(request.subscription).toBeUndefined();
  });

  test("refuses when the subscription lookup throws", async () => {
    getSubscriptionMock.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getVerifySubscriptionHandler(["whatsapp"] as any)(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({ message: "Error while verifying subscription" });
  });
});

describe("getVerifySubscriptionForPublicHandler", () => {
  test("reads the org from the request body rather than a session", async () => {
    const reply = makeReply();

    await getVerifySubscriptionForPublicHandler(["whatsapp"] as any)(
      makeRequest({ body: { orgId: "org-public" } }),
      reply,
    );

    expect(getSubscriptionMock).toHaveBeenCalledWith("org-public");
    expect(reply.code).not.toHaveBeenCalled();
  });

  // Unlike the authenticated handler, the public one refuses rather than provisioning.
  test("refuses an org with no subscription instead of creating one", async () => {
    getSubscriptionMock.mockResolvedValue(null);
    const reply = makeReply();

    await getVerifySubscriptionForPublicHandler(["whatsapp"] as any)(
      makeRequest({ body: { orgId: "org-public" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toMatchObject({ message: "Unauthorized" });
    expect(db.subscription.create).not.toHaveBeenCalled();
  });

  test.each([["POST"], ["PUT"], ["PATCH"], ["DELETE"]])(
    "blocks a %s once the subscription has expired",
    async (method) => {
      getSubscriptionMock.mockResolvedValue(subscription({ expiresAt: new Date("2020-01-01") }));
      const reply = makeReply();

      await getVerifySubscriptionForPublicHandler(["whatsapp"] as any)(
        makeRequest({ method, body: { orgId: "org-public" } }),
        reply,
      );

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.payload).toMatchObject({ message: "Subscription expired" });
    },
  );

  test("still allows a GET on an expired subscription", async () => {
    getSubscriptionMock.mockResolvedValue(subscription({ expiresAt: new Date("2020-01-01") }));
    const reply = makeReply();

    await getVerifySubscriptionForPublicHandler(["whatsapp"] as any)(
      makeRequest({ method: "GET", body: { orgId: "org-public" } }),
      reply,
    );

    expect(reply.payload).not.toMatchObject({ message: "Subscription expired" });
  });

  test("refuses when the plan lacks the feature", async () => {
    getSubscriptionMock.mockResolvedValue(
      subscription({ features: { whatsapp: { active: false } } }),
    );
    const reply = makeReply();

    await getVerifySubscriptionForPublicHandler(["whatsapp"] as any)(
      makeRequest({ body: { orgId: "org-public" } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
  });
});

describe("verifySubscription", () => {
  test("hands back the subscription when everything checks out", async () => {
    await expect(
      verifySubscription("org-1", [SubscriptionFeaturePathName.Whatsapp]),
    ).resolves.toMatchObject({ id: "sub-1" });
  });

  test("reports false for an org with no subscription", async () => {
    getSubscriptionMock.mockResolvedValue(null);

    await expect(verifySubscription("org-1", [SubscriptionFeaturePathName.Whatsapp])).resolves.toBe(
      false,
    );
  });

  // Unlike the request handlers, this one gates every use on expiry, not just writes.
  test("reports false once the subscription has expired", async () => {
    getSubscriptionMock.mockResolvedValue(subscription({ expiresAt: new Date("2020-01-01") }));

    await expect(verifySubscription("org-1", [SubscriptionFeaturePathName.Whatsapp])).resolves.toBe(
      false,
    );
  });

  test("reports false when a requested feature is switched off", async () => {
    getSubscriptionMock.mockResolvedValue(
      subscription({ features: { whatsapp: { active: false } } }),
    );

    await expect(verifySubscription("org-1", [SubscriptionFeaturePathName.Whatsapp])).resolves.toBe(
      false,
    );
  });

  test("requires every named feature, not just one", async () => {
    getSubscriptionMock.mockResolvedValue(
      subscription({ features: { whatsapp: { active: true }, team: { active: false } } }),
    );

    await expect(
      verifySubscription("org-1", [
        SubscriptionFeaturePathName.Whatsapp,
        SubscriptionFeaturePathName.Team,
      ]),
    ).resolves.toBe(false);
  });
});

describe("assertRootOrg", () => {
  test("allows a caller from the root org through", () => {
    const reply = makeReply();
    const done = vi.fn();

    assertRootOrg(makeRequest({ user: { orgId: "root-org" } }), reply, done);

    expect(reply.code).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalled();
  });

  test("refuses a caller from any other org", () => {
    const reply = makeReply();

    assertRootOrg(makeRequest({ user: { orgId: "org-1" } }), reply, vi.fn());

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({ message: "Not authorized" });
  });

  test("refuses a caller with no org", () => {
    const reply = makeReply();
    const done = vi.fn();

    assertRootOrg(makeRequest({ user: { orgId: undefined } }), reply, done);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(done).not.toHaveBeenCalled();
  });

  // The refusal returns, so done() never runs and a rejected request does not carry on
  // through the handler chain.
  test("stops the handler chain after refusing", () => {
    const done = vi.fn();

    assertRootOrg(makeRequest({ user: { orgId: "org-1" } }), makeReply(), done);

    expect(done).not.toHaveBeenCalled();
  });
});

if (originalRootOrg === undefined) delete process.env.ROOT_ORG;
else process.env.ROOT_ORG = originalRootOrg;
