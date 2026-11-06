import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const integration = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() }));
vi.mock("../../../../utils/prisma.js", () => ({ default: { integration } }));

// The real receiver pulls in the whole provider registry.
vi.mock("../../shared/inboundWebhookContract.js", () => ({
  inboundWebhookUrl: (provider: string, id: string) =>
    `https://api.test/api/public/integrations/webhooks/${provider}/${id}`,
}));

vi.mock("./zoho.client.js", () => ({
  registerZohoWebhook: vi.fn(),
  unsubscribeZohoWebhook: vi.fn(),
}));

vi.mock("./zoho.auth.js", async () => ({
  ...(await vi.importActual<typeof import("./zoho.auth.js")>("./zoho.auth.js")),
  getValidZohoAccessToken: vi.fn(),
  refreshZohoToken: vi.fn(),
  revokeZohoToken: vi.fn(),
}));

import { OAuthConnectError } from "../../shared/oauthConnectError.js";
import {
  getValidZohoAccessToken,
  refreshZohoToken,
  revokeZohoToken,
  ZOHO_SCOPES,
  zohoScopesFor,
} from "./zoho.auth.js";
import { registerZohoWebhook, unsubscribeZohoWebhook } from "./zoho.client.js";
import { connectZoho, disconnectZoho, refreshZohoIntegrationCredential } from "./zoho.connect.js";

type Mock = ReturnType<typeof vi.fn>;

const ORG = "11111111-1111-1111-1111-111111111111";

const tokens = (over: Record<string, unknown> = {}) => ({
  accessToken: "access-1",
  refreshToken: "refresh-1",
  expiresAt: "2026-10-01T00:00:00.000Z",
  scope: "ZohoCRM.modules.ALL ZohoBigin.modules.ALL",
  raw: { api_domain: "https://www.zohoapis.in" },
  ...over,
});

/** The credential the last `integration.update` saved. */
const saved = () => integration.update.mock.calls.at(-1)?.[0].data.credential;

beforeEach(() => {
  vi.clearAllMocks();
  integration.findUnique.mockResolvedValue(null);
  integration.upsert.mockResolvedValue({ id: "int-1" });
  integration.update.mockResolvedValue({});
  let n = 0;
  (registerZohoWebhook as unknown as Mock).mockImplementation(async () => ({
    channelId: `chan-${++n}`,
    expiry: "2026-10-07T00:00:00+05:30",
  }));
  (unsubscribeZohoWebhook as unknown as Mock).mockResolvedValue(undefined);
  (getValidZohoAccessToken as unknown as Mock).mockResolvedValue("fresh-access");
  (refreshZohoToken as unknown as Mock).mockResolvedValue({
    access_token: "refreshed",
    expires_in: 3600,
  });
});

describe("connectZoho", () => {
  test("saves the grant and registers a channel per product at the shared receiver", async () => {
    await connectZoho(ORG, tokens());

    const created = integration.upsert.mock.calls[0][0].create;
    expect(created).toMatchObject({ orgId: ORG, name: "zoho", active: true });
    expect(created.credential).toMatchObject({
      access_token: "access-1",
      refresh_token: "refresh-1",
      supportedProducts: { crm: true, bigin: true },
    });

    expect(registerZohoWebhook).toHaveBeenCalledTimes(2);
    for (const [call] of (registerZohoWebhook as unknown as Mock).mock.calls) {
      expect(call.notifyUrl).toBe("https://api.test/api/public/integrations/webhooks/zoho/int-1");
      expect(call.zohoWebhookSecret).toBe(created.credential.zohoWebhookSecret);
    }
    expect(saved()).toMatchObject({
      crmWebhook: { channelId: "chan-1", product: "crm" },
      biginWebhook: { channelId: "chan-2", product: "bigin" },
      isWebhookRegistered: true,
    });
  });

  test("registers only the products the grant covers", async () => {
    await connectZoho(ORG, tokens({ scope: "ZohoBigin.modules.ALL" }));

    expect(registerZohoWebhook).toHaveBeenCalledOnce();
    expect((registerZohoWebhook as unknown as Mock).mock.calls[0][0].product).toBe("bigin");
  });

  // Zoho answers a spent or wrong code with a 200 and an `error` field.
  test("refuses a token response with no access token", async () => {
    await expect(
      connectZoho(ORG, tokens({ accessToken: "", raw: { error: "invalid_code" } })),
    ).rejects.toThrow(OAuthConnectError);
    expect(integration.upsert).not.toHaveBeenCalled();
  });

  test("refuses a grant with no refresh token", async () => {
    await expect(connectZoho(ORG, tokens({ refreshToken: undefined }))).rejects.toThrow(
      OAuthConnectError,
    );
  });

  test("a reconnect keeps the org's settings and replaces its channels", async () => {
    integration.findUnique.mockResolvedValue({
      id: "int-1",
      credential: {
        triggerSubscriptions: [{ subscribed_field: "lead_created", active: true }],
        crm: { leadLifecycleMappings: [{ stageId: "s-1", zohoLeadStatus: "New" }] },
        crmWebhook: { channelId: "old-crm", product: "crm" },
      },
    });

    await connectZoho(ORG, tokens({ scope: "ZohoCRM.modules.ALL" }));

    const update = integration.upsert.mock.calls[0][0].update;
    expect(update.credential.triggerSubscriptions).toEqual([
      { subscribed_field: "lead_created", active: true },
    ]);
    expect(update.credential.crm.leadLifecycleMappings).toHaveLength(1);
    expect(update).toMatchObject({ active: true, consecutiveFailures: 0, lastError: null });
    expect((unsubscribeZohoWebhook as unknown as Mock).mock.calls[0][0].channelIds).toEqual([
      "old-crm",
    ]);
    expect(saved().crmWebhook.channelId).toBe("chan-1");
  });

  test("still connects when a channel fails to register, and says so", async () => {
    (registerZohoWebhook as unknown as Mock).mockRejectedValueOnce(new Error("zoho down"));

    await connectZoho(ORG, tokens());

    expect(saved().isWebhookRegistered).toBe(false);
    expect(saved().biginWebhook.channelId).toBe("chan-1");
  });
});

