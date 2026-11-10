import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    contact: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    contactCustomFieldValue: { createMany: vi.fn(), deleteMany: vi.fn() },
    customerLoyaltyAccount: { count: vi.fn() },
    usageStats: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./identity/contactFields.js", () => ({
  findOrCreateContactByIdentity: vi.fn(),
  setPrimaryIdentities: vi.fn(),
  primaryIdentities: { identities: {} },
  withContactFields: ({ identities, ...row }: any) => ({
    ...row,
    phone: identities?.find((i: any) => i.kind === "PHONE")?.value ?? null,
    email: identities?.find((i: any) => i.kind === "EMAIL")?.value ?? null,
  }),
}));
vi.mock("./identity/identity.service.js", () => ({
  IdentityTakenError: class IdentityTakenError extends Error {},
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
import { findOrCreateContactByIdentity, setPrimaryIdentities } from "./identity/contactFields.js";
import { IdentityTakenError } from "./identity/identity.service.js";
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
  vi.mocked(findOrCreateContactByIdentity).mockResolvedValue({
    contact: { id: "c1" },
    created: false,
  } as any);
  db.contact.findUniqueOrThrow.mockResolvedValue({
    id: "c1",
    name: "Ann",
    dob: null,
    identities: [{ kind: "PHONE", value: "919000000001" }],
  });
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
  const findOrCreate = () => vi.mocked(findOrCreateContactByIdentity).mock.calls[0];

  test("finds or creates the contact by its phone, with the plus stripped", async () => {
    await createLCustomer(input);

    expect(findOrCreate()[0]).toBe(ORG);
    expect(findOrCreate()[1]).toBe("phone");
    expect(findOrCreate()[2]).toBe("919000000001");
  });

  test("leaves a phone that has no plus alone", async () => {
    await createLCustomer({ ...input, phone: "919000000001" });

    expect(findOrCreate()[2]).toBe("919000000001");
  });

  test("marks the contact as a loyalty member on both branches", async () => {
    await createLCustomer(input);
    expect(findOrCreate()[3].source).toBe("LOYALTY");
    expect(db.contact.update.mock.calls[0][0].data.source).toBe("LOYALTY");
  });

  test("a new contact is not written twice", async () => {
    vi.mocked(findOrCreateContactByIdentity).mockResolvedValue({
      contact: { id: "c1" },
      created: true,
    } as any);
    await createLCustomer(input);
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("normalises a date of birth the payload carried as null", async () => {
    await createLCustomer({ ...input, dob: null });

    expect(db.contact.update.mock.calls[0][0].data.dob).toBeNull();
    expect(findOrCreate()[3].dob).toBeNull();
  });

  test("leaves a stored field alone when the registration payload omits it", async () => {
    await createLCustomer({ ...input, name: undefined, email: undefined });

    const { data } = db.contact.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("name");
    expect(data.source).toBe("LOYALTY");
    expect(setPrimaryIdentities).not.toHaveBeenCalled();
  });

  test("writes the fields the registration payload does carry", async () => {
    await createLCustomer({ ...input, name: "Ann", email: "a@b.c", external_id: "x1" });

    expect(db.contact.update.mock.calls[0][0].data).toMatchObject({
      name: "Ann",
      external_id: "x1",
    });
    expect(setPrimaryIdentities).toHaveBeenCalledWith(ORG, "c1", { email: "a@b.c" }, "CUSTOMER");
  });

  test("an email another contact holds does not fail the registration", async () => {
    vi.mocked(setPrimaryIdentities).mockRejectedValueOnce(
      new IdentityTakenError("EMAIL", "a@b.c", "c2"),
    );
    await expect(createLCustomer(input)).resolves.toMatchObject({ id: "c1" });
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
    db.contact.findUniqueOrThrow.mockResolvedValue({
      id: "c1",
      name: "Ann",
      dob: null,
      identities: [
        { kind: "PHONE", value: "919000000001" },
        { kind: "EMAIL", value: "a@b.c" },
      ],
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
      // teamId, userId, timeDelay, isTemplateName, tag, buttonVariable
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      // quickReplyPayload
      undefined,
    );
  });

  test("passes quick-reply payloads in sendTemplateToUserCore's quickReplyPayload slot", async () => {
    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"], ["JOIN", "STOP"]);

    const args = vi.mocked(sendTemplateToUserCore).mock.calls[0];
    expect(args).toHaveLength(11);
    // Not the buttonVariable slot (index 9), which feeds a URL button's suffix.
    expect(args[9]).toBeUndefined();
    expect(args[10]).toEqual(["JOIN", "STOP"]);
  });

  test("sends without consulting a per-message allowance", async () => {
    await handleSendTemplate("t1", ORG, "919000000001", ["Ann"]);

    expect(sendTemplateToUserCore).toHaveBeenCalled();
  });
});
