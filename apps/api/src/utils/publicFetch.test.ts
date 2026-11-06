import { describe, expect, test } from "vitest";

import { fetchPublicBytes, isPublicAddress } from "./publicFetch.js";

describe("isPublicAddress", () => {
  test("refuses loopback, private, link-local and metadata addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:127.0.0.1",
      "::ffff:169.254.169.254",
      "::ffff:7f00:1",
      "::ffff:a9fe:a9fe",
      "0:0:0:0:0:ffff:127.0.0.1",
      "::127.0.0.1",
      "::a9fe:a9fe",
      "2002:7f00:1::",
      "2002:a9fe:a9fe::1",
      "2001:0:4136:e378:8000:63bf:3fff:fdd2",
      "64:ff9b:1::a9fe:a9fe",
      "fe80::1%eth0",
    ])
      expect(isPublicAddress(ip), ip).toBe(false);
  });

  test("accepts public addresses", () => {
    for (const ip of ["8.8.8.8", "151.101.1.69", "2606:4700:4700::1111", "::ffff:8.8.8.8"])
      expect(isPublicAddress(ip), ip).toBe(true);
  });
});

describe("fetchPublicBytes", () => {
  test("only fetches https", async () => {
    await expect(fetchPublicBytes("http://example.com/logo.png")).rejects.toThrow(/https/);
    await expect(fetchPublicBytes("file:///etc/passwd")).rejects.toThrow(/https/);
  });

  test("refuses a private address given as a literal IP", async () => {
    await expect(fetchPublicBytes("https://169.254.169.254/latest/meta-data")).rejects.toThrow(
      /private/,
    );
    await expect(fetchPublicBytes("https://[::1]/")).rejects.toThrow(/private/);
  });

  test("refuses a hostname that resolves to a private address", async () => {
    await expect(fetchPublicBytes("https://localhost/")).rejects.toThrow(/private/);
  });
});
