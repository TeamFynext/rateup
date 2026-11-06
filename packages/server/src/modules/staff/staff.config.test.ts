import { afterEach, describe, expect, test, vi } from "vitest";
import { staffConfig, staffSignInDomain, type StaffConfig } from "./staff.config.js";

const base: StaffConfig = {
  googleClientId: "cid",
  googleClientSecret: "csecret",
  googleHd: "rateup.app",
  consoleOrigin: "http://localhost:4000",
  apiOrigin: "http://localhost:3001",
  cookieSecret: "a-cookie-secret-that-is-at-least-32-chars",
  cfAccessTeam: "",
  cfAccessAud: "",
  cfAccessEnforced: false,
  secureCookies: false,
  development: false,
};

describe("staffSignInDomain", () => {
  test("is the Workspace domain anywhere but NODE_ENV=development", () => {
    expect(staffSignInDomain(base)).toBe("rateup.app");
  });

  test("is open to any domain with NODE_ENV=development", () => {
    expect(staffSignInDomain({ ...base, development: true })).toBeNull();
  });
});

describe("secureCookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("outside development the cookies are Secure even if API_URL says http://", () => {
    vi.stubEnv("NODE_ENV", "");
    vi.stubEnv("STAFF_API_ORIGIN", "http://api.rateup.app");
    expect(staffConfig().secureCookies).toBe(true);
  });

  test("only a plain-http API under NODE_ENV=development goes without", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STAFF_API_ORIGIN", "http://localhost:3001");
    expect(staffConfig().secureCookies).toBe(false);
    vi.stubEnv("STAFF_API_ORIGIN", "https://tunnel.example");
    expect(staffConfig().secureCookies).toBe(true);
  });
});
