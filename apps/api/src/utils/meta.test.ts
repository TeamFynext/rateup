import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("./logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { log } from "./logger.js";
import { isNonProductionRuntime, resolveMetaBaseUrl } from "./meta.js";

const MOCK = "http://whatsapp-mock-api.railway.internal:8081";

describe("isNonProductionRuntime", () => {
  test.each([
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "test" }, true],
    [{ RAILWAY_ENVIRONMENT_NAME: "dev" }, true],
    [{}, false],
    [{ NODE_ENV: "production" }, false],
    [{ RAILWAY_ENVIRONMENT_NAME: "production" }, false],
    // A Railway production environment wins over a stray NODE_ENV.
    [{ RAILWAY_ENVIRONMENT_NAME: "production", NODE_ENV: "development" }, false],
  ])("%o → %s", (env, expected) => {
    expect(isNonProductionRuntime(env)).toBe(expected);
  });
});

describe("resolveMetaBaseUrl", () => {
  test("no override means the real Graph host", () => {
    expect(resolveMetaBaseUrl({ RAILWAY_ENVIRONMENT_NAME: "dev" })).toBeNull();
  });

  test("honoured in a non-production Railway environment", () => {
    expect(resolveMetaBaseUrl({ META_API_BASE_URL: MOCK, RAILWAY_ENVIRONMENT_NAME: "dev" })).toBe(
      MOCK,
    );
  });

  test("honoured locally and under vitest", () => {
    expect(resolveMetaBaseUrl({ META_API_BASE_URL: MOCK, NODE_ENV: "development" })).toBe(MOCK);
    expect(resolveMetaBaseUrl({ META_API_BASE_URL: MOCK, NODE_ENV: "test" })).toBe(MOCK);
  });

  test("ignored, loudly, in production", () => {
    vi.mocked(log.error).mockClear();

    expect(
      resolveMetaBaseUrl({ META_API_BASE_URL: MOCK, RAILWAY_ENVIRONMENT_NAME: "production" }),
    ).toBeNull();
    expect(resolveMetaBaseUrl({ META_API_BASE_URL: MOCK })).toBeNull();
    expect(log.error).toHaveBeenCalledTimes(2);
  });

  test("ALLOW_META_MOCK=true is the explicit opt-in", () => {
    expect(
      resolveMetaBaseUrl({
        META_API_BASE_URL: MOCK,
        RAILWAY_ENVIRONMENT_NAME: "production",
        ALLOW_META_MOCK: "true",
      }),
    ).toBe(MOCK);
  });
});
