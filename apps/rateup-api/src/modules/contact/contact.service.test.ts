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
    lifecycle: { findFirst: vi.fn(), findUnique: vi.fn() },
    conversation: { findMany: vi.fn(), updateMany: vi.fn() },
    integration: { findMany: vi.fn() },
    webhook: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

// The contact service only emits integration events now. Rather than asserting
// on the events alone, each one is run through the real fan-out and adapters
// inline, so the assertions below still check the Zoho jobs and Zapier triggers
// that come out the other end — the same ones the service used to enqueue
// itself. The org is treated as having Zoho, GetLead and Zapier connected.
vi.mock("../integrations/events/emitIntegrationEvent.js", async () => {
  const { processIntegrationEvent } =
    await import("../integrations/events/integrationEvent.fanout.js");
  return {
    INTEGRATION_EVENT_JOB: "integration-event",
    emitIntegrationEvent: vi.fn((orgId: string, event: any) =>
      processIntegrationEvent({ orgId, event }),
    ),
  };
});

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./contactGroup/contactGroup.service.js", () => ({
  addExistingContactsToMultipleGroups: vi.fn(),
}));

vi.mock("../integrations/meta/conversions.service.js", () => ({
  triggerConversionsApiForContact: vi.fn(),
}));

// The board half of the lifecycle mirror; its own behaviour is covered in
// pipeline.test.ts, so here we only care that the contact side calls it.
vi.mock("../pipeline/pipelineLead/lead.service.js", () => ({}));
vi.mock("../metaAgent/metaAgent.autoRelease.js", () => ({
  releaseThreadsOnTicketClose: vi.fn(),
}));

vi.mock("../whatsapp/inbox/message/wamessage.service.js", () => ({
  assignWaMessageToUser: vi.fn(),
  createInternalWaMessage: vi.fn(),
  deleteAssignedUsersforContact: vi.fn(),
  getAssignedUserForContact: vi.fn(),
}));

vi.mock("../notification/notify.js", () => ({ notify: vi.fn() }));

vi.mock("../integrations/external/zapier/zapier.deliver.js", () => ({
  queueZapierTrigger: vi.fn(),
  deliverZapierHook: vi.fn(),
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
  resolveContactChannel: vi.fn(async () => ({ platform: "ALL" })),
}));

vi.mock("../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
  notificationQueue: { add: vi.fn() },
}));

vi.mock("../whatsapp/inbox/inboxStats/inboxStats.service.js", () => ({
  mapStatusToField: vi.fn((status: string) => (status ? `${status.toLowerCase()}Count` : null)),
  transitionInboxStat: vi.fn(),
  incrementInboxStat: vi.fn(),
  decrementInboxStat: vi.fn(),
}));

vi.mock("../integrations/external/zoho/zoho.crm.js", () => ({
  pushCrmLeadStatus: vi.fn(),
  updateZohoLeadQueue: vi.fn(),
  processZohoCrmJob: vi.fn(),
  ZOHO_CRM_TRIGGERS: [],
}));

vi.mock("../integrations/external/zoho/zoho.utils.js", async () => ({
  // The real subscription check, which the Zoho provider reads.
  isZohoTriggerEnabled: (
    await vi.importActual<typeof import("../integrations/external/zoho/zoho.utils.js")>(
      "../integrations/external/zoho/zoho.utils.js",
    )
  ).isZohoTriggerEnabled,
  addZohoContactToQueue: vi.fn(),
  buildZohoContactPayload: vi.fn((c: any) => ({ Last_Name: c?.name })),
  buildZohoLeadPayload: vi.fn((c: any) => ({ Last_Name: c?.name, Lead_Status: c?.leadStatus })),
}));

import prisma from "../../utils/prisma.js";
import { releaseThreadsOnTicketClose } from "../metaAgent/metaAgent.autoRelease.js";
import { addExistingContactsToMultipleGroups } from "./contactGroup/contactGroup.service.js";
import { queueZapierTrigger } from "../integrations/external/zapier/zapier.deliver.js";
import { emitIntegrationEvent } from "../integrations/events/emitIntegrationEvent.js";
import { integrationTriggerQueue } from "../../workers/bullmq/queues/index.js";
import { checkAndExecuteRuleByTriggerEvent } from "../whatsapp/automatedReply/wa_automatedReply.utils.js";
import { addZohoContactToQueue } from "../integrations/external/zoho/zoho.utils.js";
import {
  assignWaMessageToUser,
  createInternalWaMessage,
  deleteAssignedUsersforContact,
  getAssignedUserForContact,
} from "../whatsapp/inbox/message/wamessage.service.js";
import { notify } from "../notification/notify.js";
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
  updateContactById,
  updateContactLabelsById,
  updateCustomField,
  updateLifecycleStageofContacts,
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
  integration: Record<string, Mock>;
  webhook: Record<string, Mock>;
  $queryRaw: Mock;
  $transaction: Mock;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

