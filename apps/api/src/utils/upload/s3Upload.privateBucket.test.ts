import { afterEach, expect, test, vi } from "vitest";

vi.mock("../logger.js", () => ({ log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const { privateBucket } = await import("./s3Upload.js");

afterEach(() => vi.unstubAllEnvs());

test("uses the private bucket when it is set", () => {
  vi.stubEnv("AWS_S3_PRIVATE_BUCKET", "private-docs");
  vi.stubEnv("NODE_ENV", "production");
  expect(privateBucket()).toBe("private-docs");
});

test("refuses to fall back to the public bucket in production", () => {
  vi.stubEnv("AWS_S3_PRIVATE_BUCKET", "");
  vi.stubEnv("AWS_S3_BUCKET", "public-uploads");
  vi.stubEnv("NODE_ENV", "production");
  expect(() => privateBucket()).toThrow(/AWS_S3_PRIVATE_BUCKET/);
});

test("falls back outside production, for local setups", () => {
  vi.stubEnv("AWS_S3_PRIVATE_BUCKET", "");
  vi.stubEnv("AWS_S3_BUCKET", "public-uploads");
  vi.stubEnv("NODE_ENV", "development");
  expect(privateBucket()).toBe("public-uploads");
});
