import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    contact: { upsert: vi.fn() },
    contactCustomFieldValue: { createMany: vi.fn(), deleteMany: vi.fn() },
    customerLoyaltyAccount: { count: vi.fn() },
    usageStats: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../subscription/subscription.service.js", () => ({ getSubscription: vi.fn() }));
vi.mock("../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { sendTemplateToUserCore } from "../whatsapp/messageTemplates/wa_templates.controller.js";
import {
  createLCustomer,
  handlePostRegisterAction,
  handleSendTemplate,
  verifyLCustomerMaxCountRestriction,
  verifyLCustomerMaxCountRestrictionHandler,
} from "./contact.utils.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  contactCustomFieldValue: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  usageStats: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

/// A subscription whose whatsapp plan caps loyalty registrations at `max`.
function subscription(max: number | undefined) {
  return { features: { whatsapp: { count: { max } } } };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.customerLoyaltyAccount.count.mockResolvedValue(0);
  db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 0 });
  db.contact.upsert.mockResolvedValue({ id: "c1", name: "Ann", phone: "919000000001" });
});

describe("verifyLCustomerMaxCountRestrictionHandler", () => {
  // The whole body was commented out behind a "TODO: re-check", so this was an
  // empty async function registered as a preHandler — a gate that read like a plan
  // limit and enforced nothing, while the working implementation sat directly
  // beneath it with no callers. Wired up rather than deleted: unlike the four dead
  // MESSAGE-limit gates (issues.txt 14.1a, 17.1, 17.10) this is a different meter
  // and was not superseded. See issues.txt 18.21.
  test("refuses a registration once the org is at its cap", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(5);
    const rep = reply();

    await verifyLCustomerMaxCountRestrictionHandler(
      { body: { source: "LOYALTY" }, user: { orgId: ORG }, subscription: subscription(5) } as any,
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send.mock.calls[0][0]).toMatchObject({ message: "Registration limit reached" });
  });

  test("lets a registration through while the org is under its cap", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(1);
    const rep = reply();

    await verifyLCustomerMaxCountRestrictionHandler(
      { body: { source: "LOYALTY" }, user: { orgId: ORG }, subscription: subscription(5) } as any,
      rep,
    );

    expect(rep.code).not.toHaveBeenCalled();
  });

  // The cap is a LOYALTY registration cap, so an ordinary contact create never
  // reaches it, and never pays for the two queries behind it.
  test("ignores a create that is not a loyalty registration", async () => {
    const rep = reply();

    await verifyLCustomerMaxCountRestrictionHandler(
      { body: { source: "manual" }, user: { orgId: ORG }, subscription: subscription(0) } as any,
      rep,
    );

    expect(rep.code).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.count).not.toHaveBeenCalled();
  });

  // Enabling it changes nothing today: no plan in subscription.data.ts states a
  // `whatsapp.count.max`, so every real subscription reports "no limit".
  test("enforces nothing for a plan that states no maximum", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(999999);
    const rep = reply();

    await verifyLCustomerMaxCountRestrictionHandler(
      {
        body: { source: "LOYALTY" },
        user: { orgId: ORG },
        subscription: subscription(undefined),
      } as any,
      rep,
    );

    expect(rep.code).not.toHaveBeenCalled();
  });
});

describe("verifyLCustomerMaxCountRestriction", () => {
  test("refuses an org with no subscription", async () => {
    expect(await verifyLCustomerMaxCountRestriction(ORG, null)).toBe(false);
    expect(db.customerLoyaltyAccount.count).not.toHaveBeenCalled();
  });

  test("counts only this org's loyalty-program contacts", async () => {
    await verifyLCustomerMaxCountRestriction(ORG, subscription(10));

    expect(db.customerLoyaltyAccount.count).toHaveBeenCalledWith({
      where: { contact: { orgId: ORG, source: "loyalty_program" } },
    });
  });

  test("allows a registration while the org is under its cap", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(9);

    expect(await verifyLCustomerMaxCountRestriction(ORG, subscription(10))).toBe(true);
  });

  test("refuses once the org has reached its cap", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(10);

    expect(await verifyLCustomerMaxCountRestriction(ORG, subscription(10))).toBe(false);
  });

  test("repairs a usage counter that has drifted from the real count", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(7);
    db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 3 });

    await verifyLCustomerMaxCountRestriction(ORG, subscription(10));

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: { loyaltyCustomerCount: 7 },
    });
  });

  test("leaves an accurate usage counter alone", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(7);
    db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 7 });

    await verifyLCustomerMaxCountRestriction(ORG, subscription(10));

    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  // A plan that names no maximum means NO LIMIT — the same reading as
  // enforceWhatsappCountLimit, which is the shared version of this gate for flows,
  // templates, campaigns and automated replies (issues.txt 11.7, 14.7, 17.2). It
  // used to arrive at the same answer by accident, via `count >= undefined`, which
  // is always false and read like a check. See issues.txt 18.22.
  test("grants an unlimited allowance when the plan states no maximum", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(999999);

    expect(await verifyLCustomerMaxCountRestriction(ORG, subscription(undefined))).toBe(true);
  });

  // getNestedProperty returns undefined for a plan with no whatsapp feature at
  // all, and `.count.max` used to be read off it unguarded — a TypeError. A plan
  // with no whatsapp feature states no maximum, which means no limit.
  // See issues.txt 18.22.
  test("enforces nothing for a plan with no whatsapp feature", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(999999);

    await expect(
      verifyLCustomerMaxCountRestriction(ORG, { features: { webSurvey: {} } }),
    ).resolves.toBe(true);
  });

  // An org with no UsageStats row yet made findUnique return null and the
  // destructure on the next line threw — harmless while nothing called this
  // function (18.21), and a 500 on every registration the moment it was wired up.
  // See issues.txt 18.22.
  test("copes with an org that has no usage stats row", async () => {
    db.usageStats.findUnique.mockResolvedValue(null);

    await expect(verifyLCustomerMaxCountRestriction(ORG, subscription(10))).resolves.toBe(true);
    expect(db.usageStats.update).not.toHaveBeenCalled();
  });
});