/**
 * The org's connected integrations: Zoho and GetLead, every trigger switched on,
 * so the providers' subscription filter lets every event through.
 */
const subscribed = (...fields: string[]) => ({
  triggerSubscriptions: fields.map((subscribed_field) => ({ subscribed_field, active: true })),
});
const CONNECTED_INTEGRATIONS = [
  {
    name: "zoho",
    active: true,
    credential: subscribed(
      "contact_created",
      "contact_updated",
      "contact_deleted",
      "lead_created",
      "lead_updated",
      "bigin_contact_created",
      "bigin_contact_updated",
      "bigin_contact_deleted",
      "bigin_deal_created",
    ),
  },
  {
    name: "getlead",
    active: true,
    credential: subscribed("getlead_lead_create", "getlead_lead_update"),
  },
  {
    name: "zapier",
    active: true,
    credential: subscribed(
      "new_contact_create",
      "contact_updated",
      "contact_deleted",
      "contact_lifecycle_updated",
      "contact_stage_updated",
      "conversation_closed",
    ),
  },
];

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
  db.integration.findMany.mockResolvedValue(CONNECTED_INTEGRATIONS);
  db.webhook.findUnique.mockResolvedValue(null);
  (getAssignedUserForContact as Mock).mockResolvedValue([]);
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

  // `lifecycleId` is optional on contactCoreSchema; omitting it is treated the
  // same as an explicit empty string — no lifecycle assigned, create proceeds.
  test("treats an omitted lifecycleId as no lifecycle", async () => {
    await createContact({ ...base, lifecycleId: undefined });

    expect(db.contact.create.mock.calls[0][0].data.lifecycleId).toBeUndefined();
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

    expect(queueZapierTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: "zapier" }),
      "new_contact_create",
      {
        id: "c1",
        orgId: ORG,
        phone: "919000000001",
      },
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

  test("a quiet create (lead import) fires no automation, Zap or CRM push", async () => {
    db.contact.create.mockResolvedValue({ id: "c1", orgId: ORG, lifecycleId: "lc-1" });

    await createContact({ ...base, lifecycleId: "lc-1" }, undefined, { quiet: true });

    expect(db.contact.create).toHaveBeenCalled();
    expect(checkAndExecuteRuleByTriggerEvent).not.toHaveBeenCalled();
    expect(queueZapierTrigger).not.toHaveBeenCalled();
    expect(addZohoContactToQueue).not.toHaveBeenCalled();
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("waits for the group membership write", async () => {
    let settled = false;
    (addExistingContactsToMultipleGroups as Mock).mockImplementation(async () => {
      settled = true;
    });

    await createContact({ ...base, lifecycleId: "", contactGroupIds: ["g1"] });

    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], ["g1"], ORG);
    expect(settled).toBe(true);
  });

  test("lets a failed group membership write reach the caller", async () => {
    (addExistingContactsToMultipleGroups as Mock).mockRejectedValueOnce(new Error("db down"));

    await expect(
      createContact({ ...base, lifecycleId: "", contactGroupIds: ["g1"] }),
    ).rejects.toThrow("db down");
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
    expect(queueZapierTrigger).not.toHaveBeenCalled();
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
    expect(queueZapierTrigger).toHaveBeenCalled();
    expect(integrationTriggerQueue.add).toHaveBeenCalledWith("zoho-lead-create", expect.anything());
  });

  test("strips the relation inputs prisma has no columns for", async () => {
    await getOrcreateContact({
      ...base,
      labels: ["l1"],
      contactGroupIds: ["g1"],
      assignedUserIds: ["u1"],
      customFields: [{ id: "f1", value: "x" }],
    });

    const data = db.contact.create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("labels");
    expect(data).not.toHaveProperty("contactGroupIds");
    expect(data).not.toHaveProperty("assignedUserIds");
    expect(data).not.toHaveProperty("customFields");
  });
});

