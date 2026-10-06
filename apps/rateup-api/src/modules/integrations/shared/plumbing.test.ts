import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    integrationEntityLink: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../notification/notify.js", () => ({ notify: vi.fn() }));
vi.mock("axios", () => ({ default: { post: vi.fn() } }));
// The real registry drags in every provider; these tests pass their own.
vi.mock("../providers/registry.js", () => ({
  INTEGRATION_PROVIDERS: [],
  getIntegrationProvider: vi.fn(),
}));

import axios from "axios";
import prisma from "../../../utils/prisma.js";
import { notify } from "../../notification/notify.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { refreshIntegrationCredentials } from "./credentialRefresh.js";
import { hashSyncPayload, isEchoOfLastSync, recordLink } from "./entityLink.js";
import { InboundWebhookRejected, receiveInboundWebhook } from "./inboundWebhook.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "./integrationHealth.js";
import {
  buildAuthorizeUrl,
  exchangeOAuthCode,
  refreshOAuthToken,
  type OAuth2Config,
} from "./oauth2.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ID = "3f1c2b8e-9a4d-4c1e-8f2a-1b2c3d4e5f60";
const row = (over: object = {}) => ({
  id: ID,
  orgId: "org-1",
  name: "hubspot",
  active: true,
  consecutiveFailures: 0,
  ...over,
});

