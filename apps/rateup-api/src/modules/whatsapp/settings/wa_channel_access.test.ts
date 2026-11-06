import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The module only touches prisma; stub it so no DB is reached.
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    team: { findMany: vi.fn() },
    channel: { findMany: vi.fn() },
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

/** A team row as `computeScope` selects it: its grants, of any platform, are Channel ids. */
const team = (allChannels: boolean, ...channelIds: string[]) => ({
  allChannels,
  channelGrants: channelIds.map((channelId) => ({ channelId })),
});

/** Channel rows as `getScopedSourceIdentifiers` selects them. */
const whatsapp = (address: string | null, accountId = "phone-id") => ({
  platform: "WHATSAPP",
  accountId,
  address,
});
const instagram = (accountId: string) => ({ platform: "INSTAGRAM", accountId, address: null });
const messenger = (accountId: string) => ({ platform: "FACEBOOK", accountId, address: null });

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.channel.findMany.mockResolvedValue([]);
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

  test("grants of every platform land in one id set", async () => {
    // WhatsApp, Messenger and Instagram channels are all Channel rows granted through
    // TeamChannel, so one team's grants can mix platforms freely.
    prismaMock.team.findMany.mockResolvedValue([
      team(false, "chan-a", "page-chan-1"),
      team(false, "page-chan-2", "page-chan-1"),
    ]);

    const scope = await getChannelScope(actorFor(ORG, USER));

    expect(scope.all).toBe(false);
    expect([...scope.ids].sort()).toEqual(["chan-a", "page-chan-1", "page-chan-2"]);
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

    expect(prismaMock.team.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG, id: { in: ["team-1"] } },
      select: { allChannels: true, channelGrants: { select: { channelId: true } } },
    });
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
    expect(prismaMock.channel.findMany).not.toHaveBeenCalled();
  });

  test("a WhatsApp channel yields every spelling of its number", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.channel.findMany.mockResolvedValue([whatsapp("+15551323034")]);

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
    prismaMock.channel.findMany.mockResolvedValue([whatsapp("+1555-132-3034")]);

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
    prismaMock.channel.findMany.mockResolvedValue([whatsapp("+")]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).not.toContain("");
  });

  test("Instagram and Facebook identifiers are the channels' account ids", async () => {
    // The April implementation omitted the Page id, leaking every Facebook conversation.
    prismaMock.team.findMany.mockResolvedValue([team(false, "ig-chan-1", "fb-chan-1")]);
    prismaMock.channel.findMany.mockResolvedValue([
      instagram("17841400000"),
      messenger("1029384756"),
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.all).toBe(false);
    expect(result.identifiers.sort()).toEqual(["1029384756", "17841400000"]);
  });

  // An Instagram channel is its own row: the Page it is linked to is not a Messenger channel,
  // so that Page's id must not open its Messenger conversations to the team.
  test("an Instagram channel contributes its account id, never its linked Page id", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "ig-chan-1")]);
    prismaMock.channel.findMany.mockResolvedValue([instagram("17841400000")]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).toEqual(["17841400000"]);
    // The linked Page lives on MetaChannelSettings, which this lookup never reads.
    expect(prismaMock.channel.findMany.mock.calls[0][0].select).toEqual({
      platform: true,
      accountId: true,
      address: true,
    });
  });

  test("WhatsApp numbers and Meta identifiers are listed together", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "ig-chan-1", "fb-chan-1")]);
    prismaMock.channel.findMany.mockResolvedValue([
      whatsapp("+15551323034"),
      instagram("17841400000"),
      messenger("1029384756"),
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers.sort()).toEqual(
      ["+15551323034", "15551323034", "1029384756", "17841400000"].sort(),
    );
  });

  test("a WhatsApp channel is matched by its number, never by its phone number id", async () => {
    // Messages record the display number as sourceIdentifier, not the phone id.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a")]);
    prismaMock.channel.findMany.mockResolvedValue([whatsapp("+15551323034", "106540352242922")]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).not.toContain("106540352242922");
  });

  test("a null address contributes no identifier", async () => {
    // An empty string in the list would match nothing but bloats the query parameter.
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);
    prismaMock.channel.findMany.mockResolvedValue([whatsapp("+15551323034"), whatsapp(null)]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers).not.toContain("");
    expect(result.identifiers.sort()).toEqual(["+15551323034", "15551323034"]);
  });

  test("identifiers shared by two channels are not duplicated", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "chan-b")]);
    prismaMock.channel.findMany.mockResolvedValue([
      whatsapp("+15551323034", "phone-a"),
      whatsapp("+15551323034", "phone-b"),
    ]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.identifiers.sort()).toEqual(["+15551323034", "15551323034"]);
  });

  test("a team scoped to zero channels yields an empty list, still flagged as scoped", async () => {
    // `all: false` with no identifiers must mean "match nothing" — callers that treat an
    // empty list as "no filter" would hand the user the whole org.
    prismaMock.team.findMany.mockResolvedValue([team(false)]);

    const result = await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(result.all).toBe(false);
    expect(result.identifiers).toEqual([]);
  });

  test("channels of every platform are looked up in one query, scoped to the org", async () => {
    prismaMock.team.findMany.mockResolvedValue([team(false, "chan-a", "page-chan-1")]);

    await getScopedSourceIdentifiers(actorFor(ORG, USER));

    expect(prismaMock.channel.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.channel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: ORG, id: { in: ["chan-a", "page-chan-1"] } },
      }),
    );
  });
});
