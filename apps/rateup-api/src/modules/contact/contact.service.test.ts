import { beforeEach, describe, expect, test, vi } from "vitest";

// ---------------------------------------------------------------------------
// contact.service.ts pulls in the queue, chatbot, zapier, zoho, inbox-stats and
// conversation layers at import time. Everything below the module under test is
// stubbed so the assertions are about *this* file's logic only.
// ---------------------------------------------------------------------------

vi.mock("../../utils/prisma.js", () => ({
  default: {
    contact: {
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    contactLabelMap: { createMany: vi.fn(), deleteMany: vi.fn() },
    contactGroupMap: { createMany: vi.fn(), deleteMany: vi.fn() },
    contactCustomFieldValue: { createMany: vi.fn(), deleteMany: vi.fn() },
    contactCustomField: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    waInboxAssign: { createMany: vi.fn(), deleteMany: vi.fn() },
    lifecycle: { findUnique: vi.fn() },
    conversation: { findMany: vi.fn(), updateMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../utils/spreadsheet.js", () => ({
  readSpreadsheetObjects: vi.fn(),
  readSpreadsheetRows: vi.fn(),
}));

vi.mock("./contactGroup/contactGroup.service.js", () => ({
  addExistingContactsToMultipleGroups: vi.fn(),
  addNewContactsToGroup: vi.fn(),
}));

vi.mock("../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(),
}));

vi.mock("../whatsapp/inbox/message/wamessage.service.js", () => ({
  assignWaMessageToUser: vi.fn(),
  createInternalWaMessage: vi.fn(),
  deleteAssignedUsersforContact: vi.fn(),
  getAssignedUserForContact: vi.fn(),
}));

vi.mock("../chatbot/chatbot.service.js", () => ({ getChatbotDetails: vi.fn() }));

vi.mock("../notification/notification.service.js", () => ({ getNotificationSettings: vi.fn() }));

vi.mock("../integrations/external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: {
    CONTACT_CREATE: "new_contact_create",
    CONTACT_UPDATED: "contact_updated",
    CONTACT_DELETED: "contact_deleted",
    CONTACT_LIFECYCLE_UPDATED: "contact_lifecycle_updated",
    CONVERSATION_CLOSED: "conversation_closed",
  },
}));

vi.mock("./conversation/conversation.service.js", () => ({
  conversationStatusData: vi.fn(() => ({ status: "CLOSED" })),
  createConversation: vi.fn(),
  mirrorConversationStatusTx: vi.fn(),
  resolveClosedByUserId: vi.fn((actor: any) => (actor?.source === "user" ? actor.userId : null)),
  resolveInboxActor: vi.fn((userId?: string) =>
    userId && userId.includes("-") ? { source: "user", userId } : { source: "system" },
  ),
}));

vi.mock("../whatsapp/automatedReply/wa_automatedReply.utils.js", () => ({
  checkAndExecuteRuleByTriggerEvent: vi.fn(),
}));

vi.mock("../../utils/redisConnection.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../whatsapp/inbox/inboxStats/inboxStats.service.js", () => ({
  mapStatusToField: vi.fn((status: string) => (status ? `${status.toLowerCase()}Count` : null)),
  transitionInboxStat: vi.fn(),
  incrementInboxStat: vi.fn(),
  decrementInboxStat: vi.fn(),
}));

vi.mock("../integrations/external/zoho/zoho.service.js", () => ({
  updateZohoLeadQueue: vi.fn(),
  ZohoTriggers: {
    LEAD_CREATE: "lead_created",
    CONTACT_UPDATE: "contact_updated",
    CONTACT_DELETE: "contact_deleted",
    BIGIN_DEAL_CREATE: "bigin_deal_created",
    BIGIN_CONTACT_UPDATE: "bigin_contact_updated",
    BIGIN_CONTACT_DELETE: "bigin_contact_deleted",
  },
}));

vi.mock("../integrations/external/zoho/zoho.utils.js", () => ({
  addZohoContactToQueue: vi.fn(),
  buildZohoContactPayload: vi.fn((c: any) => ({ Last_Name: c?.name })),
  buildZohoLeadPayload: vi.fn((c: any) => ({ Last_Name: c?.name, Lead_Status: c?.leadStatus })),
}));

import prisma from "../../utils/prisma.js";
import { getChatbotDetails } from "../chatbot/chatbot.service.js";
import { readSpreadsheetObjects, readSpreadsheetRows } from "../../utils/spreadsheet.js";
import {
  addExistingContactsToMultipleGroups,
  addNewContactsToGroup,
} from "./contactGroup/contactGroup.service.js";
import { addZapierTriggerToQueue } from "../integrations/external/zapier/zapier.service.js";
import { integrationTriggerQueue, notificationQueue } from "../../utils/redisConnection.js";
import {
  assignWaMessageToUser,
  createInternalWaMessage,
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
} from "../whatsapp/inbox/message/wamessage.service.js";
import { getNotificationSettings } from "../notification/notification.service.js";
import { mirrorConversationStatusTx } from "./conversation/conversation.service.js";
import {
  decrementInboxStat,
  incrementInboxStat,
  transitionInboxStat,
} from "../whatsapp/inbox/inboxStats/inboxStats.service.js";
import { WaMessageAssignStatus } from "../../types/enums.js";
import {
  addCustomField,
  bulkUpdateWaMessageAssignStatus,
  createContact,
  createContactsFromCsv,
  createMultipleContacts,
  deleteContactById,
  deleteCustomField,
  deleteManyContacts,
  getContactById,
  getContactByPhoneNumberAndOrgId,
  getContactsByOrgId,
  getCustomFields,
  getExistingContactCountByPhno,
  getOrCreateContactByIgsId,
  getOrCreateContactByPhone,
  getOrCreateContactByPsid,
  getOrcreateContact,
  handleContactConsent,
  importCSVContacts,
  updateContactById,
  updateContactLabelsById,
  updateCustomField,
  updateLifecycleStageofContacts,
  updateMulitplceContacts,
} from "./contact.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  contactLabelMap: Record<string, Mock>;
  contactGroupMap: Record<string, Mock>;
  contactCustomFieldValue: Record<string, Mock>;
  contactCustomField: Record<string, Mock>;
  waInboxAssign: Record<string, Mock>;
  lifecycle: Record<string, Mock>;
  conversation: Record<string, Mock>;
  $queryRaw: Mock;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

/// The interactive-transaction stub: hands the callback a tx client backed by
/// the same mocks, so a test can assert on either `prisma.x` or the tx copy.
function runTransaction(fn: any) {
  if (typeof fn !== "function") return Promise.resolve(fn);
  return fn({
    contact: db.contact,
    conversation: db.conversation,
    contactGroupMap: db.contactGroupMap,
    waInboxAssign: db.waInboxAssign,
    $queryRaw: db.$queryRaw,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks keeps implementations but drops queued *Once values; every
  // mock is re-armed here so one test's leftovers cannot reach the next.
  (getChatbotDetails as Mock).mockResolvedValue(null);
  db.$transaction.mockImplementation(runTransaction);
  db.$queryRaw.mockResolvedValue([]);
  db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG, phone: "919000000001" });
  db.contact.createManyAndReturn.mockResolvedValue([]);
  db.contact.findFirst.mockResolvedValue(null);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.findMany.mockResolvedValue([]);
  db.contact.update.mockResolvedValue({ id: "c1", orgId: ORG });
  db.contact.updateMany.mockResolvedValue({ count: 0 });
  db.contact.upsert.mockResolvedValue({ id: "c1", orgId: ORG });
  db.contact.delete.mockResolvedValue({ id: "c1", orgId: ORG, integrationIds: null });
  db.contact.deleteMany.mockResolvedValue({ count: 0 });
  db.contact.count.mockResolvedValue(0);
  db.conversation.findMany.mockResolvedValue([]);
  db.lifecycle.findUnique.mockResolvedValue(null);
  db.contactCustomField.findMany.mockResolvedValue([]);
  (getAssignedUserForContact as Mock).mockResolvedValue([]);
  (getNotificationSettings as Mock).mockResolvedValue(null);
  (mirrorConversationStatusTx as Mock).mockResolvedValue(null);
});

