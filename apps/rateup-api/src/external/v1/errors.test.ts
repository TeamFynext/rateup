import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { LoyaltyError } from "../../modules/loyalty/loyalty.errors.js";
import { ApiAuthError } from "../../modules/apiAccessToken/apiAccessToken.auth.js";
import { ExternalApiError, externalErrorHandler } from "./errors.js";

function reply() {
  const sent: { status?: number; body?: any } = {};
  const r: any = {
    code(status: number) {
      sent.status = status;
      return r;
    },
    send(body: unknown) {
      sent.body = body;
      return r;
    },
    header: () => r,
  };
  return { reply: r, sent };
}

const request = { id: "req-1", url: "/api/external/v1/o/loyalty/x", method: "POST" } as any;

function handle(err: unknown) {
  const { reply: rep, sent } = reply();
  externalErrorHandler(err as never, request, rep);
  return sent;
}

describe("business failures get a status that means something", () => {
  test.each([
    ["INSUFFICIENT_POINTS", 422, "insufficient_points"],
    ["REDEMPTION_RULES_VIOLATED", 422, "redemption_rules_violated"],
    ["MEMBER_NOT_FOUND", 404, "member_not_found"],
    ["MEMBER_EXISTS", 409, "member_already_exists"],
    ["VOUCHER_ALREADY_USED", 409, "voucher_already_redeemed"],
    ["VOUCHER_NOT_APPROVED", 409, "voucher_not_approved"],
    ["REWARD_NOT_FOUND", 404, "reward_not_found"],
    ["PROGRAM_NOT_ACTIVE", 422, "program_not_active"],
  ] as const)("%s → %i %s", (code, status, external) => {
    const sent = handle(new LoyaltyError(code, "something the shop can act on"));

    expect(sent.status).toBe(status);
    expect(sent.body.error.code).toBe(external);
  });

  test("the numbers a till needs come through in details", () => {
    const sent = handle(
      new LoyaltyError("INSUFFICIENT_POINTS", "Insufficient points", {
        required: 500,
        available: 320,
      }),
    );

    expect(sent.body.error.details).toEqual({ required: 500, available: 320 });
  });
});

describe("an untyped error never leaks", () => {
  /**
   * The guard against the behaviour this replaced: every handler used to end
   * `reply.code(500).send({ error: e.message })`, so internal exception text went straight
   * to third parties. An error that reaches here untyped is *our* bug, and it must look
   * like one — no message, no sniffing the text for a business failure.
   */
  test("a bare Error is a 500 with a fixed message", () => {
    const sent = handle(new Error("Insufficient points. Required: 500, Available: 320"));

    expect(sent.status).toBe(500);
    expect(sent.body.error.code).toBe("internal_error");
    expect(sent.body.error.message).toBe("Something went wrong");
    expect(JSON.stringify(sent.body)).not.toContain("Insufficient");
  });

  test("a database error does not publish its internals", () => {
    const sent = handle(new Error('relation "LoyaltyTransaction" does not exist'));

    expect(sent.status).toBe(500);
    expect(JSON.stringify(sent.body)).not.toContain("LoyaltyTransaction");
  });
});

describe("the rest of the taxonomy", () => {
  test("ExternalApiError is passed through as declared", () => {
    const sent = handle(new ExternalApiError(400, "card_code_invalid", "Bad card"));

    expect(sent.status).toBe(400);
    expect(sent.body.error).toMatchObject({ code: "card_code_invalid", message: "Bad card" });
  });

  test("a rejected key is 401, a missing org is 404", () => {
    expect(handle(new ApiAuthError(401, "invalid_token", "Invalid access token")).status).toBe(401);
    expect(handle(new ApiAuthError(404, "org_not_found", "nope")).body.error.code).toBe(
      "org_not_found",
    );
  });

  test("a unique violation is a conflict, a missing row a 404", () => {
    expect(handle(Object.assign(new Error("u"), { code: "P2002" })).status).toBe(409);
    expect(handle(Object.assign(new Error("m"), { code: "P2025" })).status).toBe(404);
  });

  test("every answer carries the request id and one envelope shape", () => {
    const sent = handle(new ExternalApiError(404, "member_not_found", "nope"));

    expect(sent.body).toEqual({
      error: { code: "member_not_found", message: "nope", details: undefined, requestId: "req-1" },
    });
  });
});
