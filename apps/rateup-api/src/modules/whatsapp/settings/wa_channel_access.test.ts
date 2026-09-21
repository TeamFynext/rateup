import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The module only touches prisma; stub it so no DB is reached.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    team: { findMany: vi.fn() },
    whatsappSettings: { findMany: vi.fn() },
  },
}));
vi.mock("../../../utils/prisma.js", () => ({ default: prismaMock }));

import {
  getChannelScope,
  getScopedSourceIdentifiers,
  invalidateChannelAccessCache,
} from "./wa_channel_access.js";

const ORG = "org-1";
const OTHER_ORG = "org-2";
const USER = "user-1";

/** A team-scoped actor; the scope used to come from a membership query, now from the actor. */
const actorFor = (orgId: string, userId: string, teamIds: string[] = ["team-1"]) =>
  ({
    orgId,
    userId,
    principal: { kind: "user" },
    scope: { all: false, teamIds, inbox: "all" },
  }) as any;

/** A team row as `computeScope` selects it. */
const team = (allChannels: boolean, ...channelIds: string[]) => ({
  allChannels,
  channelAccess: channelIds.map((channelId) => ({ channelId })),
});

beforeEach(() => {
  vi.clearAllMocks();
  // The scope cache is module-level state and would otherwise leak across tests.
  invalidateChannelAccessCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getChannelScope — resolving a user's reach", () => {
  test("a user in no team at all keeps full access", async () => {
    // Scoping is opt-in per team; org admins and fresh invitees belong to none.
    const scope = await getChannelScope(actorFor(ORG, USER, []));

    expect(prismaMock.team.findMany).not.toHaveBeenCalled();

    expect(scope.all).toBe(true);
  });

  test("a team with allChannels grants everything", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(true)]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(true);
  });

  test("a scoped team grants exactly its own channels", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(false);
    expect([...scope.ids].sort()).toEqual(["chan-a", "chan-b"]);
  });

  test("membership of several scoped teams unions their channels", async () => {
    prismaMock.team.findMany.mockResolvedValue([
      team(false, "chan-a"),
      team(false, "chan-b", "chan-a"),
    ]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(false);
    expect([...scope.ids].sort()).toEqual(["chan-a", "chan-b"]);
  });

  test("one unscoped team widens the union to everything", async () => {
    // The likeliest support question: "I scoped their team, why do they still see all?"
    // Because access unions across teams and the widest one wins.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a"), team(true)]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(true);
  });

  test("a scoped team with no channels grants nothing — not everything", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false)]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(false);
    expect(scope.ids.size).toBe(0);
  });

  test("only the actor's teams, within the caller's org, are considered", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);

    await getChannelScope(actorFor(ORG, USER));

    expect(prismaMock.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, id: { in: ["team-1"] } },
      }),
    );
  });
});

describe("getChannelScope — caching", () => {
  test("a repeat lookup inside the TTL does not re-query", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);

    await getChannelScope(actorFor(ORG, USER));
    await getChannelScope(actorFor(ORG, USER));

    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(1);
  });

  test("the cache expires so a stale grant cannot persist indefinitely", async () => {
    vi.useFakeTimers();
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);

    await getChannelScope(actorFor(ORG, USER));
    vi.advanceTimersByTime(61_000);
    await getChannelScope(actorFor(ORG, USER));

    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(2);
  });

  test("different users in the same org are cached separately", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);

    await getChannelScope(actorFor(ORG, USER));
    await getChannelScope(actorFor(ORG, "user-2"));

    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(2);
  });

  test("invalidating an org forces the next lookup to re-read", async () => {
    // This is what makes a channel-assignment change take effect immediately.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    await getChannelScope(actorFor(ORG, USER));

    invalidateChannelAccessCache(ORG);
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);
    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(2);
    expect([...scope.ids].sort()).toEqual(["chan-a", "chan-b"]);
  });

  test("invalidating one org leaves another org's cache intact", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    await getChannelScope(actorFor(ORG, USER));
    await getChannelScope(actorFor(OTHER_ORG, USER));
    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(2);

    invalidateChannelAccessCache(OTHER_ORG);
    await getChannelScope(actorFor(ORG, USER));

    expect(prismaMock.team.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("getScopedSourceIdentifiers — translating ids for the inbox query", () => {
  test("an unscoped user needs no identifier list", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(true)]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result).toEqual({ all: true, identifiers: [] });
    expect(prismaMock.whatsappSettings.findMany).not.toHaveBeenCalled();
  });

  test("a WhatsApp channel yields every spelling of its number", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+15551323034", ibaId: null, fbPageId: null },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.all).toBe(false);
    expect(result.identifiers.sort()).toEqual(["+15551323034", "15551323034"]);
  });

  /**
   * `phone` is a display string and Meta formats it, so this is the spelling many
   * of these rows actually hold — while the same number is stored bare by other
   * write paths. Listing only one of them is how a scoped agent lost most of
   * their own inbox.
   */
  test("a formatted number covers the bare spellings its messages hold", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+1555-132-3034", ibaId: null, fbPageId: null },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers.sort()).toEqual(
      ["+1555-132-3034", "1555-132-3034", "15551323034", "+15551323034"].sort(),
    );
  });

  // An empty entry would compare equal to nothing useful and only bloats the
  // query parameter — but a value with no digits at all must not silently become
  // one.
  test("never lists an empty identifier", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+", ibaId: null, fbPageId: null },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).not.toContain("");
  });

  test("Instagram and Facebook identifiers are included", async () => {
    // The April implementation omitted fbPageId, leaking every Facebook conversation.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: null, ibaId: "17841400000", fbPageId: null },
      { phone: null, ibaId: null, fbPageId: "1029384756" },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers.sort()).toEqual(["1029384756", "17841400000"]);
  });

  test("blank and null identifier fields are dropped", async () => {
    // Unused platform columns are stored as "" rather than NULL on some rows; an empty
    // string in the list would match nothing but bloats the query parameter.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+15551323034", ibaId: "", fbPageId: null },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).not.toContain("");
    expect(result.identifiers.sort()).toEqual(["+15551323034", "15551323034"]);
  });

  test("identifiers shared by two channels are not duplicated", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+15551323034", ibaId: null, fbPageId: null },
      { phone: "+15551323034", ibaId: null, fbPageId: null },
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers.sort()).toEqual(["+15551323034", "15551323034"]);
  });

  test("a team scoped to zero channels yields an empty list, still flagged as scoped", async () => {
    // `all: false` with no identifiers must mean "match nothing" — callers that treat an
    // empty list as "no filter" would hand the user the whole org.
    prismaMock.team.findMany.mockResolvedValue([team(false)]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.all).toBe(false);
    expect(result.identifiers).toEqual([]);
  });

  test("channels are looked up scoped to the org, never by id alone", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.whatsappSettings.findMany.mockResolvedValue([]);

    await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(prismaMock.whatsappSettings.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, id: { in: ["chan-a"] } },
      }),
    );
  });
});
