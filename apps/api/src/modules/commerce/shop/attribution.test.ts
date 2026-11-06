import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, string>());
vi.mock("../../../utils/redisConnection.js", () => ({
  default: {
    set: vi.fn(async (k: string, v: string) => store.set(k, v)),
    get: vi.fn(async (k: string) => store.get(k) ?? null),
  },
}));

interface Click {
  orgId: string;
  contactId: string;
  sourceId: string;
  sourceType: string;
  headline: string | null;
  sourceUrl: string | null;
  ctwaClid: string | null;
  createdAt: Date;
  [field: string]: unknown;
}
const clicks = vi.hoisted(() => [] as Click[]);
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    adReferral: {
      create: vi.fn(async ({ data }: { data: Click }) => {
        const row = { ...data, createdAt: data.createdAt ?? new Date() };
        clicks.push(row);
        return row;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: {
            orgId: string;
            contactId: string;
            sourceType: string;
            createdAt: { gte: Date; lte: Date };
          };
        }) =>
          clicks
            .filter(
              (c) =>
                c.orgId === where.orgId &&
                c.contactId === where.contactId &&
                c.sourceType === where.sourceType &&
                c.createdAt >= where.createdAt.gte &&
                c.createdAt <= where.createdAt.lte,
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      ),
    },
  },
}));

const { adAttribution, chatAttribution, rememberAdReferral, rememberSocialSource } =
  await import("./attribution.js");

const DAY = 24 * 3_600_000;

beforeEach(() => {
  store.clear();
  clicks.length = 0;
});

describe("a click on a click-to-WhatsApp ad", () => {
  test("is kept with what Meta sent about the ad", async () => {
    const row = await rememberAdReferral(
      "org",
      "c1",
      {
        source_id: "ad-1",
        source_type: "ad",
        source_url: "https://fb.me/x",
        headline: "Summer Sale",
        ctwa_clid: "clid-1",
        media_type: "image",
        image_url: "https://img.test/a.jpg",
      },
      { conversationId: "conv-1", phoneId: "phone-1" },
    );
    expect(row).toMatchObject({
      sourceId: "ad-1",
      sourceType: "ad",
      headline: "Summer Sale",
      ctwaClid: "clid-1",
      mediaUrl: "https://img.test/a.jpg",
      conversationId: "conv-1",
      phoneId: "phone-1",
    });
  });

  test("without an ad id is not kept", async () => {
    await expect(rememberAdReferral("org", "c1", { headline: "?" })).resolves.toBeNull();
  });

  test("credits a sale in the week after it, and the latest click wins", async () => {
    const now = Date.now();
    clicks.push(
      {
        orgId: "org",
        contactId: "c1",
        sourceId: "old",
        sourceType: "ad",
        headline: null,
        sourceUrl: null,
        ctwaClid: "a",
        createdAt: new Date(now - 3 * DAY),
      },
      {
        orgId: "org",
        contactId: "c1",
        sourceId: "new",
        sourceType: "ad",
        headline: "New",
        sourceUrl: null,
        ctwaClid: "b",
        createdAt: new Date(now - DAY),
      },
    );
    await expect(adAttribution("org", "c1")).resolves.toMatchObject({
      kind: "ctwa_ad",
      adId: "new",
      adTitle: "New",
      ctwaClid: "b",
    });
  });

  test("no longer counts after seven days, nor for a boosted post", async () => {
    clicks.push(
      {
        orgId: "org",
        contactId: "c1",
        sourceId: "stale",
        sourceType: "ad",
        headline: null,
        sourceUrl: null,
        ctwaClid: null,
        createdAt: new Date(Date.now() - 8 * DAY),
      },
      {
        orgId: "org",
        contactId: "c1",
        sourceId: "post",
        sourceType: "post",
        headline: null,
        sourceUrl: null,
        ctwaClid: null,
        createdAt: new Date(),
      },
    );
    await expect(adAttribution("org", "c1")).resolves.toBeNull();
  });

  test("opens a 72-hour free window from the click", async () => {
    const createdAt = new Date("2026-10-01T10:00:00Z");
    clicks.push({
      orgId: "org",
      contactId: "c1",
      sourceId: "ad",
      sourceType: "ad",
      headline: null,
      sourceUrl: null,
      ctwaClid: null,
      createdAt,
    });
    const at = await adAttribution("org", "c1", new Date("2026-10-02T10:00:00Z"));
    expect(at?.freeWindowUntil).toBe("2026-10-04T10:00:00.000Z");
  });
});

describe("what brought a contact to a chat order", () => {
  test("is the Instagram comment they answered", async () => {
    await rememberSocialSource("org", "c1", { kind: "ig_comment", mediaId: "m1" });
    await expect(chatAttribution("org", "c1")).resolves.toEqual({
      kind: "ig_comment",
      mediaId: "m1",
    });
  });

  test("is the ad when they also clicked one", async () => {
    await rememberSocialSource("org", "c1", { kind: "ig_comment", mediaId: "m1" });
    await rememberAdReferral("org", "c1", { source_id: "ad-1", source_type: "ad" });
    await expect(chatAttribution("org", "c1")).resolves.toMatchObject({
      kind: "ctwa_ad",
      adId: "ad-1",
    });
  });

  test("is nothing for a contact with neither", async () => {
    await expect(chatAttribution("org", "c2")).resolves.toBeNull();
  });
});
