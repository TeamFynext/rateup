import { describe, expect, test } from "vite-plus/test";

import { isInviteExpired } from "./inviteExpiry.ts";

describe("isInviteExpired", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");

  test("a future expiry is still live", () => {
    expect(isInviteExpired("2026-10-21T12:00:00Z", now)).toBe(false);
  });

  test("an expiry at or before now has lapsed", () => {
    expect(isInviteExpired("2026-10-20T12:00:00Z", now)).toBe(true);
    expect(isInviteExpired("2026-10-19T12:00:00Z", now)).toBe(true);
  });

  test("a row without a token expiry cannot be accepted, so it reads as expired", () => {
    expect(isInviteExpired(null, now)).toBe(true);
  });

  test("a listing that does not send the field leaves the row unmarked", () => {
    expect(isInviteExpired(undefined, now)).toBe(false);
  });

  test("an unparseable date is not treated as expired", () => {
    expect(isInviteExpired("not a date", now)).toBe(false);
  });
});
