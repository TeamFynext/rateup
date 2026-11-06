import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, test } from "vitest";

import {
  isGetLeadNotFound,
  isInvalidStatusTransition,
  isRateLimited,
  parseGetLeadError,
  readRateLimit,
  retryAfterSeconds,
} from "./getlead.types.js";
import { maskGetLeadApiKey } from "./getlead.utils.js";

/**
 * Builds an AxiosError around a real GetLead body.
 *
 * Every fixture below is a response actually returned by the live API on
 * 2026-09-03, not a body transcribed from the docs — which are wrong about the
 * error shape (see docs/getlead-integration-plan.md §1.1).
 */
function axiosErrorWith(status: number, data: unknown, headers: Record<string, string> = {}) {
  const error = new AxiosError("Request failed");
  error.response = {
    status,
    statusText: "",
    data,
    headers: new AxiosHeaders(headers),
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe("parseGetLeadError", () => {
  test("reads Laravel's field-validation shape, which the docs omit", () => {
    const error = axiosErrorWith(422, {
      message: "At least one phone number is required",
      errors: { phone_numbers: ["At least one phone number is required"] },
    });

    expect(parseGetLeadError(error)).toEqual({
      status: 422,
      message: "At least one phone number is required",
      fieldErrors: { phone_numbers: ["At least one phone number is required"] },
    });
  });

  test("keys a nested field error by its dotted path", () => {
    const error = axiosErrorWith(422, {
      message: "Each phone number must be in E.164 format (e.g., +1234567890)",
      errors: { "phone_numbers.0": ["Each phone number must be in E.164 format"] },
    });

    expect(parseGetLeadError(error).fieldErrors).toHaveProperty("phone_numbers.0");
  });

  test("reads the documented business-rule shape, whose context is an array", () => {
    const error = axiosErrorWith(422, {
      error: { code: "invalid_phone_number", message: "Invalid phone number format", context: [] },
    });

    expect(parseGetLeadError(error)).toEqual({
      status: 422,
      code: "invalid_phone_number",
      message: "Invalid phone number format",
    });
  });

  test("reads the bare-message shape a 404 uses", () => {
    const error = axiosErrorWith(404, { message: "Lead not found with the provided identifier" });

    expect(parseGetLeadError(error)).toEqual({
      status: 404,
      message: "Lead not found with the provided identifier",
    });
  });

  test("falls back to the error's own message when there is no response body", () => {
    expect(parseGetLeadError(new Error("socket hang up")).message).toBe("socket hang up");
  });

  test("does not mistake a validation body for a rule body", () => {
    const error = axiosErrorWith(422, {
      message: "At least one phone number is required",
      errors: { phone_numbers: ["required"] },
    });

    // Reading `error.code` alone would drop every field message — the whole
    // reason this helper exists.
    expect(parseGetLeadError(error).code).toBeUndefined();
    expect(parseGetLeadError(error).fieldErrors).toBeDefined();
  });
});

describe("error classification", () => {
  test("a 404 is the create-fallthrough branch", () => {
    expect(isGetLeadNotFound(axiosErrorWith(404, { message: "Lead not found" }))).toBe(true);
    expect(isGetLeadNotFound(axiosErrorWith(422, { message: "nope" }))).toBe(false);
  });

  test("an invalid status transition is distinguished from other rule failures", () => {
    const transition = axiosErrorWith(422, {
      error: { code: "status_transition_must_be_valid", message: "Not allowed" },
    });
    const otherRule = axiosErrorWith(422, {
      error: { code: "lead_status_must_belong_to_business", message: "Wrong business" },
    });

    expect(isInvalidStatusTransition(transition)).toBe(true);
    expect(isInvalidStatusTransition(otherRule)).toBe(false);
  });

  test("recognises a 429", () => {
    expect(isRateLimited(axiosErrorWith(429, { message: "Too many requests" }))).toBe(true);
  });
});

describe("retryAfterSeconds", () => {
  test("prefers the documented body field", () => {
    const error = axiosErrorWith(429, { message: "Too many requests", retry_after: 42 });
    expect(retryAfterSeconds(error)).toBe(42);
  });

  test("falls back to the Retry-After header", () => {
    const error = axiosErrorWith(429, { message: "Too many requests" }, { "retry-after": "17" });
    expect(retryAfterSeconds(error)).toBe(17);
  });

  test("falls back to the stated one-minute window", () => {
    expect(retryAfterSeconds(axiosErrorWith(429, { message: "Too many requests" }))).toBe(60);
  });

  test("ignores a nonsensical retry hint rather than scheduling in the past", () => {
    const error = axiosErrorWith(429, { message: "Too many", retry_after: 0 });
    expect(retryAfterSeconds(error)).toBe(60);
  });
});

describe("readRateLimit", () => {
  test("reads the undocumented headers GetLead sends on every response", () => {
    expect(readRateLimit({ "x-ratelimit-limit": "100", "x-ratelimit-remaining": "98" })).toEqual({
      limit: 100,
      remaining: 98,
    });
  });

  test("carries the plan's own ceiling rather than assuming 100", () => {
    // The limit is a per-business plan value; a hardcoded 100 would throttle a
    // larger plan needlessly and overrun a smaller one.
    expect(readRateLimit({ "x-ratelimit-limit": "1000" }).limit).toBe(1000);
  });

  test("distinguishes an exhausted budget from a missing header", () => {
    expect(readRateLimit({ "x-ratelimit-remaining": "0" }).remaining).toBe(0);
    expect(readRateLimit({}).remaining).toBeUndefined();
  });
});

describe("maskGetLeadApiKey", () => {
  test("keeps the prefix and the last four characters", () => {
    expect(maskGetLeadApiKey("ik_9f2c4b1ae7d03f2a")).toBe("ik_••••••••3f2a");
  });

  test("masks a key with no ik_ prefix", () => {
    expect(maskGetLeadApiKey("9f2c4b1ae7d03f2a")).toBe("••••••••3f2a");
  });

  /* A four-character secret is entirely last-four, so showing it would print the
     whole key rather than a hint. */
  test("shows nothing of a key too short to hint at", () => {
    expect(maskGetLeadApiKey("ik_abcd")).toBe("ik_••••••••");
  });

  test("has no preview for an absent key", () => {
    expect(maskGetLeadApiKey(undefined)).toBeNull();
    expect(maskGetLeadApiKey("")).toBeNull();
  });
});
