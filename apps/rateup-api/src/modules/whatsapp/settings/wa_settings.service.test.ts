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
    metaAssets: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../../../../utils/encryption/encryption.utils.js", () => ({
  aes_encrypt: vi.fn(),
  aes_decrypt: vi.fn(),
}));
vi.mock("../auth/wa_auth.service.js", () => ({
  getPhoneDetails: vi.fn(),
  registerPhoneNumber: vi.fn(),
}));
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
import { getPhoneDetails, registerPhoneNumber } from "../auth/wa_auth.service.js";
import { callMetaApi } from "../wa_axios.js";
import { subscribePageToApp } from "./wa_settings.controller.js";
import { getChannelScope } from "./wa_channel_access.js";
import { log } from "../../../utils/logger.js";
import { WaConfigType, WhatsappSettingsStatus } from "../../../types/enums.js";
import {
  buildBusinessProfileBody,
  createWaSettings,
  deleteWaSettings,
  getAccessibleWaSettings,
  getAdAccountsFromWa,
  getAdsFromWa,
  getAllWaSettings,
  getBusinessProfile,
  getContactTag,
  getConversationalAutomation,
  getFbPagesFromWa,
  getMetaDatasetsFromWa,
  getWaSettings,
  getWaSettingsById,
  getWaSettingsByIbaId,
  getWaSettingsByPageId,
  getWaSettingsWithAccessTokenDecrypted,
  reRegisterPhoneNumber,
  syncDisplayName,
  updateBusinessProfile,
  updateContactTag,
  updateDisplayName,
  updateProfilePicture,
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
  metaAssets: Record<"findUnique" | "upsert", Mock>;
};
const encryptMock = aes_encrypt as unknown as Mock;
const decryptMock = aes_decrypt as unknown as Mock;
const getPhoneDetailsMock = getPhoneDetails as unknown as Mock;
const registerPhoneNumberMock = registerPhoneNumber as unknown as Mock;
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
  registerPhoneNumberMock.mockResolvedValue({ success: true });
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

  test("encrypts the token for a channel with no phone id too", async () => {
    await createWaSettings(ORG_A, {
      accessToken: "plain-token",
      pageAccessToken: "page-token",
    } as any);

    expect(encryptMock).toHaveBeenCalledWith("plain-token", expect.anything());
    const { data } = db.whatsappSettings.create.mock.calls[0][0];
    expect(data.accessToken).not.toBe("plain-token");
    expect(data.accessToken_iv).toBeTruthy();
  });

  test("encrypts the page access token, with its iv inline", async () => {
    await createWaSettings(ORG_A, {
      accessToken: "plain-token",
      phoneId: PHONE_ID,
      phone: "1",
      pageAccessToken: "page-token",
    } as any);

    // aes_encrypt is mocked, so the ciphertext is a stand-in; what matters is that
    // the stored value is the `<iv>:<ciphertext>` form and not the raw token.
    const stored = db.whatsappSettings.create.mock.calls[0][0].data.pageAccessToken;
    expect(stored).not.toBe("page-token");
    expect(stored).toBe("iv-hex:cipher-text");
  });

  test("leaves a channel with no page token alone", async () => {
    await createWaSettings(ORG_A, { accessToken: "plain-token" } as any);

    expect(db.whatsappSettings.create.mock.calls[0][0].data.pageAccessToken).toBeUndefined();
  });
});

