import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({ default: {} }));

import {
  assertRecentAuth,
  hashSessionToken,
  judgeSession,
  newSessionToken,
  SESSION_IDLE_MS,
  STEP_UP_MAX_AGE_MS,
  type SessionWithStaff,
} from "./staff.session.js";

const now = new Date("2026-09-22T12:00:00Z");

function session(overrides: Partial<SessionWithStaff> = {}): SessionWithStaff {
  return {
    id: "sess-1",
    tokenHash: "h",
    staffUserId: "staff-1",
    createdAt: new Date(now.getTime() - 60_000),
    authenticatedAt: new Date(now.getTime() - 60_000),
    lastSeenAt: new Date(now.getTime() - 60_000),
    expiresAt: new Date(now.getTime() + 60 * 60_000),
    revokedAt: null,
    ip: null,
    userAgent: null,
    staffUser: { active: true } as SessionWithStaff["staffUser"],
    ...overrides,
  };
}

describe("judgeSession", () => {
  test("a live session of an active staff member is fine", () => {
    expect(judgeSession(session(), now)).toBeNull();
  });

  test.each([
    ["revoked", { revokedAt: new Date(now.getTime() - 1) }],
    ["expired", { expiresAt: now }],
    ["idle", { lastSeenAt: new Date(now.getTime() - SESSION_IDLE_MS - 1) }],
    ["inactive", { staffUser: { active: false } as SessionWithStaff["staffUser"] }],
  ] as const)("refuses a %s session", (reason, override) => {
    expect(judgeSession(session(override as Partial<SessionWithStaff>), now)).toBe(reason);
  });
});

describe("assertRecentAuth", () => {
  test("passes within the step-up window", () => {
    expect(() => assertRecentAuth(session(), now)).not.toThrow();
  });

  test("asks for a fresh Google login once the window has passed", () => {
    const old = session({ authenticatedAt: new Date(now.getTime() - STEP_UP_MAX_AGE_MS - 1) });
    expect(() => assertRecentAuth(old, now)).toThrowError(
      expect.objectContaining({ statusCode: 401, code: "REAUTH_REQUIRED" }),
    );
    expect(() => assertRecentAuth(undefined, now)).toThrow();
  });
});

describe("session tokens", () => {
  test("only the hash is derived for storage, and it is stable", () => {
    const { token, tokenHash } = newSessionToken();
    expect(token).not.toBe(tokenHash);
    expect(hashSessionToken(token)).toBe(tokenHash);
    expect(newSessionToken().token).not.toBe(token);
  });
});