// ===========================================================================
// createContact
// ===========================================================================

describe("createContact", () => {
  const base = { name: "Ann", phone: "919000000001", source: "MANUAL", orgId: ORG } as any;

  test("refuses a contact with no phone before touching the database", async () => {
    await expect(createContact({ ...base, phone: undefined })).rejects.toThrow(
      "Phone must be provided",
    );
    expect(db.contact.create).not.toHaveBeenCalled();
  });

  // NOTE: pins current behaviour. `lifecycleId` is optional on contactCoreSchema,
  // but createContact reads `lifecycleId.length` unguarded, so every create that
  // omits it throws before any row is written. See issues.txt 18.1.
  test("throws on a contact that omits lifecycleId", async () => {
    await expect(createContact({ ...base, lifecycleId: undefined })).rejects.toThrow(TypeError);
    expect(db.contact.create).not.toHaveBeenCalled();
  });

  test("treats an empty lifecycleId as no lifecycle", async () => {
    await createContact({ ...base, lifecycleId: "" });

    expect(db.contact.create.mock.calls[0][0].data.lifecycleId).toBeUndefined();
  });

  test("keeps a non-empty lifecycleId", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG, lifecycleId: "lc-1" });
    db.lifecycle.findUnique.mockResolvedValue({ name: "Lead" });

    await createContact({ ...base, lifecycleId: "lc-1" });

    expect(db.contact.create.mock.calls[0][0].data.lifecycleId).toBe("lc-1");
  });

  test("does not persist the relation inputs on the contact row itself", async () => {
    await createContact({
      ...base,
      lifecycleId: "",
      customFields: [{ id: "f1", value: "v" }],
      labels: ["l1"],
      contactGroupIds: ["g1"],
      assignedUserIds: [USER],
    });

    const data = db.contact.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("customFields");
    expect(data).not.toHaveProperty("labels");
    expect(data).not.toHaveProperty("contactGroupIds");
    expect(data).not.toHaveProperty("assignedUserIds");
  });

  test("turns on the AI chat flag when the org's chatbot answers every chat", async () => {
    (getChatbotDetails as Mock).mockResolvedValue({ enableAllWaChat: true });

    await createContact({ ...base, lifecycleId: "" });

    expect(db.contact.create.mock.calls[0][0].data.aiWaChat).toBe(true);
  });

  test("leaves the AI chat flag alone when the chatbot is off", async () => {
    (getChatbotDetails as Mock).mockResolvedValue({ enableAllWaChat: false });

    await createContact({ ...base, lifecycleId: "" });

    expect(db.contact.create.mock.calls[0][0].data.aiWaChat).toBeUndefined();
  });

  test("writes the requested labels against the new contact", async () => {
    await createContact({ ...base, lifecycleId: "", labels: ["l1", "l2"] });

    expect(db.contactLabelMap.createMany).toHaveBeenCalledWith({
      data: [
        { contactId: "c1", labelId: "l1" },
        { contactId: "c1", labelId: "l2" },
      ],
      skipDuplicates: true,
    });
  });

  test("writes custom field values against the new contact", async () => {
    await createContact({
      ...base,
      lifecycleId: "",
      customFields: [{ id: "f1", value: "gold" }],
    });

    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", fieldId: "f1", value: "gold" }],
      skipDuplicates: true,
    });
  });

  test("scopes the assignee lookup to the contact's own org", async () => {
    await createContact({ ...base, lifecycleId: "", assignedUserIds: [USER] });

    const bound = db.$queryRaw.mock.calls[0].slice(1);
    expect(bound).toEqual([[USER], ORG]);
    expect(assignWaMessageToUser).toHaveBeenCalled();
  });

  test("fires the contact-created automation and the zapier trigger", async () => {
    await createContact({ ...base, lifecycleId: "" }, USER);

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "new_contact_create",
      { new_contact_create: { id: "c1", orgId: ORG, phone: "919000000001" } },
      ORG,
    );
  });

  test("queues a zoho lead for every contact", async () => {
    await createContact({ ...base, lifecycleId: "" });

    const jobs = integrationTriggerQueue.add as unknown as Mock;
    expect(jobs.mock.calls.map((c) => c[0])).toEqual(["zoho-lead-create"]);
  });

  test("queues a bigin deal only when the contact has a lifecycle", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG, lifecycleId: "lc-1" });
    db.lifecycle.findUnique.mockResolvedValue({ name: "Lead" });

    await createContact({ ...base, lifecycleId: "lc-1" });

    const jobs = integrationTriggerQueue.add as unknown as Mock;
    expect(jobs.mock.calls.map((c) => c[0])).toEqual(["zoho-lead-create", "bigin-deal-create"]);
  });

  test("carries the lifecycle name into the zoho lead payload", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG, lifecycleId: "lc-1", name: "Ann" });
    db.lifecycle.findUnique.mockResolvedValue({ name: "Qualified" });

    await createContact({ ...base, lifecycleId: "lc-1" });

    const jobs = integrationTriggerQueue.add as unknown as Mock;
    expect(jobs.mock.calls[0][1].data.Lead_Status).toBe("Qualified");
  });

  // NOTE: the group write is launched without `await`, so createContact can
  // resolve before the contact is in its groups — and a rejection there becomes
  // an unhandled rejection rather than a failed request. See issues.txt 18.2.
  test("does not wait for the group membership write", async () => {
    let settle: () => void;
    (addExistingContactsToMultipleGroups as Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );

    await createContact({ ...base, lifecycleId: "", contactGroupIds: ["g1"] });

    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], ["g1"], ORG);
    settle!();
  });
});

// ===========================================================================
// getOrcreateContact
// ===========================================================================

describe("getOrcreateContact", () => {
  const base = { name: "Ann", phone: "919000000001", source: "API", orgId: ORG } as any;

  test("returns the existing contact untouched", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "existing", orgId: ORG });

    const res = await getOrcreateContact(base);

    expect(res).toEqual({ id: "existing", orgId: ORG });
    expect(db.contact.create).not.toHaveBeenCalled();
    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });

  test("looks the contact up by phone within the org", async () => {
    await getOrcreateContact(base);

    expect(db.contact.findFirst.mock.calls[0][0]).toEqual({
      where: { phone: "919000000001", orgId: ORG },
    });
  });

  test("requires a phone", async () => {
    await expect(getOrcreateContact({ ...base, phone: "" })).rejects.toThrow(
      "Phone must be provided",
    );
  });

  test("creates and announces a brand new contact", async () => {
    await getOrcreateContact(base);

    expect(db.contact.create).toHaveBeenCalled();
    expect(addZapierTriggerToQueue).toHaveBeenCalled();
    expect(integrationTriggerQueue.add).toHaveBeenCalledWith("zoho-lead-create", expect.anything());
  });

  // NOTE: unlike createContact this path keeps `labels`, `contactGroupIds` and
  // `assignedUserIds` in `rest`, so they are handed to prisma as if they were
  // columns. Only `customFields` is stripped. See issues.txt 18.3.
  test("passes label and group ids straight through to prisma.create", async () => {
    await getOrcreateContact({ ...base, labels: ["l1"], contactGroupIds: ["g1"] });

    const data = db.contact.create.mock.calls[0][0].data;
    expect(data.labels).toEqual(["l1"]);
    expect(data.contactGroupIds).toEqual(["g1"]);
  });
});

