import { describe, expect, test } from "vitest";
import {
  assertDevBypassConfig,
  isDevBypassEnabled,
  isLocalConsoleOrigin,
  type StaffConfig,
} from "./staff.config.js";

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
  devBypassEmail: "dev@rateup.app",
  production: false,
};

describe("STAFF_DEV_BYPASS_EMAIL", () => {
  test("only a plain-http localhost console counts as local", () => {
    expect(isLocalConsoleOrigin("http://localhost:4000")).toBe(true);
    expect(isLocalConsoleOrigin("http://127.0.0.1:4000")).toBe(true);
    expect(isLocalConsoleOrigin("https://localhost:4000")).toBe(false);
    expect(isLocalConsoleOrigin("http://localhost.evil.com")).toBe(false);
    expect(isLocalConsoleOrigin("https://admin.rateup.app")).toBe(false);
    expect(isLocalConsoleOrigin("https://rateup-admin-dev.up.railway.app")).toBe(false);
  });

  test("is enabled only with every local condition met", () => {
    expect(isDevBypassEnabled(base)).toBe(true);
    expect(isDevBypassEnabled({ ...base, devBypassEmail: "" })).toBe(false);
    expect(isDevBypassEnabled({ ...base, production: true })).toBe(false);
    expect(isDevBypassEnabled({ ...base, cfAccessEnforced: true })).toBe(false);
    expect(isDevBypassEnabled({ ...base, consoleOrigin: "https://admin.rateup.app" })).toBe(false);
  });

  test("production refuses to boot with it set", () => {
    expect(() => assertDevBypassConfig({ ...base, production: true })).toThrow(
      /NODE_ENV=production/,
    );
  });

  test("a non-local console or enforced Access refuses to boot with it set", () => {
    expect(() =>
      assertDevBypassConfig({ ...base, consoleOrigin: "https://admin.rateup.app" }),
    ).toThrow(/localhost/);
    expect(() => assertDevBypassConfig({ ...base, cfAccessEnforced: true })).toThrow(
      /STAFF_CF_ACCESS_ENFORCE/,
    );
  });

  test("unset, it is never a boot error", () => {
    expect(() =>
      assertDevBypassConfig({ ...base, devBypassEmail: "", production: true }),
    ).not.toThrow();
  });
});
