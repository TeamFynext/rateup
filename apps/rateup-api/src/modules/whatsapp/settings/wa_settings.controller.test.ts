import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./wa_settings.service.js", () => ({
  createWaSettings: vi.fn(),
  deleteWaSettings: vi.fn(),
  getAccessibleWaSettings: vi.fn(),
  getAdAccountsFromWa: vi.fn(),
  getAdsFromWa: vi.fn(),
  getContactTag: vi.fn(),
  getConversationalAutomation: vi.fn(),
  getFbPagesFromWa: vi.fn(),
  getLeadgenFormQuestionsFromWa: vi.fn(),
  getLeadgenFormsFromWa: vi.fn(),
  getMetaAssets: vi.fn(),
  getMetaDatasetsFromWa: vi.fn(),
  getWaLogs: vi.fn(),
  getWaSettings: vi.fn(),
  getWaSettingsById: vi.fn(),
  subscribeFieldtoPage: vi.fn(),
  syncConversationalAutomation: vi.fn(),
  syncMetaAssetstoDb: vi.fn(),
  updateContactTag: vi.fn(),
  updateConversationalAutomation: vi.fn(),
  updateWaSettings: vi.fn(),
  updateWaSettingsById: vi.fn(),
  upsertWaSettings: vi.fn(),
}));
vi.mock("../../user/user.service.js", () => ({ getOrgIdAndRole: vi.fn() }));
vi.mock("../../org/org.services.js", () => ({
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", AGENT: "AGENT" },
}));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import {
  createWaSettings,
  deleteWaSettings,
  getAccessibleWaSettings,
  getAdAccountsFromWa,
  getAdsFromWa,
  getContactTag,
  getConversationalAutomation,
  getFbPagesFromWa,
  getLeadgenFormsFromWa,
  getMetaAssets,
  getMetaDatasetsFromWa,
  getWaLogs,
  getWaSettings,
  getWaSettingsById,
  subscribeFieldtoPage,
  syncMetaAssetstoDb,
  updateContactTag,
  updateConversationalAutomation,
  updateWaSettings,
  updateWaSettingsById,
  upsertWaSettings,
} from "./wa_settings.service.js";
import { getOrgIdAndRole } from "../../user/user.service.js";
import { callMetaApi } from "../wa_axios.js";
import {
  createWaSettingsHandler,
  deleteWaSettingsHandler,
  getContactTagHandler,
  getConversationalAutomationHandler,
  getMetaAssetsHandler,
  getMetaDatasetsHandler,
  getWaLogsHandler,
  getWaSettingsForOrgHandler,
  getWaSettingsHandler,
  subscribeFieldstoPageHandler,
  syncAdAccountsHandler,
  syncFbPagesHandler,
  syncLeadgenFormsHandler,
  updateContactTagHandler,
  updateConversationalAutomationHandler,
  updateWaSettingsByIdHandler,
  updateWaSettingsHandler,
  upsertWaSettingsHandler,
} from "./wa_settings.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  callMetaApi: callMetaApi as unknown as Mock,
  createWaSettings: createWaSettings as unknown as Mock,
  deleteWaSettings: deleteWaSettings as unknown as Mock,
  getAccessibleWaSettings: getAccessibleWaSettings as unknown as Mock,
  getAdAccountsFromWa: getAdAccountsFromWa as unknown as Mock,
  getAdsFromWa: getAdsFromWa as unknown as Mock,
  getContactTag: getContactTag as unknown as Mock,
  getConversationalAutomation: getConversationalAutomation as unknown as Mock,
  getFbPagesFromWa: getFbPagesFromWa as unknown as Mock,
  getLeadgenFormsFromWa: getLeadgenFormsFromWa as unknown as Mock,
  getMetaAssets: getMetaAssets as unknown as Mock,
  getMetaDatasetsFromWa: getMetaDatasetsFromWa as unknown as Mock,
  getOrgIdAndRole: getOrgIdAndRole as unknown as Mock,
  getWaLogs: getWaLogs as unknown as Mock,
  getWaSettings: getWaSettings as unknown as Mock,
  getWaSettingsById: getWaSettingsById as unknown as Mock,
  subscribeFieldtoPage: subscribeFieldtoPage as unknown as Mock,
  syncMetaAssetstoDb: syncMetaAssetstoDb as unknown as Mock,
  updateContactTag: updateContactTag as unknown as Mock,
  updateConversationalAutomation: updateConversationalAutomation as unknown as Mock,
  updateWaSettings: updateWaSettings as unknown as Mock,
  updateWaSettingsById: updateWaSettingsById as unknown as Mock,
  upsertWaSettings: upsertWaSettings as unknown as Mock,
};

