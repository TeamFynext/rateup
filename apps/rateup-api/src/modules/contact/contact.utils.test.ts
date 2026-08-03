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
vi.mock("../whatsapp/messageTemplates/wa_templates.auth.js", () => ({
  verifyTemplateMessageLimit: vi.fn(),
}));
vi.mock("../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { verifyTemplateMessageLimit } from "../whatsapp/messageTemplates/wa_templates.auth.js";
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
  // NOTE: the whole body is commented out behind a "TODO: re-check", so the
  // registration cap is never applied. This is the same shape as the message
  // limiters in issues.txt 14.1(a) and 17.1 — a fourth dead gate.
  // See issues.txt 18.21.
  test("lets every registration through without checking anything", async () => {
    const rep = reply();

    await verifyLCustomerMaxCountRestrictionHandler(
      { body: { source: "LOYALTY" }, user: { orgId: ORG }, subscription: subscription(0) } as any,
      rep,
    );

    expect(rep.code).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.count).not.toHaveBeenCalled();
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

  // NOTE: pins current behaviour — the fourth copy of the "undefined max means
  // unlimited" defect, after issues.txt 11.7, 14.7 and 17.2. Any comparison
  // against undefined is false, so a plan that states no loyalty maximum grants
  // an unlimited one. See issues.txt 18.22.
  test("grants an unlimited allowance when the plan states no maximum", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(999999);

    expect(await verifyLCustomerMaxCountRestriction(ORG, subscription(undefined))).toBe(true);
  });

  // NOTE: `getNestedProperty` returns undefined for a plan with no whatsapp
  // feature at all, and `.count.max` is then read off it unguarded.
  // See issues.txt 18.22.
  test("throws for a plan with no whatsapp feature", async () => {
    await expect(
      verifyLCustomerMaxCountRestriction(ORG, { features: { webSurvey: {} } }),
    ).rejects.toThrow(TypeError);
  });

  // NOTE: an org that has no UsageStats row yet makes findUnique return null,
  // and the destructure on the next line throws. See issues.txt 18.22.
  test("throws for an org that has no usage stats row", async () => {
    db.usageStats.findUnique.mockResolvedValue(null);

    await expect(verifyLCustomerMaxCountRestriction(ORG, subscription(10))).rejects.toThrow(
      TypeError,
    );
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

  test("normalises a missing date of birth to null rather than undefined", async () => {
    await createLCustomer(input);

    expect(db.contact.upsert.mock.calls[0][0].update.dob).toBeNull();
    expect(db.contact.upsert.mock.calls[0][0].create.dob).toBeNull();
  });

  // NOTE: an existing contact's registration overwrites its stored name, email
  // and external id with whatever the registration form carried, even when those
  // fields were left blank. See issues.txt 18.23.
  test("an existing contact's fields are overwritten by the registration payload", async () => {
    await createLCustomer({ ...input, name: undefined, email: undefined });

    expect(db.contact.upsert.mock.calls[0][0].update).toMatchObject({
      name: undefined,
      email: undefined,
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

  test("checks the org's message allowance before sending", async () => {
    (getSubscription as Mock).mockResolvedValue({ id: "sub-1" });

    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"]);

    expect(getSubscription).toHaveBeenCalledWith(ORG);
    expect(verifyTemplateMessageLimit).toHaveBeenCalledWith({ id: "sub-1" });
  });

  // NOTE: the limit check it calls — verifyTemplateMessageLimit — is itself
  // entirely commented out (issues.txt 14.1a), so this send is unmetered too.
  // See issues.txt 18.21.
  test("sends anyway when the allowance check raises nothing", async () => {
    (verifyTemplateMessageLimit as Mock).mockResolvedValue(undefined);

    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"]);

    expect(sendTemplateToUserCore).toHaveBeenCalled();
  });

  test("does not send when the allowance check throws", async () => {
    (verifyTemplateMessageLimit as Mock).mockRejectedValue(new Error("limit reached"));

    await expect(handleSendTemplate("t1", ORG, "919000000001", ["Ann"])).rejects.toThrow(
      "limit reached",
    );
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
  });
});
