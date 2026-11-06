import { beforeEach, describe, expect, test } from "vitest";

process.env.FLOW_TOKEN_SECRET = "test-secret";
process.env.API_URL = "api.example.test";

const { buildReviewRedirectUrl, reviewRedirectPath, signReviewRedirect, verifyReviewRedirect } =
  await import("./feedback.redirect.js");

const REQUEST_ID = "2f0a7d2e-6b7e-4f2d-9a1e-0f3f5c1d9b11";

beforeEach(() => {
  process.env.FLOW_TOKEN_SECRET = "test-secret";
  process.env.API_URL = "api.example.test";
});

describe("signReviewRedirect / verifyReviewRedirect", () => {
  test("round-trips", () => {
    const sig = signReviewRedirect(REQUEST_ID);
    expect(sig).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyReviewRedirect(REQUEST_ID, sig)).toBe(true);
  });

  test("rejects a signature for a different request", () => {
    const sig = signReviewRedirect(REQUEST_ID);
    expect(verifyReviewRedirect("2f0a7d2e-6b7e-4f2d-9a1e-0f3f5c1d9b12", sig)).toBe(false);
  });

  test("rejects a tampered or malformed signature without throwing", () => {
    const sig = signReviewRedirect(REQUEST_ID);
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyReviewRedirect(REQUEST_ID, flipped)).toBe(false);
    expect(verifyReviewRedirect(REQUEST_ID, "short")).toBe(false);
    expect(verifyReviewRedirect(REQUEST_ID, "")).toBe(false);
  });

  test("a rotated secret invalidates earlier links", () => {
    const sig = signReviewRedirect(REQUEST_ID);
    process.env.FLOW_TOKEN_SECRET = "another-secret";
    expect(verifyReviewRedirect(REQUEST_ID, sig)).toBe(false);
  });

  test("is not interchangeable with a flow token signed over the same id", async () => {
    const { signFlowToken } = await import("../../whatsapp/flows/flowToken.js");
    const token = signFlowToken({ surveyTeamMapId: REQUEST_ID, orgId: "o", phone: "1" });
    const flowSig = token.split(".")[2]!;
    expect(verifyReviewRedirect(REQUEST_ID, flowSig)).toBe(false);
  });

  test("throws when the secret is missing rather than signing with nothing", () => {
    delete process.env.FLOW_TOKEN_SECRET;
    expect(() => signReviewRedirect(REQUEST_ID)).toThrow(/FLOW_TOKEN_SECRET/);
  });
});

describe("buildReviewRedirectUrl", () => {
  test("uses API_URL, adding https when the scheme is missing", () => {
    const url = buildReviewRedirectUrl(REQUEST_ID);
    expect(url).toBe(`https://api.example.test${reviewRedirectPath(REQUEST_ID)}`);
    expect(url).toContain(`/api/public/loyalty/feedback/review/${REQUEST_ID}/`);
  });

  test("keeps an explicit scheme and drops a trailing slash", () => {
    process.env.API_URL = "http://localhost:3001/";
    expect(buildReviewRedirectUrl(REQUEST_ID).startsWith("http://localhost:3001/api/")).toBe(true);
  });

  test("refuses to build a link nobody could follow", () => {
    process.env.API_URL = "";
    expect(() => buildReviewRedirectUrl(REQUEST_ID)).toThrow(/API_URL/);
  });
});