// ===========================================================================
// createMultipleContacts
// ===========================================================================

describe("createMultipleContacts", () => {
  test("stamps the org onto every row and strips relation inputs", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([]);

    await createMultipleContacts(
      [{ name: "A", phone: "9190001", source: "CSV", labels: ["l1"] } as any],
      ORG,
    );

    const [row] = db.contact.createManyAndReturn.mock.calls[0][0].data;
    expect(row).toMatchObject({ orgId: ORG });
    expect(row).not.toHaveProperty("aiWaChat");
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

  test("skips a custom field whose contact was not created", async () => {
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

    expect((queueZapierTrigger as unknown as Mock).mock.calls).toHaveLength(2);
    expect((integrationTriggerQueue.add as unknown as Mock).mock.calls).toHaveLength(2);
  });

  test("does nothing downstream when the database created nothing", async () => {
    db.contact.createManyAndReturn.mockResolvedValue([]);

    await createMultipleContacts([{ name: "A", phone: "9190001", source: "CSV" } as any], ORG);

    expect(db.contactCustomFieldValue.deleteMany).not.toHaveBeenCalled();
    expect(queueZapierTrigger).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// reads
// ===========================================================================

describe("getContactById", () => {
  test("looks a contact up within the caller's org", async () => {
    await getContactById("c1", ORG);

    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({ id: "c1", orgId: ORG });
  });

  test("includes the contact's labels", async () => {
    await getContactById("c1", ORG);

    expect(db.contact.findFirst.mock.calls[0][0].include).toHaveProperty("ContactLabelMap");
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

    expect(where().AND).toEqual([
      {
        OR: [
          { name: { contains: "ann", mode: "insensitive" } },
          { phone: { contains: "ann", mode: "insensitive" } },
        ],
      },
    ]);
  });

  test("labelIds matches contacts carrying any of the labels", async () => {
    await getContactsByOrgId(ORG, { labelIds: "l1,l2,l1" } as any);

    expect(where().AND).toEqual([{ ContactLabelMap: { some: { labelId: { in: ["l1", "l2"] } } } }]);
  });

  test("a custom field filter matches its value case-insensitively", async () => {
    await getContactsByOrgId(ORG, { customFieldId: "f1", customFieldValue: " Gold " } as any);

    expect(where().AND).toEqual([
      {
        customFields: {
          some: { fieldId: "f1", value: { equals: "Gold", mode: "insensitive" } },
        },
      },
    ]);
  });

  test("a custom field without a value matches contacts that have it set", async () => {
    await getContactsByOrgId(ORG, { customFieldId: "f1" } as any);

    expect(where().AND).toEqual([
      { customFields: { some: { fieldId: "f1", value: { not: "" } } } },
    ]);
  });

  test("a name filter becomes a case-insensitive contains", async () => {
    await getContactsByOrgId(ORG, { name: "an" } as any);

    expect(where().AND).toEqual([{ name: { contains: "an", mode: "insensitive" } }]);
  });

  test("the consent filter compares against a real boolean", async () => {
    await getContactsByOrgId(ORG, { consent: "TRUE" } as any);

    expect(where().AND).toEqual([{ consent: { equals: true } }]);
  });

  test("a group filter de-duplicates the requested group ids", async () => {
    await getContactsByOrgId(ORG, { filterGroupName: "g1,g2,g1" } as any);

    expect(where().AND).toEqual([
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

    expect(where().AND).toEqual([expected]);
  });

  test("a real label id filters through the label map", async () => {
    await getContactsByOrgId(ORG, { labelId: "l1" } as any);

    expect(where().AND).toEqual([{ ContactLabelMap: { some: { labelId: "l1" } } }]);
  });

  test("combining two filters ANDs them together", async () => {
    await getContactsByOrgId(ORG, { name: "ann", consent: "true" } as any);

    expect(where().AND).toEqual([
      { name: { contains: "ann", mode: "insensitive" } },
      { consent: { equals: true } },
    ]);
    expect(where().OR).toBeUndefined();
  });

  test("a createdAt filter covers the whole of the day it names", async () => {
    await getContactsByOrgId(ORG, { createdAt: "2026-01-01" } as any);

    expect(where().AND).toEqual([
      { createdAt: { gte: new Date("2026-01-01"), lt: new Date("2026-01-02") } },
    ]);
  });

  test("a createdAt filter that is not a date is dropped rather than sent", async () => {
    await getContactsByOrgId(ORG, { createdAt: "last tuesday" } as any);

    expect(where()).toEqual({ orgId: ORG });
  });

  // Contact -> CustomerLoyaltyAccount is a list relation, so membership is `some`.
  // The restriction rides on the same array as the filters: it used to be spread
  // alongside them as its own `AND` key, which was harmless while the filters
  // lived under `OR` and would have silently overwritten them once both wanted
  // `AND`.
  test("the LOYALTY type restricts to contacts that have a loyalty account", async () => {
    await getContactsByOrgId(ORG, { type: "LOYALTY" } as any);

    expect(where().AND).toEqual([{ loyaltyAccounts: { some: {} } }]);
  });

  test("a type filter and an ordinary filter narrow together", async () => {
    await getContactsByOrgId(ORG, { type: "LOYALTY", consent: "true" } as any);

    expect(where().AND).toEqual([{ consent: { equals: true } }, { loyaltyAccounts: { some: {} } }]);
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

  test("the desc query parameter chooses the sort direction", async () => {
    await getContactsByOrgId(ORG, { sort: "createdAt", desc: "asc" } as any);

    expect(db.contact.findMany.mock.calls[0][0].orderBy[0]).toEqual({ createdAt: "asc" });
  });

  test("sorts descending by default", async () => {
    await getContactsByOrgId(ORG, { sort: "createdAt" } as any);

    expect(db.contact.findMany.mock.calls[0][0].orderBy[0]).toEqual({ createdAt: "desc" });
  });

  // `query.type` is read with optional chaining, matching the `query ?? {...}`
  // default used for the rest of the destructuring — calling with no query at
  // all is a normal "no filters" request.
  test("does not throw when called with no query object", async () => {
    await expect(getContactsByOrgId(ORG)).resolves.toEqual({ users: [], totalCount: 0 });
  });
});

// ===========================================================================
// deletes
// ===========================================================================

describe("deleteContactById", () => {
  test("deletes by id and announces it", async () => {
    db.contact.delete.mockResolvedValue({ id: "c1", orgId: ORG, integrationIds: null });

    await deleteContactById("c1", ORG);

    expect(db.contact.delete).toHaveBeenCalledWith({ where: { id: "c1", orgId: ORG } });
    expect(queueZapierTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: "zapier" }),
      "contact_deleted",
      expect.anything(),
    );
  });

  test("passes the mirrored CRM ids on to the delete jobs", async () => {
    db.contact.delete.mockResolvedValue({
      id: "c1",
      orgId: ORG,
      integrationIds: { zoho: { contact: { id: "z1" } }, bigin: { contact: { id: "b1" } } },
    });

    await deleteContactById("c1", ORG);

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data).toEqual({ zohoContactId: "z1" });
    expect(jobs[1][1].data).toEqual({ biginContactId: "b1" });
  });

  test("still queues the CRM deletes when the contact was never mirrored", async () => {
    db.contact.delete.mockResolvedValue({ id: "c1", orgId: ORG, integrationIds: null });

    await deleteContactById("c1", ORG);

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data).toEqual({ zohoContactId: undefined });
  });
});

describe("deleteManyContacts", () => {
  test("deletes only the ids the caller's org owns", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await deleteManyContacts(["c1", "c2"], ORG);

    expect(db.contact.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] }, orgId: ORG },
    });
    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["c1", "c2"] },
      orgId: ORG,
    });
  });

  test("announces each deleted contact against its own org", async () => {
    db.contact.findMany.mockResolvedValue([
      { id: "c1", orgId: "org-a", integrationIds: null },
      { id: "c2", orgId: "org-b", integrationIds: null },
    ]);

    await deleteManyContacts(["c1", "c2"], ORG);

    expect(
      (emitIntegrationEvent as unknown as Mock).mock.calls
        .filter(([, event]) => event.type === "contact.deleted")
        .map(([orgId]) => orgId),
    ).toEqual(["org-a", "org-b"]);
  });

  test("returns the delete count from prisma", async () => {
    db.contact.deleteMany.mockResolvedValue({ count: 2 });

    expect(await deleteManyContacts(["c1", "c2"], ORG)).toEqual({ count: 2 });
  });
});