describe("reading a channel", () => {
  test("scopes the org's default channel to that org", async () => {
    await getWaSettings(ORG_A);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0].where).toEqual({ orgId: ORG_A });
  });

  // Callers derive a wabaId from this, and Meta scopes flows and templates to a WABA,
  // so an unstable default would spread an org's assets across its numbers.
  test("settles the default on the oldest channel rather than on row order", async () => {
    await getWaSettings(ORG_A);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
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

  test("returns the token as stored for a channel that was never encrypted", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(
      row({ wabaId: null, accessToken_iv: null, accessToken: "plain-token" }),
    );

    const result = await getWaSettingsById(SETTINGS_ID, ORG_A);

    expect(decryptMock).not.toHaveBeenCalled();
    expect(result!.accessToken).toBe("plain-token");
  });

  test("does the same when looking a channel up by Instagram account", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ wabaId: null, accessToken_iv: null }));

    await getWaSettingsByIbaId("iba-1");

    expect(decryptMock).not.toHaveBeenCalled();
  });

  test("reads a page-only channel by page id without throwing", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(
      row({ wabaId: null, accessToken_iv: null, accessToken: "plain-token" }),
    );

    await expect(getWaSettingsByPageId("page-1")).resolves.toMatchObject({
      accessToken: "plain-token",
    });
  });

  test("returns the whole channel list when one channel has no WhatsApp account", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([
      row(),
      row({ id: "settings-2", wabaId: null, accessToken_iv: null }),
    ]);

    await expect(getAllWaSettings(ORG_A)).resolves.toHaveLength(2);
  });

  // A decrypt that fails on a row that DOES have an iv is logged and the stored
  // value returned, rather than taking the caller down with it.
  test("survives a token it cannot decrypt", async () => {
    decryptMock.mockImplementation(() => {
      throw new Error("bad key");
    });
    db.whatsappSettings.findMany.mockResolvedValue([row()]);

    await expect(getAllWaSettings(ORG_A)).resolves.toHaveLength(1);
    expect(logMock.error).toHaveBeenCalled();
  });

  test("scopes a channel lookup by id to the org asking", async () => {
    await getWaSettingsById(SETTINGS_ID, ORG_A);

    expect(db.whatsappSettings.findFirst.mock.calls[0][0]).toEqual({
      where: { id: SETTINGS_ID, orgId: ORG_A },
    });
  });

  test("reports nothing for a channel belonging to another org", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(getWaSettingsById(SETTINGS_ID, ORG_B)).resolves.toBeNull();
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

  test("scopes the update to the caller's org and encrypts the token", async () => {
    await updateWaSettingsById(SETTINGS_ID, ORG_A, { accessToken: "new-plain" } as any);

    const call = db.whatsappSettings.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: SETTINGS_ID, orgId: ORG_A });
    expect(call.data.accessToken).not.toBe("new-plain");
    expect(call.data.accessToken_iv).toBeTruthy();
    expect(encryptMock).toHaveBeenCalledWith("new-plain", expect.anything());
  });

  test("encrypts a replacement page access token too", async () => {
    await updateWaSettingsById(SETTINGS_ID, ORG_A, { pageAccessToken: "page-token" } as any);

    expect(db.whatsappSettings.update.mock.calls[0][0].data.pageAccessToken).toBe(
      "iv-hex:cipher-text",
    );
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
  // The inline `<32-hex iv>:<ciphertext>` form; the mocked aes_decrypt reads it as "plain-token".
  const STORED_PAGE_TOKEN = `${"0".repeat(32)}:cipher-text`;

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

  test.each([null, ""])(
    "clears every page field when the page is disconnected (fbPageId %j)",
    async (fbPageId) => {
      db.whatsappSettings.findUnique.mockResolvedValue(row({ fbPageId: "page-1" }));

      await upsertWaSettings(ORG_A, PHONE_ID, { appId: "app-1", fbPageId } as any);

      expect(db.whatsappSettings.update.mock.calls[0][0].data).toMatchObject({
        fbPageId: null,
        ibaId: null,
        pageAccessToken: null,
        igUserName: null,
        igDisplayName: null,
        fbUserName: null,
      });
    },
  );

  test("leaves the page connected when an update doesn't mention it", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(row({ fbPageId: "page-1" }));

    await upsertWaSettings(ORG_A, PHONE_ID, { appId: "app-1" } as any);

    const { data } = db.whatsappSettings.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("fbPageId");
    expect(data).not.toHaveProperty("ibaId");
    expect(data).not.toHaveProperty("pageAccessToken");
  });

  test("re-saving the connected page falls back to its stored token", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(
      row({ fbPageId: "page-1", pageAccessToken: STORED_PAGE_TOKEN }),
    );

    await upsertWaSettings(ORG_A, PHONE_ID, { fbPageId: "page-1" } as any);

    expect(subscribePageToAppMock).toHaveBeenCalledWith("page-1", "plain-token", expect.anything());
    // The stored token is reused, not rewritten.
    expect(db.whatsappSettings.update.mock.calls[0][0].data.pageAccessToken).toBeUndefined();
  });

  test("still needs a token to switch to a different page", async () => {
    db.whatsappSettings.findUnique.mockResolvedValue(
      row({ fbPageId: "page-1", pageAccessToken: STORED_PAGE_TOKEN }),
    );

    await expect(upsertWaSettings(ORG_A, PHONE_ID, { fbPageId: "page-2" } as any)).rejects.toThrow(
      "pageAccessToken is required to connect a Facebook page",
    );
    expect(db.whatsappSettings.update).not.toHaveBeenCalled();
  });

  test.each([null, ""])(
    "disconnecting Instagram alone keeps the Facebook page (ibaId %j)",
    async (ibaId) => {
      db.whatsappSettings.findUnique.mockResolvedValue(
        row({
          fbPageId: "page-1",
          pageAccessToken: STORED_PAGE_TOKEN,
          ibaId: "iba-1",
          igUserName: "the_shop",
        }),
      );
      callMetaApiMock.mockResolvedValue({ data: { name: "The Shop" } });

      await upsertWaSettings(ORG_A, PHONE_ID, { fbPageId: "page-1", ibaId } as any);

      const { data } = db.whatsappSettings.update.mock.calls[0][0];
      expect(data).toMatchObject({
        fbPageId: "page-1",
        ibaId: null,
        igUserName: null,
        igDisplayName: null,
        fbUserName: "The Shop",
      });
      expect(data.pageAccessToken).toBeUndefined();
    },
  );

  test("passes the org's access token as the auth header on both lookups", async () => {
    await upsertWaSettings(ORG_A, PHONE_ID, {
      fbPageId: "page-1",
      ibaId: "iba-1",
      pageAccessToken: "page-token",
    } as any);

    for (const [url, , token] of callMetaApiMock.mock.calls) {
      expect(url).not.toContain("access_token=");
      expect(token).toBe("plain-token");
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

describe("reading Meta assets for onboarding", () => {
  test("lists the Facebook pages the org's token can reach", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "page-1", name: "The Shop" }] } });

    await expect(getFbPagesFromWa(SETTINGS_ID, ORG_A)).resolves.toEqual([
      { id: "page-1", name: "The Shop" },
    ]);
  });

  test("flattens each page's profile picture to pictureUrl", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          { id: "page-1", name: "The Shop", picture: { data: { url: "https://cdn/p1.jpg" } } },
        ],
      },
    });

    const [page] = await getFbPagesFromWa(SETTINGS_ID, ORG_A);

    expect(page.pictureUrl).toBe("https://cdn/p1.jpg");
    expect(page).not.toHaveProperty("picture");
    expect(callMetaApiMock.mock.calls[0][0]).toContain("picture.type(large){url}");
  });

  test("attaches the linked Instagram account's username and picture", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "page-1", name: "The Shop", instagram_business_account: { id: "ig-1" } }],
        },
      })
      .mockResolvedValueOnce({
        data: { username: "theshop", profile_picture_url: "https://cdn/ig1.jpg" },
      });

    const [page] = await getFbPagesFromWa(SETTINGS_ID, ORG_A);

    expect(callMetaApiMock.mock.calls[1][0]).toBe("/ig-1?fields=username,profile_picture_url");
    expect(page.instagram_business_account).toEqual({
      id: "ig-1",
      username: "theshop",
      profile_picture_url: "https://cdn/ig1.jpg",
    });
  });

  test("still lists a page when its Instagram profile can't be read", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "page-1", name: "The Shop", instagram_business_account: { id: "ig-1" } }],
        },
      })
      .mockRejectedValueOnce(new Error("(#10) missing instagram_basic"));

    const [page] = await getFbPagesFromWa(SETTINGS_ID, ORG_A);

    expect(page.instagram_business_account).toEqual({ id: "ig-1" });
  });

  test("refuses when the channel has no access token", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ wabaId: null, accessToken: null }));

    await expect(getFbPagesFromWa(SETTINGS_ID, ORG_A)).rejects.toThrow("accesstoken not found");
  });

  test.each([
    ["the page list", () => getFbPagesFromWa(SETTINGS_ID, ORG_A)],
    ["the ad list", () => getAdsFromWa(SETTINGS_ID, "act-1", ORG_A)],
    ["the ad-account list", () => getAdAccountsFromWa(SETTINGS_ID, ORG_A)],
    ["the dataset list", () => getMetaDatasetsFromWa(SETTINGS_ID, ORG_A)],
  ])("throws the same clear error from %s for a channel that does not exist", async (_l, read) => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(read()).rejects.toThrow("accesstoken not found");
  });

  test("never logs a page access token", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { data: [{ id: "page-1", name: "The Shop", access_token: "page-token-secret" }] },
    });

    await getFbPagesFromWa(SETTINGS_ID, ORG_A);

    expect(JSON.stringify(logMock.info.mock.calls)).not.toContain("page-token-secret");
    expect(JSON.stringify(logMock.trace.mock.calls)).not.toContain("page-token-secret");
  });

  test("passes the org token as the auth header, not in the query string", async () => {
    await getFbPagesFromWa(SETTINGS_ID, ORG_A);

    const [url, , token] = callMetaApiMock.mock.calls[0];
    expect(url).not.toContain("access_token=");
    expect(token).toBe("plain-token");
  });

  test("lists the ads on one ad account", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "ad-1" }] } });

    await expect(getAdsFromWa(SETTINGS_ID, "act-1", ORG_A)).resolves.toEqual([{ id: "ad-1" }]);
    expect(callMetaApiMock.mock.calls[0][0]).toContain("/act-1/ads");
  });

  test("attaches each ad account's ads with one call per account", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { data: [{ id: "act-1" }, { id: "act-2" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "ad-1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "ad-2" }] } });

    const result = await getAdAccountsFromWa(SETTINGS_ID, ORG_A);

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

    await expect(getMetaDatasetsFromWa(SETTINGS_ID, ORG_A)).resolves.toEqual([
      { id: "pixel-1", name: "Main" },
      { id: "pixel-2", name: "Other" },
    ]);
  });

  test("still reports the ad-account pixels when the business lookup fails", async () => {
    callMetaApiMock
      .mockRejectedValueOnce(new Error("no business permission"))
      .mockResolvedValueOnce({ data: { data: [{ id: "act-1" }] } })
      .mockResolvedValueOnce({ data: { data: [{ id: "pixel-1" }] } });

    await expect(getMetaDatasetsFromWa(SETTINGS_ID, ORG_A)).resolves.toEqual([{ id: "pixel-1" }]);
  });

  test("reports an empty list when both halves fail", async () => {
    callMetaApiMock.mockRejectedValue(new Error("graph is down"));

    await expect(getMetaDatasetsFromWa(SETTINGS_ID, ORG_A)).resolves.toEqual([]);
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

describe("syncDisplayName", () => {
  test("asks Meta for the name fields and reports both the live and the pending name", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        verified_name: "Lucky Shrub",
        name_status: "APPROVED",
        new_display_name: "New Lucky Shrub",
        new_name_status: "PENDING_REVIEW",
      },
    });

    await expect(syncDisplayName(ORG_A, PHONE_ID)).resolves.toEqual({
      verifiedName: "Lucky Shrub",
      nameStatus: "APPROVED",
      newDisplayName: "New Lucky Shrub",
      newNameStatus: "PENDING_REVIEW",
    });

    const [url, method, token, , , , params] = callMetaApiMock.mock.calls[0];
    expect(url).toBe(`/${PHONE_ID}`);
    expect(method).toBe("GET");
    expect(token).toBe("plain-token");
    expect(params).toEqual({
      fields: "verified_name,name_status,new_display_name,new_name_status",
    });
  });

  test("never writes Meta's name over the org's own channel label", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ phoneDisplayName: "Support desk" }));
    callMetaApiMock.mockResolvedValue({ data: { verified_name: "Lucky Shrub" } });

    await syncDisplayName(ORG_A, PHONE_ID);

    expect(db.whatsappSettings.update).not.toHaveBeenCalled();
  });

  test("refuses for a channel the org does not own", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(syncDisplayName(ORG_A, PHONE_ID)).rejects.toThrow("WhatsApp settings not found");
  });
});

