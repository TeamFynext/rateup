import { describe, expect, it } from "vitest";

import {
  classifyWaFailure,
  isRetryable,
  RETRYABLE_ERROR_CODES,
  waFailureLabel,
  waFailureReasonGroup,
  WA_TRANSPORT_ERROR_CODE,
  WaFailureClass,
  WaFailureReasonGroup,
} from "./waRetryableErrors.js";

const ENABLED = { enabled: true };

describe("classifyWaFailure", () => {
  it.each([
    [131049, WaFailureClass.FREQUENCY_CAP],
    [130472, WaFailureClass.FREQUENCY_CAP],
    [130429, WaFailureClass.TRANSIENT],
    [131048, WaFailureClass.TRANSIENT],
    [368, WaFailureClass.TRANSIENT],
    [133016, WaFailureClass.TRANSIENT],
    [1, WaFailureClass.TRANSIENT],
    [2, WaFailureClass.TRANSIENT],
    [131000, WaFailureClass.TRANSIENT],
    [131016, WaFailureClass.TRANSIENT],
    [131056, WaFailureClass.TRANSIENT],
    [131057, WaFailureClass.TRANSIENT],
    [4, WaFailureClass.TRANSIENT],
    [80007, WaFailureClass.TRANSIENT],
    [131026, WaFailureClass.PERMANENT],
    [131047, WaFailureClass.RETRY_LATER],
    [131064, WaFailureClass.RETRY_LATER],
    [132069, WaFailureClass.RETRY_LATER],
    [134101, WaFailureClass.RETRY_LATER],
    [131051, WaFailureClass.PERMANENT],
    [131008, WaFailureClass.PERMANENT],
    [133010, WaFailureClass.PERMANENT],
    [130403, WaFailureClass.PERMANENT],
    [131050, WaFailureClass.PERMANENT],
    [131063, WaFailureClass.PERMANENT],
    [0, WaFailureClass.PERMANENT],
    [190, WaFailureClass.PERMANENT],
    [100, WaFailureClass.PERMANENT],
  ])("classifies %i as %s", (code, expected) => {
    expect(classifyWaFailure(code)).toBe(expected);
  });

  it("treats the whole 132xxx block as a permanent template problem", () => {
    for (const code of [132000, 132001, 132012, 132015, 132068, 132999]) {
      expect(classifyWaFailure(code)).toBe(WaFailureClass.PERMANENT);
      expect(waFailureReasonGroup(code)).toBe(WaFailureReasonGroup.TEMPLATE_ISSUE);
    }
    // Just outside the block, so it must not be swept in.
    expect(waFailureReasonGroup(131999)).toBe(WaFailureReasonGroup.OTHER);
  });

  it("treats the whole 200–299 permission block as permanent", () => {
    for (const code of [200, 230, 299]) {
      expect(classifyWaFailure(code)).toBe(WaFailureClass.PERMANENT);
    }
    // Outside the block these still classify as permanent, but as unrecognised.
    expect(waFailureLabel(199)).toBe("Unrecognised error (199)");
    expect(waFailureLabel(300)).toBe("Unrecognised error (300)");
  });

  it("treats an unmapped code, and no code at all, as permanent", () => {
    expect(classifyWaFailure(999999)).toBe(WaFailureClass.PERMANENT);
    expect(classifyWaFailure(undefined)).toBe(WaFailureClass.PERMANENT);
    expect(classifyWaFailure(null)).toBe(WaFailureClass.PERMANENT);
  });

  it("covers the management-side codes from the spec as permanent", () => {
    for (const code of [2388019, 2388103, 200005, 2593107, 1752041, 131052]) {
      expect(classifyWaFailure(code)).toBe(WaFailureClass.PERMANENT);
    }
    expect(classifyWaFailure(2494100)).toBe(WaFailureClass.TRANSIENT);
  });

  it("treats a 5xx as transient when the code itself is unmapped", () => {
    expect(classifyWaFailure(undefined, 503)).toBe(WaFailureClass.TRANSIENT);
    expect(classifyWaFailure(999999, 500)).toBe(WaFailureClass.TRANSIENT);
  });

  it("keeps a documented permanent failure permanent even when served with a 5xx", () => {
    expect(classifyWaFailure(133010, 500)).toBe(WaFailureClass.PERMANENT);
  });

  it("does not treat a 4xx as transient", () => {
    expect(classifyWaFailure(undefined, 400)).toBe(WaFailureClass.PERMANENT);
  });
});

