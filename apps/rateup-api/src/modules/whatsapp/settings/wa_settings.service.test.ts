import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    whatsappSettings: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    waAccountSettings: { findFirst: vi.fn(), upsert: vi.fn() },
    waLogs: { count: vi.fn(), findMany: vi.fn() },
    metaAssets: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../../../../utils/encryption/encryption.utils.js", () => ({
  aes_encrypt: vi.fn(),
  aes_decrypt: vi.fn(),
}));
vi.mock("../auth/wa_auth.service.js", () => ({ getPhoneDetails: vi.fn() }));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
// wa_settings.service imports subscribePageToApp back out of the controller, which
// imports the service — a cycle. Stubbing the controller keeps the test on one side.
vi.mock("./wa_settings.controller.js", () => ({ subscribePageToApp: vi.fn() }));
vi.mock("./wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { aes_decrypt, aes_encrypt } from "../../../../utils/encryption/encryption.utils.js";
import { getPhoneDetails } from "../auth/wa_auth.service.js";
import { callMetaApi } from "../wa_axios.js";
import { subscribePageToApp } from "./wa_settings.controller.js";
import { getChannelScope } from "./wa_channel_access.js";
import { log } from "../../../utils/logger.js";
import { WaConfigType, WhatsappSettingsStatus } from "../../../types/enums.js";
import {
  createWaSettings,
  deleteWaSettings,
  getAccessibleWaSettings,
  getAdAccountsFromWa,
  getAdsFromWa,
  getAllWaSettings,
  getContactTag,
  getConversationalAutomation,
  getFbPagesFromWa,
  getMetaDatasetsFromWa,
  getWaLogs,
  getWaSettings,
  getWaSettingsById,
  getWaSettingsByIbaId,
  getWaSettingsByPageId,
  getWaSettingsWithAccessTokenDecrypted,
  updateContactTag,
  updateWaSettings,
  updateWaSettingsById,
  updateWaSettingsStatus,
  updateWaSettingsStatusByWabaId,
  upsertWaSettings,
} from "./wa_settings.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  whatsappSettings: Record<
    "create" | "delete" | "findFirst" | "findMany" | "findUnique" | "update" | "updateMany",
    Mock
  >;
  waAccountSettings: Record<"findFirst" | "upsert", Mock>;
  waLogs: Record<"count" | "findMany", Mock>;
  metaAssets: Record<"findUnique" | "upsert", Mock>;
};
const encryptMock = aes_encrypt as unknown as Mock;
const decryptMock = aes_decrypt as unknown as Mock;
const getPhoneDetailsMock = getPhoneDetails as unknown as Mock;
const callMetaApiMock = callMetaApi as unknown as Mock;
const subscribePageToAppMock = subscribePageToApp as unknown as Mock;
const getChannelScopeMock = getChannelScope as unknown as Mock;
const logMock = log as unknown as Record<string, Mock>;

const ORG_A = "org-a";
const ORG_B = "org-b";
const PHONE_ID = "phone-1";
const SETTINGS_ID = "settings-1";

/** A stored channel row, WhatsApp-connected unless told otherwise. */
function row(overrides: Record<string, unknown> = {}): any {
  return {
    id: SETTINGS_ID,
    orgId: ORG_A,
    accessToken: "cipher-text",
    accessToken_iv: "iv-hex",
    wabaId: "waba-1",
    phoneId: PHONE_ID,
    phone: "15550001",
    appId: "app-1",
    fbPageId: null,
    ibaId: null,
    pageAccessToken: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.wa_access_token_encryption_key = "00".repeat(32);
  encryptMock.mockReturnValue({ encryptedData: "cipher-text", iv: "iv-hex" });
  decryptMock.mockReturnValue("plain-token");
  getPhoneDetailsMock.mockResolvedValue({ display_phone_number: "+1 555 0001" });
  callMetaApiMock.mockResolvedValue({ data: { data: [] } });
  subscribePageToAppMock.mockResolvedValue(undefined);
  getChannelScopeMock.mockResolvedValue({ all: false, ids: new Set([SETTINGS_ID]) });
  db.whatsappSettings.create.mockResolvedValue(row());
  db.whatsappSettings.findFirst.mockResolvedValue(row());
  db.whatsappSettings.findUnique.mockResolvedValue(row());
  db.whatsappSettings.findMany.mockResolvedValue([row()]);
  db.whatsappSettings.update.mockResolvedValue(row());
  db.whatsappSettings.updateMany.mockResolvedValue({ count: 1 });
  db.whatsappSettings.delete.mockResolvedValue(row());
  db.waLogs.count.mockResolvedValue(0);
  db.waLogs.findMany.mockResolvedValue([]);
});

