import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    channel: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../settings/wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));
// A readable stand-in for the AES helpers: what was encrypted, and what decrypts back.
vi.mock("../settings/wa_settings.service.js", () => ({
  encryptInlineToken: vi.fn((value: string) => `enc(${value})`),
  decryptInlineToken: vi.fn((value: string | null) =>
    value ? value.replace(/^enc\((.*)\)$/, "$1") : value,
  ),
}));

import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../wa_axios.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import {
  connectMetaChannel,
  deleteMetaChannel,
  getAccessibleMetaChannels,
  getInstagramChannel,
  getMessengerChannel,
  getMetaChannelById,
  MetaChannelConflictError,
  PAGE_SUBSCRIBED_FIELDS,
  toPublicMetaChannel,
  updateMetaChannelById,
} from "./metaChannel.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (
  prisma as unknown as {
    channel: {
      findFirst: Mock;
      findMany: Mock;
      findUnique: Mock;
      create: Mock;
      update: Mock;
      deleteMany: Mock;
    };
  }
).channel;
const meta = callMetaApi as unknown as Mock;
const scope = getChannelScope as unknown as Mock;

const ORG = "org-1";

/** A Channel row with its Meta settings included, as Prisma returns it. */
function row(
  overrides: Record<string, unknown> = {},
  metaOverrides: Record<string, unknown> | null = {},
) {
  return {
    id: "chan-1",
    orgId: ORG,
    platform: "INSTAGRAM",
    accountId: "iba-1",
    address: null,
    name: "The Shop",
    username: "the_shop",
    status: "ACTIVE",
    meta:
      metaOverrides === null
        ? null
        : {
            channelId: "chan-1",
            fbPageId: "page-1",
            pageName: "The Shop Page",
            pageAccessToken: "enc(page-token)",
            accessToken: "enc(user-token)",
            appId: "app-1",
            instagramIceBreakers: null,
            instagramPersistentMenu: null,
            ...metaOverrides,
          },
    ...overrides,
  };
}

/** What a nested write returns: the channel with its settings as written. */
function echoWrite({ data }: { data: Record<string, any> }) {
  const { meta: nested, ...channel } = data;
  const settings = nested?.create ?? nested?.upsert?.create ?? nested?.update ?? {};
  return {
    id: "chan-1",
    orgId: ORG,
    platform: "INSTAGRAM",
    accountId: "iba-1",
    ...channel,
    meta: { channelId: "chan-1", accessToken: null, ...settings },
  };
}

const igInput = {
  platform: "INSTAGRAM" as const,
  accountId: "iba-1",
  fbPageId: "page-1",
  name: "The Shop",
  username: "the_shop",
  pageName: "The Shop Page",
  pageAccessToken: "page-token",
  accessToken: "user-token",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.findFirst.mockResolvedValue(null);
  db.findMany.mockResolvedValue([]);
  db.findUnique.mockResolvedValue(null);
  db.create.mockImplementation(async (args: { data: Record<string, unknown> }) => echoWrite(args));
  db.update.mockImplementation(async (args: { data: Record<string, unknown> }) => echoWrite(args));
  db.deleteMany.mockResolvedValue({ count: 1 });
  meta.mockResolvedValue({ data: { success: true } });
  scope.mockResolvedValue({ all: true, ids: new Set() });
});

