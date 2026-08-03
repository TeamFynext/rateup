import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { whatsappSettings: { findFirst: vi.fn() } },
  excludeFields: vi.fn(),
}));

vi.mock("./wa_auth.service.js", () => ({
  getAccessTokenFromCode: vi.fn(),
  getPhoneNumbersFromWABA: vi.fn(),
  registerPhoneNumber: vi.fn(),
  subscribeWABAToWebhook: vi.fn(),
}));

vi.mock("../settings/wa_settings.service.js", () => ({
  createWaSettings: vi.fn(),
  deleteWaSettings: vi.fn(),
  getMetaAssets: vi.fn(),
  syncMetaAssetstoDb: vi.fn(),
  updateWaSettings: vi.fn(),
}));

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../wa_error_handler.js", () => ({ handleWhatsappError: vi.fn() }));
vi.mock("../encryption/wa_encryption.utils.js", () => ({
  generateKeyPairsForWaEncryption: vi.fn(async () => ({
    publicKey: "public-key",
    privateKey: "private-key",
  })),
}));
vi.mock("../encryption/wa_encryption.service.js", () => ({ setBusinessPublicKey: vi.fn() }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import {
  getAccessTokenFromCode,
  getPhoneNumbersFromWABA,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./wa_auth.service.js";
import {
  createWaSettings,
  deleteWaSettings,
  getMetaAssets,
  syncMetaAssetstoDb,
  updateWaSettings,
} from "../settings/wa_settings.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { handleWhatsappError } from "../wa_error_handler.js";
import { setBusinessPublicKey } from "../encryption/wa_encryption.service.js";
import { WaConfigType } from "../../../types/enums.js";
import {
  deRegisterBusinessClientHandler,
  getUserAccessTokenHanlder,
  registerBusinessClientHandler,
} from "./wa_auth.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (prisma as unknown as { whatsappSettings: { findFirst: Mock } }).whatsappSettings;

const m = {
  getToken: getAccessTokenFromCode as unknown as Mock,
  getPhones: getPhoneNumbersFromWABA as unknown as Mock,
  registerPhone: registerPhoneNumber as unknown as Mock,
  subscribe: subscribeWABAToWebhook as unknown as Mock,
  createSettings: createWaSettings as unknown as Mock,
  updateSettings: updateWaSettings as unknown as Mock,
  deleteSettings: deleteWaSettings as unknown as Mock,
  getMetaAssets: getMetaAssets as unknown as Mock,
  syncAssets: syncMetaAssetstoDb as unknown as Mock,
  callMetaApi: callMetaApi as unknown as Mock,
  handleWaError: handleWhatsappError as unknown as Mock,
  setPublicKey: setBusinessPublicKey as unknown as Mock,
};

const CONNECTED_PHONE = {
  id: "phone-1",
  display_phone_number: "+1 555 0001",
  verified_name: "Acme",
  status: "CONNECTED",
};

function makeReply() {
  const reply: any = {
    statusCode: undefined,
    payload: undefined,
    code: vi.fn((c: number) => {
      reply.statusCode = c;
      return reply;
    }),
    status: vi.fn((c: number) => {
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
    body: { code: "code-1", waba_id: "waba-1", phone_number_id: "phone-1", assets: {} },
    params: {},
    user: { orgId: "org-1", userId: "user-1" },
    ...overrides,
  } as any;
}

const originalEnv = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  wa_user_redirect_uri: process.env.wa_user_redirect_uri,
  wa_app_id: process.env.wa_app_id,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FRONTEND_URL = "https://app.rateup.app";
  process.env.wa_user_redirect_uri = "wa-callback";
  process.env.wa_app_id = "app-123";

  // clearAllMocks resets call history but keeps implementations, so every mock a test
  // makes reject has to be given its happy-path value back here.
  db.findFirst.mockResolvedValue(null);
  m.getToken.mockResolvedValue("token-abc");
  m.getPhones.mockResolvedValue({ data: [{ ...CONNECTED_PHONE }] });
  m.subscribe.mockResolvedValue({ success: true });
  m.registerPhone.mockResolvedValue({ success: true });
  m.callMetaApi.mockResolvedValue({ data: { data: [] } });
  m.getMetaAssets.mockResolvedValue(null);
  m.syncAssets.mockResolvedValue({ pages: [] });
  m.createSettings.mockResolvedValue({ id: "settings-1" });
  m.updateSettings.mockResolvedValue({ id: "settings-1" });
  m.deleteSettings.mockResolvedValue(undefined);
  m.setPublicKey.mockResolvedValue(undefined);
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("registerBusinessClientHandler - refusing a number owned elsewhere", () => {
  test("refuses a number already registered to another org", async () => {
    db.findFirst.mockResolvedValue({ id: "settings-other", orgId: "org-other" });
    const reply = makeReply();

    await registerBusinessClientHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.payload).toEqual({ message: "Phone number already registered" });
    expect(m.getToken).not.toHaveBeenCalled();
  });

  test("looks for the number under any org but this one", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(db.findFirst.mock.calls[0][0].where).toEqual({
      phoneId: "phone-1",
      NOT: { orgId: "org-1" },
    });
  });

  test("skips the ownership check when no number was supplied", async () => {
    await registerBusinessClientHandler(
      makeRequest({ body: { code: "code-1", waba_id: "waba-1", assets: {} } }),
      makeReply(),
    );

    expect(db.findFirst.mock.calls[0][0].where).not.toHaveProperty("NOT");
  });
});

describe("registerBusinessClientHandler - the registration flow", () => {
  test("exchanges the code and reads the account's numbers", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.getToken).toHaveBeenCalledWith("code-1");
    expect(m.getPhones).toHaveBeenCalledWith("waba-1", "token-abc");
  });

  test("subscribes the business account to the webhook", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.subscribe).toHaveBeenCalledWith("waba-1", "token-abc");
  });

  test("registers a number that is not connected yet", async () => {
    m.getPhones.mockResolvedValue({ data: [{ ...CONNECTED_PHONE, status: "PENDING" }] });

    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.registerPhone).toHaveBeenCalledWith("phone-1", "token-abc");
  });

  test("leaves an already-connected number alone", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.registerPhone).not.toHaveBeenCalled();
  });

  test("does not register when the request named no number", async () => {
    m.getPhones.mockResolvedValue({ data: [{ ...CONNECTED_PHONE, status: "PENDING" }] });

    await registerBusinessClientHandler(
      makeRequest({ body: { code: "code-1", waba_id: "waba-1", assets: {} } }),
      makeReply(),
    );

    expect(m.registerPhone).not.toHaveBeenCalled();
  });

  test("generates encryption keys and publishes the public one to Meta", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.setPublicKey).toHaveBeenCalledWith("public-key", "phone-1", "token-abc");
  });

  test("confirms success", async () => {
    const reply = makeReply();

    await registerBusinessClientHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ message: "Business client registered successfully" });
  });
});