// ===========================================================================
// updateContactById
// ===========================================================================

describe("updateContactById", () => {
  const existing: {
    id: string;
    orgId: string;
    waMessageAssignStatus: WaMessageAssignStatus;
    blockedOnWhatsApp: boolean;
    lastReceivedMessageTimeStamp: Date | null;
  } = {
    id: "c1",
    orgId: ORG,
    waMessageAssignStatus: WaMessageAssignStatus.UNASSIGNED,
    blockedOnWhatsApp: false,
    lastReceivedMessageTimeStamp: null,
  };

  function updated(overrides: Record<string, unknown> = {}) {
    const base: {
      id: string;
      orgId: string;
      name: string;
      phone: string;
      waMessageAssignStatus: WaMessageAssignStatus;
      blockedOnWhatsApp: boolean;
      lastReceivedMessageTimeStamp: Date | null;
      lifecycleId: string | null;
      integrationIds: string[] | null;
      waInboxAssign: unknown[];
      contactGroups: unknown[];
    } = {
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
    };
    return { ...base, ...overrides };
  }

  test("reuses a caller-supplied snapshot instead of re-reading the contact", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", ORG, { name: "Ann" } as any, USER, existing);

    expect(db.contact.findUnique).not.toHaveBeenCalled();
  });

  test("reads the contact within the caller's org when no snapshot is supplied", async () => {
    db.contact.findFirst.mockResolvedValue(existing);
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", ORG, { name: "Ann" } as any);

    expect(db.contact.findFirst).toHaveBeenCalledWith({ where: { id: "c1", orgId: ORG } });
  });

  test("throws a named error when the contact does not exist", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    // Previously fell through to a bare TypeError on the first property read.
    await expect(updateContactById("nope", ORG, { name: "Ann" } as any)).rejects.toThrow(
      "Contact nope not found",
    );
  });

  test("replaces the label set rather than appending to it", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", ORG, { labels: ["l1"] } as any, USER, existing);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({ where: { contactId: "c1" } });
    expect(db.contactLabelMap.createMany).toHaveBeenCalledWith({
      data: [{ contactId: "c1", labelId: "l1" }],
      skipDuplicates: true,
    });
  });

  test("an empty label array clears the contact's labels", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", ORG, { labels: [] } as any, USER, existing);

    expect(db.contactLabelMap.deleteMany).toHaveBeenCalledWith({ where: { contactId: "c1" } });
    expect(db.contactLabelMap.createMany).not.toHaveBeenCalled();
  });

  test("an absent label field leaves the existing labels alone", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById("c1", ORG, { name: "Ann" } as any, USER, existing);

    expect(db.contactLabelMap.deleteMany).not.toHaveBeenCalled();
  });

  test("writes the contact-form fields the update used to drop", async () => {
    db.contact.update.mockResolvedValue(updated());
    const dob = new Date("1990-04-02T00:00:00.000Z");

    await updateContactById(
      "c1",
      ORG,
      { email: "ann@example.com", dob, external_id: "crm-7" } as any,
      USER,
      existing,
    );

    expect(db.contact.update.mock.calls[0][0].data).toMatchObject({
      email: "ann@example.com",
      dob,
      external_id: "crm-7",
    });
  });

  test("leaves untouched fields alone on a partial update", async () => {
    db.contact.update.mockResolvedValue(updated());

    // An inbox status change must not blank the contact's email or lifecycle.
    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED } as any,
      USER,
      existing,
    );

    const { data } = db.contact.update.mock.calls[0][0];
    expect(data.email).toBeUndefined();
    expect(data.dob).toBeUndefined();
    expect(data.external_id).toBeUndefined();
    expect(data.lifecycleId).toBeUndefined();
  });

  test("replaces the custom field values", async () => {
    db.contact.update.mockResolvedValue(updated());

    await updateContactById(
      "c1",
      ORG,
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
      ORG,
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

  test("closing a ticket hands its thread back to Meta AI; a spam close does not", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );
    expect(releaseThreadsOnTicketClose).toHaveBeenCalledWith(ORG, ["c1"]);

    vi.mocked(releaseThreadsOnTicketClose).mockClear();
    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.SPAM } as any,
      USER,
      existing,
    );
    expect(releaseThreadsOnTicketClose).not.toHaveBeenCalled();
  });

  test("a spam mark is recorded in the thread as SPAM, not as CLOSED", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      ORG,
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
      ORG,
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
      ORG,
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
      ORG,
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
      ORG,
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
      ORG,
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
      ORG,
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
      ORG,
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

    await updateContactById("c1", ORG, { name: "Ann" } as any, USER, seen);

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

    await updateContactById("c1", ORG, { name: "Ann" } as any, USER, seen);

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

    await updateContactById("c1", ORG, { waMessageAssignStatus: status } as any, USER, existing);

    expect(checkAndExecuteRuleByTriggerEvent).toHaveBeenCalledWith(event, {
      orgId: ORG,
      phone: "919000000001",
      platform: "ALL",
    });
  });

  // A WhatsApp-only rule must not run for an Instagram chat: it would try to
  // WhatsApp-message the contact's IGSID and fail.
  test("runs the automation against the channel the contact is actually on", async () => {
    db.contact.update.mockResolvedValue(
      updated({ waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED }),
    );
    const { checkAndExecuteRuleByTriggerEvent, resolveContactChannel } =
      await import("../whatsapp/automatedReply/wa_automatedReply.utils.js");
    (resolveContactChannel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      platform: "INSTAGRAM",
      phoneNumberId: "iba-1",
    });

    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED } as any,
      USER,
      existing,
    );

    expect(checkAndExecuteRuleByTriggerEvent).toHaveBeenCalledWith("CHAT_ASSIGNED", {
      orgId: ORG,
      phone: "919000000001",
      platform: "INSTAGRAM",
      phoneNumberId: "iba-1",
    });
  });

  test("adds and removes group memberships to match the requested set", async () => {
    db.contact.update.mockResolvedValue(updated({ contactGroups: [{ contactGroupId: "g-old" }] }));

    await updateContactById("c1", ORG, { contactGroupIds: ["g-new"] } as any, USER, existing);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", contactGroupId: { in: ["g-old"] } },
    });
    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], ["g-new"], ORG);
    expect(db.contact.update.mock.calls[0][0].where).toEqual({ id: "c1", orgId: ORG });
  });

  test("leaves a group the contact is already in alone", async () => {
    db.contact.update.mockResolvedValue(updated({ contactGroups: [{ contactGroupId: "g1" }] }));

    await updateContactById("c1", ORG, { contactGroupIds: ["g1"] } as any, USER, existing);

    expect(db.contactGroupMap.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", contactGroupId: { in: [] } },
    });
    expect(addExistingContactsToMultipleGroups).toHaveBeenCalledWith(["c1"], [], ORG);
  });

  test("revokes assignees that are no longer requested", async () => {
    db.contact.update.mockResolvedValue(updated({ waInboxAssign: [{ assignedUserId: "u-old" }] }));

    await updateContactById("c1", ORG, { assignedUserIds: [] } as any, USER, existing);

    expect(db.waInboxAssign.deleteMany).toHaveBeenCalledWith({
      where: { contactId: "c1", assignedUserId: { in: ["u-old"] } },
    });
    expect(assignWaMessageToUser).not.toHaveBeenCalled();
  });

  test("scopes a new assignee lookup to the contact's org", async () => {
    db.contact.update.mockResolvedValue(updated());
    db.$queryRaw.mockResolvedValue([{ userId: USER, teamId: "t1" }]);

    await updateContactById("c1", ORG, { assignedUserIds: [USER] } as any, USER, existing);

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

    await updateContactById("c1", ORG, { name: "Ann" } as any, USER, existing);

    const jobs = (integrationTriggerQueue.add as unknown as Mock).mock.calls;
    expect(jobs[0][1].data.zohoContactId).toBe("z1");
    expect(jobs[1][1].data.biginContactId).toBe("b1");
  });

  // The lifecycle is reported rather than written straight into `Lead_Status`:
  // the org's mapping decides which Zoho status it means, and a lifecycle named
  // something Zoho's picklist does not hold is a rejected push.
  test("reports the lifecycle to the mirrored zoho lead", async () => {
    const { pushCrmLeadStatus } = await import("../integrations/external/zoho/zoho.crm.js");
    db.contact.update.mockResolvedValue(
      updated({ lifecycleId: "lc-1", integrationIds: { zoho: { lead: { id: "lead-1" } } } }),
    );
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });

    await updateContactById("c1", ORG, { lifecycleId: "lc-1" } as any, USER, existing);

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      ORG,
      "lead-1",
      { lifecycleId: "lc-1", lifecycleName: "Customer" },
      expect.any(Object),
    );
  });

  test("skips the lead update when the contact has no mirrored lead", async () => {
    const { pushCrmLeadStatus } = await import("../integrations/external/zoho/zoho.crm.js");
    db.contact.update.mockResolvedValue(updated({ lifecycleId: "lc-1" }));

    await updateContactById("c1", ORG, { lifecycleId: "lc-1" } as any, USER, existing);

    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  test("closing frees the assignees and tells them, not the person who closed it", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));
    (getAssignedUserForContact as Mock).mockResolvedValue([{ assignedUserId: "u1" }]);

    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect(deleteAssignedUsersforContact).toHaveBeenCalledWith("c1");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "inbox.closed",
        audience: { kind: "users", userIds: ["u1"] },
        actorUserId: USER,
      }),
    );
  });

  test("announces a close to zapier as a closed conversation", async () => {
    db.contact.update.mockResolvedValue(updated({ waMessageAssignStatus: "CLOSED" }));

    await updateContactById(
      "c1",
      ORG,
      { waMessageAssignStatus: WaMessageAssignStatus.CLOSED } as any,
      USER,
      existing,
    );

    expect((queueZapierTrigger as unknown as Mock).mock.calls.map((c) => c[1])).toContain(
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

    await updateContactLabelsById("c1", ORG, "lc-1");

    expect(db.contact.update.mock.calls[0][0]).toMatchObject({
      where: { id: "c1" },
      data: { lifecycleId: "lc-1" },
    });
    expect(queueZapierTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ name: "zapier" }),
      "contact_lifecycle_updated",
      {
        contactId: "c1",
        lifecycleId: "lc-1",
        lifecycleName: "Customer",
      },
    );
  });
});