describe("channel lookups", () => {
  test("an Instagram channel is found by platform and account id, within the org", async () => {
    await getInstagramChannel("iba-1", ORG);

    expect(db.findFirst.mock.calls[0][0]).toEqual({
      where: { platform: "INSTAGRAM", accountId: "iba-1", orgId: ORG },
      include: { meta: true },
    });
  });

  test("a Messenger channel is found by platform and Page id, within the org", async () => {
    await getMessengerChannel("page-1", ORG);

    // A Page that is only there for its linked Instagram account is not a Messenger channel.
    expect(db.findFirst.mock.calls[0][0].where).toEqual({
      platform: "FACEBOOK",
      accountId: "page-1",
      orgId: ORG,
    });
  });

  test("a webhook lookup with no org still names the platform", async () => {
    await getInstagramChannel("iba-1");

    expect(db.findFirst.mock.calls[0][0].where).toEqual({
      platform: "INSTAGRAM",
      accountId: "iba-1",
    });
  });

  test("flattens the Meta settings onto the channel and hands back the tokens decrypted", async () => {
    db.findFirst.mockResolvedValue(row());

    const channel = await getInstagramChannel("iba-1", ORG);

    expect(channel).toEqual({
      id: "chan-1",
      orgId: ORG,
      platform: "INSTAGRAM",
      accountId: "iba-1",
      address: null,
      name: "The Shop",
      username: "the_shop",
      status: "ACTIVE",
      fbPageId: "page-1",
      pageName: "The Shop Page",
      pageAccessToken: "page-token",
      accessToken: "user-token",
      appId: "app-1",
      instagramIceBreakers: null,
      instagramPersistentMenu: null,
    });
    expect(channel).not.toHaveProperty("meta");
    expect(channel).not.toHaveProperty("channelId");
  });

  test("a channel whose settings are missing is treated as not found", async () => {
    db.findFirst.mockResolvedValue(row({}, null));

    await expect(getInstagramChannel("iba-1", ORG)).resolves.toBeNull();
  });

  test("an unknown account is null", async () => {
    await expect(getMessengerChannel("page-9", ORG)).resolves.toBeNull();
  });

  test("by id, a channel is only found within the org and on a Meta platform", async () => {
    db.findFirst.mockResolvedValue(row({}, { accessToken: null }));

    const channel = await getMetaChannelById("chan-1", ORG);

    // A WhatsApp channel id must never resolve here.
    expect(db.findFirst.mock.calls[0][0]).toEqual({
      where: { id: "chan-1", orgId: ORG, platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
      include: { meta: true },
    });
    expect(channel).toMatchObject({ pageAccessToken: "page-token", accessToken: null });
  });

  test("the public shape carries no token", () => {
    const safe = toPublicMetaChannel({
      ...row({ meta: undefined }),
      fbPageId: "page-1",
      pageName: "The Shop Page",
      pageAccessToken: "page-token",
      accessToken: "user-token",
      appId: "app-1",
      instagramIceBreakers: null,
      instagramPersistentMenu: null,
    } as any);

    expect(safe).not.toHaveProperty("pageAccessToken");
    expect(safe).not.toHaveProperty("accessToken");
    expect(safe).not.toHaveProperty("appId");
    expect(safe).toMatchObject({ id: "chan-1", accountId: "iba-1", fbPageId: "page-1" });
  });
});

describe("getAccessibleMetaChannels", () => {
  const actor = { orgId: ORG, userId: "user-1" } as any;

  test("an unscoped actor sees every channel of the platform asked", async () => {
    await getAccessibleMetaChannels(actor, "FACEBOOK");

    expect(db.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG, platform: "FACEBOOK" });
    expect(db.findMany.mock.calls[0][0].include).toEqual({ meta: true });
  });

  test("a scoped actor sees only the channels their teams were granted, on Meta platforms", async () => {
    scope.mockResolvedValue({ all: false, ids: new Set(["chan-1", "wa-1"]) });

    await getAccessibleMetaChannels(actor);

    expect(db.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
      id: { in: ["chan-1", "wa-1"] },
    });
  });

  test("returns the flattened channels and drops any without settings", async () => {
    db.findMany.mockResolvedValue([row(), row({ id: "chan-2" }, null)]);

    const channels = await getAccessibleMetaChannels(actor);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      id: "chan-1",
      fbPageId: "page-1",
      pageAccessToken: "page-token",
    });
  });
});

describe("updateMetaChannelById", () => {
  test("updates the registry row and its nested settings, within the org", async () => {
    await updateMetaChannelById("chan-1", ORG, {
      name: "New name",
      instagramIceBreakers: [{ question: "Hi", payload: "HI" }] as any,
    });

    const args = db.update.mock.calls[0][0];
    // Only a Messenger or Instagram channel of this org has Meta settings to update.
    expect(args.where).toEqual({
      id: "chan-1",
      orgId: ORG,
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
    });
    expect(args.data.name).toBe("New name");
    expect(args.data).not.toHaveProperty("instagramIceBreakers");
    expect(args.data.meta.update.instagramIceBreakers).toEqual([{ question: "Hi", payload: "HI" }]);
    // Not mentioned → left alone.
    expect(args.data.meta.update.instagramPersistentMenu).toBeUndefined();
  });

  test("a null clears the JSON column", async () => {
    await updateMetaChannelById("chan-1", ORG, { instagramPersistentMenu: null });

    expect(db.update.mock.calls[0][0].data.meta.update.instagramPersistentMenu).toBe(Prisma.DbNull);
  });
});

