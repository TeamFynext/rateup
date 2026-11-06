import { describe, expect, test } from "vitest";

import { isUnreachable, responseStatus } from "./network";

describe("isUnreachable", () => {
  test("no response at all is unreachable", () => {
    expect(isUnreachable({ code: "ERR_NETWORK" })).toBe(true);
    expect(isUnreachable({ code: "ECONNABORTED" })).toBe(true);
    expect(isUnreachable({ request: {} })).toBe(true);
  });

  // A 5xx arrived at the server and may have committed — it must not be queued.
  test("any response, even a 5xx, means the server was reached", () => {
    expect(isUnreachable({ response: { status: 500 } })).toBe(false);
    expect(isUnreachable({ response: { status: 404 } })).toBe(false);
    expect(isUnreachable(new Error("boom"))).toBe(false);
    expect(isUnreachable(null)).toBe(false);
  });
});

describe("responseStatus", () => {
  test("reads the status off an axios rejection, null otherwise", () => {
    expect(responseStatus({ response: { status: 404 } })).toBe(404);
    expect(responseStatus({ code: "ERR_NETWORK" })).toBeNull();
    expect(responseStatus("nope")).toBeNull();
  });
});
