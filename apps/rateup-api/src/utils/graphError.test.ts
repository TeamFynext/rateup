import { describe, expect, it } from "vitest";

import { graphApiErrorDetail } from "./graphError.js";
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

  it("leaves an ordinary Error uncoded, so it is not retried on a guess", () => {
    expect(graphApiErrorDetail(new Error("Error calling Meta API"))).toEqual({
      message: "Error calling Meta API",
      type: "Error",
    });
  });
});
