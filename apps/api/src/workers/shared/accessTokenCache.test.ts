import { describe, expect, it, vi } from "vite-plus/test";

const query = vi.fn();
vi.mock("../../utils/db.js", () => ({ default: { query } }));
vi.mock("./whatsapp/index.js", () => ({
  decryptAccessToken: vi.fn(async (token: string) => `decrypted:${token}`),
}));

const { createAccessTokenCache, resolveCampaignAccessToken } =
  await import("./accessTokenCache.js");

describe("createAccessTokenCache", () => {
  it("shares one lookup between concurrent jobs for the same number", async () => {
    const load = vi.fn(async () => "token");
    const cache = createAccessTokenCache(load);

    const tokens = await Promise.all(Array.from({ length: 50 }, () => cache.get("org", "phone")));

    expect(new Set(tokens)).toEqual(new Set(["token"]));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("looks again once the entry expires, so a new token is picked up", async () => {
    let clock = 0;
    const load = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    const cache = createAccessTokenCache(load, 1_000, () => clock);

    expect(await cache.get("org", "phone")).toBe("old");
    clock = 999;
    expect(await cache.get("org", "phone")).toBe("old");
    clock = 1_000;
    expect(await cache.get("org", "phone")).toBe("new");
  });

  it("keeps numbers apart", async () => {
    const load = vi.fn(async (_org: string, phoneId: string) => `token-${phoneId}`);
    const cache = createAccessTokenCache(load);

    expect(await cache.get("org", "a")).toBe("token-a");
    expect(await cache.get("org", "b")).toBe("token-b");
  });

  it("does not cache a failed lookup", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValue("token");
    const cache = createAccessTokenCache(load);

    await expect(cache.get("org", "phone")).rejects.toThrow("db down");
    expect(await cache.get("org", "phone")).toBe("token");
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("resolveCampaignAccessToken", () => {
  it("decrypts the settings row for the org's number", async () => {
    query.mockResolvedValueOnce({ rows: [{ accessToken: "enc", accessToken_iv: "iv" }] });

    expect(await resolveCampaignAccessToken("org-1", "phone-1")).toBe("decrypted:enc");
    expect(query.mock.calls[0][1]).toEqual(["phone-1", "org-1"]);
  });

  it("is null when the org has no settings row for the number", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await resolveCampaignAccessToken("org-1", "phone-2")).toBeNull();
  });
});