const ORG_A = "org-a";
const ORG_B = "org-b";
const SETTINGS_ID = "settings-1";
const PHONE_ID = "phone-1";

function settingsRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: SETTINGS_ID,
    orgId: ORG_A,
    accessToken: "plain-token",
    pageAccessToken: "page-token",
    wabaId: "waba-1",
    phoneId: PHONE_ID,
    fbPageId: null,
    encryption: { privateKey: "secret-key", passphrase: "secret" },
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1", role: "ADMIN" },
    userId: "user-1",
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

/** The body the handler answered with. */
function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_A, role: "SUPER_ADMIN" });
  m.getAccessibleWaSettings.mockResolvedValue([settingsRow()]);
  m.getWaSettings.mockResolvedValue(settingsRow());
  m.getWaSettingsById.mockResolvedValue(settingsRow());
  m.createWaSettings.mockResolvedValue(settingsRow());
  m.updateWaSettings.mockResolvedValue(settingsRow());
  m.updateWaSettingsById.mockResolvedValue(settingsRow());
  m.upsertWaSettings.mockResolvedValue(settingsRow());
  m.deleteWaSettings.mockResolvedValue(settingsRow());
  m.getFbPagesFromWa.mockResolvedValue([{ id: "page-1", name: "The Shop" }]);
  m.getAdAccountsFromWa.mockResolvedValue([{ id: "act-1" }]);
  m.getAdsFromWa.mockResolvedValue([{ id: "ad-1" }]);
  m.getLeadgenFormsFromWa.mockResolvedValue([{ id: "form-1" }]);
  m.getMetaAssets.mockResolvedValue({ pages: [], adAccounts: [], leadgenForms: [] });
  m.getMetaDatasetsFromWa.mockResolvedValue([{ id: "pixel-1" }]);
  m.syncMetaAssetstoDb.mockResolvedValue(undefined);
  m.subscribeFieldtoPage.mockResolvedValue({ success: true });
  m.getWaLogs.mockResolvedValue({ totalCount: 0, logs: [] });
  m.getContactTag.mockResolvedValue({ contactTags: ["vip"] });
  m.updateContactTag.mockResolvedValue({});
  m.getConversationalAutomation.mockResolvedValue({ commands: [], prompts: [] });
  m.updateConversationalAutomation.mockResolvedValue({ success: true });
  m.callMetaApi.mockResolvedValue({ data: { business_verification_status: "verified" } });
});