describe("createWaSettings", () => {
  test("encrypts the access token before storing a WhatsApp channel", async () => {
    await createWaSettings(ORG_A, { accessToken: "plain-token", phoneId: PHONE_ID } as any);

    expect(encryptMock.mock.calls[0][0]).toBe("plain-token");
    expect(db.whatsappSettings.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG_A,
      accessToken: "cipher-text",
      accessToken_iv: "iv-hex",
    });
  });

  test("looks the display number up from Meta when the caller did not supply one", async () => {
    await createWaSettings(ORG_A, { accessToken: "plain-token", phoneId: PHONE_ID } as any);

    expect(getPhoneDetailsMock).toHaveBeenCalledWith(PHONE_ID, "plain-token");
    expect(db.whatsappSettings.create.mock.calls[0][0].data.phone).toBe("+15550001");
  });

  test("keeps the number it was given rather than asking Meta", async () => {
    await createWaSettings(ORG_A, {
      accessToken: "plain-token",
      phoneId: PHONE_ID,
      phone: "15559999",
    } as any);

    expect(getPhoneDetailsMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. Only the phoneId branch encrypts. A channel
  // created without one — the Instagram and Facebook-page shape, which carries a
  // pageAccessToken and no WhatsApp number — is written with whatever token it was
  // handed, verbatim. The column comment in prisma/schema.prisma:292 says
  // "// encrypted". See issues.txt 13.5.
  test("stores the token in plain text for a channel with no phone id", async () => {
    await createWaSettings(ORG_A, {
      accessToken: "plain-token",
      pageAccessToken: "page-token",
    } as any);

    expect(encryptMock).not.toHaveBeenCalled();
    expect(db.whatsappSettings.create.mock.calls[0][0].data).toMatchObject({
      accessToken: "plain-token",
      pageAccessToken: "page-token",
    });
  });

  // NOTE: pins current behaviour. pageAccessToken is never encrypted on either
  // branch, and the schema does not mark it encrypted either. It is the token that
  // grants messaging on behalf of the Facebook page and the Instagram account.
  // See issues.txt 13.5.
  test("stores the page access token in plain text even on the encrypting branch", async () => {
    await createWaSettings(ORG_A, {
      accessToken: "plain-token",
      phoneId: PHONE_ID,
      phone: "1",
      pageAccessToken: "page-token",
    } as any);

    expect(db.whatsappSettings.create.mock.calls[0][0].data.pageAccessToken).toBe("page-token");
  });
});

describe("reading a channel", () => {
  test("scopes the org's default channel to that org", async () => {
    await getWaSettings(ORG_A);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0]).toEqual({ where: { orgId: ORG_A } });
  });

  test("narrows to one number when a phone id is named", async () => {
    await getWaSettings(ORG_A, PHONE_ID);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      phoneId: PHONE_ID,
    });
  });

  test("reports nothing for an org with no channel", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(getWaSettings(ORG_A)).resolves.toBeNull();
  });

  test("hands back the decrypted token and drops the initialisation vector", async () => {
    const result = await getWaSettings(ORG_A);

    expect(result!.accessToken).toBe("plain-token");
    expect(result).not.toHaveProperty("accessToken_iv");
  });

  test("lists the org's channels oldest first", async () => {
    await getAllWaSettings(ORG_A);

    expect(db.whatsappSettings.findMany.mock.calls[0][0]).toEqual({
      where: { orgId: ORG_A },
      orderBy: { createdAt: "asc" },
    });
  });

  test("reports an empty list for an org with no channels", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([]);

    await expect(getAllWaSettings(ORG_A)).resolves.toEqual([]);
  });

  test("skips decryption for a channel that has no WhatsApp account behind it", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(row({ wabaId: null, accessToken_iv: null }));

    await getWaSettingsById(SETTINGS_ID);

    expect(decryptMock).not.toHaveBeenCalled();
  });

  test("applies the same guard when looking a channel up by Instagram account", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ wabaId: null, accessToken_iv: null }));

    await getWaSettingsByIbaId("iba-1");

    expect(decryptMock).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. getWaSettingsById and getWaSettingsByIbaId guard
  // the decrypt with `res.wabaId ?`; getWaSettingsByPageId, getWaSettings,
  // getAllWaSettings, getAccessibleWaSettings, getWaSettingsByPhoneId and
  // getWaSettingsByWaBaId do not. aes_decrypt does Buffer.from(iv, "hex") on a null
  // iv, which throws. So a Facebook-page-only channel breaks the whole inbound
  // Facebook webhook (getWaSettingsByPageId is its first call — see section 10) and
  // the dashboard's channel list. See issues.txt 13.4.
  test("throws for a page-only channel when looking it up by page id", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ wabaId: null, accessToken_iv: null }));
    decryptMock.mockImplementation(() => {
      throw new TypeError("The first argument must be of type string");
    });

    await expect(getWaSettingsByPageId("page-1")).rejects.toThrow(TypeError);
  });

  // NOTE: same gap, reached through the channel list the dashboard loads on every
  // page. One unencrypted row takes the whole list down. See issues.txt 13.4.
  test("throws for the whole channel list when one channel has no WhatsApp account", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([
      row(),
      row({ id: "settings-2", wabaId: null, accessToken_iv: null }),
    ]);
    decryptMock.mockImplementation((_token: string, _key: unknown, iv: string) => {
      if (!iv) throw new TypeError("The first argument must be of type string");
      return "plain-token";
    });

    await expect(getAllWaSettings(ORG_A)).rejects.toThrow(TypeError);
  });

  // NOTE: pins current behaviour. getWaSettingsById keys on the id alone and takes
  // no org, and the sync/meta-asset handlers that call it never check ownership
  // afterwards. See issues.txt 13.1.
  test("returns a channel by id without being told which org is asking", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(row({ orgId: ORG_B }));

    const result = await getWaSettingsById(SETTINGS_ID);

    expect(result!.orgId).toBe(ORG_B);
    expect(db.whatsappSettings.findUnique.mock.calls[0][0]).toEqual({
      where: { id: SETTINGS_ID },
    });
  });
});

