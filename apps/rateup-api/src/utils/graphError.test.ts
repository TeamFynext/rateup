import { describe, expect, it } from "vitest";

import { graphApiErrorDetail, isSendOutcomeUnknown } from "./graphError.js";
import { WA_TRANSPORT_ERROR_CODE } from "./waRetryableErrors.js";

describe("graphApiErrorDetail", () => {
  it("keeps Meta's own payload untouched", () => {
    const detail = { message: "Rate limit", code: 130429, type: "OAuthException" };
    expect(graphApiErrorDetail({ error: detail })).toBe(detail);
  });

  it("codes a refused connection as a transport failure", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8081"), {
      name: "AxiosError",
      code: "ECONNREFUSED",
    });
    expect(graphApiErrorDetail(error)).toMatchObject({
      code: WA_TRANSPORT_ERROR_CODE,
      transportCode: "ECONNREFUSED",
      message: "connect ECONNREFUSED 127.0.0.1:8081",
    });
  });

  it("keeps the HTTP status of a response that had no Graph body", () => {
    const error = Object.assign(new Error("Error calling Meta API"), {
      name: "MetaHttpError",
      status: 502,
    });
    expect(graphApiErrorDetail(error)).toEqual({
      message: "Error calling Meta API",
      type: "MetaHttpError",
      httpStatus: 502,
    });
  });

  it("flags a timeout or abort as a send whose outcome is unknown", () => {
    const transport = (code: string) =>
      graphApiErrorDetail(Object.assign(new Error(code), { name: "AxiosError", code }));
    expect(isSendOutcomeUnknown(transport("ECONNABORTED"))).toBe(true);
    expect(isSendOutcomeUnknown(transport("ERR_CANCELED"))).toBe(true);
    // Never connected, so nothing can have been delivered.
    expect(isSendOutcomeUnknown(transport("ECONNREFUSED"))).toBe(false);
    expect(isSendOutcomeUnknown({ code: 131026 })).toBe(false);
    expect(isSendOutcomeUnknown(undefined)).toBe(false);
  });

  it("leaves an ordinary Error uncoded, so it is not retried on a guess", () => {
    expect(graphApiErrorDetail(new Error("Error calling Meta API"))).toEqual({
      message: "Error calling Meta API",
      type: "Error",
    });
  });
});
