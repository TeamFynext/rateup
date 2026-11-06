import { randomBytes } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

// Pipedrive behind axios: `create` for the company API, `post` for the OAuth server.
const pipedrive = vi.hoisted(() => ({
  me: {
    id: 7,
    name: "Sam",
    email: "sam@acme.test",
    company_id: 9100,
    company_name: "Acme",
    company_domain: "acme",
  },
  get: vi.fn(),
  post: vi.fn(),
  create: vi.fn(),
}));
vi.mock("./pipedrive.webhooks.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./pipedrive.webhooks.js")>()),
  syncPipedriveWebhooks: vi.fn(),
  removePipedriveWebhooks: vi.fn(),
}));
vi.mock("axios", () => {
  const axios = {
    post: pipedrive.post,
    create: pipedrive.create,
    isAxiosError: (error: unknown) => (error as { isAxiosError?: boolean })?.isAxiosError === true,
  };
  return { default: axios, ...axios };
});

import prisma from "../../../utils/prisma.js";
import { getIntegrationProvider } from "../providers/registry.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { getPipedriveAccessToken, isPipedriveApiDomain } from "./pipedrive.client.js";
import { removePipedriveWebhooks, syncPipedriveWebhooks } from "./pipedrive.webhooks.js";
import {
  connectPipedrive,
  disconnectPipedrive,
  getPipedriveStatus,
  updatePipedriveSettings,
} from "./pipedrive.connect.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma.integration as unknown as Record<string, Mock>;

const API_DOMAIN = "https://acme.pipedrive.com";

const tokens = (raw: Record<string, unknown> = { api_domain: API_DOMAIN }) => ({
  accessToken: "at-new",
  refreshToken: "rt-new",
  expiresAt: "2026-10-07T12:00:00.000Z",
  raw,
});

const credential = (over: Record<string, unknown> = {}) => ({
  access_token: "at-old",
  refresh_token: "rt-old",
  expires_at: "2026-10-07T11:00:00.000Z",
  apiDomain: API_DOMAIN,
  companyId: 9100,
  companyName: "Acme",
  connectedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

beforeAll(() => {
  process.env.INTEGRATION_SECRET_KEY = randomBytes(32).toString("base64");
  process.env.PIPEDRIVE_CLIENT_ID = "client-id";
  process.env.PIPEDRIVE_CLIENT_SECRET = "client-secret";
});

beforeEach(() => {
  vi.clearAllMocks();
  pipedrive.get.mockResolvedValue({ data: { data: pipedrive.me } });
  pipedrive.create.mockImplementation(() => ({ get: pipedrive.get }));
  pipedrive.post.mockResolvedValue({ data: {} });
  db.findFirst.mockResolvedValue(null);
  db.findUnique.mockResolvedValue(null);
  db.upsert.mockResolvedValue({ id: "int-1" });
  (syncPipedriveWebhooks as unknown as Mock).mockResolvedValue([]);
  (removePipedriveWebhooks as unknown as Mock).mockResolvedValue(undefined);
});

describe("the company address", () => {
  test.each([
    ["https://acme.pipedrive.com", true],
    ["https://acme.pipedrive.com/", true],
    ["http://acme.pipedrive.com", false],
    ["https://acme.pipedrive.com.evil.test", false],
    ["https://evil.test/acme.pipedrive.com", false],
    ["https://acme.pipedrive.com:8443", false],
    [42, false],
  ])("%s is %s", (value, expected) => {
    expect(isPipedriveApiDomain(value)).toBe(expected);
  });
});

describe("connecting a Pipedrive company", () => {
  test("keeps the tokens with the company's address, id and name", async () => {
    await connectPipedrive("org-1", tokens());

    expect(pipedrive.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: `${API_DOMAIN}/api` }),
    );
    expect(pipedrive.get).toHaveBeenCalledWith("/v1/users/me");
    const { create } = db.upsert.mock.calls[0][0];
    expect(create).toMatchObject({ orgId: "org-1", name: "pipedrive", active: true });
    expect(create.credential).toMatchObject({
      access_token: "at-new",
      refresh_token: "rt-new",
      apiDomain: API_DOMAIN,
      companyId: 9100,
      companyName: "Acme",
      companyDomain: "acme",
      connectedBy: "sam@acme.test",
    });
  });

  test("a new connection gets a webhook secret and its webhooks registered", async () => {
    await connectPipedrive("org-1", tokens());

    expect(db.upsert.mock.calls[0][0].create.credential.webhookSecret).toMatch(/^[\w-]{32}$/);
    expect(syncPipedriveWebhooks).toHaveBeenCalledWith({ id: "int-1" });
  });

  test("webhooks that will not register do not undo the connection", async () => {
    (syncPipedriveWebhooks as unknown as Mock).mockRejectedValue(new Error("403"));
    await expect(connectPipedrive("org-1", tokens())).resolves.toBeUndefined();
    expect(db.upsert).toHaveBeenCalledOnce();
  });

  test("refuses a token response without a Pipedrive company address", async () => {
    await expect(
      connectPipedrive("org-1", tokens({ api_domain: "https://evil.test" })),
    ).rejects.toBeInstanceOf(OAuthConnectError);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  test("refuses a company another workspace has connected", async () => {
    db.findFirst.mockResolvedValue({ id: "int-other", orgId: "org-2" });

    await expect(connectPipedrive("org-1", tokens())).rejects.toMatchObject({ statusCode: 409 });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  test("a reconnect to the same company keeps its settings", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      credential: credential({
        syncContacts: true,
        webhookSecret: "kept",
        webhooks: [{ id: 5, object: "person" }],
      }),
    });

    await connectPipedrive("org-1", tokens());

    expect(db.upsert.mock.calls[0][0].update.credential).toMatchObject({
      syncContacts: true,
      access_token: "at-new",
      webhookSecret: "kept",
      webhooks: [{ id: 5, object: "person" }],
    });
    expect(pipedrive.post).not.toHaveBeenCalled();
  });

  test("a reconnect to another company starts over and revokes the old grant", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      credential: credential({ companyId: 1, syncContacts: true }),
    });

    await connectPipedrive("org-1", tokens());

    expect(db.upsert.mock.calls[0][0].update.credential.syncContacts).toBeUndefined();
    expect(pipedrive.post).toHaveBeenCalledWith(
      "https://oauth.pipedrive.com/oauth/revoke",
      "token=rt-old&token_type_hint=refresh_token",
      expect.objectContaining({ auth: { username: "client-id", password: "client-secret" } }),
    );
  });
});