describe("getAccessibleWaSettings", () => {
  test("gives a super admin every channel in the org", async () => {
    await getAccessibleWaSettings(ORG_A, "user-1", "SUPER_ADMIN");

    expect(getChannelScopeMock).not.toHaveBeenCalled();
    expect(db.whatsappSettings.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG_A });
  });

  test("gives an unrestricted user every channel in the org", async () => {
    getChannelScopeMock.mockResolvedValue({ all: true, ids: new Set() });

    await getAccessibleWaSettings(ORG_A, "user-1", "ADMIN");

    expect(db.whatsappSettings.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG_A });
  });

  test("narrows a scoped user to the channels their teams reach", async () => {
    getChannelScopeMock.mockResolvedValue({ all: false, ids: new Set(["c-1", "c-2"]) });

    await getAccessibleWaSettings(ORG_A, "user-1", "AGENT");

    expect(db.whatsappSettings.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      id: { in: ["c-1", "c-2"] },
    });
  });

  test("still filters by org, so a stale scope cannot reach another tenant", async () => {
    getChannelScopeMock.mockResolvedValue({ all: false, ids: new Set(["c-from-another-org"]) });

    await getAccessibleWaSettings(ORG_A, "user-1", "AGENT");

    expect(db.whatsappSettings.findMany.mock.calls[0][0].where.orgId).toBe(ORG_A);
  });

  test("gives a scoped user with no channels an empty list", async () => {
    getChannelScopeMock.mockResolvedValue({ all: false, ids: new Set() });
    db.whatsappSettings.findMany.mockResolvedValue([]);

    await expect(getAccessibleWaSettings(ORG_A, "user-1", "AGENT")).resolves.toEqual([]);
  });
});

describe("getWaSettingsWithAccessTokenDecrypted", () => {
  test("decrypts with the key from the environment and the row's own vector", () => {
    getWaSettingsWithAccessTokenDecrypted(row() as any);

    const [cipher, , iv] = decryptMock.mock.calls[0];
    expect(cipher).toBe("cipher-text");
    expect(iv).toBe("iv-hex");
  });

  test("never lets the initialisation vector out with the result", () => {
    const result = getWaSettingsWithAccessTokenDecrypted(row() as any);

    expect(result).not.toHaveProperty("accessToken_iv");
    expect(result.accessToken).toBe("plain-token");
  });
});