// ===========================================================================
// createMultipleContacts
// ===========================================================================

describe("createMultipleContacts", () => {
  test("stamps org and AI-chat flag onto every row and strips relation inputs", async () => {
    (getChatbotDetails as Mock).mockResolvedValue({ enableAllWaChat: true });
    db.contact.createManyAndReturn.mockResolvedValue([]);

    await createMultipleContacts(
      [{ name: "A", phone: "9190001", source: "CSV", labels: ["l1"] } as any],
      ORG,
    );

    const [row] = db.contact.createManyAndReturn.mock.calls[0][0].data;
    expect(row).toMatchObject({ orgId: ORG, aiWaChat: true });
    expect(row.labels).toBeUndefined();
    expect(row.customFields).toBeUndefined();
    expect(row.contactGroupIds).toBeUndefined();
    expect(row.assignedUserIds).toBeUndefined();
  });

  test("skips rows that already exist", async () => {
    await createMultipleContacts([{ name: "A", phone: "9190001", source: "CSV" } as any], ORG);

    expect(db.contact.createManyAndReturn.mock.calls[0][0].skipDuplicates).toBe(true);
  });

  test("returns only the rows the database actually created", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([{ id: "c1", phone: "9190001" }]);

    const res = await createMultipleContacts(
      [
        { name: "A", phone: "9190001", source: "CSV" },
        { name: "B", phone: "9190002", source: "CSV" },
      ] as any,
      ORG,
    );

    expect(res).toEqual([{ id: "c1", phone: "9190001" }]);
  });

  test("clears any stale custom field values before writing the new ones", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([{ id: "c1", phone: "9190001" }]);

    await createMultipleContacts(
      [
        { name: "A", phone: "9190001", source: "CSV", customFields: [{ id: "f1", value: "x" }] },
      ] as any,
      ORG,
    );

    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: { in: ["c1"] } },
    });
    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", fieldId: "f1", value: "x" }],
      skipDuplicates: true,
    });
  });

  // NOTE: pins current behaviour. `skipDuplicates` means an already-present phone
  // never comes back from createManyAndReturn, so the lookup by phone misses and
  // the row is written with an empty contactId — a foreign-key violation that
  // takes the whole custom-field batch down with it. See issues.txt 18.4.
  test("writes an empty contactId for a custom field whose contact was skipped", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([{ id: "c1", phone: "9190001" }]);

    await createMultipleContacts(
      [
        { name: "A", phone: "9190001", source: "CSV", customFields: [{ id: "f1", value: "x" }] },
        { name: "B", phone: "9190002", source: "CSV", customFields: [{ id: "f1", value: "y" }] },
      ] as any,
      ORG,
    );

    expect(db.contactCustomFieldValue.createMany.mock.calls[0][0].data).toEqual([
      { contactId: "c1", fieldId: "f1", value: "x" },
      { contactId: "", fieldId: "f1", value: "y" },
    ]);
  });

  test("announces every created contact to zapier and zoho", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([
      { id: "c1", phone: "9190001" },
      { id: "c2", phone: "9190002" },
    ]);

    await createMultipleContacts(
      [
        { name: "A", phone: "9190001", source: "CSV" },
        { name: "B", phone: "9190002", source: "CSV" },
      ] as any,
      ORG,
    );

    expect((addZapierTriggerToQueue as Mock).mock.calls).toHaveLength(2);
    expect((integrationTriggerQueue.add as unknown as Mock).mock.calls).toHaveLength(2);
  });

  test("does nothing downstream when the database created nothing", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([]);

    await createMultipleContacts([{ name: "A", phone: "9190001", source: "CSV" } as any], ORG);

    expect(db.contactCustomFieldValue.deleteMany).not.toHaveBeenCalled();
    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getContactById", () => {
  // NOTE: the lookup is by id alone. Nothing in the query or in the calling
  // handler restricts it to the caller's org. See issues.txt 18.5.
  test("looks a contact up by id with no org restriction", async () => {
    await getContactById("c1");

    expect(db.contact.findUnique.mock.calls[0][0].where).toEqual({ id: "c1" });
  });

  test("includes the contact's labels", async () => {
    await getContactById("c1");

    expect(db.contact.findUnique.mock.calls[0][0].include).toHaveProperty("ContactLabelMap");
  });
});

describe("getContactByPhoneNumberAndOrgId", () => {
  test("matches on phone and org together", async () => {
    await getContactByPhoneNumberAndOrgId("919000000001", ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      phone: "919000000001",
      orgId: ORG,
    });
  });
});