describe("deleteMetaChannel", () => {
  test("deletes only this org's channel, and only a Messenger or Instagram one", async () => {
    await deleteMetaChannel("chan-1", ORG);

    expect(db.deleteMany).toHaveBeenCalledWith({
      where: { id: "chan-1", orgId: ORG, platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
    });
  });
});

describe("connectMetaChannel", () => {
  test("refuses an account another org holds, before touching Meta", async () => {
    db.findUnique.mockResolvedValue({ id: "theirs", orgId: "org-2" });

    await expect(connectMetaChannel(ORG, igInput)).rejects.toThrow(MetaChannelConflictError);
    await expect(connectMetaChannel(ORG, igInput)).rejects.toThrow(
      "This Instagram account is already connected to another organization",
    );
    expect(meta).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  test("looks the account up by its platform and account id across every org", async () => {
    await connectMetaChannel(ORG, igInput);

    expect(db.findUnique).toHaveBeenCalledWith({
      where: { platform_accountId: { platform: "INSTAGRAM", accountId: "iba-1" } },
      select: { id: true, orgId: true },
    });
  });

  test("a Page held elsewhere is refused in Page terms", async () => {
    db.findUnique.mockResolvedValue({ id: "theirs", orgId: "org-2" });

    await expect(
      connectMetaChannel(ORG, { ...igInput, platform: "FACEBOOK", accountId: "page-1" }),
    ).rejects.toThrow("This Facebook Page is already connected to another organization");
  });

  test("subscribes the Page to the app with the Page token", async () => {
    await connectMetaChannel(ORG, igInput);

    expect(meta).toHaveBeenCalledWith(
      `/page-1/subscribed_apps?subscribed_fields=${PAGE_SUBSCRIBED_FIELDS.join(",")}`,
      "POST",
      "page-token",
    );
  });

  test("an Instagram account subscribes the Page it is linked to, not its own id", async () => {
    await connectMetaChannel(ORG, { ...igInput, accountId: "iba-1", fbPageId: "page-7" });

    expect(meta.mock.calls[0][0]).toMatch(/^\/page-7\/subscribed_apps/);
  });

  test("does not save the channel when Meta refuses the subscription", async () => {
    meta.mockRejectedValue(new Error("no permission"));

    await expect(connectMetaChannel(ORG, igInput)).rejects.toThrow("no permission");
    expect(db.update).not.toHaveBeenCalled();
    expect(db.create).not.toHaveBeenCalled();
  });

  test("creates a new channel with its Meta settings nested, storing both tokens encrypted", async () => {
    const channel = await connectMetaChannel(ORG, { ...igInput, appId: "app-1" });

    expect(db.update).not.toHaveBeenCalled();
    expect(db.create.mock.calls[0][0]).toEqual({
      data: {
        orgId: ORG,
        platform: "INSTAGRAM",
        accountId: "iba-1",
        name: "The Shop",
        username: "the_shop",
        status: "ACTIVE",
        meta: {
          create: {
            fbPageId: "page-1",
            pageName: "The Shop Page",
            pageAccessToken: "enc(page-token)",
            accessToken: "enc(user-token)",
            appId: "app-1",
          },
        },
      },
      include: { meta: true },
    });
    // Hands back the flattened, decrypted channel.
    expect(channel).toMatchObject({
      id: "chan-1",
      fbPageId: "page-1",
      pageAccessToken: "page-token",
      accessToken: "user-token",
    });
    expect(channel).not.toHaveProperty("meta");
  });

  test("a reconnect updates this org's row in place via a nested upsert and creates nothing", async () => {
    db.findUnique.mockResolvedValue({ id: "chan-1", orgId: ORG });

    const channel = await connectMetaChannel(ORG, igInput);

    const args = db.update.mock.calls[0][0];
    // Only this org's own row is ever written, and never moved to another org or account.
    expect(args.where).toEqual({ id: "chan-1", orgId: ORG });
    expect(args.data).not.toHaveProperty("orgId");
    expect(args.data).not.toHaveProperty("accountId");
    expect(args.data).not.toHaveProperty("platform");
    expect(args.data).toMatchObject({ name: "The Shop", username: "the_shop", status: "ACTIVE" });
    const settings = {
      fbPageId: "page-1",
      pageName: "The Shop Page",
      pageAccessToken: "enc(page-token)",
      accessToken: "enc(user-token)",
      appId: process.env.wa_app_id ?? null,
    };
    expect(args.data.meta).toEqual({ upsert: { create: settings, update: settings } });
    expect(args.include).toEqual({ meta: true });
    expect(db.create).not.toHaveBeenCalled();
    expect(channel).toMatchObject({ id: "chan-1", pageAccessToken: "page-token" });
  });

  test("another org connecting the same account at the same moment is a conflict", async () => {
    db.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(connectMetaChannel(ORG, igInput)).rejects.toThrow(MetaChannelConflictError);
  });

  test("any other write failure is passed on as it is", async () => {
    db.create.mockRejectedValue(new Error("db down"));

    await expect(connectMetaChannel(ORG, igInput)).rejects.toThrow("db down");
  });

  test("keeps the stored login token when a reconnect brings none", async () => {
    db.findUnique.mockResolvedValue({ id: "chan-1", orgId: ORG });

    await connectMetaChannel(ORG, { ...igInput, accessToken: null });

    const { upsert } = db.update.mock.calls[0][0].data.meta;
    expect(upsert.update).not.toHaveProperty("accessToken");
    expect(upsert.create).not.toHaveProperty("accessToken");
    expect(upsert.update.pageAccessToken).toBe("enc(page-token)");
  });

  test("a new channel with no login token stores none", async () => {
    await connectMetaChannel(ORG, { ...igInput, accessToken: null });

    expect(db.create.mock.calls[0][0].data.meta.create).not.toHaveProperty("accessToken");
  });

  test("missing names are stored as null rather than left out", async () => {
    await connectMetaChannel(ORG, {
      platform: "FACEBOOK",
      accountId: "page-1",
      fbPageId: "page-1",
      pageAccessToken: "page-token",
      appId: "app-1",
    });

    const { data } = db.create.mock.calls[0][0];
    expect(data).toMatchObject({ platform: "FACEBOOK", name: null, username: null });
    expect(data.meta.create).toMatchObject({ pageName: null });
  });
});
