import { randomBytes } from "node:crypto";

import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { leadActivity: { findMany: vi.fn(async () => []) } },
}));
vi.mock("../../../config.js", () => ({
  appConfig: { frontendUrl: "https://app.test.example" },
}));
vi.mock("axios", () => ({ default: { post: vi.fn() } }));

import axios from "axios";

import prisma from "../../../utils/prisma.js";
import { listIntegrationActivity } from "../external/integrationActivity.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { signOAuthState } from "./oauth2.js";
import {
  finishOAuthConnect,
  OAuthConnectError,
  oauthRedirectUri,
  startOAuthConnect,
} from "./oauthConnect.js";

type Mock = ReturnType<typeof vi.fn>;

beforeAll(() => {
  process.env.INTEGRATION_SECRET_KEY = randomBytes(32).toString("base64");
});

const connect = vi.fn();

function provider(over: Partial<IntegrationProvider["oauth"]> = {}): IntegrationProvider {
  return {
    name: "hubspot" as never,
    label: "HubSpot",
    auth: "oauth2",
    connection: "integration",
    events: [],
    subscribedEvents: () => [],
    handleEvent: vi.fn(),
    oauth: {
      config: {
        authorizeUrl: "https://auth.example.com/authorize",
        tokenUrl: "https://auth.example.com/token",
        clientId: "client-1",
        clientSecret: "secret-1",
        tokenAuth: "form",
      },
      scopes: ["contacts", "deals"],
      connect,
      ...over,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("starting an OAuth connect", () => {
  test("sends the user to the provider, back to the generic callback, with signed state", () => {
    const url = new URL(startOAuthConnect(provider(), "hubspot", "org-1", "user-1"));

    expect(url.origin + url.pathname).toBe("https://auth.example.com/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("scope")).toBe("contacts deals");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.test.example/dashboard/settings/integrations/hubspot/callback",
    );
    expect(url.searchParams.get("state")).toMatch(/^[\w-]+\.[\w-]+$/);
  });

  test("a provider without OAuth is a 404, not a broken consent screen", () => {
    const { oauth: _, ...apiKeyProvider } = provider();

    expect(() => startOAuthConnect(apiKeyProvider, "getlead", "org-1")).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
    expect(() => startOAuthConnect(undefined, "nope", "org-1")).toThrow(OAuthConnectError);
  });

  test("an environment with no client id says so instead of redirecting", () => {
    const p = provider();
    p.oauth!.config.clientId = undefined;

    expect(() => startOAuthConnect(p, "hubspot", "org-1")).toThrow(/not configured/);
  });
});

describe("finishing an OAuth connect", () => {
  beforeEach(() => {
    (axios.post as Mock).mockResolvedValue({
      data: { access_token: "at-1", refresh_token: "rt-1", expires_in: 1800 },
    });
  });

  test("exchanges the code against the same redirect URI and hands the tokens over", async () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot" });

    await finishOAuthConnect(provider(), "hubspot", "org-1", { code: "c-1", state });

    const [tokenUrl, body] = (axios.post as Mock).mock.calls[0];
    expect(tokenUrl).toBe("https://auth.example.com/token");
    expect(String(body)).toContain(
      `redirect_uri=${encodeURIComponent(oauthRedirectUri("hubspot"))}`,
    );
    expect(connect).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ accessToken: "at-1", refreshToken: "rt-1" }),
    );
  });

  test("a code started by one org cannot be finished into another", async () => {
    const state = signOAuthState({ orgId: "org-attacker", provider: "hubspot" });

    await expect(
      finishOAuthConnect(provider(), "hubspot", "org-1", { code: "c-1", state }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(axios.post).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  test("state minted for another provider is refused", async () => {
    const state = signOAuthState({ orgId: "org-1", provider: "zoho" });

    await expect(
      finishOAuthConnect(provider(), "hubspot", "org-1", { code: "c-1", state }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test("tampered state is refused", async () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot" }).replace(/.$/, "x");

    await expect(
      finishOAuthConnect(provider(), "hubspot", "org-1", { code: "c-1", state: `${state}x` }),
    ).rejects.toBeInstanceOf(OAuthConnectError);
  });
});

describe("the Sync activity feed", () => {
  test("reads one provider's entries on this org's leads, recent first", async () => {
    await listIntegrationActivity("org-1", "zoho");

    const args = (prisma.leadActivity.findMany as Mock).mock.calls[0][0];
    expect(args.where.lead).toEqual({ pipeline: { orgId: "org-1" } });
    expect(args.where.type.in).toEqual([
      "INTEGRATION_SYNCED",
      "INTEGRATION_SKIPPED",
      "INTEGRATION_RECEIVED",
    ]);
    expect(args.where.OR).toEqual([
      { details: { path: ["integrationName"], equals: "Zoho CRM" } },
      { details: { path: ["integrationName"], equals: "Zoho Bigin" } },
    ]);
    expect(args.where.createdAt.gte).toBeInstanceOf(Date);
    expect(args.orderBy).toEqual({ createdAt: "desc" });
  });

  test("a provider that writes no entries costs no query", async () => {
    await expect(listIntegrationActivity("org-1", "shopify")).resolves.toEqual([]);
    expect(prisma.leadActivity.findMany).not.toHaveBeenCalled();
  });
});