describe("registerBusinessClientHandler - saving the settings", () => {
  test("creates settings the first time this org connects the number", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.createSettings).toHaveBeenCalledWith("org-1", {
      wabaId: "waba-1",
      phone: "+15550001",
      phoneId: "phone-1",
      accessToken: "token-abc",
      type: WaConfigType.Automated,
      appId: "app-123",
      encryption: { publicKey: "public-key", privateKey: "private-key" },
      assets: {},
    });
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  test("strips the spaces out of the display number before storing it", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.createSettings.mock.calls[0][1].phone).toBe("+15550001");
  });

  test("refreshes the token instead of creating a duplicate when settings exist", async () => {
    db.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "settings-1" });

    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.updateSettings).toHaveBeenCalledWith("org-1", "phone-1", {
      accessToken: "token-abc",
      assets: {},
    });
    expect(m.createSettings).not.toHaveBeenCalled();
  });

  test("matches existing settings on this org and this number", async () => {
    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(db.findFirst.mock.calls[1][0].where).toEqual({ orgId: "org-1", phoneId: "phone-1" });
  });
});

describe("registerBusinessClientHandler - failures", () => {
  test("hands a Graph API failure to the WhatsApp error handler", async () => {
    const graphError = new (GraphApiError as any)("Invalid OAuth token");
    m.getToken.mockRejectedValue(graphError);
    const request = makeRequest();
    const reply = makeReply();

    await registerBusinessClientHandler(request, reply);

    expect(m.handleWaError).toHaveBeenCalledWith(graphError, request, reply);
    expect(reply.status).not.toHaveBeenCalledWith(500);
  });

  test("returns 500 for any other failure", async () => {
    m.getPhones.mockRejectedValue(new Error("network down"));
    const reply = makeReply();

    await registerBusinessClientHandler(makeRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ message: "Internal server error" });
    expect(m.handleWaError).not.toHaveBeenCalled();
  });

  test("does not save settings when the flow fails part way", async () => {
    m.subscribe.mockRejectedValue(new Error("subscribe failed"));

    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.createSettings).not.toHaveBeenCalled();
    expect(m.updateSettings).not.toHaveBeenCalled();
  });

  test("still saves settings when the account reports no numbers", async () => {
    m.getPhones.mockResolvedValue({ data: [] });

    await registerBusinessClientHandler(makeRequest(), makeReply());

    expect(m.createSettings.mock.calls[0][1]).toMatchObject({
      phoneId: undefined,
      phone: undefined,
    });
  });
});

