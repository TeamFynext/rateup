import { beforeEach, describe, expect, test, vi } from "vitest";

const claim = vi.hoisted(() => ({
  /** Successive answers from the session's cached claim, oldest first. */
  reads: [] as unknown[],
  readThrows: false,
  refreshes: 0,
  refreshThrows: false,
  /** What the API answers when the session carries no claim at all. */
  apiVerified: true,
  apiCalls: 0,
  apiThrows: false,
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
  isEmailVerified: async () => {
    claim.apiCalls += 1;
    if (claim.apiThrows) throw new Error("no session");
    return { status: "OK", isVerified: claim.apiVerified };
  },
}));

import { forgetEmailVerification, isEmailVerified } from "./emailVerification";

describe("isEmailVerified", () => {
  beforeEach(() => {
    claim.reads = [];
    claim.readThrows = false;
    claim.refreshes = 0;
    claim.refreshThrows = false;
    claim.apiVerified = true;
    claim.apiCalls = 0;
    claim.apiThrows = false;
    forgetEmailVerification();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("believes a verified claim without a round trip", async () => {
    claim.reads = [true];
    expect(await isEmailVerified()).toBe(true);
    expect(claim.refreshes).toBe(0);
    expect(claim.apiCalls).toBe(0);
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

  test("asks the API when the session carries no claim", async () => {
    // A session restored on a later visit can arrive with no `st-ev` at all. Reading
    // that as "verified" walked an unverified visitor into the dashboard's 403s and
    // back out to /login, which returned them to the dashboard — the flicker.
    claim.reads = [undefined, undefined];
    claim.apiVerified = false;
    expect(await isEmailVerified()).toBe(false);
    expect(claim.apiCalls).toBe(1);
  });

  test("an absent claim the API calls verified is not a refusal", async () => {
    // No email-verification gate on this session — answering false would strand the
    // user on a page with nothing to confirm.
    claim.reads = [undefined, undefined];
    claim.apiVerified = true;
    expect(await isEmailVerified()).toBe(true);
  });

  test("a claim that only appears after the refresh is believed", async () => {
    claim.reads = [undefined, true];
    expect(await isEmailVerified()).toBe(true);
    expect(claim.apiCalls).toBe(0);
  });

  test("an unreachable API falls back to letting the visitor through", async () => {
    // Signed out, or the network is down — neither is "unverified", and stranding a
    // signed-out visitor on a page that needs a session helps no one.
    claim.reads = [undefined, undefined];
    claim.apiThrows = true;
    expect(await isEmailVerified()).toBe(true);
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