describe("isRetryable", () => {
  it("retries frequency caps and transient failures", () => {
    expect(isRetryable(131049, ENABLED)).toBe(true);
    expect(isRetryable(130429, ENABLED)).toBe(true);
  });

  it("never retries permanent failures", () => {
    expect(isRetryable(133010, ENABLED)).toBe(false);
    expect(isRetryable(132001, ENABLED)).toBe(false);
    expect(isRetryable(131051, ENABLED)).toBe(false);
  });

  it("never retries an undeliverable number", () => {
    expect(isRetryable(131026, ENABLED)).toBe(false);
  });

  it("retries a closed 24-hour window later — but the dispatcher never retries it in place", () => {
    expect(isRetryable(131047, ENABLED)).toBe(true);
    // Only TRANSIENT earns another BullMQ attempt against the same number.
    expect(classifyWaFailure(131047)).not.toBe(WaFailureClass.TRANSIENT);
  });

  it("never retries an unclassified code — an unknown code burns allowance to learn nothing", () => {
    expect(isRetryable(999999, ENABLED)).toBe(false);
    expect(isRetryable(undefined, ENABLED)).toBe(false);
  });

  it("retries nothing without an enabled policy", () => {
    expect(isRetryable(131049, null)).toBe(false);
    expect(isRetryable(131049, undefined)).toBe(false);
    expect(isRetryable(131049, { enabled: false })).toBe(false);
  });
});

describe("failure reason grouping", () => {
  it("groups the codes the breakdown renders", () => {
    expect(waFailureReasonGroup(131049)).toBe(WaFailureReasonGroup.LIMITED_BY_META);
    expect(waFailureReasonGroup(130429)).toBe(WaFailureReasonGroup.LIMITED_BY_META);
    expect(waFailureReasonGroup(131026)).toBe(WaFailureReasonGroup.INVALID_NUMBER);
    expect(waFailureReasonGroup(133010)).toBe(WaFailureReasonGroup.OTHER);
    expect(waFailureReasonGroup(undefined)).toBe(WaFailureReasonGroup.OTHER);
  });

  it("gives a customer-readable label rather than the bare code", () => {
    expect(waFailureLabel(131026)).toBe("Number could not receive the message");
    expect(waFailureLabel(131049)).toBe("Meta limited marketing messages to this contact");
    // Unmapped codes still say something, and keep the code for support.
    expect(waFailureLabel(999999)).toBe("Unrecognised error (999999)");
  });
});

describe("RETRYABLE_ERROR_CODES", () => {
  it("is exactly the retryable half of the table", () => {
    expect([...RETRYABLE_ERROR_CODES].sort((a, b) => a - b)).toEqual([
      // -1 is the transport sentinel: a request that never reached Meta.
      WA_TRANSPORT_ERROR_CODE,
      1,
      2,
      4,
      368,
      80007,
      130429,
      130472,
      131000,
      131016,
      131047,
      131048,
      131049,
      131056,
      131057,
      131064,
      132069,
      133004,
      133015,
      133016,
      134101,
      2494100,
    ]);
  });

  it("agrees with classifyWaFailure", () => {
    for (const code of RETRYABLE_ERROR_CODES) {
      expect(isRetryable(code, ENABLED)).toBe(true);
    }
  });
});

describe("transport failures", () => {
  it("is transient, so both retry layers pick it up", () => {
    expect(classifyWaFailure(WA_TRANSPORT_ERROR_CODE)).toBe(WaFailureClass.TRANSIENT);
    expect(isRetryable(WA_TRANSPORT_ERROR_CODE, ENABLED)).toBe(true);
  });

  it("says what happened rather than showing the sentinel", () => {
    expect(waFailureLabel(WA_TRANSPORT_ERROR_CODE)).toBe("Could not reach WhatsApp");
  });
});