describe("getContactsByOrgId", () => {
  function where() {
    return db.contact.findMany.mock.calls[0][0].where;
  }

  test("returns every contact in the org when nothing is filtered", async () => {
    db.contact.count.mockResolvedValue(3);
    db.contact.findMany.mockResolvedValue([{ id: "c1" }]);

    const res = await getContactsByOrgId(ORG, {} as any);

    expect(where()).toEqual({ orgId: ORG });
    expect(res).toEqual({ users: [{ id: "c1" }], totalCount: 3 });
  });

  test("counts and lists with exactly the same condition", async () => {
    await getContactsByOrgId(ORG, { search: "ann" } as any);

    expect(db.contact.count.mock.calls[0][0].where).toEqual(where());
  });

  test("searching matches either the name or the phone", async () => {
    await getContactsByOrgId(ORG, { search: "ann" } as any);

    expect(where().OR).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { phone: { contains: "ann", mode: "insensitive" } },
    ]);
  });

  test("a name filter becomes a case-insensitive contains", async () => {
    await getContactsByOrgId(ORG, { name: "an" } as any);

    expect(where().OR).toEqual([{ name: { contains: "an", mode: "insensitive" } }]);
  });

  test("the consent filter compares against a real boolean", async () => {
    await getContactsByOrgId(ORG, { consent: "TRUE" } as any);

    expect(where().OR).toEqual([{ consent: { equals: true } }]);
  });

  test("a group filter de-duplicates the requested group ids", async () => {
    await getContactsByOrgId(ORG, { filterGroupName: "g1,g2,g1" } as any);

    expect(where().OR).toEqual([
      { contactGroups: { some: { contactGroupId: { in: ["g1", "g2"] } } } },
    ]);
  });

  test('"all" means no source filter at all', async () => {
    await getContactsByOrgId(ORG, { source: "all" } as any);

    expect(where()).toEqual({ orgId: ORG });
  });

  test.each([
    ["active", { blockedOnWhatsApp: false }],
    ["blocked", { blockedOnWhatsApp: true }],
  ])("labelId=%s filters on the WhatsApp block flag instead", async (value, expected) => {
    await getContactsByOrgId(ORG, { labelId: value } as any);

    expect(where().OR).toEqual([expected]);
  });

  test("a real label id filters through the label map", async () => {
    await getContactsByOrgId(ORG, { labelId: "l1" } as any);

    expect(where().OR).toEqual([{ ContactLabelMap: { some: { labelId: "l1" } } }]);
  });

  // NOTE: pins current behaviour. Every filter is pushed into one OR array, so
  // combining filters *widens* the result set instead of narrowing it: asking for
  // "named ann AND consented" returns everyone named ann plus everyone who
  // consented. See issues.txt 18.6.
  test("combining two filters ORs them together rather than ANDing them", async () => {
    await getContactsByOrgId(ORG, { name: "ann", consent: "true" } as any);

    expect(where().OR).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { consent: { equals: true } },
    ]);
    expect(where().AND).toBeUndefined();
  });

  // NOTE: createdAt is a DateTime column but is filtered with a string
  // `contains`, which prisma rejects. See issues.txt 18.7.
  test("a createdAt filter is built as a string contains", async () => {
    await getContactsByOrgId(ORG, { createdAt: "2026-01-01" } as any);

    expect(where().OR).toEqual([{ createdAt: { contains: "2026-01-01", mode: "insensitive" } }]);
  });

  test("the LOYALTY type restricts to contacts that have a loyalty account", async () => {
    await getContactsByOrgId(ORG, { type: "LOYALTY" } as any);

    expect(where().AND).toEqual({ loyaltyCustomer: { isNot: null } });
  });

  test("pagination skips whole pages of the requested size", async () => {
    db.contact.count.mockResolvedValue(100);

    await getContactsByOrgId(ORG, { page: 2, limit: 10 } as any);

    expect(db.contact.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 10 });
  });

  test("a page past the end is clamped to the last page", async () => {
    db.contact.count.mockResolvedValue(15);

    await getContactsByOrgId(ORG, { page: 99, limit: 10 } as any);

    expect(db.contact.findMany.mock.calls[0][0].skip).toBe(10);
  });

  test("a negative page is clamped to the first page", async () => {
    db.contact.count.mockResolvedValue(100);

    await getContactsByOrgId(ORG, { page: -5, limit: 10 } as any);

    expect(db.contact.findMany.mock.calls[0][0].skip).toBe(0);
  });

  test("an empty result set still leaves one page", async () => {
    db.contact.count.mockResolvedValue(0);

    await getContactsByOrgId(ORG, { page: 0, limit: 10 } as any);

    expect(db.contact.findMany.mock.calls[0][0].skip).toBe(0);
  });

  test("sorting by name does not add a redundant secondary sort", async () => {
    await getContactsByOrgId(ORG, { sort: "name" } as any);

    expect(db.contact.findMany.mock.calls[0][0].orderBy).toEqual([{ name: "desc" }]);
  });

  test("any other sort falls back to name ascending as a tiebreak", async () => {
    await getContactsByOrgId(ORG, { sort: "createdAt" } as any);

    expect(db.contact.findMany.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "desc" },
      { name: "asc" },
    ]);
  });

  // NOTE: `desc` is accepted by the querystring schema and threaded all the way
  // here, but the order is hard-coded to "desc". Asking for ascending order does
  // nothing. See issues.txt 18.8.
  test("the desc query parameter has no effect on the sort direction", async () => {
    await getContactsByOrgId(ORG, { sort: "createdAt", desc: "asc" } as any);

    expect(db.contact.findMany.mock.calls[0][0].orderBy[0]).toEqual({ createdAt: "desc" });
  });

  // NOTE: the `query ?? {...}` default covers the destructuring but `query.type`
  // is read directly a few lines later, so calling this with no query at all
  // throws. See issues.txt 18.9.
  test("throws when called with no query object", async () => {
    await expect(getContactsByOrgId(ORG)).rejects.toThrow(TypeError);
  });
});

// ===========================================================================
// deletes
// ===========================================================================

describe("deleteContactById", () => {
  test("deletes by id and announces it", async () => {
    db.contact.delete.mockResolvedValue({ id: "c1", orgId: ORG, integrationIds: null });

    await deleteContactById("c1");

    expect(db.contact.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(addZapierTriggerToQueue).toHaveBeenCalledWith("contact_deleted", expect.anything(), ORG);
  });

  test("passes the mirrored CRM ids on to the delete jobs", async () => {
    db.contact.delete.mockResolvedValue({
      id: "c1",
      orgId: ORG,
      integrationIds: { zoho: { contact: { id: "z1" } }, bigin: { contact: { id: "b1" } } },
    });

    await deleteContactById("c1");

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data).toEqual({ zohoContactId: "z1" });
    expect(jobs[1][1].data).toEqual({ biginContactId: "b1" });
  });

  test("still queues the CRM deletes when the contact was never mirrored", async () => {
    db.contact.delete.mockResolvedValue({ id: "c1", orgId: ORG, integrationIds: null });

    await deleteContactById("c1");

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data).toEqual({ zohoContactId: undefined });
  });
});

describe("deleteManyContacts", () => {
  // NOTE: neither the read nor the delete is org-scoped, and the ids come
  // straight from the request body. See issues.txt 18.5.
  test("deletes every id it is given with no org restriction", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await deleteManyContacts(["c1", "c2"]);

    expect(db.contact.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["c1", "c2"] } } });
  });

  test("announces each deleted contact against its own org", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c1", orgId: "org-a", integrationIds: null },
      { id: "c2", orgId: "org-b", integrationIds: null },
    ]);

    await deleteManyContacts(["c1", "c2"]);

    expect((addZapierTriggerToQueue as Mock).mock.calls.map((c) => c[2])).toEqual([
      "org-a",
      "org-b",
    ]);
  });

  test("returns the delete count from prisma", async () => {
    db.contact.deleteMany.mockResolvedValue({ count: 2 });

    expect(await deleteManyContacts(["c1", "c2"])).toEqual({ count: 2 });
  });
});

// ===========================================================================
// updateContactById
// ===========================================================================

