import { randomBytes } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

// HubSpot's OAuth endpoints, behind axios.
const hubspot = vi.hoisted(() => ({
  tokenInfo: { hub_id: 4401, hub_domain: "acme.hubspot.com", user: "sam@acme.test" },
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("axios", () => {
  const axios = {
    get: hubspot.get,
    post: hubspot.post,
    delete: hubspot.delete,
    create: vi.fn(() => ({})),
    isAxiosError: (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
  };
  return { default: axios, ...axios };
});

import prisma from "../../../utils/prisma.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { getHubSpotAccessToken, HUBSPOT_SCOPES } from "./hubspot.auth.js";
import { connectHubSpot, disconnectHubSpot, getHubSpotStatus } from "./hubspot.connect.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma.integration as unknown as Record<string, Mock>;

const tokens = {
  accessToken: "at-new",
  refreshToken: "rt-new",
  expiresAt: "2026-09-28T12:30:00.000Z",
  raw: {},
};

const credential = (over: Record<string, unknown> = {}) => ({
  access_token: "at-old",
  refresh_token: "rt-old",
  expires_at: "2026-09-28T12:00:00.000Z",
  portalId: 4401,
  hubDomain: "acme.hubspot.com",
  connectedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

beforeAll(() => {
  process.env.INTEGRATION_SECRET_KEY = randomBytes(32).toString("base64");
  process.env.HUBSPOT_CLIENT_ID = "client-id";
  process.env.HUBSPOT_CLIENT_SECRET = "client-secret";
});

beforeEach(() => {
  vi.clearAllMocks();
  hubspot.get.mockImplementation(async () => ({ data: hubspot.tokenInfo }));
  hubspot.delete.mockResolvedValue({ data: {} });
  db.findFirst.mockResolvedValue(null);
  db.findUnique.mockResolvedValue(null);
});

describe("connecting a HubSpot account", () => {
  test("keeps the tokens with the account's id and domain", async () => {
    await connectHubSpot("org-1", tokens);

    expect(hubspot.get).toHaveBeenCalledWith(
      "https://api.hubapi.com/oauth/v1/access-tokens/at-new",
      expect.anything(),
    );
    expect(db.upsert.mock.calls[0][0].create).toMatchObject({
      orgId: "org-1",
      name: "hubspot",
      active: true,
      credential: {
        access_token: "at-new",
        refresh_token: "rt-new",
        expires_at: "2026-09-28T12:30:00.000Z",
        portalId: 4401,
        hubDomain: "acme.hubspot.com",
        connectedBy: "sam@acme.test",
      },
    });
  });

  test("an account already connected to another workspace is refused", async () => {
    db.findFirst.mockResolvedValue({ id: "int-9", orgId: "org-2" });

    const connecting = connectHubSpot("org-1", tokens);
    await expect(connecting).rejects.toThrow(OAuthConnectError);
    await expect(connecting).rejects.toMatchObject({ statusCode: 409 });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  test("reconnecting the same account keeps its settings and the old grant", async () => {
    db.findUnique.mockResolvedValue({ id: "int-1", credential: credential({ syncSetting: true }) });

    await connectHubSpot("org-1", tokens);

    expect(db.upsert.mock.calls[0][0].update.credential).toMatchObject({
      syncSetting: true,
      access_token: "at-new",
    });
    expect(hubspot.delete).not.toHaveBeenCalled();
  });

  test("switching to another account starts over, and revokes the old account's grant", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      credential: credential({ portalId: 1111, syncSetting: true }),
    });

    await connectHubSpot("org-1", tokens);

    expect(db.upsert.mock.calls[0][0].update.credential).not.toHaveProperty("syncSetting");
    expect(hubspot.delete).toHaveBeenCalledWith(
      "https://api.hubapi.com/oauth/v1/refresh-tokens/rt-old",
      expect.anything(),
    );
  });

  test("a token response with no refresh token is refused", async () => {
    await expect(connectHubSpot("org-1", { ...tokens, refreshToken: undefined })).rejects.toThrow(
      OAuthConnectError,
    );
  });
});

describe("access tokens", () => {
  const now = new Date("2026-09-28T11:00:00.000Z").getTime();

  test("a token with time left is used as it is", async () => {
    await expect(
      getHubSpotAccessToken({ id: "int-1", credential: credential() }, { now }),
    ).resolves.toBe("at-old");
    expect(hubspot.post).not.toHaveBeenCalled();
  });

  test("a token about to expire is refreshed, keeping the rest of the credential", async () => {
    hubspot.post.mockResolvedValue({ data: { access_token: "at-fresh", expires_in: 1800 } });
    db.findUnique.mockResolvedValue({ credential: credential({ laterSetting: "kept" }) });
    const nearExpiry = new Date("2026-09-28T11:58:00.000Z").getTime();

    await expect(
      getHubSpotAccessToken({ id: "int-1", credential: credential() }, { now: nearExpiry }),
    ).resolves.toBe("at-fresh");

    expect(hubspot.post).toHaveBeenCalledWith(
      "https://api.hubapi.com/oauth/v1/token",
      expect.any(URLSearchParams),
      expect.anything(),
    );
    const body = hubspot.post.mock.calls[0][1] as URLSearchParams;
    expect(Object.fromEntries(body)).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "rt-old",
      client_id: "client-id",
      client_secret: "client-secret",
    });
    expect(db.update.mock.calls[0][0].data.credential).toMatchObject({
      access_token: "at-fresh",
      refresh_token: "rt-old",
      laterSetting: "kept",
    });
  });
});

describe("the connection, as the settings page sees it", () => {
  test("names the account and never carries a token", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      active: true,
      consecutiveFailures: 0,
      lastError: null,
      lastErrorAt: null,
      credential: credential({ connectedBy: "sam@acme.test" }),
    });

    const status = await getHubSpotStatus("org-1");

    expect(status).toMatchObject({
      connected: true,
      portalId: 4401,
      hubDomain: "acme.hubspot.com",
      connectedBy: "sam@acme.test",
    });
    expect(JSON.stringify(status)).not.toMatch(/at-old|rt-old/);
  });

  test("disconnecting revokes the grant, and a failure there does not stop it", async () => {
    await disconnectHubSpot({ id: "int-1", credential: credential() } as never);
    expect(hubspot.delete).toHaveBeenCalledWith(
      "https://api.hubapi.com/oauth/v1/refresh-tokens/rt-old",
      expect.anything(),
    );

    hubspot.delete.mockRejectedValueOnce(new Error("down"));
    await expect(
      disconnectHubSpot({ id: "int-1", credential: credential() } as never),
    ).resolves.toBeUndefined();
  });
});

describe("in the registry", () => {
  test("connects through the shared OAuth flow with HubSpot's scopes", () => {
    const provider = getIntegrationProvider("hubspot");
    expect(provider?.auth).toBe("oauth2");
    expect(provider?.oauth?.scopes).toEqual(HUBSPOT_SCOPES);
    expect(provider?.oauth?.config.clientId).toBe("client-id");
    expect(provider?.oauth?.config.tokenAuth).toBe("form");
  });
});