describe("updating a channel", () => {
  test("scopes an update to the org and the number", async () => {
    await updateWaSettings(ORG_A, PHONE_ID, { phoneDisplayName: "Support" } as any);

    expect(db.whatsappSettings.update.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      phoneId: PHONE_ID,
    });
  });

  test("encrypts a replacement access token", async () => {
    await updateWaSettings(ORG_A, PHONE_ID, { accessToken: "new-plain" } as any);

    expect(encryptMock).toHaveBeenCalledWith("new-plain", expect.anything());
    expect(db.whatsappSettings.update.mock.calls[0][0].data).toMatchObject({
      accessToken: "cipher-text",
      accessToken_iv: "iv-hex",
    });
  });

  test("leaves the stored token alone for an edit that does not touch it", async () => {
    await updateWaSettings(ORG_A, PHONE_ID, { phoneDisplayName: "Support" } as any);

    expect(encryptMock).not.toHaveBeenCalled();
  });

  test("scopes a delete to the org and the number", async () => {
    await deleteWaSettings(ORG_A, PHONE_ID);

    expect(db.whatsappSettings.delete.mock.calls[0][0]).toEqual({
      where: { orgId: ORG_A, phoneId: PHONE_ID },
    });
  });

  // NOTE: pins current behaviour. updateWaSettingsById keys on the id alone, takes
  // no org, and — unlike updateWaSettings — does not encrypt a replacement access
  // token either, so a token written through this path is stored in plain text and
  // then fails to decrypt on the way back out. See issues.txt 13.1 and 13.5.
  test("takes no org to scope the update by, and does not encrypt", async () => {
    await updateWaSettingsById(SETTINGS_ID, { accessToken: "new-plain" } as any);

    expect(db.whatsappSettings.update.mock.calls[0][0]).toEqual({
      where: { id: SETTINGS_ID },
      data: { accessToken: "new-plain" },
    });
    expect(encryptMock).not.toHaveBeenCalled();
  });

  test("sets a channel's status by its number", async () => {
    await updateWaSettingsStatus(PHONE_ID, WhatsappSettingsStatus.DISCONNECTED);

    expect(db.whatsappSettings.update.mock.calls[0][0]).toEqual({
      where: { phoneId: PHONE_ID },
      data: { status: WhatsappSettingsStatus.DISCONNECTED },
    });
  });

  test("sets every channel on a business account at once", async () => {
    await updateWaSettingsStatusByWabaId("waba-1", WhatsappSettingsStatus.DISCONNECTED);

    expect(db.whatsappSettings.updateMany.mock.calls[0][0].where).toEqual({ wabaId: "waba-1" });
  });
});

describe("upsertWaSettings", () => {
  test("creates a manual channel when the org has none for that number", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(null);

    await upsertWaSettings(ORG_A, PHONE_ID, { appId: "app-1", accessToken: "t" } as any);

    expect(db.whatsappSettings.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG_A,
      type: WaConfigType.Manual,
    });
  });

  test("subscribes a newly connected page to the message webhooks", async () => {
    await upsertWaSettings(ORG_A, PHONE_ID, {
      fbPageId: "page-1",
      pageAccessToken: "page-token",
    } as any);

    expect(subscribePageToAppMock).toHaveBeenCalledWith("page-1", "page-token", [
      "messages",
      "message_reads",
      "message_reactions",
    ]);
  });

  test("records the Facebook and Instagram display names for a connected page", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { username: "the_shop" } })
      .mockResolvedValueOnce({ data: { name: "The Shop" } });

    await upsertWaSettings(ORG_A, PHONE_ID, {
      fbPageId: "page-1",
      ibaId: "iba-1",
      pageAccessToken: "page-token",
    } as any);

    expect(db.whatsappSettings.update.mock.calls[0][0].data).toMatchObject({
      igUserName: "the_shop",
      fbUserName: "The Shop",
    });
  });

  test("clears every page field when the page is disconnected", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(row({ fbPageId: "page-1" }));

    await upsertWaSettings(ORG_A, PHONE_ID, { appId: "app-1" } as any);

    expect(db.whatsappSettings.update.mock.calls[0][0].data).toMatchObject({
      fbPageId: null,
      ibaId: null,
      pageAccessToken: null,
      igUserName: null,
      igDisplayName: null,
      fbUserName: null,
    });
  });

  // NOTE: pins current behaviour, the same shape as issues.txt 10.4 and 12.7. The
  // org's decrypted WhatsApp token is interpolated into the URL rather than passed
  // as callMetaApi's third argument, and callMetaApi trace-logs the url and dumps
  // the whole response — config included — on any non-2xx. See issues.txt 13.3.
  test("puts the org's access token in the query string of both lookups", async () => {
    await upsertWaSettings(ORG_A, PHONE_ID, {
      fbPageId: "page-1",
      ibaId: "iba-1",
      pageAccessToken: "page-token",
    } as any);

    for (const [url, , token] of callMetaApiMock.mock.calls) {
      expect(url).toContain("access_token=plain-token");
      expect(token).toBeUndefined();
    }
  });
});