describe("updateLifecycleStageofContacts", () => {
  beforeEach(() => {
    db.lifecycle.findFirst.mockResolvedValue({ name: "Customer" });
    // The Zoho adapter resolves the name again on the worker side.
    db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });
  });

  test("moves every requested contact in the caller's org to the new stage", async () => {
    await updateLifecycleStageofContacts("lc-1", ORG, ["c1", "c2"]);

    expect(db.contact.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] }, orgId: ORG },
      data: { lifecycleId: "lc-1" },
    });
  });

  test("writes nothing when the lifecycle does not exist", async () => {
    db.lifecycle.findFirst.mockResolvedValue(null);

    await expect(updateLifecycleStageofContacts("nope", ORG, ["c1"])).rejects.toThrow(
      "Lifecycle nope not found",
    );
    expect(db.contact.updateMany).not.toHaveBeenCalled();
    expect(integrationTriggerQueue.add).not.toHaveBeenCalled();
  });

  test("resolves the lifecycle against the caller's org", async () => {
    await updateLifecycleStageofContacts("lc-1", ORG, ["c1"]);

    expect(db.lifecycle.findFirst.mock.calls[0][0].where).toEqual({ id: "lc-1", orgId: ORG });
  });

  test("pushes the new stage to contacts that are mirrored as zoho leads", async () => {
    const { pushCrmLeadStatus } = await import("../integrations/external/zoho/zoho.crm.js");
    db.contact.findMany.mockResolvedValue([
      { id: "c1", orgId: ORG, integrationIds: { zoho: { lead: { id: "lead-1" } } } },
    ]);

    await updateLifecycleStageofContacts("lc-1", ORG, ["c1"]);

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      ORG,
      "lead-1",
      { lifecycleId: "lc-1", lifecycleName: "Customer" },
      // A lifecycle-only write carries no details change along with it.
      {},
    );
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

  test("does nothing for a phone number that is not in the org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(handleContactConsent(ORG, "9190001", true)).resolves.toBe(false);
    expect(db.contact.update).not.toHaveBeenCalled();
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

  test("rethrows a database failure instead of swallowing it", async () => {
    db.contact.findFirst.mockRejectedValue(new Error("connection lost"));

    await expect(getOrCreateContactByPhone("9190001", ORG)).rejects.toThrow("connection lost");
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
    expect(queueZapierTrigger).toHaveBeenCalled();
    expect(res).toEqual({ contact: { id: "c1", orgId: ORG }, conversation: undefined });
  });

  test("rethrows a database failure instead of swallowing it", async () => {
    db.contact.findUnique.mockRejectedValue(new Error("boom"));

    await expect(getOrCreateContactByIgsId("igs-1", ORG)).rejects.toThrow("boom");
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

    expect(
      await bulkUpdateWaMessageAssignStatus(["nope"], ORG, WaMessageAssignStatus.CLOSED),
    ).toEqual([]);
    expect(db.contact.updateMany).not.toHaveBeenCalled();
  });

  test("writes the requested status to every contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(db.contact.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ["c1"] } },
      data: { waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED },
    });
  });

  test("stamps closedAt and closedBy on a terminal status", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.CLOSED, USER);

    const data = db.contact.updateMany.mock.calls[0][0].data;
    expect(data.closedAt).toBeInstanceOf(Date);
    expect(data.closedBy).toBe(USER);
  });

  test("never writes a sentinel actor into closedBy", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.CLOSED, "RateUp");

    expect(db.contact.updateMany.mock.calls[0][0].data.closedBy).toBeNull();
  });

  test("a bulk close hands every thread back to Meta AI; a bulk assign does not", async () => {
    db.contact.findMany.mockResolvedValue([contact(), contact({ id: "c2" })]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], ORG, WaMessageAssignStatus.RESOLVED, USER);
    expect(releaseThreadsOnTicketClose).toHaveBeenCalledWith(ORG, ["c1", "c2"]);

    vi.mocked(releaseThreadsOnTicketClose).mockClear();
    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.ASSIGNED, USER);
    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.SPAM, USER);
    expect(releaseThreadsOnTicketClose).not.toHaveBeenCalled();
  });

  test("a bulk SPAM request closes the ticket and flags the contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.SPAM, USER);

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

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.CLOSED, USER);

    expect(db.conversation.updateMany.mock.calls[0][0].where).toEqual({ id: { in: ["conv-new"] } });
  });

  test("does not reopen a conversation that is already closed", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);
    db.conversation.findMany.mockResolvedValue([
      { id: "conv-1", contactId: "c1", status: WaMessageAssignStatus.CLOSED },
    ]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(db.conversation.updateMany).not.toHaveBeenCalled();
  });

  test("moves each contact between inbox tabs exactly once", async () => {
    db.contact.findMany.mockResolvedValue([contact({ id: "c1" }), contact({ id: "c2" })]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", "assignedCount", 2);
  });

  test("leaves the counters alone for a contact that never received a message", async () => {
    db.contact.findMany.mockResolvedValue([contact({ lastReceivedMessageTimeStamp: null })]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).not.toHaveBeenCalled();
  });

  test("attributes the inbox counters to the caller's org", async () => {
    db.contact.findMany.mockResolvedValue([
      contact({ id: "c1", orgId: ORG }),
      contact({ id: "c2", orgId: ORG }),
    ]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(transitionInboxStat).toHaveBeenCalledWith(ORG, "unassignedCount", "assignedCount", 2);
  });

  test("reads and writes only the contacts the caller's org owns", async () => {
    db.contact.findMany.mockResolvedValue([contact({ id: "c1", orgId: ORG })]);

    await bulkUpdateWaMessageAssignStatus(["c1", "c2"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["c1", "c2"] },
      orgId: ORG,
    });
    expect(db.contact.updateMany.mock.calls[0][0].where).toEqual({
      id: { in: ["c1", "c2"] },
      orgId: ORG,
    });
  });

  test("frees the assignees of every closed contact", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);
    (getAssignedUserForContact as Mock).mockResolvedValue([{ assignedUserId: "u1" }]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.CLOSED, USER);

    expect(deleteAssignedUsersforContact).toHaveBeenCalledWith("c1");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "inbox.closed",
        audience: { kind: "users", userIds: ["u1"] },
      }),
    );
  });

  test("leaves the assignees alone when the status is not terminal", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.ASSIGNED, USER);

    expect(deleteAssignedUsersforContact).not.toHaveBeenCalled();
  });

  test("records the spam event in the thread even though the ticket stores CLOSED", async () => {
    db.contact.findMany.mockResolvedValue([contact()]);

    await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.SPAM, USER, "m1");

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
      await bulkUpdateWaMessageAssignStatus(["c1"], ORG, WaMessageAssignStatus.CLOSED, USER),
    ).toEqual([before]);
  });
});
