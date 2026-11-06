import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn(), debug: vi.fn() },
}));

const { auth, redis } = vi.hoisted(() => ({
  auth: { refreshToken: vi.fn(), migrateToExpiringToken: vi.fn() },
  redis: { set: vi.fn(), exists: vi.fn(), eval: vi.fn() },
}));
vi.mock("./shopify.config.js", () => ({ default: { auth } }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: redis }));

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    $executeRaw: vi.fn(),
  },
}));

import { HttpResponseError, Session } from "@shopify/shopify-api";
import prisma from "../../../utils/prisma.js";
import {
  getActiveShopifySession,
  refreshShopifyCredential,
  ShopifyReauthRequiredError,
  type StoredShopifySession,
  toStoredSession,
} from "./shopify.session.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  integration: { findUnique: Mock; findMany: Mock; update: Mock };
  $executeRaw: Mock;
};

const SHOP = "demo.myshopify.com";
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

const stored = (over: Partial<StoredShopifySession> = {}): StoredShopifySession => ({
  id: `offline_${SHOP}`,
  shop: SHOP,
  state: "",
  isOnline: false,
  accessToken: "shpat_current",
  scope: "read_orders",
  expires: new Date(Date.now() + HOUR).toISOString(),
  refreshToken: "shprt_current",
  refreshTokenExpires: new Date(Date.now() + 90 * DAY).toISOString(),
  ...over,
});

const holder = (session: StoredShopifySession) => ({ id: "int-1", credential: { session } });

const renewedSession = () =>
  new Session({
    id: `offline_${SHOP}`,
    shop: SHOP,
    state: "",
    isOnline: false,
    accessToken: "shpat_new",
    scope: "read_orders",
    expires: new Date(Date.now() + HOUR),
    refreshToken: "shprt_new",
    refreshTokenExpires: new Date(Date.now() + 90 * DAY),
  });

beforeEach(() => {
  vi.clearAllMocks();
  redis.set.mockResolvedValue("OK");
  redis.exists.mockResolvedValue(0);
  redis.eval.mockResolvedValue(1);
});

