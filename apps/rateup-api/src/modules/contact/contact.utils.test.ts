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
  reconcileLoyaltyCustomerCount,
  handlePostRegisterAction,
  handleSendTemplate,
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

describe("reconcileLoyaltyCustomerCount", () => {
  // All that survives of a registration limit that never refused anything: the counter the
  // dashboard reads drifts, and a registration is when a real count is in hand.
  test("counts only this org's loyalty-program contacts", async () => {
    await reconcileLoyaltyCustomerCount(ORG);

    expect(db.customerLoyaltyAccount.count).toHaveBeenCalledWith({
      where: { contact: { orgId: ORG, source: "loyalty_program" } },
    });
  });

  test("repairs a usage counter that has drifted from the real count", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(7);
    db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 3 });

    await reconcileLoyaltyCustomerCount(ORG);

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: { loyaltyCustomerCount: 7 },
    });
  });

  test("leaves an accurate usage counter alone", async () => {
    db.customerLoyaltyAccount.count.mockResolvedValue(7);
    db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 7 });

    await reconcileLoyaltyCustomerCount(ORG);

    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  test("copes with an org that has no usage stats row", async () => {
    db.usageStats.findUnique.mockResolvedValue(null);

    await expect(reconcileLoyaltyCustomerCount(ORG)).resolves.toBeUndefined();
    expect(db.usageStats.update).not.toHaveBeenCalled();
  });

  test("runs as part of a registration, which is where the old gate ran", async () => {
    // Without a caller this is dead code and the counter goes stale forever.
    db.customerLoyaltyAccount.count.mockResolvedValue(7);
    db.usageStats.findUnique.mockResolvedValue({ loyaltyCustomerCount: 3 });

    await createLCustomer({ phone: "+919000000000", orgId: ORG });

    expect(db.usageStats.update).toHaveBeenCalledWith({
      where: { orgId: ORG },
      data: { loyaltyCustomerCount: 7 },
    });
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

  test("sends without consulting a per-message allowance", async () => {
    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"]);

    expect(sendTemplateToUserCore).toHaveBeenCalled();
  });
});