describe("tokens", () => {
  test("a fresh token is used as it is", async () => {
    const result = await getPipedriveAccessToken(
      { id: "int-1", credential: credential({ expires_at: "2026-10-07T11:00:00.000Z" }) },
      { now: Date.parse("2026-10-07T10:00:00.000Z") },
    );

    expect(result).toEqual({ accessToken: "at-old", apiDomain: API_DOMAIN });
    expect(pipedrive.post).not.toHaveBeenCalled();
  });

  test("a token near expiry is refreshed with Basic auth, keeping the newer refresh token", async () => {
    pipedrive.post.mockResolvedValue({
      data: {
        access_token: "at-2",
        refresh_token: "rt-2",
        expires_in: 3599,
        api_domain: API_DOMAIN,
      },
    });
    db.findUnique.mockResolvedValue({ credential: credential({ syncDeals: true }) });

    const result = await getPipedriveAccessToken(
      { id: "int-1", credential: credential() },
      { now: Date.parse("2026-10-07T10:58:00.000Z") },
    );

    expect(result.accessToken).toBe("at-2");
    const [url, , options] = pipedrive.post.mock.calls[0];
    expect(url).toBe("https://oauth.pipedrive.com/oauth/token");
    expect(options.auth).toEqual({ username: "client-id", password: "client-secret" });
    expect(db.update.mock.calls[0][0].data.credential).toMatchObject({
      access_token: "at-2",
      refresh_token: "rt-2",
      syncDeals: true,
    });
  });
});

describe("disconnecting and status", () => {
  test("disconnect revokes the grant, and a failed revoke does not stop it", async () => {
    pipedrive.post.mockRejectedValueOnce(new Error("network"));

    await expect(
      disconnectPipedrive({ id: "int-1", credential: credential() } as never),
    ).resolves.toBeUndefined();
    expect(pipedrive.post).toHaveBeenCalledOnce();
    expect(removePipedriveWebhooks).toHaveBeenCalledOnce();
  });

  test("the status shows the company, never the tokens", async () => {
    db.findUnique.mockResolvedValue({
      active: true,
      credential: credential(),
      consecutiveFailures: 0,
      lastError: null,
      lastErrorAt: null,
    });

    const status = await getPipedriveStatus("org-1");

    expect(status).toMatchObject({ connected: true, companyId: 9100, companyName: "Acme" });
    expect(JSON.stringify(status)).not.toContain("at-old");
    expect(JSON.stringify(status)).not.toContain("rt-old");
  });

  test("the contacts switch is off until turned on, and is saved with the credential", async () => {
    const row = {
      id: "int-1",
      active: true,
      credential: credential(),
      consecutiveFailures: 0,
      lastError: null,
      lastErrorAt: null,
    };
    db.findUnique.mockResolvedValue(row);
    expect(await getPipedriveStatus("org-1")).toMatchObject({ settings: { syncContacts: false } });

    await updatePipedriveSettings("org-1", { syncContacts: true });
    expect(db.update.mock.calls[0][0].data.credential).toMatchObject({
      syncContacts: true,
      refresh_token: "rt-old",
    });
  });

  test("picking another pipeline drops the old stage mapping", async () => {
    db.findUnique.mockResolvedValue({
      id: "int-1",
      active: true,
      credential: credential({
        dealPipelineId: 1,
        stageMappings: [{ stageId: "col-new", pipedriveStageId: 11 }],
      }),
    });

    await updatePipedriveSettings("org-1", { dealPipelineId: 2 });
    expect(db.update.mock.calls[0][0].data.credential).toMatchObject({
      dealPipelineId: 2,
      stageMappings: [],
    });
  });

  test("settings are refused without a connection", async () => {
    await expect(updatePipedriveSettings("org-1", { syncContacts: true })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test("Pipedrive is in the registry as an OAuth provider", () => {
    const provider = getIntegrationProvider("pipedrive");
    expect(provider?.oauth?.config.tokenAuth).toBe("basic");
    expect(provider?.oauth?.scopes).toEqual([]);
  });
});
