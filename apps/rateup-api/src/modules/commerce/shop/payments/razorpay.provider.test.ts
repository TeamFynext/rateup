import { describe, expect, test } from "vitest";

import { ShopError } from "../shop.errors.js";
import { razorpayContact, razorpayFailure } from "./razorpay.provider.js";

describe("a refusal from Razorpay", () => {
  test("becomes a readable shop error with Razorpay's own words", () => {
    const err = razorpayFailure({
      statusCode: 400,
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "The amount must be atleast INR 1.00",
        metadata: {},
        reason: "input_validation_failed",
        source: "business",
        step: "payment_initiation",
      },
    });
    expect(err).toBeInstanceOf(ShopError);
    expect((err as ShopError).message).toBe("Razorpay: The amount must be atleast INR 1.00");
    expect((err as ShopError).code).toBe("PAYMENT_FAILED");
  });

  test("without a description still reads as text", () => {
    expect((razorpayFailure({ statusCode: 500 }) as ShopError).message).toBe(
      "Razorpay: Razorpay couldn't process that request",
    );
  });

  test("leaves real errors alone", () => {
    const network = new Error("socket hang up");
    expect(razorpayFailure(network)).toBe(network);
  });
});

describe("the contact sent to Razorpay", () => {
  test("is the compact number when Razorpay can take it", () => {
    expect(razorpayContact("+91 98765 43210")).toBe("+919876543210");
  });

  test("is left off when it is too short or too long", () => {
    expect(razorpayContact("+919")).toBeUndefined();
    expect(razorpayContact("+1234567890123456")).toBeUndefined();
    expect(razorpayContact(null)).toBeUndefined();
  });
});
