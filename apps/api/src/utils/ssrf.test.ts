import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("node:dns", () => ({ lookup: vi.fn() }));

import { lookup } from "node:dns/promises";
import { lookup as lookupCallback } from "node:dns";
import {
  assertPublicUrl,
  isPrivateAddress,
  publicAxiosOptions,
  publicOnlyLookup,
  PublicUrlError,
} from "./ssrf.js";

type Mock = ReturnType<typeof vi.fn>;
const dns = lookup as unknown as Mock;
const dnsCallback = lookupCallback as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  dns.mockResolvedValue([{ address: "203.0.113.10", family: 4 }]);
});

describe("isPrivateAddress", () => {
  test.each([
    "10.0.0.5",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "ff02::1",
    "::ffff:10.0.0.1",
  ])("%s is private", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  test.each(["203.0.113.10", "8.8.8.8", "2606:4700::1111"])("%s is public", (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  test("accepts an https URL that resolves to a public address", async () => {
    await expect(assertPublicUrl("https://hooks.zapier.com/x")).resolves.toBeInstanceOf(URL);
  });

  test("refuses a host that resolves to the metadata address", async () => {
    dns.mockResolvedValueOnce([{ address: "169.254.169.254", family: 4 }]);

    await expect(assertPublicUrl("https://evil.example/")).rejects.toBeInstanceOf(PublicUrlError);
  });

  test("refuses when any resolved address is private", async () => {
    dns.mockResolvedValueOnce([
      { address: "203.0.113.10", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);

    await expect(assertPublicUrl("https://mixed.example/")).rejects.toThrow(/private/);
  });

  test("refuses a private IP literal without a lookup", async () => {
    await expect(assertPublicUrl("https://[::1]/")).rejects.toThrow(/private/);
    await expect(assertPublicUrl("https://127.0.0.1/")).rejects.toThrow(/private/);
    expect(dns).not.toHaveBeenCalled();
  });

  test("refuses http unless the caller allows it", async () => {
    await expect(assertPublicUrl("http://api.example/")).rejects.toThrow(/non-https/);
    await expect(
      assertPublicUrl("http://api.example/", { allowHttp: true }),
    ).resolves.toBeDefined();
  });

  test("refuses other schemes, embedded credentials and garbage", async () => {
    await expect(assertPublicUrl("file:///etc/passwd", { allowHttp: true })).rejects.toThrow();
    await expect(assertPublicUrl("https://u:p@api.example/")).rejects.toThrow(/credentials/);
    await expect(assertPublicUrl("not a url")).rejects.toThrow(/invalid/);
  });

  test("a host that does not resolve is refused", async () => {
    dns.mockRejectedValueOnce(new Error("ENOTFOUND"));

    await expect(assertPublicUrl("https://nowhere.example/")).rejects.toThrow(/did not resolve/);
  });
});

describe("publicOnlyLookup (connect-time re-check)", () => {
  function resolveTo(addresses: { address: string; family: number }[]) {
    dnsCallback.mockImplementationOnce((_host, _opts, cb) => cb(null, addresses));
  }

  test("passes a public address through", () => {
    resolveTo([{ address: "203.0.113.10", family: 4 }]);
    const cb = vi.fn();

    publicOnlyLookup("api.example", {}, cb);

    expect(cb).toHaveBeenCalledWith(null, "203.0.113.10", 4);
  });

  test("fails a host that re-resolved to a private address", () => {
    resolveTo([{ address: "10.0.0.5", family: 4 }]);
    const cb = vi.fn();

    publicOnlyLookup("rebind.example", {}, cb);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(PublicUrlError);
  });
});

describe("publicAxiosOptions", () => {
  test("follows no redirects and sets a timeout", () => {
    const options = publicAxiosOptions(5000);

    expect(options.maxRedirects).toBe(0);
    expect(options.timeout).toBe(5000);
    expect(options.httpAgent).toBeDefined();
    expect(options.httpsAgent).toBeDefined();
  });
});