function provider(over: Partial<IntegrationProvider> = {}): IntegrationProvider {
  return {
    name: "hubspot" as any,
    label: "HubSpot",
    auth: "oauth2",
    connection: "integration",
    events: [],
    subscribedEvents: () => [],
    handleEvent: vi.fn(),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("entity links", () => {
  test("the sync hash ignores key order and undefined fields", () => {
    expect(hashSyncPayload({ a: 1, b: { c: 2, d: undefined } })).toBe(
      hashSyncPayload({ b: { c: 2 }, a: 1 }),
    );
    expect(hashSyncPayload({ a: 1 })).not.toBe(hashSyncPayload({ a: 2 }));
  });

  test("recording a link upserts on the Rateup record with the pushed payload's hash", async () => {
    await recordLink(
      { integrationId: ID, entityType: "contact" },
      { rateupId: "c1", externalId: "ext-1", payload: { name: "Ann" } },
    );

    const call = db.integrationEntityLink.upsert.mock.calls[0][0];
    expect(call.where.integration_entity_rateup_unique).toEqual({
      integrationId: ID,
      entityType: "contact",
      rateupId: "c1",
    });
    expect(call.update).toMatchObject({
      externalId: "ext-1",
      lastSyncHash: hashSyncPayload({ name: "Ann" }),
    });
  });

  test("an inbound change carrying what we last pushed is our own echo", async () => {
    db.integrationEntityLink.findUnique.mockResolvedValue({
      lastSyncHash: hashSyncPayload({ name: "Ann" }),
    });
    const key = { integrationId: ID, entityType: "contact" };

    await expect(isEchoOfLastSync(key, "ext-1", { name: "Ann" })).resolves.toBe(true);
    await expect(isEchoOfLastSync(key, "ext-1", { name: "Anne" })).resolves.toBe(false);
  });

  test("a record never linked is never an echo", async () => {
    db.integrationEntityLink.findUnique.mockResolvedValue(null);

    await expect(
      isEchoOfLastSync({ integrationId: ID, entityType: "contact" }, "ext-1", {}),
    ).resolves.toBe(false);
  });
});

describe("integration health", () => {
  test("notifies once, on the failure that reaches the threshold", async () => {
    db.integration.update.mockResolvedValueOnce({ consecutiveFailures: 1 });
    await recordIntegrationFailure(row(), "HubSpot", new Error("401"), { notifyAfter: 2 });
    expect(notify).not.toHaveBeenCalled();

    db.integration.update.mockResolvedValueOnce({ consecutiveFailures: 2 });
    await recordIntegrationFailure(row(), "HubSpot", new Error("401"), { notifyAfter: 2 });
    expect(notify).toHaveBeenCalledWith({
      event: "integration.error",
      orgId: "org-1",
      audience: { kind: "permitted" },
      data: { integration: "HubSpot", error: "401" },
    });

    db.integration.update.mockResolvedValueOnce({ consecutiveFailures: 3 });
    await recordIntegrationFailure(row(), "HubSpot", new Error("401"), { notifyAfter: 2 });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test("never throws, even when the write fails", async () => {
    db.integration.update.mockRejectedValue(new Error("db down"));
    await expect(
      recordIntegrationFailure(row(), "HubSpot", new Error("x"), { notifyAfter: 1 }),
    ).resolves.toBeUndefined();
  });

  test("a success clears the streak, and costs nothing when there is none", async () => {
    await markIntegrationHealthy(row({ consecutiveFailures: 0 }));
    expect(db.integration.update).not.toHaveBeenCalled();

    await markIntegrationHealthy(row({ consecutiveFailures: 2 }));
    expect(db.integration.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { consecutiveFailures: 0, lastError: null, lastErrorAt: null },
    });
  });
});

describe("the credential refresh cron", () => {
  test("refreshes every active integration of every provider that can", async () => {
    const refreshCredential = vi.fn();
    db.integration.findMany.mockResolvedValue([row(), row({ id: "other" })]);

    await refreshIntegrationCredentials([
      provider({ refreshCredential }),
      provider({ name: "getlead" as any }),
    ]);

    expect(db.integration.findMany).toHaveBeenCalledTimes(1);
    expect(db.integration.findMany.mock.calls[0][0].where).toEqual({
      name: "hubspot",
      active: true,
    });
    expect(refreshCredential).toHaveBeenCalledTimes(2);
  });

  test("one org failing is recorded against it and the sweep carries on", async () => {
    const refreshCredential = vi.fn().mockRejectedValueOnce(new Error("invalid_grant"));
    db.integration.findMany.mockResolvedValue([row(), row({ id: "other" })]);
    db.integration.update.mockResolvedValue({ consecutiveFailures: 1 });

    await refreshIntegrationCredentials([provider({ refreshCredential })]);

    expect(refreshCredential).toHaveBeenCalledTimes(2);
    expect(db.integration.update.mock.calls[0][0]).toMatchObject({
      where: { id: ID },
      data: { lastError: "invalid_grant" },
    });
  });
});

describe("the inbound webhook receiver", () => {
  function reply() {
    const r = { code: vi.fn(), send: vi.fn() };
    r.code.mockReturnValue(r);
    r.send.mockReturnValue(r);
    return r;
  }
  const request = (params: object) => ({ params, headers: {}, body: {} }) as any;

  test("hands a delivery to the provider that owns the integration", async () => {
    const handleInbound = vi.fn();
    db.integration.findUnique.mockResolvedValue(row());
    const r = reply();

    await receiveInboundWebhook(request({ provider: "hubspot", integrationId: ID }), r as any, () =>
      provider({ handleInbound }),
    );

    expect(handleInbound).toHaveBeenCalledWith(
      expect.objectContaining({ id: ID }),
      expect.anything(),
    );
    expect(r.code).toHaveBeenCalledWith(200);
  });

  test("answers the same 404 for an unknown provider, id, or another provider's row", async () => {
    const withInbound = () => provider({ handleInbound: vi.fn() });

    for (const [params, found, lookup] of [
      [{ provider: "nope", integrationId: ID }, row(), () => undefined],
      [{ provider: "hubspot", integrationId: "not-a-uuid" }, row(), withInbound],
      [{ provider: "hubspot", integrationId: ID }, row({ name: "zoho" }), withInbound],
      [{ provider: "hubspot", integrationId: ID }, row({ active: false }), withInbound],
      [{ provider: "hubspot", integrationId: ID }, null, withInbound],
    ] as const) {
      db.integration.findUnique.mockResolvedValue(found);
      const r = reply();
      await receiveInboundWebhook(request(params), r as any, lookup as any);
      expect(r.code).toHaveBeenCalledWith(404);
    }
  });

  test("a delivery that fails verification is a 401", async () => {
    db.integration.findUnique.mockResolvedValue(row());
    const r = reply();

    await receiveInboundWebhook(request({ provider: "hubspot", integrationId: ID }), r as any, () =>
      provider({ handleInbound: vi.fn().mockRejectedValue(new InboundWebhookRejected("bad sig")) }),
    );

    expect(r.code).toHaveBeenCalledWith(401);
  });

  test("our own failure is a 500, so the provider retries", async () => {
    db.integration.findUnique.mockResolvedValue(row());
    const r = reply();

    await receiveInboundWebhook(request({ provider: "hubspot", integrationId: ID }), r as any, () =>
      provider({ handleInbound: vi.fn().mockRejectedValue(new Error("redis")) }),
    );

    expect(r.code).toHaveBeenCalledWith(500);
  });
});

describe("OAuth token requests", () => {
  const config = (tokenAuth: OAuth2Config["tokenAuth"]): OAuth2Config => ({
    authorizeUrl: "https://auth.example.com/authorize",
    tokenUrl: "https://auth.example.com/token",
    clientId: "cid",
    clientSecret: "csecret",
    tokenAuth,
  });

  test("the authorize URL carries the client, redirect, scopes and state", () => {
    const url = new URL(
      buildAuthorizeUrl(config("form"), {
        redirectUri: "https://app/cb",
        state: "st",
        scopes: ["a", "b"],
        extraParams: { access_type: "offline" },
      }),
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "cid",
      redirect_uri: "https://app/cb",
      scope: "a b",
      state: "st",
      access_type: "offline",
    });
  });

  test("query-style exchange sends what Zoho's inline call always sent", async () => {
    (axios.post as unknown as Mock).mockResolvedValue({
      data: { access_token: "at", refresh_token: "rt", expires_in: 3600, api_domain: "d" },
    });

    const tokens = await exchangeOAuthCode(config("query"), {
      code: "c",
      redirectUri: "https://app/cb",
    });

    expect(axios.post).toHaveBeenCalledWith("https://auth.example.com/token", null, {
      params: {
        grant_type: "authorization_code",
        client_id: "cid",
        client_secret: "csecret",
        redirect_uri: "https://app/cb",
        code: "c",
      },
    });
    expect(tokens).toMatchObject({ accessToken: "at", refreshToken: "rt" });
    expect(tokens.raw.api_domain).toBe("d");
    expect(Date.parse(tokens.expiresAt!)).toBeGreaterThan(Date.now());
  });

  test("query-style refresh sends what Zoho's inline refresh always sent", async () => {
    (axios.post as unknown as Mock).mockResolvedValue({
      data: { access_token: "at2", expires_in: 3600 },
    });

    await refreshOAuthToken(config("query"), "rt");

    expect(axios.post).toHaveBeenCalledWith("https://auth.example.com/token", null, {
      params: {
        refresh_token: "rt",
        client_id: "cid",
        client_secret: "csecret",
        grant_type: "refresh_token",
      },
    });
  });

  test("basic-style keeps the client secret out of the body", async () => {
    (axios.post as unknown as Mock).mockResolvedValue({ data: { access_token: "at" } });

    await refreshOAuthToken(config("basic"), "rt");

    const [, body, options] = (axios.post as unknown as Mock).mock.calls[0];
    expect(String(body)).not.toContain("csecret");
    expect(options.auth).toEqual({ username: "cid", password: "csecret" });
  });
});
