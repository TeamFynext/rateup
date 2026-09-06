import { describe, expect, it } from "vitest";

import {
  classifyWaFailure,
  isRetryable,
  RETRYABLE_ERROR_CODES,
  waFailureLabel,
  waFailureReasonGroup,
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
    [131026, WaFailureClass.PERMANENT],
    [131047, WaFailureClass.PERMANENT],
    [131051, WaFailureClass.PERMANENT],
    [131008, WaFailureClass.PERMANENT],
    [133010, WaFailureClass.PERMANENT],
  ])("classifies %i as %s", (code, expected) => {
    expect(classifyWaFailure(code)).toBe(expected);
  });

  it("treats the whole 132xxx block as a permanent template problem", () => {
    for (const code of [132000, 132001, 132012, 132015, 132068, 132999]) {
      expect(classifyWaFailure(code)).toBe(WaFailureClass.PERMANENT);
      expect(waFailureReasonGroup(code)).toBe(WaFailureReasonGroup.TEMPLATE_ISSUE);
    }
    // Just outside the block, so it must not be swept in.
    expect(classifyWaFailure(133000)).toBe(WaFailureClass.UNKNOWN);
  });

  it("returns UNKNOWN for an unmapped code, and for no code at all", () => {
    expect(classifyWaFailure(999999)).toBe(WaFailureClass.UNKNOWN);
    expect(classifyWaFailure(undefined)).toBe(WaFailureClass.UNKNOWN);
    expect(classifyWaFailure(null)).toBe(WaFailureClass.UNKNOWN);
  });

  it("treats a 5xx as transient when the code itself is unmapped", () => {
    expect(classifyWaFailure(undefined, 503)).toBe(WaFailureClass.TRANSIENT);
    expect(classifyWaFailure(999999, 500)).toBe(WaFailureClass.TRANSIENT);
  });

  it("keeps a documented permanent failure permanent even when served with a 5xx", () => {
    expect(classifyWaFailure(131026, 500)).toBe(WaFailureClass.PERMANENT);
  });

  it("does not treat a 4xx as transient", () => {
    expect(classifyWaFailure(undefined, 400)).toBe(WaFailureClass.UNKNOWN);
  });
});

describe("isRetryable", () => {
  it("retries frequency caps and transient failures", () => {
    expect(isRetryable(131049, ENABLED)).toBe(true);
    expect(isRetryable(130429, ENABLED)).toBe(true);
  });

  it("never retries permanent failures", () => {
    expect(isRetryable(131026, ENABLED)).toBe(false);
    expect(isRetryable(132001, ENABLED)).toBe(false);
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
    expect(waFailureLabel(131026)).toBe("Number is not on WhatsApp or cannot receive messages");
    expect(waFailureLabel(131049)).toBe("Meta limited marketing messages to this contact");
    // Unmapped codes still say something, and keep the code for support.
    expect(waFailureLabel(999999)).toBe("Unrecognised error (999999)");
  });
});

describe("RETRYABLE_ERROR_CODES", () => {
  it("is exactly the retryable half of the table", () => {
    expect([...RETRYABLE_ERROR_CODES].sort((a, b) => a - b)).toEqual([
      1, 2, 368, 130429, 130472, 131048, 131049, 133016,
    ]);
  });

  it("agrees with classifyWaFailure", () => {
    for (const code of RETRYABLE_ERROR_CODES) {
      expect(isRetryable(code, ENABLED)).toBe(true);
    }
  });
});