describe("createLCustomer", () => {
  const input = { name: "Ann", phone: "+919000000001", orgId: ORG, email: "a@b.c" };

  test("upserts on the phone+org key with the plus stripped", async () => {
    await createLCustomer(input);

    expect(db.contact.upsert.mock.calls[0][0].where).toEqual({
      contact_phone_org_id_unique: { phone: "919000000001", orgId: ORG },
    });
  });

  test("leaves a phone that has no plus alone", async () => {
    await createLCustomer({ ...input, phone: "919000000001" });

    expect(db.contact.upsert.mock.calls[0][0].where.contact_phone_org_id_unique.phone).toBe(
      "919000000001",
    );
  });

  test("marks the contact as a loyalty member on both branches", async () => {
    await createLCustomer(input);

    const call = db.contact.upsert.mock.calls[0][0];
    expect(call.update.source).toBe("LOYALTY");
    expect(call.create.source).toBe("LOYALTY");
  });

  test("normalises a date of birth the payload carried as null", async () => {
    await createLCustomer({ ...input, dob: null });

    expect(db.contact.upsert.mock.calls[0][0].update.dob).toBeNull();
    expect(db.contact.upsert.mock.calls[0][0].create.dob).toBeNull();
  });

  // An existing contact's registration used to overwrite its stored name, email
  // and external id with whatever the registration form carried — including
  // undefined, when the form omitted them. The registration form is the least
  // trustworthy source of contact data in the system and it won over everything
  // already known. See issues.txt 18.23.
  test("leaves a stored field alone when the registration payload omits it", async () => {
    await createLCustomer({ ...input, name: undefined, email: undefined });

    const { update } = db.contact.upsert.mock.calls[0][0];
    expect(update).not.toHaveProperty("name");
    expect(update).not.toHaveProperty("email");
    expect(update.source).toBe("LOYALTY");
  });

  test("writes the fields the registration payload does carry", async () => {
    await createLCustomer({ ...input, name: "Ann", email: "a@b.c", external_id: "x1" });

    expect(db.contact.upsert.mock.calls[0][0].update).toMatchObject({
      name: "Ann",
      email: "a@b.c",
      external_id: "x1",
    });
  });

  test("replaces the custom field values when the registration carried any", async () => {
    await createLCustomer({ ...input, customFields: [{ id: "f1", value: "gold" }] });

    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1" },
    });
    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", fieldId: "f1", value: "gold" }],
      skipDuplicates: true,
    });
  });

  test("leaves the custom field values alone when none were sent", async () => {
    await createLCustomer(input);

    expect(db.contactCustomFieldValue.deleteMany).not.toHaveBeenCalled();
  });

  test("counts the registration against the org's monthly whatsapp usage", async () => {
    await createLCustomer(input);

    expect(updateMonthlyStat).toHaveBeenCalledWith("whatsapp", ORG);
  });

  test("returns only the public fields of the contact", async () => {
    db.contact.upsert.mockResolvedValue({
      id: "c1",
      name: "Ann",
      phone: "919000000001",
      email: "a@b.c",
      dob: null,
      orgId: ORG,
      notes: "internal",
    });

    const res = await createLCustomer(input);

    expect(res).toEqual({
      id: "c1",
      name: "Ann",
      phone: "919000000001",
      email: "a@b.c",
      dob: null,
    });
  });
});

describe("handlePostRegisterAction", () => {
  // NOTE: the whole body is commented out, so nothing configured as a
  // post-registration action ever runs. See issues.txt 18.21.
  test("is a no-op", async () => {
    expect(await handlePostRegisterAction(ORG, "c1")).toBeUndefined();
  });
});

describe("handleSendTemplate", () => {
  test("does nothing when no template was configured", async () => {
    await handleSendTemplate(null, ORG, "919000000001", ["Ann"]);

    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
    expect(getSubscription).not.toHaveBeenCalled();
  });

  test("wraps the dynamic variables as body text parameters", async () => {
    await handleSendTemplate("t1", ORG, "919000000001", ["Ann", "500"]);

    expect(sendTemplateToUserCore).toHaveBeenCalledWith(
      ORG,
      "t1",
      "919000000001",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Ann" },
            { type: "text", text: "500" },
          ],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  // The verifyTemplateMessageLimit call that stood here is gone. It was entirely
  // commented out, so it metered nothing — and the product has a CONVERSATION
  // limit, not a message limit. sendMessage, which sendTemplateToUserCore reaches,
  // enforces that one. See issues.txt 14.1(a).
  test("sends without consulting a per-message allowance", async () => {
    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"]);

    expect(sendTemplateToUserCore).toHaveBeenCalled();
  });
});
