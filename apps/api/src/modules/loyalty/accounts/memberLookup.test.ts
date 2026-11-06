import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import prisma from "../../../utils/prisma.js";
import { resolveProgramMember } from "./memberLookup.js";

const db = prisma as unknown as Record<string, any>;

const PROGRAM = "prog-1";
const ORG = "org-1";
const base = { programId: PROGRAM, orgId: ORG, defaultCountryCode: "IN" };
const member = (over: Record<string, unknown> = {}) => ({
  id: "acct-1",
  contact: { id: "contact-1", phone: "919000000001", email: "ann@example.com", orgId: ORG },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.customerLoyaltyAccount.findFirst.mockResolvedValue(null);
  db.customerLoyaltyAccount.findMany.mockResolvedValue([]);
});

describe("phone normalisation", () => {
  // Every one of these reached nobody before the resolver switched from `parsePhoneforWa`
  // (which only strips a leading "+") to libphonenumber.
  test.each([
    ["+919000000001", "E.164"],
    ["+91 90000 00001", "spaced, the way Shopify sends it"],
    ["09000000001", "a bare local number"],
    ["9000000001", "no trunk prefix"],
  ])("%s resolves to the stored digits (%s)", async (raw) => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(member());

    const res = await resolveProgramMember({ ...base, phone: raw });

    expect(res.status).toBe("matched");
    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where.contact.phone).toBe(
      "919000000001",
    );
  });

  test("the country comes from the programme, not a hardcoded IN", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(member());

    await resolveProgramMember({
      ...base,
      defaultCountryCode: "US",
      phone: "(415) 555-2671",
    });

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where.contact.phone).toBe(
      "14155552671",
    );
  });

  test("an unparseable number with no email is reported as such", async () => {
    const res = await resolveProgramMember({ ...base, phone: "12" });

    expect(res).toEqual({ status: "not_found", reason: "phone_invalid" });
    expect(db.customerLoyaltyAccount.findFirst).not.toHaveBeenCalled();
  });
});

describe("scoping", () => {
  test("is scoped to the programme and the org, and to active accounts", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(member());

    await resolveProgramMember({ ...base, phone: "919000000001" });

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where).toMatchObject({
      programId: PROGRAM,
      status: "active",
      contact: { orgId: ORG, phone: "919000000001" },
    });
  });

  test("a suspended member does not earn", async () => {
    const res = await resolveProgramMember({ ...base, phone: "919000000001" });

    expect(res).toEqual({ status: "not_found", reason: "not_enrolled" });
  });

  test("includeInactive lifts the status filter for callers that must explain why", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(member());

    await resolveProgramMember({ ...base, phone: "919000000001", includeInactive: true });

    expect(db.customerLoyaltyAccount.findFirst.mock.calls[0][0].where.status).toBeUndefined();
  });
});

describe("email fallback", () => {
  test("an email-only customer is matched", async () => {
    // Shopify makes email mandatory at checkout and phone optional, so this is the common
    // case, not the edge case.
    db.customerLoyaltyAccount.findMany.mockResolvedValue([member()]);

    const res = await resolveProgramMember({ ...base, email: "Ann@Example.com" });

    expect(res).toMatchObject({ status: "matched", matchedBy: "email" });
    expect(db.customerLoyaltyAccount.findMany.mock.calls[0][0].where.contact.email).toEqual({
      equals: "ann@example.com",
      mode: "insensitive",
    });
  });

  test("phone wins when both identify someone", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(member());

    const res = await resolveProgramMember({
      ...base,
      phone: "919000000001",
      email: "someone.else@example.com",
    });

    expect(res).toMatchObject({ status: "matched", matchedBy: "phone" });
    expect(db.customerLoyaltyAccount.findMany).not.toHaveBeenCalled();
  });

  test("an unparseable phone still falls through to the email", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([member()]);

    const res = await resolveProgramMember({ ...base, phone: "12", email: "ann@example.com" });

    expect(res).toMatchObject({ status: "matched", matchedBy: "email" });
  });

  test("a shared email awards nothing rather than guessing", async () => {
    // Contact.email has no uniqueness. Points are money-equivalent and a wrong guess is
    // unauditable, so this is reported for a human to resolve by merging the contacts.
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      member({ id: "acct-1" }),
      member({ id: "acct-2" }),
    ]);

    const res = await resolveProgramMember({ ...base, email: "family@example.com" });

    expect(res).toEqual({
      status: "ambiguous",
      matchedBy: "email",
      candidateAccountIds: ["acct-1", "acct-2"],
    });
  });

  test("a supplied phone is the one tie-break allowed on a shared email", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      member({ id: "acct-1", contact: { phone: "919000000001", orgId: ORG } }),
      member({ id: "acct-2", contact: { phone: "919000000002", orgId: ORG } }),
    ]);

    const res = await resolveProgramMember({
      ...base,
      phone: "919000000001",
      email: "family@example.com",
    });

    expect(res).toMatchObject({ status: "matched", matchedBy: "phone" });
    expect((res as { account: { id: string } }).account.id).toBe("acct-1");
  });

  test("a shared email that the phone cannot narrow stays ambiguous", async () => {
    db.customerLoyaltyAccount.findMany.mockResolvedValue([
      member({ id: "acct-1", contact: { phone: "919000000003", orgId: ORG } }),
      member({ id: "acct-2", contact: { phone: "919000000004", orgId: ORG } }),
    ]);

    const res = await resolveProgramMember({
      ...base,
      phone: "919000000001",
      email: "family@example.com",
    });

    expect(res.status).toBe("ambiguous");
  });
});

test("no identifier at all is distinguishable from not enrolled", async () => {
  expect(await resolveProgramMember(base)).toEqual({
    status: "not_found",
    reason: "no_identifier",
  });
});
