import { beforeEach, describe, expect, test, vi } from "vitest";

const claim = vi.hoisted(() => ({
  /** Successive answers from the session's cached claim, oldest first. */
  reads: [] as unknown[],
  readThrows: false,
  refreshes: 0,
  refreshThrows: false,
}));

vi.mock("supertokens-auth-react/recipe/session", () => ({
  default: {
    getClaimValue: async () => {
      if (claim.readThrows) throw new Error("no session");
      return claim.reads.shift();
    },
  },
}));

vi.mock("supertokens-auth-react/recipe/emailverification", () => ({
  EmailVerificationClaim: {
    refresh: async () => {
      claim.refreshes += 1;
      if (claim.refreshThrows) throw new Error("network");
    },
  },
}));

import { isEmailVerified } from "./emailVerification";

describe("isEmailVerified", () => {
  beforeEach(() => {
    claim.reads = [];
    claim.readThrows = false;
    claim.refreshes = 0;
    claim.refreshThrows = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("believes a verified claim without a round trip", async () => {
    claim.reads = [true];
    expect(await isEmailVerified()).toBe(true);
    expect(claim.refreshes).toBe(0);
  });

  test("re-checks a cached false — the claim lags a verification done elsewhere", async () => {
    // The validator caches `false` for ~10s, so someone who verified in another tab
    // would otherwise be sent back to the verify page they just finished with.
    claim.reads = [false, true];
    expect(await isEmailVerified()).toBe(true);
    expect(claim.refreshes).toBe(1);
  });

  test("reports unverified when the fresh claim still says so", async () => {
    claim.reads = [false, false];
    expect(await isEmailVerified()).toBe(false);
  });

  test("an absent claim is not a refusal", async () => {
    // No email-verification gate on this session — answering false would strand the
    // user on a page with nothing to confirm.
    claim.reads = [undefined];
    expect(await isEmailVerified()).toBe(true);
    expect(claim.refreshes).toBe(0);
  });

  test("an unreadable claim is not a refusal either", async () => {
    // Signed out, or the SDK is not initialised — that is /login's business, not a
    // reason to send someone to the verify page.
    claim.readThrows = true;
    expect(await isEmailVerified()).toBe(true);
  });

  test("a failed refresh falls back to what the session already says", async () => {
    claim.reads = [false, false];
    claim.refreshThrows = true;
    expect(await isEmailVerified()).toBe(false);
    expect(claim.refreshes).toBe(1);
  });
});
