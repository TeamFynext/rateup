import { describe, expect, test } from "vite-plus/test";

import { getApiErrorMessage } from "./apiError.ts";

const rejected = (data: unknown) => ({ message: "Request failed", response: { data } });

describe("getApiErrorMessage", () => {
  test("reads the API's message", () => {
    expect(getApiErrorMessage(rejected({ message: "That code can't be used" }))).toBe(
      "That code can't be used",
    );
  });

  test("never hands back an object, even when a provider error is passed through", () => {
    const razorpay = {
      statusCode: 400,
      error: { code: "BAD_REQUEST_ERROR", description: "Amount too low", reason: "x" },
    };
    expect(getApiErrorMessage(rejected(razorpay))).toBe("Amount too low");
    expect(getApiErrorMessage(rejected({ error: { code: "X" } }), "fallback")).toBe(
      "Request failed",
    );
    expect(getApiErrorMessage({ response: { data: { message: { nested: 1 } } } }, "fallback")).toBe(
      "fallback",
    );
  });
});