describe("getActiveShopifySession", () => {
  test("uses a fresh token as is, without locking or calling Shopify", async () => {
    const session = await getActiveShopifySession(holder(stored()));

    expect(session.accessToken).toBe("shpat_current");
    expect(redis.set).not.toHaveBeenCalled();
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });

  test("refreshes a token inside the expiry margin and persists only the session", async () => {
    const expiring = stored({ expires: new Date(Date.now() + 60_000).toISOString() });
    db.integration.findUnique.mockResolvedValue({ credential: { session: expiring } });
    auth.refreshToken.mockResolvedValue({ session: renewedSession() });
    const integration = holder(expiring);

    const session = await getActiveShopifySession(integration);

    expect(auth.refreshToken).toHaveBeenCalledWith({ shop: SHOP, refreshToken: "shprt_current" });
    expect(session.accessToken).toBe("shpat_new");
    // The caller's object follows the rotation, so a later read can't hand back the retired pair.
    expect(integration.credential.session.refreshToken).toBe("shprt_new");
    const sql = (db.$executeRaw.mock.calls[0][0] as string[]).join("?");
    expect(sql).toContain("jsonb_set(credential, '{session}'");
    expect(redis.eval).toHaveBeenCalled();
  });

  test("refreshes a refresh token that is about to lapse even when the access token is fresh", async () => {
    const aging = stored({ refreshTokenExpires: new Date(Date.now() + 3 * DAY).toISOString() });
    db.integration.findUnique.mockResolvedValue({ credential: { session: aging } });
    auth.refreshToken.mockResolvedValue({ session: renewedSession() });

    await getActiveShopifySession(holder(aging));

    expect(auth.refreshToken).toHaveBeenCalled();
  });

  test("skips the exchange when another worker renewed the token first", async () => {
    const expiring = stored({ expires: new Date(Date.now() + 60_000).toISOString() });
    db.integration.findUnique.mockResolvedValue({
      credential: { session: toStoredSession(renewedSession()) },
    });

    const session = await getActiveShopifySession(holder(expiring));

    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(session.accessToken).toBe("shpat_new");
  });

  test("cycles a legacy non-expiring token once and persists the pair", async () => {
    const legacy = stored({
      expires: undefined,
      refreshToken: undefined,
      refreshTokenExpires: undefined,
    });
    db.integration.findUnique.mockResolvedValue({ credential: { session: legacy } });
    auth.migrateToExpiringToken.mockResolvedValue({ session: renewedSession() });

    const session = await getActiveShopifySession(holder(legacy));

    expect(auth.migrateToExpiringToken).toHaveBeenCalledWith({
      shop: SHOP,
      nonExpiringOfflineAccessToken: "shpat_current",
    });
    expect(session.refreshToken).toBe("shprt_new");
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  test("keeps using a legacy token when its cycle fails, and backs off", async () => {
    const legacy = stored({
      expires: undefined,
      refreshToken: undefined,
      refreshTokenExpires: undefined,
    });
    db.integration.findUnique.mockResolvedValue({ credential: { session: legacy } });
    auth.migrateToExpiringToken.mockRejectedValue(new Error("network down"));

    const session = await getActiveShopifySession(holder(legacy));

    expect(session.accessToken).toBe("shpat_current");
    expect(redis.set).toHaveBeenCalledWith(`shopify:token-cycle-failed:${SHOP}`, "1", "EX", 3600);
  });

  test("does not retry a legacy cycle while backing off", async () => {
    const legacy = stored({
      expires: undefined,
      refreshToken: undefined,
      refreshTokenExpires: undefined,
    });
    redis.exists.mockResolvedValue(1);

    const session = await getActiveShopifySession(holder(legacy));

    expect(session.accessToken).toBe("shpat_current");
    expect(redis.set).not.toHaveBeenCalled();
    expect(auth.migrateToExpiringToken).not.toHaveBeenCalled();
  });

  test("a rejected refresh token deactivates the integration and asks for reauthorization", async () => {
    const expired = stored({ expires: new Date(Date.now() - 60_000).toISOString() });
    db.integration.findUnique.mockResolvedValue({ credential: { session: expired } });
    auth.refreshToken.mockRejectedValue(
      new HttpResponseError({ message: "invalid_request", code: 401, statusText: "Unauthorized" }),
    );

    await expect(getActiveShopifySession(holder(expired))).rejects.toBeInstanceOf(
      ShopifyReauthRequiredError,
    );
    expect(db.integration.update).toHaveBeenCalledWith({
      where: { id: "int-1" },
      data: { active: false },
    });
  });

  test("a transient refresh failure falls back to a still-valid access token", async () => {
    const expiring = stored({ expires: new Date(Date.now() + 60_000).toISOString() });
    db.integration.findUnique.mockResolvedValue({ credential: { session: expiring } });
    auth.refreshToken.mockRejectedValue(
      new HttpResponseError({ message: "busy", code: 503, statusText: "Service Unavailable" }),
    );

    const session = await getActiveShopifySession(holder(expiring));

    expect(session.accessToken).toBe("shpat_current");
    expect(db.integration.update).not.toHaveBeenCalled();
  });

  test("waits for the lock holder's refresh instead of refreshing concurrently", async () => {
    const expiring = stored({ expires: new Date(Date.now() + 60_000).toISOString() });
    redis.set.mockResolvedValue(null);
    db.integration.findUnique
      .mockResolvedValueOnce({ credential: { session: expiring } })
      .mockResolvedValue({ credential: { session: toStoredSession(renewedSession()) } });

    const session = await getActiveShopifySession(holder(expiring));

    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(session.accessToken).toBe("shpat_new");
  });
});

describe("refreshShopifyCredential", () => {
  test("leaves a merely expired access token for the next API call to renew", async () => {
    // The sweep runs every 45 minutes; renewing an idle shop's hour-long token
    // here would exchange every shop's tokens around the clock.
    const idle = stored({ expires: new Date(Date.now() - HOUR).toISOString() });

    await refreshShopifyCredential(holder(idle));

    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("renews a refresh token that is about to lapse", async () => {
    const aging = stored({ refreshTokenExpires: new Date(Date.now() + 3 * DAY).toISOString() });
    db.integration.findUnique.mockResolvedValue({ credential: { session: aging } });
    auth.refreshToken.mockResolvedValue({ session: renewedSession() });

    await refreshShopifyCredential(holder(aging));

    expect(auth.refreshToken).toHaveBeenCalledWith({ shop: SHOP, refreshToken: "shprt_current" });
  });

  test("cycles a legacy non-expiring token", async () => {
    const legacy = stored({
      expires: undefined,
      refreshToken: undefined,
      refreshTokenExpires: undefined,
    });
    db.integration.findUnique.mockResolvedValue({ credential: { session: legacy } });
    auth.migrateToExpiringToken.mockResolvedValue({ session: renewedSession() });

    await refreshShopifyCredential(holder(legacy));

    expect(auth.migrateToExpiringToken).toHaveBeenCalled();
  });

  test("throws when the refresh token is rejected, so the sweep records the failure", async () => {
    const aging = stored({
      expires: new Date(Date.now() - HOUR).toISOString(),
      refreshTokenExpires: new Date(Date.now() + 3 * DAY).toISOString(),
    });
    db.integration.findUnique.mockResolvedValue({ credential: { session: aging } });
    auth.refreshToken.mockRejectedValue(
      new HttpResponseError({ message: "401", code: 401, statusText: "Unauthorized" }),
    );

    await expect(refreshShopifyCredential(holder(aging))).rejects.toBeInstanceOf(
      ShopifyReauthRequiredError,
    );
  });
});