describe("deRegisterBusinessClientHandler", () => {
  test("deletes the org's settings for that number", async () => {
    await deRegisterBusinessClientHandler(
      makeRequest({ params: { phoneId: "phone-1" } }),
      makeReply(),
    );

    expect(m.deleteSettings).toHaveBeenCalledWith("org-1", "phone-1");
  });

  test("returns 500 when the delete fails", async () => {
    m.deleteSettings.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await deRegisterBusinessClientHandler(makeRequest({ params: { phoneId: "phone-1" } }), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
  });

  // NOTE: the success path never replies. Fastify has nothing to send, so the caller
  // waits until the request times out even though the delete succeeded.
  test("sends no response at all when the delete succeeds", async () => {
    const reply = makeReply();

    await deRegisterBusinessClientHandler(makeRequest({ params: { phoneId: "phone-1" } }), reply);

    expect(reply.send).not.toHaveBeenCalled();
    expect(reply.status).not.toHaveBeenCalled();
  });
});

describe("getUserAccessTokenHanlder", () => {
  const request = () =>
    makeRequest({ body: { code: "code-1" }, params: { waSettingsId: "settings-1" } });

  test("exchanges the code against the configured redirect uri", async () => {
    await getUserAccessTokenHanlder(request(), makeReply());

    expect(m.getToken).toHaveBeenCalledWith(
      "code-1",
      encodeURIComponent("https://app.rateup.app/wa-callback"),
    );
  });

  test("asks Meta for the pages the user administers", async () => {
    await getUserAccessTokenHanlder(request(), makeReply());

    const url = m.callMetaApi.mock.calls[0][0] as string;
    expect(url).toContain("/me/accounts");
    expect(url).toContain("instagram_business_account");
    expect(url).toContain("access_token=token-abc");
  });

  test("stores every page as newly unsubscribed when none are known yet", async () => {
    m.callMetaApi.mockResolvedValue({
      data: { data: [{ id: "page-1", name: "Acme", access_token: "page-token" }] },
    });

    await getUserAccessTokenHanlder(request(), makeReply());

    expect(m.syncAssets).toHaveBeenCalledWith(
      "pages",
      [{ id: "page-1", name: "Acme", access_token: "page-token", subscribedFields: [] }],
      "settings-1",
    );
  });

  test("treats an assets record with no pages the same as none at all", async () => {
    m.getMetaAssets.mockResolvedValue({ pages: [] });
    m.callMetaApi.mockResolvedValue({ data: { data: [{ id: "page-1" }] } });

    await getUserAccessTokenHanlder(request(), makeReply());

    expect(m.syncAssets.mock.calls[0][1][0]).toMatchObject({ subscribedFields: [] });
  });

  test("refreshes the stored page token from Meta's answer", async () => {
    m.getMetaAssets.mockResolvedValue({
      pages: [{ id: "page-1", name: "Acme", subscribedFields: ["messages"] }],
    });
    m.callMetaApi.mockResolvedValue({
      data: { data: [{ id: "page-1", access_token: "fresh-token" }] },
    });

    await getUserAccessTokenHanlder(request(), makeReply());

    expect(m.syncAssets.mock.calls[0][1][0]).toMatchObject({
      id: "page-1",
      pageAccessTokenByUser: "fresh-token",
      subscribedFields: ["messages"],
    });
  });

  test("keeps a known page that Meta no longer returns, without a token", async () => {
    m.getMetaAssets.mockResolvedValue({ pages: [{ id: "page-gone", name: "Old" }] });
    m.callMetaApi.mockResolvedValue({ data: { data: [] } });

    await getUserAccessTokenHanlder(request(), makeReply());

    const [page] = m.syncAssets.mock.calls[0][1];
    expect(page.id).toBe("page-gone");
    expect(page.pageAccessTokenByUser).toBeUndefined();
  });

  test("returns whatever the sync produced", async () => {
    m.syncAssets.mockResolvedValue({ pages: [{ id: "page-1" }] });
    const reply = makeReply();

    await getUserAccessTokenHanlder(request(), reply);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.payload).toEqual({ pages: [{ id: "page-1" }] });
  });

  test("hands a Graph API failure to the WhatsApp error handler", async () => {
    const graphError = new (GraphApiError as any)("token expired");
    m.callMetaApi.mockRejectedValue(graphError);
    const req = request();
    const reply = makeReply();

    await getUserAccessTokenHanlder(req, reply);

    expect(m.handleWaError).toHaveBeenCalledWith(graphError, req, reply);
  });

  test("returns 500 for any other failure", async () => {
    m.syncAssets.mockRejectedValue(new Error("db down"));
    const reply = makeReply();

    await getUserAccessTokenHanlder(request(), reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.payload).toEqual({ message: "Internal server error" });
  });
});
