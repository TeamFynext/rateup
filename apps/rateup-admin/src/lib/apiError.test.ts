import { describe, expect, it } from "vitest";

import { getStaffErrorMessage } from "./apiError";

const refused = (status: number, data: unknown) => ({ response: { status, data } });

describe("getStaffErrorMessage", () => {
  it("speaks for the staff guard codes", () => {
    expect(getStaffErrorMessage(refused(403, { code: "NOT_OWNER", message: "api words" }))).toMatch(
      /staff owner/,
    );
    expect(
      getStaffErrorMessage(refused(403, { code: "OWN_ACCOUNT", message: "api words" })),
    ).toMatch(/belong to this account yourself/);
  });

  it("falls back to the API's message, then the fallback", () => {
    expect(getStaffErrorMessage(refused(400, { code: "BAD", message: "Nope." }))).toBe("Nope.");
    expect(getStaffErrorMessage({}, "That didn't work.")).toBe("That didn't work.");
  });
});
