import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

process.env.FLOW_TOKEN_SECRET = "test-secret";

const { signFlowToken, verifyFlowToken } = await import("./flowToken.js");

const CONTEXT = {
  surveyTeamMapId: "stm-1",
  orgId: "org-1",
  phone: "15550001",
};

beforeEach(() => {
  vi.useRealTimers();
  process.env.FLOW_TOKEN_SECRET = "test-secret";
});

describe("signFlowToken / verifyFlowToken", () => {
  test("round-trips the run context", () => {
    const token = signFlowToken({
      ...CONTEXT,
      language: "en",
      campaignParticipantId: "cp-1",
      campaignParticipantDripStageId: "drip-1",
      tag: "vip",
      feedbackRequestId: "fb-1",
    });

    expect(verifyFlowToken(token)).toMatchObject({
      surveyTeamMapId: "stm-1",
      orgId: "org-1",
      phone: "15550001",
      language: "en",
      campaignParticipantId: "cp-1",
      campaignParticipantDripStageId: "drip-1",
      tag: "vip",
      feedbackRequestId: "fb-1",
    });
  });

  test("leaves the feedback request out of the payload when there is none", () => {
    const token = signFlowToken(CONTEXT);
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
    expect(payload).not.toHaveProperty("f");
    expect(verifyFlowToken(token)?.feedbackRequestId).toBeUndefined();
  });

  test("defaults an absent language to the empty string the response carries", () => {
    expect(verifyFlowToken(signFlowToken(CONTEXT))?.language).toBe("");
  });

  // The token is signed, not encrypted — it must never be given anything secret,
  // but it must be unforgeable.
  test("rejects a token whose payload was edited", () => {
    const token = signFlowToken(CONTEXT);
    const [version, payload, signature] = token.split(".");
    const tampered = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
    tampered.s = "stm-someone-elses";
    const forged = [
      version,
      Buffer.from(JSON.stringify(tampered)).toString("base64url"),
      signature,
    ].join(".");

    expect(verifyFlowToken(forged)).toBeNull();
  });

  test("rejects a token signed with a different secret", () => {
    const token = signFlowToken(CONTEXT);
    process.env.FLOW_TOKEN_SECRET = "rotated-secret";

    expect(verifyFlowToken(token)).toBeNull();
  });

  // Tokens deliberately never expire: a respondent may answer days later and
  // those answers are still worth having. Re-submission is guarded by the
  // completion marker in flowState, not by a time limit.
  test.each([
    ["a day", 24 * 60 * 60 * 1000],
    ["a month", 30 * 24 * 60 * 60 * 1000],
    ["a year", 365 * 24 * 60 * 60 * 1000],
  ])("still accepts a token issued %s ago", (_label, age) => {
    const token = signFlowToken({ ...CONTEXT, issuedAt: new Date(Date.now() - age) });

    expect(verifyFlowToken(token)?.surveyTeamMapId).toBe("stm-1");
  });

  test("reports when the token was issued", () => {
    const issuedAt = new Date(Date.now() - 60_000);

    expect(verifyFlowToken(signFlowToken({ ...CONTEXT, issuedAt }))?.issuedAt).toEqual(issuedAt);
  });

  // Flows sent before signed tokens shipped put the bare phone in flow_token;
  // those must fall through to the session lookup rather than being accepted.
  test.each(["15550001", "", "not.a.token", "v1.only-two-parts"])(
    "returns null for the non-token %j",
    (value) => {
      expect(verifyFlowToken(value)).toBeNull();
    },
  );

  test("returns null rather than throwing for a malformed payload", () => {
    expect(verifyFlowToken("v1.@@@notbase64json@@@.signature")).toBeNull();
  });
});