describe("updateDisplayName", () => {
  test("submits the new name to Meta without touching the stored one", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(row({ phoneDisplayName: "Old Name" }));
    callMetaApiMock.mockResolvedValueOnce({ data: { success: true } }).mockResolvedValueOnce({
      data: {
        verified_name: "Old Name",
        name_status: "APPROVED",
        new_display_name: "Lucky Shrub",
        new_name_status: "PENDING_REVIEW",
      },
    });

    await expect(updateDisplayName(ORG_A, PHONE_ID, "Lucky Shrub")).resolves.toMatchObject({
      newDisplayName: "Lucky Shrub",
      newNameStatus: "PENDING_REVIEW",
    });

    const [url, method, , , , , params] = callMetaApiMock.mock.calls[0];
    expect(url).toBe(`/${PHONE_ID}`);
    expect(method).toBe("POST");
    expect(params).toEqual({ new_display_name: "Lucky Shrub" });
    // The pending name is not written locally — only an approved one is.
    expect(db.whatsappSettings.update).not.toHaveBeenCalled();
  });

  test("refuses for a channel the org does not own", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(updateDisplayName(ORG_A, PHONE_ID, "Lucky Shrub")).rejects.toThrow(
      "WhatsApp settings not found",
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });
});

describe("reRegisterPhoneNumber", () => {
  test("re-registers with the channel's own access token", async () => {
    await expect(reRegisterPhoneNumber(ORG_A, PHONE_ID)).resolves.toEqual({ success: true });

    expect(registerPhoneNumberMock).toHaveBeenCalledWith(PHONE_ID, "plain-token");
  });

  test("refuses for a channel the org does not own", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(reRegisterPhoneNumber(ORG_A, PHONE_ID)).rejects.toThrow(
      "WhatsApp settings not found",
    );
    expect(registerPhoneNumberMock).not.toHaveBeenCalled();
  });
});