describe("updateContactById", () => {
  const existing = {
    id: "c1",
    orgId: ORG,
    waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    blockedOnWhatsApp: false,
    lastReceivedMessageTimeStamp: null,
  };

  function updated(overrides: Record<string, unknown> = {}) {
    return {
      id: "c1",
      orgId: ORG,
      name: "Ann",
      phone: "919000000001",
      waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
      blockedOnWhatsApp: false,
      lastReceivedMessageTimeStamp: null,
      lifecycleId: null,
      integrationIds: null,
      waInboxAssign: [],
      contactGroups: [],
      ...overrides,
    };
  }

  test("reuses a caller-supplied snapshot instead of re-reading the contact", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", { name: "Ann" } as any, USER, existing);

    expect(db.contact.findUnique).not.toHaveBeenCalled();
  });

  test("reads the contact when no snapshot is supplied", async () => {
    db.contact.findUnique.mockResolvedValue(existing);
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", { name: "Ann" } as any);

    expect(db.contact.findUnique).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  // NOTE: an id that matches nothing produces `undefined` here and the very next
  // line reads `.waMessageAssignStatus` off it. See issues.txt 18.10.
  test("throws when the contact does not exist", async () => {
    db.contact.findUnique.mockResolvedValue(null);

    await expect(updateContactById("nope", { name: "Ann" } as any)).rejects.toThrow(TypeError);
  });

  test("replaces the label set rather than appending to it", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", { labels: ["l1"] } as any, USER, existing);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({ where: { contactId: "c1" } });
    expect(db.contactLabelMap.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", labelId: "l1" }],
      skipDuplicates: true,
    });
  });

  // NOTE: an empty array is falsy for `length > 0`, so there is no way to clear
  // every label through this endpoint. See issues.txt 18.11.
  test("an empty label array leaves the existing labels in place", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", { labels: [] } as any, USER, existing);

    expect(db.contactLabelMap.deleteMany).not.toHaveBeenCalled();
  });

  test("replaces the custom field values", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById(
      "c1",
      { customFields: [{ id: "f1", value: "x" }] } as any,
      USER,
      existing,
    );

    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1" },
    });
  });

  test("stores a SPAM request as a close and flags the contact instead", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.SPAM } as any,
      USER,
      existing,
    );

    const data = db.contact.update.mock.calls[0][0].data;
    expect(data.waMessageAssignStatus).toBe(WaMessageAssignStatus.CLOSED);
    expect(data.isSpam).toBe(true);
    expect(data.spamMarkedBy).toBe(USER);
    expect(data.closedAt).toBeInstanceOf(Date);
  });

  test("a spam mark is recorded in the thread as SPAM, not as CLOSED", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.SPAM } as any,
      USER,
      existing,
    );

    expect((createInternalWaMessage as Mock).mock.calls[0][0].waMessageAssignStatus).toBe(
      WaMessageAssignStatus.SPAM,
    );
  });

  test("a non-terminal status writes no close stamp", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "ASSIGNED" }));

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED } as any,
      USER,
      existing,
    );

    const data = db.contact.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("closedAt");
    expect(data).not.toHaveProperty("isSpam");
  });

  test("mirrors the status change onto the conversation inside the same transaction", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect(mirrorConversationStatusTx).toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalled();
  });

  test("does not touch the conversation when the status is unchanged", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED } as any,
      USER,
      existing,
    );

    expect(mirrorConversationStatusTx).not.toHaveBeenCalled();
  });

  test("carries the resolution result through to the conversation mirror", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "RESOLVED" }));

    await updateContactById(
      "c1",
      {
        waMessageAssignStatus: WaMessageAssignStatus.RESOLVED,
        resolutionResult: "ANSWERED",
      } as any,
      USER,
      existing,
    );

    expect((mirrorConversationStatusTx as Mock).mock.calls[0][4].resolutionResult).toBe("ANSWERED");
  });

  test("counts a contact into the inbox stats on its first inbound message", async () => {
    db.contact.update.mockResolvedValue(updated({ lastReceivedMessageTimeStamp: new Date() }));

    await updateContactById(
      "c1",
      { lastReceivedMessageTimeStamp: "2026-01-01T00:00:00Z" } as any,
      USER,
      existing,
    );

    expect(incrementInboxStat).toHaveBeenCalledWith(ORG, "totalCount", 1);
    expect(incrementInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", 1);
  });

  test("does not count a blocked contact into the inbox stats", async () => {
    db.contact.update.mockResolvedValue(
      updated({ lastReceivedMessageTimeStamp: new Date(), blockedOnWhatsApp: true }),
    );

    await updateContactById(
      "c1",
      { lastReceivedMessageTimeStamp: "2026-01-01T00:00:00Z" } as any,
      USER,
      existing,
    );

    expect(incrementInboxStat).not.toHaveBeenCalled();
  });

  test("moves a known contact between tabs when its status changes", async () => {
    const seen = { ...existing, lastReceivedMessageTimeStamp: new Date() };
    db.contact.update.mockResolvedValue(
      updated({ waMessageAssignStatus: "ASSIGNED", lastReceivedMessageTimeStamp: new Date() }),
    );

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED } as any,
      USER,
      seen,
    );

    expect(transitionInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", "assignedCount", 1);
  });

  test("moves a contact into the blocked bucket when it becomes blocked", async () => {
    const seen = { ...existing, lastReceivedMessageTimeStamp: new Date() };
    db.contact.update.mockResolvedValue(
      updated({ blockedOnWhatsApp: true, lastReceivedMessageTimeStamp: new Date() }),
    );

    await updateContactById("c1", { name: "Ann" } as any, USER, seen);

    expect(incrementInboxStat).toHaveBeenCalledWith(ORG, "blockedCount", 1);
    expect(decrementInboxStat).toHaveBeenCalledWith(ORG, "totalCount", 1);
    expect(decrementInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", 1);
  });

  test("returns a contact to the live buckets when it is unblocked", async () => {
    const seen = {
      ...existing,
      blockedOnWhatsApp: true,
      lastReceivedMessageTimeStamp: new Date(),
    };
    db.contact.update.mockResolvedValue(
      updated({ blockedOnWhatsApp: false, lastReceivedMessageTimeStamp: new Date() }),
    );

    await updateContactById("c1", { name: "Ann" } as any, USER, seen);

    expect(decrementInboxStat).toHaveBeenCalledWith(ORG, "blockedCount", 1);
    expect(incrementInboxStat).toHaveBeenCalledWith(ORG, "totalCount", 1);
  });

  test.each([
    [WaMessageAssignStatus.CLOSED, "CHAT_CLOSED"],
    [WaMessageAssignStatus.ASSIGNED, "CHAT_ASSIGNED"],
  ])("a %s update runs the %s automation", async (status, event) => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: status }));
    const { checkAndExecuteRuleByTriggerEvent } =
      await import("../whatsapp/automatedReply/wa_automatedReply.utils.js");

    await updateContactById("c1", { waMessageAssignStatus: status } as any, USER, existing);

    expect(checkAndExecuteRuleByTriggerEvent).toHaveBeenCalledWith(event, {
      orgId: ORG,
      phone: "919000000001",
      platform: "ALL",
    });
  });

  test("adds and removes group memberships to match the requested set", async () => {
    db.contact.update.mockResolvedValue(updated({ contactGroups: [{ contactGroupId: "g-old" }] }));

    await updateContactById("c1", { contactGroupIds: ["g-new"] } as any, USER, existing);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", contactGroupId: { in: ["g-old"] } },
    });
    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], ["g-new"], ORG);
  });

  test("leaves a group the contact is already in alone", async () => {
    db.contact.update.mockResolvedValue(updated({ contactGroups: [{ contactGroupId: "g1" }] }));

    await updateContactById("c1", { contactGroupIds: ["g1"] } as any, USER, existing);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", contactGroupId: { in: [] } },
    });
    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], [], ORG);
  });

  test("revokes assignees that are no longer requested", async () => {
    db.contact.update.mockResolvedValue(updated({ waInboxAssign: [{ assignedUserId: "u-old" }] }));

    await updateContactById("c1", { assignedUserIds: [] } as any, USER, existing);

    expect(db.waInboxAssign.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", assignedUserId: { in: ["u-old"] } },
    });
    expect(assignWaMessageToUser).not.toHaveBeenCalled();
  });

  test("scopes a new assignee lookup to the contact's org", async () => {
    db.contact.update.mockResolvedValue(updated());
    db.$queryRaw.mockResolvedValue([{ userId: USER, teamId: "t1" }]);

    await updateContactById("c1", { assignedUserIds: [USER] } as any, USER, existing);

    expect(db.$queryRaw.mock.calls[0].slice(1)).toEqual([[USER], ORG]);
    expect(assignWaMessageToUser).toHaveBeenCalledWith(
      { assignees: [{ userId: USER, teamId: "t1" }], contactId: "c1" },
      ORG,
      USER,
    );
  });

  test("queues the CRM updates with the mirrored ids", async () => {
    db.contact.update.mockResolvedValue(
      updated({
        integrationIds: { zoho: { contact: { id: "z1" } }, bigin: { contact: { id: "b1" } } },
      }),
    );

    await updateContactById("c1", { name: "Ann" } as any, USER, existing);

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data.zohoContactId).toBe("z1");
    expect(jobs[1][1].data.biginContactId).toBe("b1");
  });

  test("pushes the lifecycle name to the mirrored zoho lead", async () => {
    const { updateZohoLeadQueue } = await import("../integrations/external/zoho/zoho.service.js");
    db.contact.update.mockResolvedValue(
      updated({ lifecycleId: "lc-1", integrationIds: { zoho: { lead: { id: "lead-1" } } } }),
    );
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });

    await updateContactById("c1", { lifecycleId: "lc-1" } as any, USER, existing);

    expect(updateZohoLeadQueue).toHaveBeenCalledWith(
      ORG,
      "lead-1",
      expect.objectContaining({ Lead_Status: "Customer" }),
    );
  });

  test("skips the lead update when the contact has no mirrored lead", async () => {
    const { updateZohoLeadQueue } = await import("../integrations/external/zoho/zoho.service.js");
    db.contact.update.mockResolvedValue(updated({ lifecycleId: "lc-1" }));

    await updateContactById("c1", { lifecycleId: "lc-1" } as any, USER, existing);

    expect(updateZohoLeadQueue).not.toHaveBeenCalled();
  });

  test("closing frees the assignees and notifies those who asked to hear about it", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));
    (getAssignedUserForContact as Mock).mockResolvedValue([{ assignedUserId: "u1" }]);
    (getNotificationSettings as Mock).mockResolvedValue({ waMessageClosedNotification: true });

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect(deleteAssignedUsersforContact).toHaveBeenCalledWith("c1");
    expect(notificationQueue.add).toHaveBeenCalledWith(
      "notification",
      expect.objectContaining({
        systemNotificationData: expect.objectContaining({ userId: "u1", subSource: "chat-closed" }),
      }),
    );
  });

  test("stays quiet for an assignee who turned close notifications off", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));
    (getAssignedUserForContact as Mock).mockResolvedValue([{ assignedUserId: "u1" }]);
    (getNotificationSettings as Mock).mockResolvedValue({ waMessageClosedNotification: false });

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect(notificationQueue.add).not.toHaveBeenCalled();
    expect(deleteAssignedUsersforContact).toHaveBeenCalled();
  });

  test("announces a close to zapier as a closed conversation", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect((addZapierTriggerToQueue as Mock).mock.calls.map((c) => c[0])).toContain(
      "conversation_closed",
    );
  });
});

