import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { channel: { findMany: vi.fn(), findFirst: vi.fn() } },
}));
vi.mock("../whatsapp/settings/wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { getChannelScope } from "../whatsapp/settings/wa_channel_access.js";
import { getAccessibleChannels, getChannelById, getOrgChannelIds } from "./channel.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (prisma as unknown as { channel: { findMany: Mock; findFirst: Mock } }).channel;
const scope = getChannelScope as unknown as Mock;

const ORG = "org-1";
const actor = { orgId: ORG, userId: "user-1" } as any;

beforeEach(() => {
  vi.clearAllMocks();
  db.findMany.mockResolvedValue([]);
  db.findFirst.mockResolvedValue(null);
  scope.mockResolvedValue({ all: true, ids: new Set() });
});

describe("getAccessibleChannels", () => {
  test("an unscoped actor sees every channel of the org, of every platform", async () => {
    await getAccessibleChannels(actor);

    expect(scope).toHaveBeenCalledWith(actor);
    expect(db.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG },
      orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
    });
  });

  test("a scoped actor sees only the channels their teams were granted", async () => {
    scope.mockResolvedValue({ all: false, ids: new Set(["wa-1", "ig-1"]) });

    await getAccessibleChannels(actor);

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      id: { in: ["wa-1", "ig-1"] },
    });
  });

  test("a scoped actor with no grants is filtered to nothing, not to everything", async () => {
    scope.mockResolvedValue({ all: false, ids: new Set() });

    await getAccessibleChannels(actor);

    expect(db.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG, id: { in: [] } });
  });

  test("one platform narrows to that platform", async () => {
    await getAccessibleChannels(actor, "INSTAGRAM");

    expect(db.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG, platform: "INSTAGRAM" });
  });

  test("a list of platforms narrows to any of them", async () => {
    scope.mockResolvedValue({ all: false, ids: new Set(["wa-1"]) });

    await getAccessibleChannels(actor, ["FACEBOOK", "INSTAGRAM"]);

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
      id: { in: ["wa-1"] },
    });
  });

  test("hands back the registry rows as read", async () => {
    const rows = [{ id: "wa-1", platform: "WHATSAPP" }];
    db.findMany.mockResolvedValue(rows);

    await expect(getAccessibleChannels(actor)).resolves.toBe(rows);
  });
});

describe("getChannelById", () => {
  test("a channel is only found within the org", async () => {
    db.findFirst.mockResolvedValue({ id: "wa-1", orgId: ORG });

    await expect(getChannelById("wa-1", ORG)).resolves.toEqual({ id: "wa-1", orgId: ORG });
    expect(db.findFirst).toHaveBeenCalledWith({ where: { id: "wa-1", orgId: ORG } });
  });

  test("another org's channel is null", async () => {
    await expect(getChannelById("wa-1", "org-2")).resolves.toBeNull();
  });
});

describe("getOrgChannelIds", () => {
  test("looks the ids up within the org and returns only those it found", async () => {
    db.findMany.mockResolvedValue([{ id: "wa-1" }, { id: "ig-1" }]);

    const ids = await getOrgChannelIds(ORG, ["wa-1", "ig-1", "someone-elses"]);

    expect(db.findMany).toHaveBeenCalledWith({
      where: { orgId: ORG, id: { in: ["wa-1", "ig-1", "someone-elses"] } },
      select: { id: true },
    });
    expect(ids).toEqual(["wa-1", "ig-1"]);
  });

  test("ids that are all foreign come back empty", async () => {
    await expect(getOrgChannelIds(ORG, ["someone-elses"])).resolves.toEqual([]);
  });
});
