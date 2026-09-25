import { describe, expect, test } from "vitest";
import { staffSignInDomain, type StaffConfig } from "./staff.config.js";

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