// ===========================================================================
// updateContactLabelsById / updateLifecycleStageofContacts
// ===========================================================================

describe("updateContactLabelsById", () => {
  test("writes the lifecycle and announces it with the resolved name", async () => {
    db.contact.update.mockResolvedValue({
      id: "c1",
      orgId: ORG,
      Lifecycle: { name: "Customer" },
    });

    await updateContactLabelsById("c1", "lc-1");

    expect(db.contact.update.mock.calls[0][0]).toMatchObject({
      where: { id: "c1" },
      data: { lifecycleId: "lc-1" },
    });
    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "contact_lifecycle_updated",
      {
        contact_lifecycle_updated: {
          contactId: "c1",
          lifecycleId: "lc-1",
          lifecycleName: "Customer",
        },
      },
      ORG,
    );
  });
});

describe("updateLifecycleStageofContacts", () => {
  test("moves every requested contact to the new stage", async () => {
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });

    await updateLifecycleStageofContacts("lc-1", ["c1", "c2"]);

    expect(db.contact.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] } },
      data: { lifecycleId: "lc-1" },
    });
  });

  // NOTE: the contacts have already been written by the time the lifecycle is
  // looked up, so an unknown lifecycle id leaves the rows pointing at it while
  // the CRM mirror is silently skipped. See issues.txt 18.12.
  test("still writes the stage when the lifecycle does not exist", async () => {
    db.lifecycle.findUnique.mockResolvedValue(null);

    await updateLifecycleStageofContacts("nope", ["c1"]);

    expect(db.contact.updateMany).toHaveBeenCalled();
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("pushes the new stage to contacts that are mirrored as zoho leads", async () => {
    const { updateZohoLeadQueue } = await import("../integrations/external/zoho/zoho.service.js");
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });
    db.contact.findMany.mockResolvedValue([
      { id: "c1", orgId: ORG, integrationIds: { zoho: { lead: { id: "lead-1" } } } },
    ]);

    await updateLifecycleStageofContacts("lc-1", ["c1"]);

    expect(updateZohoLeadQueue).toHaveBeenCalledWith(ORG, "lead-1", { Lead_Status: "Customer" });
  });
});

// ===========================================================================
// CSV import
// ===========================================================================

describe("importCSVContacts", () => {
  function file(mimetype = "text/csv") {
    return { mimetype, toBuffer: vi.fn().mockResolvedValue(Buffer.from("")) } as any;
  }

  test("reads a header row by default and lower-cases the headers", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({ data: [] });

    await importCSVContacts(file(), ORG, []);

    expect(readSpreadsheetObjects).toHaveBeenCalled();
    const opts = (readSpreadsheetObjects as Mock).mock.calls[0][2];
    expect(opts.transformHeader(" Name ")).toBe("name");
    expect(opts.transformValue(" 42 ")).toBe("42");
    expect(opts.transformValue(null)).toBe("");
  });

  test("assumes name,phone,<tags> column order when there is no header row", async () => {
    (readSpreadsheetRows as Mock).mockResolvedValue([["Ann", "919000000001", "gold"]]);
    db.contactCustomField.findMany.mockResolvedValue([]);

    await importCSVContacts(file(), ORG, ["tier"], false, undefined, false);

    expect(readSpreadsheetRows).toHaveBeenCalled();
    expect(readSpreadsheetObjects).not.toHaveBeenCalled();
  });

  test("returns nothing at all for an empty file", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({ data: [] });

    expect(await importCSVContacts(file(), ORG, [])).toBeUndefined();
  });

  test("rejects a row with no name", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "", phone: "919876543210" }],
    });

    const res: any = await importCSVContacts(file(), ORG, []);

    expect(res.status).toBe("error");
    expect(res.data).toEqual([{ name: "name is missing/invalid", phone: expect.any(String) }]);
  });

  test("rejects a row whose phone is not a real number", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "12" }],
    });

    const res: any = await importCSVContacts(file(), ORG, []);

    expect(res.status).toBe("error");
    expect(res.data[0].phone).toBe("12: Invalid phone number");
  });

  test("reports a missing phone distinctly from an invalid one", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({ data: [{ name: "Ann" }] });

    const res: any = await importCSVContacts(file(), ORG, []);

    expect(res.data[0].phone).toBe("phone is missing");
  });

  test("stores a valid number without its leading plus", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "+91 98765 43210" }],
    });

    await importCSVContacts(file(), ORG, []);

    const [rows] = (createMultipleContactsSpy() as any) ?? [];
    expect(rows[0].phone).toBe("919876543210");
  });

  test("recovers a phone that a spreadsheet mangled into scientific notation", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "9.19876543210E+11" }],
    });

    await importCSVContacts(file(), ORG, []);

    const [rows] = (createMultipleContactsSpy() as any) ?? [];
    expect(rows[0].phone).toBe("919876543210");
  });

  // NOTE: pins current behaviour. Valid rows are created first and only then is
  // the error status returned, so a file with one bad row is reported to the
  // caller as a pure validation failure even though contacts were written.
  // See issues.txt 18.13.
  test("reports a partly-valid file as an error after importing the good rows", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [
        { name: "Ann", phone: "+919876543210" },
        { name: "", phone: "" },
      ],
    });

    const res: any = await importCSVContacts(file(), ORG, []);

    expect(db.contact.createManyAndReturn).toHaveBeenCalled();
    expect(res.status).toBe("error");
  });

  test("reports a fully valid file as a success", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "+919876543210" }],
    });

    const res: any = await importCSVContacts(file(), ORG, []);

    expect(res.status).toBe("success");
  });

  test("adds the imported rows to a group when one was named", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "+919876543210" }],
    });
    (addNewContactsToGroup as Mock).mockResolvedValue("done");

    const res: any = await importCSVContacts(file(), ORG, [], false, "g1");

    expect(addNewContactsToGroup).toHaveBeenCalledWith("g1", expect.any(Array), ORG);
    expect(res).toEqual({ data: "done", status: "success" });
  });

  test("upserts instead of creating when updateExisting is set", async () => {
    (readSpreadsheetObjects as Mock).mockResolvedValue({
      data: [{ name: "Ann", phone: "+919876543210" }],
    });

    await importCSVContacts(file(), ORG, [], true);

    expect(db.contact.upsert).toHaveBeenCalled();
    expect(db.contact.createManyAndReturn).not.toHaveBeenCalled();
  });
});

