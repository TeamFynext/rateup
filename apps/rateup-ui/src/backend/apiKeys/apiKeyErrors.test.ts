import { describe, expect, test } from "vite-plus/test";

import { apiKeyGrantDenialMessage, getApiKeyGrantDenial } from "./apiKeyErrors.ts";

const refusal = (status: number, data: unknown) => ({ response: { status, data } });
const t = (key: string, values?: Record<string, unknown>) =>
  values ? key.replace("{detail}", String(values.detail)) : key;

describe("getApiKeyGrantDenial", () => {
  test("a team-scoped member", () => {
    expect(getApiKeyGrantDenial(refusal(403, { reason: "scope", message: "x" }))).toEqual({
      reason: "scope",
    });
  });

  test("permissions the member lacks, with the API's message", () => {
    const message = "This key would hold contacts.manage, which you do not hold yourself.";
    expect(getApiKeyGrantDenial(refusal(403, { reason: "permission", message }))).toEqual({
      reason: "permission",
      detail: message,
    });
  });

  test("other failures are not grant refusals", () => {
    expect(getApiKeyGrantDenial(refusal(403, { reason: "subscription" }))).toBeNull();
    expect(getApiKeyGrantDenial(refusal(400, { reason: "permission" }))).toBeNull();
    expect(getApiKeyGrantDenial(new Error("network"))).toBeNull();
  });
});

describe("apiKeyGrantDenialMessage", () => {
  test("names the missing permissions", () => {
    expect(
      apiKeyGrantDenialMessage(
        refusal(403, { reason: "permission", message: "This key would hold loyalty.manage." }),
        t,
      ),
    ).toBe("You can only give a key access you have yourself. This key would hold loyalty.manage.");
  });

  test("explains the team restriction", () => {
    expect(apiKeyGrantDenialMessage(refusal(403, { reason: "scope" }), t)).toMatch(/every team/);
  });

  test("null for anything else", () => {
    expect(apiKeyGrantDenialMessage(refusal(409, {}), t)).toBeNull();
  });
});