describe("the super-admin gate on the three settings write paths", () => {
  test.each([
    ["create", (req: any, rep: any) => createWaSettingsHandler(req, rep)],
    ["update", (req: any, rep: any) => updateWaSettingsHandler(req, rep)],
    ["upsert", (req: any, rep: any) => upsertWaSettingsHandler(req, rep)],
    ["delete", (req: any, rep: any) => deleteWaSettingsHandler(req, rep)],
  ])("refuses a non super admin on %s", async (_label, handler) => {
    m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_A, role: "ADMIN" });
    const rep = reply();

    await handler(request({ params: { phoneId: PHONE_ID } }), rep);

    expect(rep.status).toHaveBeenCalledWith(403);
  });

  test("creates a manual channel for a super admin", async () => {
    const rep = reply();

    await createWaSettingsHandler(
      request({
        body: { accessToken: "t", wabaId: "waba-1", phoneId: PHONE_ID, appId: "app-1" },
      }),
      rep,
    );

    expect(m.createWaSettings.mock.calls[0][0]).toBe(ORG_A);
    expect(m.createWaSettings.mock.calls[0][1].type).toBe("Manual");
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("uses the org from the role lookup rather than the one on the session", async () => {
    m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_B, role: "SUPER_ADMIN" });

    await createWaSettingsHandler(request({ body: {} }), reply());

    expect(m.createWaSettings.mock.calls[0][0]).toBe(ORG_B);
  });

  test("deletes the channel by the number in the path", async () => {
    const rep = reply();

    await deleteWaSettingsHandler(request({ params: { phoneId: PHONE_ID } }), rep);

    expect(m.deleteWaSettings).toHaveBeenCalledWith(ORG_A, PHONE_ID);
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("answers 500 with the raw error when an upsert fails", async () => {
    m.upsertWaSettings.mockRejectedValue(new Error("meta refused"));
    const rep = reply();

    await upsertWaSettingsHandler(request({ body: { phoneId: PHONE_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // createWaSettingsHandler, updateWaSettingsHandler, upsertWaSettingsHandler and
  // deleteWaSettingsHandler all require SUPER_ADMIN. updateWaSettingsByIdHandler —
  // PUT /:whatsappSettingsId, which writes the same row and more (fbPageId, ibaId,
  // pageAccessToken, encryption keys) — checked no role at all, so any
  // authenticated user of the org reached it. See issues.txt 13.2.
  test("the by-id update path refuses a non super admin, like its siblings", async () => {
    m.getOrgIdAndRole.mockResolvedValue({ orgId: ORG_A, role: "AGENT" });
    const rep = reply();

    await updateWaSettingsByIdHandler(
      request({
        user: { orgId: ORG_A, userId: "user-1", role: "AGENT" },
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { appId: "rewritten" },
      }),
      rep,
    );

    expect(m.updateWaSettingsById).not.toHaveBeenCalled();
    expect(rep.status).toHaveBeenCalledWith(403);
  });
});

describe("getWaSettingsHandler", () => {
  test("returns the channels the caller's teams can reach", async () => {
    const rep = reply();

    await getWaSettingsHandler(request(), rep);

    expect(m.getAccessibleWaSettings).toHaveBeenCalledWith(ORG_A, "user-1", "ADMIN");
    expect(rep.status).toHaveBeenCalledWith(200);
  });

  test("returns an empty list for a caller with no channels", async () => {
    m.getAccessibleWaSettings.mockResolvedValue([]);
    const rep = reply();

    await getWaSettingsHandler(request(), rep);

    expect(sent(rep)).toEqual([]);
  });

  test("strips the flow encryption keys from every channel", async () => {
    const rep = reply();

    await getWaSettingsHandler(request(), rep);

    expect(sent(rep)[0].encryption).toBeUndefined();
  });

  // The handler used to remove `encryption` and nothing else, so the response
  // carried the DECRYPTED WhatsApp system token and the Facebook page token for
  // every channel — to the browser of any authenticated member of the org, at any
  // role, since this route carries only checkSession. That system token sends
  // messages as the org, reads its whole message history and manages its templates
  // and phone numbers. See issues.txt 13.2.
  test("never sends an access token to the client", async () => {
    const rep = reply();

    await getWaSettingsHandler(
      request({ user: { orgId: ORG_A, userId: "user-1", role: "AGENT" } }),
      rep,
    );

    expect(sent(rep)[0].accessToken).toBeUndefined();
    expect(sent(rep)[0].pageAccessToken).toBeUndefined();
    expect(JSON.stringify(sent(rep))).not.toContain("plain-token");
    expect(JSON.stringify(sent(rep))).not.toContain("page-token");
  });

  test("still sends the fields the channel pickers need", async () => {
    const rep = reply();

    await getWaSettingsHandler(request(), rep);

    expect(sent(rep)[0]).toMatchObject({ id: SETTINGS_ID, orgId: ORG_A });
  });
});

describe("updateWaSettingsByIdHandler", () => {
  test("subscribes a newly connected page and records its display names", async () => {
    m.callMetaApi
      // subscribePageToApp lives in this same file and calls Meta first.
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({ data: { username: "the_shop" } })
      .mockResolvedValueOnce({ data: { name: "The Shop" } });
    const body: any = { fbPageId: "page-1", ibaId: "iba-1", pageAccessToken: "page-token" };

    await updateWaSettingsByIdHandler(
      request({ params: { whatsappSettingsId: SETTINGS_ID }, body }),
      reply(),
    );

    expect(m.callMetaApi.mock.calls[0][0]).toContain("/page-1/subscribed_apps");
    expect(body.igUserName).toBe("the_shop");
    expect(body.fbUserName).toBe("The Shop");
  });

  // subscribePageToApp put the page access token in the query string, and the two
  // profile lookups put the org's decrypted WhatsApp token there too — and
  // callMetaApi trace-logs the url and dumps the whole response on any non-2xx.
  // See issues.txt 13.3.
  test("passes every token as an auth header, never in a query string", async () => {
    await updateWaSettingsByIdHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", ibaId: "iba-1", pageAccessToken: "page-token" },
      }),
      reply(),
    );

    for (const [url] of m.callMetaApi.mock.calls) {
      expect(url).not.toContain("access_token=");
    }
    const tokens = m.callMetaApi.mock.calls.map((c) => c[2]);
    expect(tokens).toEqual(["page-token", "plain-token", "plain-token"]);
  });

  // The dashboard no longer receives pageAccessToken in the channel list (13.2),
  // so it cannot send one back for a page it did not just pick. The stored token
  // is used instead of refusing. See issues.txt 13.2.
  test("falls back to the stored page token when the client sends none", async () => {
    m.getWaSettingsById.mockResolvedValue(settingsRow({ pageAccessToken: "stored-page-token" }));

    await updateWaSettingsByIdHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", ibaId: "iba-1" },
      }),
      reply(),
    );

    expect(m.callMetaApi.mock.calls[0][2]).toBe("stored-page-token");
  });

  test("clears every page field when the page is disconnected", async () => {
    m.getWaSettingsById.mockResolvedValue(settingsRow({ fbPageId: "page-1" }));
    const body: any = {};

    await updateWaSettingsByIdHandler(
      request({ params: { whatsappSettingsId: SETTINGS_ID }, body }),
      reply(),
    );

    expect(body).toMatchObject({
      fbPageId: null,
      ibaId: null,
      pageAccessToken: null,
      igUserName: null,
      igDisplayName: null,
      fbUserName: null,
    });
  });

  test("leaves an unchanged page alone", async () => {
    m.getWaSettingsById.mockResolvedValue(settingsRow({ fbPageId: "page-1" }));

    await updateWaSettingsByIdHandler(
      request({ params: { whatsappSettingsId: SETTINGS_ID }, body: { fbPageId: "page-1" } }),
      reply(),
    );

    expect(m.callMetaApi).not.toHaveBeenCalled();
  });

  // 404, not the 500 this used to fall through to. See issues.txt 13.7.
  test("answers 404 when the channel does not exist", async () => {
    m.getWaSettingsById.mockResolvedValue(null);
    const rep = reply();

    await updateWaSettingsByIdHandler(
      request({ params: { whatsappSettingsId: "nope" }, body: {} }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.updateWaSettingsById).not.toHaveBeenCalled();
  });

  // The row was loaded by id and its orgId never compared to request.user.orgId,
  // so an authenticated user of any org could rewrite another org's channel —
  // including pointing its fbPageId, ibaId and pageAccessToken at a page they
  // control, which redirects that org's inbound Facebook and Instagram traffic.
  // See issues.txt 13.1.
  test("answers 404 for a channel belonging to another org", async () => {
    m.getWaSettingsById.mockResolvedValue(null);
    const rep = reply();

    await updateWaSettingsByIdHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: null, appId: "taken-over" },
      }),
      rep,
    );

    expect(m.getWaSettingsById).toHaveBeenCalledWith(SETTINGS_ID, ORG_A);
    expect(m.updateWaSettingsById).not.toHaveBeenCalled();
    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("scopes the write to the caller's org", async () => {
    await updateWaSettingsByIdHandler(
      request({ params: { whatsappSettingsId: SETTINGS_ID }, body: { appId: "x" } }),
      reply(),
    );

    expect(m.updateWaSettingsById.mock.calls[0].slice(0, 2)).toEqual([SETTINGS_ID, ORG_A]);
  });
});