/// The rows handed to createMultipleContacts, read back off the prisma mock.
function createMultipleContactsSpy() {
  const call = db.contact.createManyAndReturn.mock.calls[0];
  return call ? [call[0].data] : undefined;
}

describe("createContactsFromCsv", () => {
  test("stamps every imported contact with a CSV IMPORT source", async () => {
    await createContactsFromCsv([{ name: "Ann", phone: "9190001" }], ORG, [], false, undefined);

    expect(db.contact.createManyAndReturn.mock.calls[0][0].data[0].source).toBe("CSV IMPORT");
  });

  test("maps a spreadsheet column onto a custom field when its slug was tagged", async () => {
    db.contactCustomField.findMany.mockResolvedValue([{ id: "f1", slug: "tier" }]);
    db.contact.createManyAndReturn.mockResolvedValue([{ id: "c1", phone: "9190001" }]);

    await createContactsFromCsv(
      [{ name: "Ann", phone: "9190001", tier: "gold" }],
      ORG,
      ["tier"],
      false,
      undefined,
    );

    expect(db.contactCustomFieldValue.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", fieldId: "f1", value: "gold" }],
      skipDuplicates: true,
    });
  });

  test("ignores a column whose slug was not tagged", async () => {
    db.contactCustomField.findMany.mockResolvedValue([{ id: "f1", slug: "tier" }]);
    db.contact.createManyAndReturn.mockResolvedValue([{ id: "c1", phone: "9190001" }]);

    await createContactsFromCsv(
      [{ name: "Ann", phone: "9190001", tier: "gold" }],
      ORG,
      [],
      false,
      undefined,
    );

    expect(db.contactCustomFieldValue.createMany).not.toHaveBeenCalled();
  });

  test("returns the group result when a group was named", async () => {
    (addNewContactsToGroup as Mock).mockResolvedValue({ ok: true });

    const res = await createContactsFromCsv(
      [{ name: "Ann", phone: "9190001" }],
      ORG,
      [],
      false,
      "g1",
    );

    expect(res).toEqual({ ok: true });
  });
});

describe("getExistingContactCountByPhno", () => {
  test("counts the phone numbers that already exist in the org", async () => {
    db.contact.count.mockResolvedValue(2);

    expect(await getExistingContactCountByPhno(["9190001", "9190002"], ORG)).toBe(2);
    expect(db.contact.count.mock.calls[0][0].where).toEqual({
      phone: { in: ["9190001", "9190002"] },
      orgId: ORG,
    });
  });

  test("issues no query at all for an empty list", async () => {
    expect(await getExistingContactCountByPhno([], ORG)).toBe(0);
    expect(db.contact.count).not.toHaveBeenCalled();
  });
});

describe("updateMulitplceContacts", () => {
  test("upserts on the phone+org key", async () => {
    await updateMulitplceContacts([{ name: "Ann", phone: "9190001" } as any], ORG);

    expect(db.contact.upsert.mock.calls[0][0].where).toEqual({
      contact_phone_org_id_unique: { phone: "9190001", orgId: ORG },
    });
  });

  // NOTE: only name and aiWaChat are written on update, so re-importing a file
  // with a corrected email, source or notes silently keeps the old values.
  // See issues.txt 18.14.
  test("an update only refreshes the name and the AI chat flag", async () => {
    await updateMulitplceContacts(
      [{ name: "Ann", phone: "9190001", email: "a@b.c", source: "CSV IMPORT" } as any],
      ORG,
    );

    expect(db.contact.upsert.mock.calls[0][0].update).toEqual({ name: "Ann", aiWaChat: false });
  });

  test("a create carries the whole row", async () => {
    await updateMulitplceContacts([{ name: "Ann", phone: "9190001", email: "a@b.c" } as any], ORG);

    expect(db.contact.upsert.mock.calls[0][0].create).toMatchObject({
      name: "Ann",
      phone: "9190001",
      email: "a@b.c",
      orgId: ORG,
    });
  });

  test("replaces the custom field values of an upserted contact", async () => {
    db.contact.upsert.mockResolvedValue({ id: "c1", orgId: ORG });

    await updateMulitplceContacts(
      [{ name: "Ann", phone: "9190001", customFields: [{ id: "f1", value: "x" }] } as any],
      ORG,
    );

    expect(db.contactCustomFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1" },
    });
  });
});

// ===========================================================================
// consent + custom fields
// ===========================================================================

describe("handleContactConsent", () => {
  test("writes the new consent value and reports that it changed", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", consent: false });

    expect(await handleContactConsent(ORG, "9190001", true)).toBe(true);
    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { consent: true },
    });
  });

  test("does nothing when the consent value already matches", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", consent: true });

    expect(await handleContactConsent(ORG, "9190001", true)).toBe(false);
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  // NOTE: an unknown phone yields null and the next line reads `.consent` off it.
  // See issues.txt 18.15.
  test("throws for a phone number that is not in the org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(handleContactConsent(ORG, "9190001", true)).rejects.toThrow(TypeError);
  });
});

describe("custom fields", () => {
  test("lists the org's fields", async () => {
    await getCustomFields(ORG);

    expect(db.contactCustomField.findMany).toHaveBeenCalledWith({ where: { orgId: ORG } });
  });

  test("creates a field against the caller's org", async () => {
    await addCustomField(ORG, { slug: "tier", name: "Tier" } as any);

    expect(db.contactCustomField.create).toHaveBeenCalledWith({
      data: { slug: "tier", name: "Tier", orgId: ORG },
    });
  });

  test("an update is scoped to the org as well as the field id", async () => {
    await updateCustomField(ORG, "f1", { name: "Tier" } as any);

    expect(db.contactCustomField.update.mock.calls[0][0].where).toEqual({ id: "f1", orgId: ORG });
  });

  test("a delete is scoped to the org as well as the field id", async () => {
    await deleteCustomField(ORG, "f1");

    expect(db.contactCustomField.delete).toHaveBeenCalledWith({
      where: { id: "f1", orgId: ORG },
    });
  });
});

// ===========================================================================
// getOrCreateContactBy* — the webhook entry points
// ===========================================================================

