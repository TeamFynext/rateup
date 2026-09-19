import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../modules/loyalty/accounts/account.service.js", () => ({
  getCustomerAccountByCardCode: vi.fn(),
  getCustomerAccountByPhone: vi.fn(),
}));

import {
  getCustomerAccountByCardCode,
  getCustomerAccountByPhone,
} from "../../../modules/loyalty/accounts/account.service.js";
import { ExternalApiError } from "../errors.js";
import { memberRefSchema, resolveMember } from "./memberRef.js";

type Mock = ReturnType<typeof vi.fn>;
const byCard = getCustomerAccountByCardCode as Mock;
const byPhone = getCustomerAccountByPhone as Mock;

const PROGRAM = { id: "prog-1", defaultCountryCode: "IN" };
const ORG = "org-1";
const account = { id: "acct-1" };

beforeEach(() => {
  vi.clearAllMocks();
  byCard.mockResolvedValue(account);
  byPhone.mockResolvedValue(account);
});

describe("the ref itself", () => {
  test("exactly one identifier is required", () => {
    expect(memberRefSchema.safeParse({ phone: "919000000001" }).success).toBe(true);
    expect(memberRefSchema.safeParse({ cardCode: "ABCDEFGHJ" }).success).toBe(true);
    expect(memberRefSchema.safeParse({}).success).toBe(false);
    expect(
      memberRefSchema.safeParse({ phone: "919000000001", cardCode: "ABCDEFGHJ" }).success,
    ).toBe(false);
  });
});

describe("card codes", () => {
  test.each([
    ["ABCDEFGHJ", "bare"],
    ["ABC-DEF-GHJ", "grouped, as printed on the card"],
    ["abc-def-ghj", "lower case"],
    ["ABCDEFGHJ.png", "the card image filename"],
  ])("%s is accepted (%s)", async (raw) => {
    await resolveMember(PROGRAM, ORG, { cardCode: raw });
    expect(byCard).toHaveBeenCalledWith("prog-1", "ABCDEFGHJ");
  });

  test("a code that does not parse is a 400, not a lookup", async () => {
    await expect(resolveMember(PROGRAM, ORG, { cardCode: "nope" })).rejects.toMatchObject({
      status: 400,
      code: "card_code_invalid",
    });
    expect(byCard).not.toHaveBeenCalled();
  });

  test("a well-formed code nobody holds is a 404", async () => {
    byCard.mockResolvedValue(null);
    await expect(resolveMember(PROGRAM, ORG, { cardCode: "ABCDEFGHJ" })).rejects.toMatchObject({
      status: 404,
      code: "member_not_found",
    });
  });
});

describe("phone numbers", () => {
  test.each([
    ["+919000000001", "E.164"],
    ["+91 90000 00001", "spaced"],
    ["09000000001", "local, with a trunk prefix"],
  ])("%s resolves to the stored digits (%s)", async (raw) => {
    await resolveMember(PROGRAM, ORG, { phone: raw });
    expect(byPhone).toHaveBeenCalledWith("prog-1", "919000000001", ORG);
  });

  test("the country comes from the programme", async () => {
    await resolveMember({ id: "prog-1", defaultCountryCode: "US" }, ORG, {
      phone: "(415) 555-2671",
    });
    expect(byPhone).toHaveBeenCalledWith("prog-1", "14155552671", ORG);
  });

  test("a number that is not a number is a 400", async () => {
    await expect(resolveMember(PROGRAM, ORG, { phone: "12345" })).rejects.toMatchObject({
      status: 400,
      code: "phone_invalid",
    });
  });
});

describe("the two identifiers never get confused", () => {
  /**
   * The card alphabet is A-Z without I and O, plus the digits 2-9 — so a card code can be
   * nine digits, which is also what a local phone number looks like. That overlap is
   * the whole reason this API asks which identifier the caller means instead of sniffing
   * one polymorphic path segment. On an endpoint that moves points, that is not acceptable.
   */
  const DIGITS = "947554835";
  const DE = { id: "prog-1", defaultCountryCode: "DE" };

  test("sent as a phone, it is a phone", async () => {
    await resolveMember(DE, ORG, { phone: "947554835958" });

    expect(byPhone).toHaveBeenCalledWith("prog-1", "49947554835958", ORG);
    expect(byCard).not.toHaveBeenCalled();
  });

  test("sent as a card code, an all-digit code is a card code", async () => {
    await resolveMember(DE, ORG, { cardCode: DIGITS });

    expect(byCard).toHaveBeenCalledWith("prog-1", DIGITS);
    expect(byPhone).not.toHaveBeenCalled();
  });
});

test("refusals are ExternalApiError, so the envelope shapes them", async () => {
  await expect(resolveMember(PROGRAM, ORG, { cardCode: "nope" })).rejects.toBeInstanceOf(
    ExternalApiError,
  );
});
