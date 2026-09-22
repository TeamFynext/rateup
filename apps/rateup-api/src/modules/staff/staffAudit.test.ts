import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({ default: {} }));

import { redact } from "./staffAudit.js";

describe("redact", () => {
  test("replaces secret-looking values at any depth and leaves the rest", () => {
    expect(
      redact({
        reason: "customer asked",
        password: "hunter2",
        nested: { apiKey: "k", clientSecret: "s", accessToken: "t", plan: "PRO" },
        list: [{ Authorization: "Bearer x", name: "a" }],
      }),
    ).toEqual({
      reason: "customer asked",
      password: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        clientSecret: "[redacted]",
        accessToken: "[redacted]",
        plan: "PRO",
      },
      list: [{ Authorization: "[redacted]", name: "a" }],
    });
  });

  test("passes primitives through", () => {
    expect(redact("x")).toBe("x");
    expect(redact(null)).toBeNull();
    expect(redact(3)).toBe(3);
  });
});