describe("getOrCreateContactByPhone", () => {
  test("matches on phone within the org when no source is given", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("9190001", ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({ phone: "9190001", orgId: ORG });
  });

  test("matches on the `other` column when a source is given", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("web-123", ORG, undefined, "WEBCHAT");

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      other: "web-123",
      orgId: ORG,
      source: "WEBCHAT",
    });
  });

  test("leaves an existing contact untouched when there is nothing to merge", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", orgId: ORG });

    const res = await getOrCreateContactByPhone("9190001", ORG);

    expect(db.contact.update).not.toHaveBeenCalled();
    expect(res).toEqual({ contact: { id: "c1", orgId: ORG }, conversation: undefined });
  });

  test("does not overwrite a stored name with a blank one", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("9190001", ORG, { name: "", notes: "hi" } as any);

    expect(db.contact.update.mock.calls[0][0].data).toEqual({ notes: "hi" });
  });

  test("merges a supplied name into an existing contact", async () => {
    db.contact.findFirst.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("9190001", ORG, { name: "Ann" } as any);

    expect(db.contact.update.mock.calls[0][0].data).toEqual({ name: "Ann" });
  });

  test("creates a contact when the phone is new", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("9190001", ORG);

    expect(db.contact.create.mock.calls[0][0].data).toMatchObject({
      phone: "9190001",
      orgId: ORG,
      aiWaChat: false,
    });
  });

  test("stores no phone at all for a source-keyed contact", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("web-123", ORG, undefined, "WEBCHAT");

    expect(db.contact.create.mock.calls[0][0].data.phone).toBeUndefined();
  });

  test("opens a conversation only when the caller asks for one", async () => {
    const { createConversation } = await import("./conversation/conversation.service.js");
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPhone("9190001", ORG, undefined, undefined, true);

    expect(createConversation).toHaveBeenCalledWith({ contactId: "c1", orgId: ORG });
  });

  // NOTE: the whole body is wrapped in try/catch and the catch only logs, so a
  // database failure returns undefined and every caller destructuring the result
  // fails a step later with a confusing error. See issues.txt 18.16.
  test("swallows a database failure and returns undefined", async () => {
    db.contact.findFirst.mockRejectedValue(new Error("connection lost"));

    expect(await getOrCreateContactByPhone("9190001", ORG)).toBeUndefined();
  });
});

describe("getOrCreateContactByIgsId", () => {
  test("looks up on the igsId+org unique key", async () => {
    db.contact.findUnique.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByIgsId("igs-1", ORG);

    expect(db.contact.findUnique.mock.calls[0][0].where).toEqual({
      contact_igsid_org_id_unique: { igsId: "igs-1", orgId: ORG },
    });
  });

  test("creates and announces a new instagram contact", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG });

    const res = await getOrCreateContactByIgsId("igs-1", ORG);

    expect(db.contact.create.mock.calls[0][0].data).toMatchObject({ igsId: "igs-1", orgId: ORG });
    expect(addZapierTriggerToQueue).toHaveBeenCalled();
    expect(res).toEqual({ contact: { id: "c1", orgId: ORG }, conversation: undefined });
  });

  test("swallows a database failure and returns undefined", async () => {
    db.contact.findUnique.mockRejectedValue(new Error("boom"));

    expect(await getOrCreateContactByIgsId("igs-1", ORG)).toBeUndefined();
  });
});

describe("getOrCreateContactByPsid", () => {
  test("looks up on the psid+org unique key", async () => {
    db.contact.findUnique.mockResolvedValue({ id: "c1", orgId: ORG });

    await getOrCreateContactByPsid("psid-1", ORG);

    expect(db.contact.findUnique.mock.calls[0][0].where).toEqual({
      contact_psid_org_id_unique: { psid: "psid-1", orgId: ORG },
    });
  });

  // The messenger variant is the only one of the three that rethrows, so a
  // webhook failure is retried rather than silently dropped.
  test("rethrows a database failure instead of swallowing it", async () => {
    db.contact.findUnique.mockRejectedValue(new Error("boom"));

    await expect(getOrCreateContactByPsid("psid-1", ORG)).rejects.toThrow("boom");
  });
});

// ===========================================================================
// bulkUpdateWaMessageAssignStatus
// ===========================================================================

describe("bulkUpdateWaMessageAssignStatus", () => {
  const contact = (over: Record<string, unknown> = {}) => ({
    id: "c1",
    phone: "919000000001",
    name: "Ann",
    orgId: ORG,
    waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    lastReceivedMessageTimeStamp: new Date(),
    blockedOnWhatsApp: false,
    ...over,
  });

  test("returns an empty list and writes nothing when no contact matches", async () => {
    db.contact.findMany.mockResolvedValue([]);

    expect(await bulkUpdateWaMessageAssignStatus(["nope"], WaMessageAssignStatus.CLOSED)).toEqual(
      [],
    );
    expect(db.contact.updateMany).not.toHaveBeenCalled();
  });

  test("writes the requested status to every contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(db.contact.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ["c1"] } },
      data: { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED },
    });
  });

  test("stamps closedAt and closedBy on a terminal status", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.CLOSED, USER);

    const data = db.contact.updateMany.mock.calls[0][0].data;
    expect(data.closedAt).toBeInstanceOf(Date);
    expect(data.closedBy).toBe(USER);
  });

  test("never writes a sentinel actor into closedBy", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.CLOSED, "RateUp");

    expect(db.contact.updateMany.mock.calls[0][0].data.closedBy).toBeNull();
  });

  test("a bulk SPAM request closes the ticket and flags the contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.SPAM, USER);

    const data = db.contact.updateMany.mock.calls[0][0].data;
    expect(data.waMessageAssignStatus).toBe(WaMessageAssignStatus.CLOSED);
    expect(data.isSpam).toBe(true);
  });

  test("mirrors onto the newest conversation of each contact only", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-new", contactId: "c1", status: "ASSIGNED" },
      { id: "conv-old", contactId: "c1", status: "ASSIGNED" },
    ]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.CLOSED, USER);

    expect(db.conversation.updateMany.mock.calls[0][0].where).toEqual({ id: { in: ["conv-new"] } });
  });

  test("does not reopen a conversation that is already closed", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-1", contactId: "c1", status: WaMessageAssignStatus.CLOSED },
    ]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(db.conversation.updateMany).not.toHaveBeenCalled();
  });

  test("moves each contact between inbox tabs exactly once", async () => {
    db.contact.findMany.mockResolvedValue([contact({ id: "c1" }), contact({ id: "c2" })]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", "assignedCount", 2);
  });

  test("leaves the counters alone for a contact that never received a message", async () => {
    db.contact.findMany.mockResolvedValue([contact({ lastReceivedMessageTimeStamp: null })]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).not.toHaveBeenCalled();
  });

  // NOTE: the ids are not org-scoped anywhere, and the stats are then attributed
  // to whichever org happens to own the first row. A mixed-org id list moves
  // another org's counters. See issues.txt 18.5.
  test("attributes the inbox counters to the first contact's org", async () => {
    db.contact.findMany.mockResolvedValue([
      contact({ id: "c1", orgId: "org-a" }),
      contact({ id: "c2", orgId: "org-b" }),
    ]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).toHaveBeenCalledWith(
      "org-a",
      "unassignedCount",
      "assignedCount",
      2,
    );
  });

  test("frees the assignees of every closed contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);
    (getAssignedUserForContact as Mock).mockResolvedValue([{ assignedUserId: "u1" }]);
    (getNotificationSettings as Mock).mockResolvedValue({ waMessageClosedNotification: true });

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.CLOSED, USER);

    expect(deleteAssignedUsersforContact).toHaveBeenCalledWith("c1");
    expect(notificationQueue.add).toHaveBeenCalled();
  });

  test("leaves the assignees alone when the status is not terminal", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.ASSIGNED, USER);

    expect(deleteAssignedUsersforContact).not.toHaveBeenCalled();
  });

  test("records the spam event in the thread even though the ticket stores CLOSED", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.SPAM, USER, "m1");

    expect(createInternalWaMessage).toHaveBeenCalledWith({
      trigerredByUser: USER,
      contactId: "c1",
      waMessageAssignStatus: WaMessageAssignStatus.SPAM,
      messageId: "m1",
    });
  });

  test("returns the contacts as they were before the write", async () => {
    const before = contact();
    db.contact.findMany.mockResolvedValue([before]);

    expect(
      await bulkUpdateWaMessageAssignStatus(["c1"], WaMessageAssignStatus.CLOSED, USER),
    ).toEqual([before]);
  });
});
