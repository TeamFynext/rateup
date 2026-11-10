import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import {
  getUnsplashImageList,
  InvalidDownloadLocationError,
  triggerDownloadUnsplashImage,
  unsplashDownloadUrl,
} from "./unsplash.service.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("unsplashDownloadUrl (SURV-4)", () => {
  test("keeps a genuine Unsplash download location, with only its ixid", () => {
    const url = unsplashDownloadUrl(
      "https://api.unsplash.com/photos/Dwu85P9SOIk/download?ixid=M3wx&client_id=leak&x=1",
    );
    expect(url.toString()).toBe("https://api.unsplash.com/photos/Dwu85P9SOIk/download?ixid=M3wx");
  });

  test.each([
    "https://attacker.tld/?x",
    "https://api.unsplash.com.attacker.tld/photos/a/download",
    "http://api.unsplash.com/photos/a/download",
    "https://user:pw@api.unsplash.com/photos/a/download",
    "https://api.unsplash.com:8443/photos/a/download",
    "https://api.unsplash.com/users/a/download",
    "https://api.unsplash.com/photos/../../me/download",
    "http://169.254.169.254/latest/meta-data",
    "not a url",
  ])("refuses %s", (location) => {
    expect(() => unsplashDownloadUrl(location)).toThrow(InvalidDownloadLocationError);
  });

  test("never fetches a refused location", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      triggerDownloadUnsplashImage({ downloadLocation: "https://attacker.tld/?x" }),
    ).rejects.toBeInstanceOf(InvalidDownloadLocationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getUnsplashImageList", () => {
  test("encodes the search query", async () => {
    const fetchMock = vi.fn(async () => ({ json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    process.env.UNSPLASH_API_URL = "https://api.unsplash.com";

    await getUnsplashImageList({ query: "cats&client_id=x", page: 1, limit: 10 });

    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.pathname).toBe("/search/photos");
    expect(url.searchParams.get("query")).toBe("cats&client_id=x");
    expect(url.searchParams.getAll("client_id")).toHaveLength(1);
  });
});
