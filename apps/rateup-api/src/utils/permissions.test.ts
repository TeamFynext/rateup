import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./prisma.js", () => ({
  default: {
    orgMember: { findUnique: vi.fn() },
    teamFeatureAccess: { findMany: vi.fn() },
  },
  excludeFields: vi.fn(),
}));

vi.mock("../../generated/prisma/client.js", () => ({
  TeamFeature: {
    inbox: "inbox",
    analytics: "analytics",
    contacts: "contacts",
    campaigns: "campaigns",
    settings: "settings",
  },
}));

import prisma from "./prisma.js";
import { attachUserFeatures, getUserFeatures, requireFeature, TeamFeature } from "./permissions.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  orgMember: { findUnique: Mock };
  teamFeatureAccess: { findMany: Mock };
};

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
    user: { userId: "user-1", orgId: "org-1", role: "MEMBER" },
    routeOptions: { config: {} },
    ...overrides,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.orgMember.findUnique.mockResolvedValue({ role: "MEMBER" });
  db.teamFeatureAccess.findMany.mockResolvedValue([]);
});

describe("getUserFeatures", () => {
  test("gives a super admin every feature without consulting team grants", async () => {
    db.orgMember.findUnique.mockResolvedValue({ role: "SUPER_ADMIN" });

    const features = await getUserFeatures("user-1", "org-1");

    expect(features).toEqual(new Set(Object.values(TeamFeature)));
    expect(db.teamFeatureAccess.findMany).not.toHaveBeenCalled();
  });

  test("gives a member the union of what their teams are granted", async () => {
    db.teamFeatureAccess.findMany.mockResolvedValue([
      { feature: "inbox" },
      { feature: "contacts" },
      // Two teams granting the same feature must not double up.
      { feature: "inbox" },
    ]);

    const features = await getUserFeatures("user-1", "org-1");

    expect(features).toEqual(new Set(["inbox", "contacts"]));
  });

  test("scopes the grant lookup to this org and this user's teams", async () => {
    await getUserFeatures("user-1", "org-1");

    expect(db.teamFeatureAccess.findMany.mock.calls[0][0].where).toEqual({
      team: { orgId: "org-1", members: { some: { userId: "user-1" } } },
    });
  });

  test("gives nothing to a member whose teams grant nothing", async () => {
    const features = await getUserFeatures("user-1", "org-1");

    expect(features.size).toBe(0);
  });

  // Only SUPER_ADMIN bypasses; ADMIN is treated like any other member.
  test("does not treat a plain ADMIN as having every feature", async () => {
    db.orgMember.findUnique.mockResolvedValue({ role: "ADMIN" });
    db.teamFeatureAccess.findMany.mockResolvedValue([{ feature: "inbox" }]);

    const features = await getUserFeatures("user-1", "org-1");

    expect(features).toEqual(new Set(["inbox"]));
  });

  test("gives nothing to someone who is not a member of the org at all", async () => {
    db.orgMember.findUnique.mockResolvedValue(null);

    const features = await getUserFeatures("user-1", "org-other");

    expect(features.size).toBe(0);
  });
});

describe("attachUserFeatures", () => {
  test("puts the feature set and a can() helper on the request", async () => {
    db.teamFeatureAccess.findMany.mockResolvedValue([{ feature: "inbox" }]);
    const request = makeRequest();

    await attachUserFeatures(request, makeReply());

    expect(request.features).toEqual(new Set(["inbox"]));
    expect(request.can("inbox")).toBe(true);
    expect(request.can("campaigns")).toBe(false);
  });
});

describe("requireFeature", () => {
  test("lets a member through when their team has the feature", async () => {
    db.teamFeatureAccess.findMany.mockResolvedValue([{ feature: "inbox" }]);
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(makeRequest(), reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  test("refuses with a 403 naming the missing feature", async () => {
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(makeRequest(), reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload).toEqual({
      message: "Access to 'inbox' is not enabled for your team",
    });
  });

  test("lets a super admin through without loading any features", async () => {
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(
      makeRequest({ user: { userId: "user-1", orgId: "org-1", role: "SUPER_ADMIN" } }),
      reply,
    );

    expect(db.teamFeatureAccess.findMany).not.toHaveBeenCalled();
    expect(reply.code).not.toHaveBeenCalled();
  });

  test("loads the features itself when nothing attached them earlier", async () => {
    db.teamFeatureAccess.findMany.mockResolvedValue([{ feature: "inbox" }]);
    const request = makeRequest();

    await requireFeature(TeamFeature.inbox)(request, makeReply());

    expect(db.teamFeatureAccess.findMany).toHaveBeenCalled();
    expect(request.features).toEqual(new Set(["inbox"]));
  });

  test("reuses features already on the request rather than querying again", async () => {
    const request = makeRequest({ features: new Set(["inbox"]) });

    await requireFeature(TeamFeature.inbox)(request, makeReply());

    expect(db.teamFeatureAccess.findMany).not.toHaveBeenCalled();
  });

  test("prefers the feature named on the route config over the one baked in", async () => {
    db.teamFeatureAccess.findMany.mockResolvedValue([{ feature: "inbox" }]);
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(
      makeRequest({ routeOptions: { config: { feature: "campaigns" } } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.payload.message).toContain("campaigns");
  });

  test("answers with an empty list instead of a refusal when the route asks for it", async () => {
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(
      makeRequest({ routeOptions: { config: { fallbackEmptyArray: true } } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual([]);
    expect(reply.code).not.toHaveBeenCalledWith(403);
  });

  test("still refuses normally when the route does not ask for the empty fallback", async () => {
    const reply = makeReply();

    await requireFeature(TeamFeature.inbox)(
      makeRequest({ routeOptions: { config: { fallbackEmptyArray: false } } }),
      reply,
    );

    expect(reply.code).toHaveBeenCalledWith(403);
  });
});