describe("contact tags", () => {
  test("reads the org's tag settings", async () => {
    db.waAccountSettings.findFirst.mockResolvedValue({ contactTags: ["vip"] });

    await expect(getContactTag(ORG_A)).resolves.toEqual({ contactTags: ["vip"] });
    expect(db.waAccountSettings.findFirst.mock.calls[0][0]).toEqual({ where: { orgId: ORG_A } });
  });

  test("creates the tag settings for an org that has none yet", async () => {
    db.waAccountSettings.upsert.mockResolvedValue({});

    await updateContactTag(ORG_A, { tags: ["vip"], groupTags: ["wholesale"] } as any);

    const call = db.waAccountSettings.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ orgId: ORG_A });
    expect(call.create).toEqual({
      orgId: ORG_A,
      contactTags: ["vip"],
      contactGroupTags: ["wholesale"],
    });
    expect(call.update).toEqual({ contactTags: ["vip"], contactGroupTags: ["wholesale"] });
  });
});

describe("getWaLogs", () => {
  test("returns the page of logs alongside a total", async () => {
    db.waLogs.count.mockResolvedValue(137);
    db.waLogs.findMany.mockResolvedValue([{ id: "log-1" }]);

    await expect(getWaLogs(ORG_A, { page: 0, limit: 50 } as any)).resolves.toEqual({
      totalCount: 137,
      logs: [{ id: "log-1" }],
    });
  });

  test("scopes both halves to the org", async () => {
    await getWaLogs(ORG_A, { page: 0, limit: 50 } as any);

    expect(db.waLogs.count.mock.calls[0][0].where.orgId).toBe(ORG_A);
    expect(db.waLogs.findMany.mock.calls[0][0].where.orgId).toBe(ORG_A);
  });

  test("matches a phone number loosely when one is given", async () => {
    await getWaLogs(ORG_A, { page: 0, limit: 50, phone: "5550" } as any);

    expect(db.waLogs.findMany.mock.calls[0][0].where.phone).toEqual({ contains: "5550" });
  });

  test("takes every log when no page size is given", async () => {
    await getWaLogs(ORG_A, {} as any);

    expect(db.waLogs.findMany.mock.calls[0][0].skip).toBeUndefined();
    expect(db.waLogs.findMany.mock.calls[0][0].take).toBeUndefined();
  });

  test("sorts newest first by default", async () => {
    await getWaLogs(ORG_A, { page: 0, limit: 50 } as any);

    expect(db.waLogs.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "desc" },
      { phone: "desc" },
    ]);
  });

  // NOTE: pins current behaviour. The count query filters on orgId only — the phone
  // filter is applied to the rows but not to the total. So a search that matches
  // three logs out of ten thousand reports totalCount 10000, and the client's
  // pager offers pages that come back empty. See issues.txt 13.6.
  test("counts every log in the org, ignoring the phone filter it applied to the rows", async () => {
    await getWaLogs(ORG_A, { page: 0, limit: 50, phone: "5550" } as any);

    expect(db.waLogs.count.mock.calls[0][0]).toEqual({ where: { orgId: ORG_A } });
    expect(db.waLogs.count.mock.calls[0][0].where.phone).toBeUndefined();
  });

  // NOTE: pins current behaviour, the same off-by-one shape as issues.txt 8.2.
  // skip is page * limit, so pages are zero-based — page 1 is the second page.
  // The schema leaves page optional with no default, so the convention is stated
  // nowhere. See issues.txt 13.6.
  test("treats the page number as zero-based", async () => {
    await getWaLogs(ORG_A, { page: 1, limit: 50 } as any);

    expect(db.waLogs.findMany.mock.calls[0][0].skip).toBe(50);
  });
});