describe("disconnectZoho", () => {
  const row = {
    id: "int-1",
    credential: {
      access_token: "stale",
      refresh_token: "refresh-1",
      api_domain: "https://www.zohoapis.in",
      crmWebhook: { channelId: "chan-crm" },
      biginWebhook: { channelId: "chan-bigin" },
    },
  } as any;

  test("unsubscribes both channels with a fresh token, then revokes the grant", async () => {
    await disconnectZoho(row);

    const calls = (unsubscribeZohoWebhook as unknown as Mock).mock.calls.map((c) => c[0]);
    expect(calls.map((c) => [c.product, c.channelIds, c.accessToken])).toEqual([
      ["crm", ["chan-crm"], "fresh-access"],
      ["bigin", ["chan-bigin"], "fresh-access"],
    ]);
    expect(revokeZohoToken).toHaveBeenCalledWith("refresh-1");
  });

  // It runs before the row is deleted, and a remote that is already gone must
  // not stop the org disconnecting.
  test("carries on through every failure", async () => {
    (getValidZohoAccessToken as unknown as Mock).mockRejectedValueOnce(new Error("revoked"));
    (unsubscribeZohoWebhook as unknown as Mock).mockRejectedValue(new Error("zoho down"));
    (revokeZohoToken as unknown as Mock).mockRejectedValueOnce(new Error("revoke failed"));

    await expect(disconnectZoho(row)).resolves.toBeUndefined();
    expect(unsubscribeZohoWebhook).toHaveBeenCalledTimes(2);
    expect((unsubscribeZohoWebhook as unknown as Mock).mock.calls[0][0].accessToken).toBe("stale");
    expect(revokeZohoToken).toHaveBeenCalled();
  });
});

describe("refreshZohoIntegrationCredential", () => {
  const row = (credential: Record<string, unknown> = {}) =>
    ({
      id: "int-1",
      credential: {
        refresh_token: "refresh-1",
        api_domain: "https://www.zohoapis.in",
        supportedProducts: { crm: true },
        zohoWebhookSecret: "secret",
        crmWebhook: { channelId: "old-crm", product: "crm" },
        ...credential,
      },
    }) as any;

  test("saves the new token and moves the channel to the shared receiver", async () => {
    await refreshZohoIntegrationCredential(row());

    expect((registerZohoWebhook as unknown as Mock).mock.calls[0][0]).toMatchObject({
      accessToken: "refreshed",
      notifyUrl: "https://api.test/api/public/integrations/webhooks/zoho/int-1",
    });
    expect(saved()).toMatchObject({
      access_token: "refreshed",
      crmWebhook: { channelId: "chan-1" },
    });
  });

  // Zoho refuses to unsubscribe an expired channel; that must not stop the
  // new one registering, or an expired webhook could never come back.
  test("re-registers even when unsubscribing the old channel fails", async () => {
    (unsubscribeZohoWebhook as unknown as Mock).mockRejectedValueOnce(new Error("expired"));

    await refreshZohoIntegrationCredential(row());

    expect(registerZohoWebhook).toHaveBeenCalledOnce();
    expect(saved().crmWebhook.channelId).toBe("chan-1");
  });

  test("registers nothing without a webhook secret", async () => {
    await refreshZohoIntegrationCredential(row({ zohoWebhookSecret: undefined }));

    expect(registerZohoWebhook).not.toHaveBeenCalled();
    expect(saved().crmWebhook.channelId).toBe("old-crm");
  });
});

describe("zohoScopesFor", () => {
  test("asks for both products when the page names none", () => {
    expect(zohoScopesFor({})).toEqual(ZOHO_SCOPES);
  });

  test("asks only for the picked product", () => {
    const scopes = zohoScopesFor({ products: "bigin" });
    expect(scopes.every((scope) => scope.startsWith("ZohoBigin."))).toBe(true);
    expect(scopes).toHaveLength(4);
  });

  test("takes a list", () => {
    expect(zohoScopesFor({ products: "crm,bigin" })).toEqual(ZOHO_SCOPES);
  });

  test("refuses a product it does not know", () => {
    expect(() => zohoScopesFor({ products: "desk" })).toThrow(OAuthConnectError);
  });
});
