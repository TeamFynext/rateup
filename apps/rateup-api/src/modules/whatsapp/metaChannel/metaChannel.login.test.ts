import { beforeEach, describe, expect, test, vi } from "vitest";

// An in-memory Redis: enough to check what key a login is parked under.
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: {
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../settings/wa_settings.service.js", () => ({
  encryptInlineToken: vi.fn((value: string) => `enc(${value})`),
  decryptInlineToken: vi.fn((value: string | null) =>
    value ? value.replace(/^enc\((.*)\)$/, "$1") : value,
  ),
}));
vi.mock("./metaChannel.service.js", () => ({ getInstagramAccountProfile: vi.fn() }));

import redis from "../../../utils/redisConnection.js";
import { callMetaApi } from "../wa_axios.js";
import { getInstagramAccountProfile } from "./metaChannel.service.js";
import { listGrantedAccounts, readLogin, storeLogin } from "./metaChannel.login.js";

type Mock = ReturnType<typeof vi.fn>;

const meta = callMetaApi as unknown as Mock;
const profile = getInstagramAccountProfile as unknown as Mock;

const ORG = "org-1";

/** What /me/accounts answers: one Page with a linked Instagram account, one without. */
const PAGES = [
  {
    id: "page-1",
    name: "The Shop",
    access_token: "page-token-1",
    picture: { data: { url: "https://cdn/page-1.jpg" } },
    instagram_business_account: { id: "iba-1" },
  },
  {
    id: "page-2",
    name: "The Other Shop",
    access_token: "page-token-2",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  meta.mockResolvedValue({ data: { data: PAGES } });
  profile.mockImplementation(async (id: string) => ({
    id,
    username: "the_shop",
    name: "The Shop IG",
    profile_picture_url: "https://cdn/iba-1.jpg",
  }));
});

describe("listGrantedAccounts", () => {
  test("reads the login's Pages with their linked Instagram accounts", async () => {
    await listGrantedAccounts("FACEBOOK", "user-token");

    const [url, method, token] = meta.mock.calls[0];
    expect(url).toMatch(/^\/me\/accounts\?/);
    expect(url).toContain("instagram_business_account");
    expect(url).toContain("access_token");
    expect(method).toBe("GET");
    expect(token).toBe("user-token");
  });

  test("Messenger lists every granted Page, as itself", async () => {
    const accounts = await listGrantedAccounts("FACEBOOK", "user-token");

    expect(accounts).toEqual([
      {
        accountId: "page-1",
        fbPageId: "page-1",
        pageAccessToken: "page-token-1",
        name: "The Shop",
        pageName: "The Shop",
        pictureUrl: "https://cdn/page-1.jpg",
      },
      {
        accountId: "page-2",
        fbPageId: "page-2",
        pageAccessToken: "page-token-2",
        name: "The Other Shop",
        pageName: "The Other Shop",
        pictureUrl: undefined,
      },
    ]);
    expect(profile).not.toHaveBeenCalled();
  });

  test("Instagram lists the linked account, with its profile and its Page", async () => {
    const accounts = await listGrantedAccounts("INSTAGRAM", "user-token");

    expect(accounts).toEqual([
      {
        accountId: "iba-1",
        fbPageId: "page-1",
        pageAccessToken: "page-token-1",
        name: "The Shop IG",
        username: "the_shop",
        pageName: "The Shop",
        pictureUrl: "https://cdn/iba-1.jpg",
      },
    ]);
    // The profile is read with the token of the Page the account is linked to.
    expect(profile).toHaveBeenCalledWith("iba-1", "page-token-1");
  });

  test("Instagram leaves out a Page with no linked account", async () => {
    const accounts = await listGrantedAccounts("INSTAGRAM", "user-token");

    expect(accounts.map((account) => account.fbPageId)).not.toContain("page-2");
    expect(profile).toHaveBeenCalledTimes(1);
  });

  test("a login that granted nothing lists nothing", async () => {
    meta.mockResolvedValue({ data: {} });

    await expect(listGrantedAccounts("INSTAGRAM", "user-token")).resolves.toEqual([]);
    await expect(listGrantedAccounts("FACEBOOK", "user-token")).resolves.toEqual([]);
  });
});

describe("storeLogin / readLogin", () => {
  test("parks the token encrypted, under the org and the platform, for a while", async () => {
    const loginId = await storeLogin(ORG, "INSTAGRAM", "user-token");

    expect(redis.set).toHaveBeenCalledWith(
      `meta:channel-login:${ORG}:INSTAGRAM:${loginId}`,
      "enc(user-token)",
      "EX",
      expect.any(Number),
    );
  });

  test("reads the token back for the same org and platform", async () => {
    const loginId = await storeLogin(ORG, "FACEBOOK", "user-token");

    await expect(readLogin(ORG, "FACEBOOK", loginId)).resolves.toBe("user-token");
  });

  test("a Messenger login cannot be read back as an Instagram one, nor the reverse", async () => {
    const messengerLogin = await storeLogin(ORG, "FACEBOOK", "fb-token");
    const instagramLogin = await storeLogin(ORG, "INSTAGRAM", "ig-token");

    await expect(readLogin(ORG, "INSTAGRAM", messengerLogin)).resolves.toBeNull();
    await expect(readLogin(ORG, "FACEBOOK", instagramLogin)).resolves.toBeNull();
  });

  test("another org cannot read the login", async () => {
    const loginId = await storeLogin(ORG, "INSTAGRAM", "user-token");

    await expect(readLogin("org-2", "INSTAGRAM", loginId)).resolves.toBeNull();
  });

  test("each login gets its own id", async () => {
    const first = await storeLogin(ORG, "INSTAGRAM", "a");
    const second = await storeLogin(ORG, "INSTAGRAM", "b");

    expect(first).not.toBe(second);
  });
});