describe("getBusinessProfile", () => {
  test("asks Meta for every profile field and flattens the single-element list", async () => {
    callMetaApiMock.mockResolvedValue({
      data: {
        data: [
          {
            about: "Succulent specialists!",
            address: "1 Hacker Way",
            description: "We sell plants",
            email: "lucky@luckyshrub.com",
            profile_picture_url: "https://pps.whatsapp.net/v/t61",
            websites: ["https://www.luckyshrub.com/"],
            vertical: "RETAIL",
          },
        ],
      },
    });

    await expect(getBusinessProfile(ORG_A, PHONE_ID)).resolves.toEqual({
      about: "Succulent specialists!",
      address: "1 Hacker Way",
      description: "We sell plants",
      email: "lucky@luckyshrub.com",
      profilePictureUrl: "https://pps.whatsapp.net/v/t61",
      websites: ["https://www.luckyshrub.com/"],
      vertical: "RETAIL",
    });

    const [url, method, , , , , params] = callMetaApiMock.mock.calls[0];
    expect(url).toBe(`/${PHONE_ID}/whatsapp_business_profile`);
    expect(method).toBe("GET");
    expect(params.fields).toContain("profile_picture_url");
  });

  test("reports empty fields for a number with no profile set", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [] } });

    await expect(getBusinessProfile(ORG_A, PHONE_ID)).resolves.toEqual({
      about: null,
      address: null,
      description: null,
      email: null,
      profilePictureUrl: null,
      websites: [],
      vertical: null,
    });
  });

  test("refuses for a channel the org does not own", async () => {
    db.whatsappSettings.findFirst.mockResolvedValue(null);

    await expect(getBusinessProfile(ORG_A, PHONE_ID)).rejects.toThrow(
      "WhatsApp settings not found",
    );
  });
});