describe("reading Meta assets for onboarding", () => {
  test("lists the Facebook pages the org's token can reach", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "page-1", name: "The Shop" }] } });

    await expect(getFbPagesFromWa(SETTINGS_ID)).resolves.toEqual([
      { id: "page-1", name: "The Shop" },
    ]);
  });

  test("refuses when the channel has no access token", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(row({ wabaId: null, accessToken: null }));

    await expect(getFbPagesFromWa(SETTINGS_ID)).rejects.toThrow("accesstoken not found");
  });

  // Fixed as part of the TS strict-mode migration (see issues.txt 13.7): all four of
  // these used to destructure getWaSettingsById's result before checking it, and that
  // function returns null for an id that matches nothing. An unknown — or another
  // org's, since nothing is scoped — settings id gave a bare TypeError rather than the
  // "accesstoken not found" error two lines above, and the handlers caught it and
  // answered a generic 500. Both null-shaped inputs (missing row, row with no
  // accessToken) now fail the same explicit way.
  test.each([
    ["the page list", () => getFbPagesFromWa(SETTINGS_ID)],
    ["the ad list", () => getAdsFromWa(SETTINGS_ID, "act-1")],
    ["the ad-account list", () => getAdAccountsFromWa(SETTINGS_ID)],
    ["the dataset list", () => getMetaDatasetsFromWa(SETTINGS_ID)],
  ])("throws the same clear error from %s for a channel that does not exist", async (_l, read) => {
    db.whatsappSettings.findUnique.mockResolvedValue(null);

    await expect(read()).rejects.toThrow("accesstoken not found");
  });

  // NOTE: pins current behaviour, and this is the worst of the logging cases. The
  // request asks Meta for `access_token` on every page, and line 335 then logs the
  // whole response body at INFO — a level that IS on in production. So a page
  // access token for every connected Facebook page is written to the log on every
  // sync. Those tokens send messages as the page and never expire on their own.
  // See issues.txt 13.3.
  test("logs every page's access token at info level", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "page-1", name: "The Shop", access_token: "page-token-secret" }] },
    });

    await getFbPagesFromWa(SETTINGS_ID);

    expect(JSON.stringify(logMock.info.mock.calls)).toContain("page-token-secret");
  });

  test("lists the ads on one ad account", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "ad-1" }] } });

    await expect(getAdsFromWa(SETTINGS_ID, "act-1")).resolves.toEqual([{ id: "ad-1" }]);
    expect(callMetaApiMock.mock.calls[0][0]).toContain("/act-1/ads");
  });

  test("attaches each ad account's ads with one call per account", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { data: [{ id: "act-1" }, { id: "act-2" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "ad-1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "ad-2" }] } });

    const result = await getAdAccountsFromWa(SETTINGS_ID);

    expect(result).toEqual([
      { id: "act-1", ads: [{ id: "ad-1" }] },
      { id: "act-2", ads: [{ id: "ad-2" }] },
    ]);
    expect(callMetaApiMock).toHaveBeenCalledTimes(3);
  });

  test("gathers pixels from both businesses and ad accounts, without repeats", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { data: [{ id: "biz-1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "pixel-1", name: "Main" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "act-1" }] } })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: "pixel-1", name: "Main" },
            { id: "pixel-2", name: "Other" },
          ],
        },
      });

    await expect(getMetaDatasetsFromWa(SETTINGS_ID)).resolves.toEqual([
      { id: "pixel-1", name: "Main" },
      { id: "pixel-2", name: "Other" },
    ]);
  });

  test("still reports the ad-account pixels when the business lookup fails", async () => {
    callMetaApiMock
      .mockRejectedValueOnce(new Error("no business permission"))
      .mockResolvedValueOnce({ data: { data: [{ id: "act-1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "pixel-1" }] } });

    await expect(getMetaDatasetsFromWa(SETTINGS_ID)).resolves.toEqual([{ id: "pixel-1" }]);
  });

  test("reports an empty list when both halves fail", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(getMetaDatasetsFromWa(SETTINGS_ID)).resolves.toEqual([]);
  });
});

describe("getConversationalAutomation", () => {
  test("scopes the lookup to the org and the number", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue({ conversationalAutomation: null });

    await getConversationalAutomation(ORG_A, PHONE_ID);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      phoneId: PHONE_ID,
    });
  });

  test("returns empty commands and prompts for a channel that has none set", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue({ conversationalAutomation: null });

    await expect(getConversationalAutomation(ORG_A, PHONE_ID)).resolves.toEqual({
      commands: [],
      prompts: [],
    });
  });

  test("returns what is stored when there is something", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue({
      conversationalAutomation: { commands: [{ command_name: "help" }], prompts: ["Hi"] },
    });

    await expect(getConversationalAutomation(ORG_A, PHONE_ID)).resolves.toEqual({
      commands: [{ command_name: "help" }],
      prompts: ["Hi"],
    });
  });

  test("refuses for a channel the org does not own", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(getConversationalAutomation(ORG_A, PHONE_ID)).rejects.toThrow(
      "WhatsApp settings not found",
    );
  });
});