describe("the Meta sync handlers", () => {
  test("stores the synced pages with an empty subscription list", async () => {
    const rep = reply();

    await syncFbPagesHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep);

    expect(m.syncMetaAssetstoDb).toHaveBeenCalledWith(
      "pages",
      [{ id: "page-1", name: "The Shop", subscribedFields: [] }],
      SETTINGS_ID,
    );
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 404 when the org's token reaches no pages", async () => {
    m.getFbPagesFromWa.mockResolvedValue([]);
    const rep = reply();

    await syncFbPagesHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.syncMetaAssetstoDb).not.toHaveBeenCalled();
  });

  test("stores the synced ad accounts", async () => {
    await syncAdAccountsHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), reply());

    expect(m.syncMetaAssetstoDb).toHaveBeenCalledWith("adAccounts", [{ id: "act-1" }], SETTINGS_ID);
  });

  test("tags each synced lead form with the page it belongs to", async () => {
    await syncLeadgenFormsHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", pageAccessToken: "page-token" },
      }),
      reply(),
    );

    expect(m.syncMetaAssetstoDb).toHaveBeenCalledWith(
      "leadgenForms",
      [{ id: "form-1", pageId: "page-1" }],
      SETTINGS_ID,
    );
  });

  test("records the newly subscribed fields against the page", async () => {
    m.getMetaAssets.mockResolvedValue({
      pages: [{ id: "page-1", subscribedFields: ["messages"] }],
    });
    const rep = reply();

    await subscribeFieldstoPageHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", pageAccessToken: "t", fields: ["message_reads"] },
      }),
      rep,
    );

    expect(m.syncMetaAssetstoDb.mock.calls[0][1][0].subscribedFields).toEqual([
      "messages",
      "message_reads",
    ]);
  });

  test("answers 404 when subscribing a page that has not been synced yet", async () => {
    m.getMetaAssets.mockResolvedValue({ pages: [] });
    const rep = reply();

    await subscribeFieldstoPageHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", pageAccessToken: "t", fields: ["messages"] },
      }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(404);
  });

  test("answers 400 when Meta refuses the subscription", async () => {
    m.subscribeFieldtoPage.mockResolvedValue({ success: false });
    const rep = reply();

    await subscribeFieldstoPageHandler(
      request({
        params: { whatsappSettingsId: SETTINGS_ID },
        body: { fbPageId: "page-1", pageAccessToken: "t", fields: ["messages"] },
      }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(400);
  });

  test("answers 500 when a sync fails", async () => {
    m.getFbPagesFromWa.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await syncFbPagesHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // NOTE: pins current behaviour. Every one of these handlers takes
  // whatsappSettingsId from the path or query and never loads the row to compare
  // its orgId to request.user.orgId. The sync ones then call Meta with the VICTIM
  // org's access token, so this both reads their assets and spends their rate
  // limit. Same IDOR family as issues.txt 1.1, 11.1 and 12.15. See issues.txt 13.1.
  test.each([
    [
      "the page sync",
      (rep: any) =>
        syncFbPagesHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep),
    ],
    [
      "the ad-account sync",
      (rep: any) =>
        syncAdAccountsHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep),
    ],
    [
      "the dataset list",
      (rep: any) =>
        getMetaDatasetsHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep),
    ],
  ])("scopes %s to the caller's org", async (_label, run) => {
    const rep = reply();

    await run(rep);

    // Each of these now passes orgId down to the service, which resolves the
    // channel with it. They used to call Meta with the VICTIM org's access token,
    // reading its pages, ad accounts, ads, lead forms and pixels and spending its
    // rate limit. See issues.txt 13.1.
    const scoped = [
      ...m.getFbPagesFromWa.mock.calls,
      ...m.getAdAccountsFromWa.mock.calls,
      ...m.getMetaDatasetsFromWa.mock.calls,
    ];
    expect(scoped.length).toBe(1);
    expect(scoped[0]).toContain(ORG_A);
  });
});