describe("updateBusinessProfile", () => {
  test("sends only what the caller supplied, with websites JSON-encoded as Meta wants", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    await updateBusinessProfile(ORG_A, PHONE_ID, {
      about: "Succulent specialists!",
      websites: ["https://www.luckyshrub.com"],
    });

    const [url, method, , body] = callMetaApiMock.mock.calls[0];
    expect(url).toBe(`/${PHONE_ID}/whatsapp_business_profile`);
    expect(method).toBe("POST");
    expect(body).toEqual({
      messaging_product: "whatsapp",
      about: "Succulent specialists!",
      websites: '["https://www.luckyshrub.com"]',
    });
  });

  test("leaves websites out entirely when the caller did not send any", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    await updateBusinessProfile(ORG_A, PHONE_ID, { about: "Hi" });

    expect(callMetaApiMock.mock.calls[0][3]).toEqual({
      messaging_product: "whatsapp",
      about: "Hi",
    });
  });

  test("drops blank fields, which Meta rejects rather than clearing", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    await updateBusinessProfile(ORG_A, PHONE_ID, {
      about: "",
      address: "   ",
      description: "  We sell plants  ",
      email: "lucky@luckyshrub.com",
      websites: ["", "https://www.luckyshrub.com"],
    });

    expect(callMetaApiMock.mock.calls[0][3]).toEqual({
      messaging_product: "whatsapp",
      description: "We sell plants",
      email: "lucky@luckyshrub.com",
      websites: '["https://www.luckyshrub.com"]',
    });
  });

  test("an all-blank update carries no fields at all", () => {
    expect(buildBusinessProfileBody({ about: "", address: "  ", websites: [""] })).toEqual({});
  });
});

