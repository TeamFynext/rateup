import { describe, expect, test } from "vite-plus/test";

import {
  addressWaPayload,
  echoIdentity,
  inboundIdentity,
  isBsuid,
  isParentBsuid,
  payloadAddress,
  waAddress,
} from "./bsuid.js";

describe("isBsuid", () => {
  test.each([
    ["US.13491208655302741918", true],
    ["US.ENT.11815799212886844830", true],
    ["IN.1684570989242773", true],
    ["919876543210", false],
    ["+919876543210", false],
    ["us.123", false],
    ["", false],
    [undefined, false],
  ])("%s → %s", (value, expected) => {
    expect(isBsuid(value)).toBe(expected);
  });

  test("tells a parent BSUID apart", () => {
    expect(isParentBsuid("US.ENT.118")).toBe(true);
    expect(isParentBsuid("US.118")).toBe(false);
  });
});

describe("inboundIdentity", () => {
  test("reads phone, BSUID and username", () => {
    const identity = inboundIdentity({ from: "919876543210", from_user_id: "IN.42" }, [
      { profile: { name: "Ann", username: "ann.k" }, wa_id: "919876543210", user_id: "IN.42" },
    ]);
    expect(identity).toEqual({ phone: "919876543210", bsuid: "IN.42", username: "ann.k" });
    expect(waAddress(identity)).toBe("919876543210");
  });

  test("a customer with their phone withheld is addressed by BSUID", () => {
    const identity = inboundIdentity({ from_user_id: "IN.42" }, [
      { profile: { name: "Ann", username: "ann.k" }, user_id: "IN.42" },
    ]);
    expect(identity.phone).toBeUndefined();
    expect(waAddress(identity)).toBe("IN.42");
  });

  test("fills a missing half from the contacts entry", () => {
    expect(inboundIdentity({ from: "911" }, [{ wa_id: "911", user_id: "IN.42" }]).bsuid).toBe(
      "IN.42",
    );
  });
});

describe("echoIdentity", () => {
  test("reads to_user_id when `to` is omitted", () => {
    expect(waAddress(echoIdentity({ to_user_id: "US.9" }))).toBe("US.9");
  });
  test("reads a BSUID send's `recipient`", () => {
    expect(echoIdentity({ recipient: "US.9" }).bsuid).toBe("US.9");
  });
});

describe("addressWaPayload", () => {
  test("moves a BSUID from `to` to `recipient`", () => {
    const sent = addressWaPayload({ messaging_product: "whatsapp", to: "US.9", type: "text" });
    expect(sent).toEqual({ messaging_product: "whatsapp", recipient: "US.9", type: "text" });
    expect(payloadAddress(sent)).toBe("US.9");
  });
  test("leaves a phone number alone", () => {
    const body = { messaging_product: "whatsapp", to: "919876543210" };
    expect(addressWaPayload(body)).toBe(body);
  });
});
