import { describe, expect, test } from "vitest";

import {
  asApiError,
  getAccessDenialReason,
  getApiErrorData,
  getApiErrorMessage,
  isPlanDenial,
} from "./apiError";

const rejected = (status: number, data: unknown) => ({
  message: "Request failed",
  response: { status, data },
});

describe("getApiErrorMessage", () => {
  test("prefers the API's message, then its error, then axios's own", () => {
    expect(getApiErrorMessage(rejected(400, { message: "Reason too short" }))).toBe(
      "Reason too short",
    );
    expect(getApiErrorMessage(rejected(400, { error: "Bad request" }))).toBe("Bad request");
    expect(getApiErrorMessage(rejected(500, {}))).toBe("Request failed");
  });

  test("a bare string body is the message", () => {
    expect(getApiErrorMessage(rejected(502, "Bad gateway"))).toBe("Bad gateway");
  });

  test("anything that is not an error gets the fallback", () => {
    expect(getApiErrorMessage(null)).toBe("Something went wrong");
    expect(getApiErrorMessage("boom", "Try again")).toBe("Try again");
  });
});

test("getApiErrorData only returns an object body", () => {
  expect(getApiErrorData(rejected(400, { code: "REAUTH_REQUIRED" }))?.code).toBe("REAUTH_REQUIRED");
  expect(getApiErrorData(rejected(400, "text"))).toBeUndefined();
  expect(asApiError(undefined)).toEqual({});
});

describe("access denials", () => {
  test("uses the API's own reason when it sends one", () => {
    expect(getAccessDenialReason(rejected(403, { reason: "team" }))).toBe("team");
  });

  test("falls back to the message for older 403s", () => {
    expect(getAccessDenialReason(rejected(403, { message: "Subscription expired" }))).toBe(
      "subscription_expired",
    );
    expect(getAccessDenialReason(rejected(403, { message: "Upgrade your subscription" }))).toBe(
      "subscription",
    );
    expect(
      getAccessDenialReason(rejected(403, { message: "Feature not enabled for your team" })),
    ).toBe("team");
    expect(getAccessDenialReason(rejected(403, { message: "No" }))).toBe("unknown");
  });

  test("anything but a 403 is not an access refusal", () => {
    expect(getAccessDenialReason(rejected(401, { reason: "team" }))).toBeNull();
  });

  test("plan denials are the subscription reasons only", () => {
    expect(isPlanDenial(rejected(403, { reason: "subscription" }))).toBe(true);
    expect(isPlanDenial(rejected(403, { reason: "subscription_expired" }))).toBe(true);
    expect(isPlanDenial(rejected(403, { reason: "team" }))).toBe(false);
  });
});