describe("updateProfilePicture", () => {
  const file = { buffer: Buffer.from("image-bytes"), mimetype: "image/png", filename: "logo.png" };

  test("opens an upload session, sends the bytes, then sets the returned handle", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { id: "upload:session-1" } })
      .mockResolvedValueOnce({ data: { h: "4::aW" } })
      .mockResolvedValueOnce({ data: { success: true } });

    await expect(updateProfilePicture(ORG_A, PHONE_ID, file)).resolves.toEqual({ success: true });

    const [sessionUrl, , , , , , sessionParams] = callMetaApiMock.mock.calls[0];
    expect(sessionUrl).toBe("/app-1/uploads");
    expect(sessionParams).toEqual({
      file_name: "logo.png",
      file_length: file.buffer.length,
      file_type: "image/png",
    });

    const [uploadUrl, , uploadToken, uploadBody, , uploadHeaders] = callMetaApiMock.mock.calls[1];
    expect(uploadUrl).toBe("/upload:session-1");
    // The upload leg authenticates with an OAuth header rather than a bearer token.
    expect(uploadToken).toBeNull();
    expect(uploadBody).toBe(file.buffer);
    expect(uploadHeaders.Authorization).toBe("OAuth plain-token");
    expect(uploadHeaders.file_offset).toBe("0");

    expect(callMetaApiMock.mock.calls[2][3]).toEqual({
      messaging_product: "whatsapp",
      profile_picture_handle: "4::aW",
    });
  });

  test("stops before uploading when Meta gives no session", async () => {
    callMetaApiMock.mockResolvedValueOnce({ data: {} });

    await expect(updateProfilePicture(ORG_A, PHONE_ID, file)).rejects.toThrow(
      "Meta did not return an upload session",
    );
    expect(callMetaApiMock).toHaveBeenCalledTimes(1);
  });

  test("does not touch the profile when the upload returns no handle", async () => {
    callMetaApiMock
      .mockResolvedValueOnce({ data: { id: "upload:session-1" } })
      .mockResolvedValueOnce({ data: {} });

    await expect(updateProfilePicture(ORG_A, PHONE_ID, file)).rejects.toThrow(
      "Meta did not return a file handle for the uploaded image",
    );
    expect(callMetaApiMock).toHaveBeenCalledTimes(2);
  });
});