describe("getMetaAssetsHandler", () => {
  test("returns the stored assets for the channel", async () => {
    m.getMetaAssets.mockResolvedValue({ pages: [{ id: "page-1" }] });
    const rep = reply();

    await getMetaAssetsHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep);

    expect(sent(rep)).toEqual({ pages: [{ id: "page-1" }] });
  });

  test("answers 500 when the assets cannot be read", async () => {
    m.getMetaAssets.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getMetaAssetsHandler(request({ params: { whatsappSettingsId: SETTINGS_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });

  // The sharpest edge of 13.1. The stored MetaAsset blob holds
  // `pages[].access_token` — the page access tokens synced from Meta — and this
  // handler took the channel id from the path, performed no ownership check and
  // sent the blob verbatim. Any authenticated user with another org's channel id
  // got working page tokens for that org's Facebook pages. getMetaAssets is
  // org-scoped now and reports null for a channel the caller does not own.
  // See issues.txt 13.1.
  test("answers 404 for another org's channel, sending no tokens", async () => {
    m.getMetaAssets.mockResolvedValue(null);
    const rep = reply();

    await getMetaAssetsHandler(
      request({
        user: { orgId: ORG_B, userId: "user-2", role: "AGENT" },
        params: { whatsappSettingsId: SETTINGS_ID },
      }),
      rep,
    );

    expect(m.getMetaAssets).toHaveBeenCalledWith(SETTINGS_ID, ORG_B);
    expect(rep.code).toHaveBeenCalledWith(404);
    expect(JSON.stringify(sent(rep))).not.toContain("access_token");
  });
});

describe("contact tags", () => {
  test("returns the org's tags", async () => {
    const rep = reply();

    await getContactTagHandler(request(), rep);

    expect(m.getContactTag).toHaveBeenCalledWith(ORG_A);
    expect(sent(rep)).toEqual({ contactTags: ["vip"] });
  });

  test("returns an empty tag list for an org that has none", async () => {
    m.getContactTag.mockResolvedValue(null);
    const rep = reply();

    await getContactTagHandler(request(), rep);

    expect(sent(rep)).toEqual({ contactTags: [] });
  });

  test("saves the tags against the caller's org", async () => {
    const rep = reply();

    await updateContactTagHandler(request({ body: { tags: ["vip"], groupTags: [] } }), rep);

    expect(m.updateContactTag).toHaveBeenCalledWith(ORG_A, { tags: ["vip"], groupTags: [] });
    expect(rep.code).toHaveBeenCalledWith(204);
  });

  test("answers 500 when saving the tags fails", async () => {
    m.updateContactTag.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await updateContactTagHandler(request({ body: { tags: [], groupTags: [] } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("getWaLogsHandler", () => {
  test("passes the paging query straight through, scoped to the org", async () => {
    const rep = reply();

    await getWaLogsHandler(request({ query: { page: 0, limit: 50 } }), rep);

    expect(m.getWaLogs).toHaveBeenCalledWith(ORG_A, { page: 0, limit: 50 });
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 500 when the logs cannot be read", async () => {
    m.getWaLogs.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await getWaLogsHandler(request({ query: {} }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("getWaSettingsForOrgHandler", () => {
  test("reports the business verification status Meta holds", async () => {
    const rep = reply();

    await getWaSettingsForOrgHandler(request(), rep);

    expect(m.callMetaApi.mock.calls[0][0]).toBe("/waba-1");
    expect(sent(rep)).toEqual({ verificationStatus: "verified" });
  });

  test("reports nothing rather than calling Meta for an org with no channel", async () => {
    m.getWaSettings.mockResolvedValue(null);
    const rep = reply();

    await getWaSettingsForOrgHandler(request(), rep);

    expect(m.callMetaApi).not.toHaveBeenCalled();
    expect(sent(rep)).toEqual({ verificationStatus: null });
  });

  test("answers 500 when Meta cannot be reached", async () => {
    m.callMetaApi.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await getWaSettingsForOrgHandler(request(), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
  });
});

describe("conversational automation", () => {
  test("reads the automation for the number in the path, scoped to the org", async () => {
    const rep = reply();

    await getConversationalAutomationHandler(request({ params: { phoneId: PHONE_ID } }), rep);

    expect(m.getConversationalAutomation).toHaveBeenCalledWith(ORG_A, PHONE_ID);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("writes the automation for the number in the path, scoped to the org", async () => {
    const body = { commands: [{ command_name: "help", command_description: "Help" }] };
    const rep = reply();

    await updateConversationalAutomationHandler(
      request({ params: { phoneId: PHONE_ID }, body }),
      rep,
    );

    expect(m.updateConversationalAutomation).toHaveBeenCalledWith(ORG_A, PHONE_ID, body);
    expect(rep.code).toHaveBeenCalledWith(200);
  });

  test("answers 500 for a number the org does not own", async () => {
    m.getConversationalAutomation.mockRejectedValue(new Error("WhatsApp settings not found"));
    const rep = reply();

    await getConversationalAutomationHandler(request({ params: { phoneId: PHONE_ID } }), rep);

    expect(rep.code).toHaveBeenCalledWith(500);
    expect(sent(rep)).toEqual({ message: "Something went wrong" });
  });
});
